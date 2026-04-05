const express = require("express");

const { authRequired } = require("../auth");
const { run, get, all, text, toInt, nowIso, withTransaction } = require("../db");
const {
  buildDashboard,
  canManageCourse,
  getCoursePricing,
  getLatestPaymentOrder,
  getLiveClassRecord,
  getLiveClassRegistration,
  getLiveClassState,
  getPaidCoursePurchase,
  getPaymentOrder,
  ensureEnrollment,
  ensureLiveClassRegistration,
  getCourseDetail,
  getCourseRecord,
  getEnrollment,
  listLiveClasses,
  listPaymentRecords,
  notifyUser,
} = require("../services");

const router = express.Router();

function normalizePaymentMethod(value) {
  const method = text(value).toLowerCase();
  return ["card", "upi", "netbanking"].includes(method) ? method : "";
}

function maskCardNumber(rawValue) {
  const digits = String(rawValue || "").replace(/\D/g, "");
  if (digits.length < 12) {
    return "";
  }

  return `Card ending ${digits.slice(-4)}`;
}

function maskUpiId(rawValue) {
  const upiId = text(rawValue);
  if (!upiId.includes("@")) {
    return "";
  }

  const [handle, provider] = upiId.split("@");
  return `${handle.slice(0, 3)}***@${provider}`;
}

function createTransactionReference(orderId) {
  const timestamp = Date.now().toString().slice(-8);
  return `GMT-${orderId}-${timestamp}`;
}

function getPaymentPayload(request) {
  const paymentMethod = normalizePaymentMethod(request.body.paymentMethod);
  const payerName = text(request.body.payerName) || request.user.name;
  const payerEmail = text(request.body.payerEmail) || request.user.email;

  if (!paymentMethod || !payerName || !payerEmail) {
    return { error: "Payment method, payer name, and payer email are required." };
  }

  if (paymentMethod === "card") {
    const descriptor = maskCardNumber(request.body.cardNumber);
    const expiry = text(request.body.expiry);
    const cvv = String(request.body.cvv || "").replace(/\D/g, "");

    if (!descriptor || !expiry || cvv.length < 3) {
      return { error: "Enter a valid card number, expiry, and CVV for card checkout." };
    }

    return {
      paymentMethod,
      payerName,
      payerEmail,
      paymentDescriptor: descriptor,
    };
  }

  if (paymentMethod === "upi") {
    const descriptor = maskUpiId(request.body.upiId);
    if (!descriptor) {
      return { error: "Enter a valid UPI ID for UPI checkout." };
    }

    return {
      paymentMethod,
      payerName,
      payerEmail,
      paymentDescriptor: `UPI ${descriptor}`,
    };
  }

  const bankName = text(request.body.bankName);
  if (!bankName) {
    return { error: "Choose a bank name for netbanking checkout." };
  }

  return {
    paymentMethod,
    payerName,
    payerEmail,
    paymentDescriptor: `Netbanking ${bankName}`,
  };
}

router.get("/dashboard", authRequired, async (request, response, next) => {
  try {
    response.json(await buildDashboard(request.user));
  } catch (error) {
    next(error);
  }
});

router.get("/payments/history", authRequired, async (request, response, next) => {
  try {
    const payments =
      request.user.role === "student"
        ? await listPaymentRecords({
            whereClause: "po.user_id = :userId",
            params: { userId: request.user.id },
            limit: 25,
          })
        : await listPaymentRecords({
            whereClause: "c.instructor_id = :ownerId OR :isAdmin = 1",
            params: {
              ownerId: request.user.id,
              isAdmin: request.user.role === "admin" ? 1 : 0,
            },
            limit: 25,
          });

    response.json({ payments });
  } catch (error) {
    next(error);
  }
});

router.post("/courses/:id/checkout", authRequired, async (request, response, next) => {
  try {
    const courseId = toInt(request.params.id);
    if (!courseId) {
      response.status(400).json({ message: "Invalid course id." });
      return;
    }

    if (request.user.role !== "student") {
      response.status(403).json({ message: "Only student accounts can purchase courses." });
      return;
    }

    const course = await getCourseRecord(courseId);
    if (!course || course.status !== "approved") {
      response.status(404).json({ message: "Only approved courses can be purchased." });
      return;
    }

    const pricing = await getCoursePricing(courseId);
    if (!pricing.isPaid) {
      response.status(400).json({ message: "This course is free. Enroll directly instead of using checkout." });
      return;
    }

    const paidPurchase = await getPaidCoursePurchase(request.user.id, courseId);
    if (paidPurchase) {
      response.json({
        alreadyPaid: true,
        order: await getPaymentOrder(Number(paidPurchase.id)),
        course: await getCourseDetail(courseId, request.user),
      });
      return;
    }

    const existingPendingOrder = await getLatestPaymentOrder(request.user.id, courseId, { statuses: ["pending"] });
    if (existingPendingOrder) {
      response.status(201).json({
        order: await getPaymentOrder(Number(existingPendingOrder.id)),
        course: await getCourseDetail(courseId, request.user),
      });
      return;
    }

    const createdAt = nowIso();
    const orderId = Number(
      (
        await run(
          `
            INSERT INTO payment_orders (user_id, course_id, amount, currency, status, created_at, updated_at)
            VALUES (:userId, :courseId, :amount, :currency, 'pending', :createdAt, :updatedAt)
          `,
          {
            userId: request.user.id,
            courseId,
            amount: pricing.priceAmount,
            currency: pricing.currency,
            createdAt,
            updatedAt: createdAt,
          },
        )
      ).lastInsertRowid,
    );

    response.status(201).json({
      order: await getPaymentOrder(orderId),
      course: await getCourseDetail(courseId, request.user),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/payments/orders/:id/confirm", authRequired, async (request, response, next) => {
  try {
    const orderId = toInt(request.params.id);
    if (!orderId) {
      response.status(400).json({ message: "Invalid order id." });
      return;
    }

    const order = await getPaymentOrder(orderId);
    if (!order || Number(order.userId) !== Number(request.user.id)) {
      response.status(404).json({ message: "Payment order not found." });
      return;
    }

    if (order.status === "paid") {
      response.json({
        order,
        course: await getCourseDetail(Number(order.courseId), request.user),
      });
      return;
    }

    const course = await getCourseRecord(Number(order.courseId));
    if (!course || course.status !== "approved") {
      response.status(400).json({ message: "This course is not available for payment right now." });
      return;
    }

    const paymentPayload = getPaymentPayload(request);
    if (paymentPayload.error) {
      response.status(400).json({ message: paymentPayload.error });
      return;
    }

    await withTransaction(async () => {
      await run(
        `
          UPDATE payment_orders
          SET status = 'paid',
              payment_method = :paymentMethod,
              payment_descriptor = :paymentDescriptor,
              payer_name = :payerName,
              payer_email = :payerEmail,
              transaction_reference = :transactionReference,
              failure_reason = '',
              updated_at = :updatedAt,
              paid_at = :paidAt
          WHERE id = :orderId
        `,
        {
          orderId,
          paymentMethod: paymentPayload.paymentMethod,
          paymentDescriptor: paymentPayload.paymentDescriptor,
          payerName: paymentPayload.payerName,
          payerEmail: paymentPayload.payerEmail,
          transactionReference: createTransactionReference(orderId),
          updatedAt: nowIso(),
          paidAt: nowIso(),
        },
      );

      await ensureEnrollment(request.user.id, Number(order.courseId));
    });

    await notifyUser(
      request.user.id,
      "Payment successful",
      `Your payment for ${course.title} is complete and the course is now unlocked.`,
      `/learn/${order.courseId}`,
    );
    await notifyUser(
      Number(course.instructorId),
      "New paid enrollment",
      `${request.user.name} purchased ${course.title}.`,
      "/#studio",
    );

    response.json({
      order: await getPaymentOrder(orderId),
      course: await getCourseDetail(Number(order.courseId), request.user),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/live-classes", authRequired, async (request, response, next) => {
  try {
    const classes = await listLiveClasses({
      viewerId: request.user.id,
      user: request.user,
    });

    response.json({ classes });
  } catch (error) {
    next(error);
  }
});

router.post("/live-classes/:id/register", authRequired, async (request, response, next) => {
  try {
    const liveClassId = toInt(request.params.id);
    if (!liveClassId) {
      response.status(400).json({ message: "Invalid live class id." });
      return;
    }

    if (request.user.role !== "student") {
      response.status(403).json({ message: "Only students can register for live classes." });
      return;
    }

    const liveClass = await getLiveClassRecord(liveClassId);
    if (!liveClass) {
      response.status(404).json({ message: "Live class not found." });
      return;
    }

    if (getLiveClassState(liveClass.scheduledAt, liveClass.durationMinutes) === "completed") {
      response.status(400).json({ message: "This live class has already ended." });
      return;
    }

    const existingRegistration = await getLiveClassRegistration(request.user.id, liveClassId);
    if (!existingRegistration) {
      await ensureLiveClassRegistration(request.user.id, liveClassId);
      const formattedTime = new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(liveClass.scheduledAt));

      await notifyUser(
        request.user.id,
        "Live class seat confirmed",
        `You are registered for ${liveClass.title} on ${formattedTime}.`,
        "/live-classes",
      );

      await notifyUser(
        Number(liveClass.hostId),
        "New live class registration",
        `${request.user.name} saved a seat for ${liveClass.title}.`,
        "/live-classes",
      );
    }

    response.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post("/courses/:id/enroll", authRequired, async (request, response, next) => {
  try {
    const courseId = toInt(request.params.id);
    if (!courseId) {
      response.status(400).json({ message: "Invalid course id." });
      return;
    }

    const course = await getCourseRecord(courseId);
    if (!course || course.status !== "approved") {
      response.status(404).json({ message: "Only approved courses can be enrolled in." });
      return;
    }

    const pricing = await getCoursePricing(courseId);
    if (request.user.role === "student" && pricing.isPaid && !(await getPaidCoursePurchase(request.user.id, courseId))) {
      response.status(403).json({ message: "Purchase this course before enrolling in it." });
      return;
    }

    const enrollment = await getEnrollment(request.user.id, courseId);
    if (!enrollment) {
      await ensureEnrollment(request.user.id, courseId);
      await notifyUser(request.user.id, "Enrollment confirmed", `You are now enrolled in ${course.title}.`, "/#workspace");
      await notifyUser(Number(course.instructorId), "New enrollment", `${request.user.name} joined ${course.title}.`, "/#studio");
    }

    response.status(201).json(await getCourseDetail(courseId, request.user));
  } catch (error) {
    next(error);
  }
});

router.post("/lessons/:id/resume", authRequired, async (request, response, next) => {
  try {
    const lessonId = toInt(request.params.id);
    if (!lessonId) {
      response.status(400).json({ message: "Invalid lesson id." });
      return;
    }

    const lesson = await get(
      `
        SELECT l.id, l.course_id AS courseId, c.status, c.instructor_id AS instructorId
        FROM lessons l
        JOIN courses c ON c.id = l.course_id
        WHERE l.id = :lessonId
      `,
      { lessonId },
    );

    if (!lesson) {
      response.status(404).json({ message: "Lesson not found." });
      return;
    }

    const canManage = canManageCourse(request.user, lesson);
    if (!canManage && lesson.status !== "approved") {
      response.status(403).json({ message: "This lesson is not available yet." });
      return;
    }

    if (!canManage && !(await getEnrollment(request.user.id, Number(lesson.courseId)))) {
      response.status(403).json({ message: "Enroll in the course to save your place." });
      return;
    }

    if (!canManage) {
      await run(
        `
          UPDATE enrollments
          SET last_lesson_id = :lessonId
          WHERE user_id = :userId AND course_id = :courseId
        `,
        {
          lessonId,
          userId: request.user.id,
          courseId: Number(lesson.courseId),
        },
      );
    }

    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post("/lessons/:id/complete", authRequired, async (request, response, next) => {
  try {
    const lessonId = toInt(request.params.id);
    if (!lessonId) {
      response.status(400).json({ message: "Invalid lesson id." });
      return;
    }

    const lesson = await get(
      `
        SELECT l.id, l.title, l.course_id AS courseId, c.title AS courseTitle, c.status, c.instructor_id AS instructorId
        FROM lessons l
        JOIN courses c ON c.id = l.course_id
        WHERE l.id = :lessonId
      `,
      { lessonId },
    );

    if (!lesson) {
      response.status(404).json({ message: "Lesson not found." });
      return;
    }

    const canManage = canManageCourse(request.user, lesson);
    if (!canManage && lesson.status !== "approved") {
      response.status(403).json({ message: "This lesson is not available yet." });
      return;
    }

    if (!canManage && !(await getEnrollment(request.user.id, Number(lesson.courseId)))) {
      response.status(403).json({ message: "Enroll in the course to track lesson progress." });
      return;
    }

    if (!canManage) {
      await run(
        `
          INSERT INTO lesson_progress (user_id, course_id, lesson_id, completed_at)
          VALUES (:userId, :courseId, :lessonId, :completedAt)
          ON CONFLICT (user_id, lesson_id) DO NOTHING
        `,
        {
          userId: request.user.id,
          courseId: Number(lesson.courseId),
          lessonId,
          completedAt: nowIso(),
        },
      );

      await run(
        `
          UPDATE enrollments
          SET last_lesson_id = :lessonId
          WHERE user_id = :userId AND course_id = :courseId
        `,
        {
          lessonId,
          userId: request.user.id,
          courseId: Number(lesson.courseId),
        },
      );

      const courseDetail = await getCourseDetail(Number(lesson.courseId), request.user);
      if (courseDetail?.progress.progressPercent === 100) {
        await notifyUser(
          request.user.id,
          "Course completed",
          `You have completed every lesson in ${lesson.courseTitle}.`,
          "/#workspace",
        );
      }

      response.json(courseDetail);
      return;
    }

    response.json(await getCourseDetail(Number(lesson.courseId), request.user));
  } catch (error) {
    next(error);
  }
});

router.post("/quizzes/:id/submit", authRequired, async (request, response, next) => {
  try {
    const quizId = toInt(request.params.id);
    if (!quizId) {
      response.status(400).json({ message: "Invalid quiz id." });
      return;
    }

    const quiz = await get(
      `
        SELECT q.id, q.title, q.course_id AS courseId, c.status
        FROM quizzes q
        JOIN courses c ON c.id = q.course_id
        WHERE q.id = :quizId
      `,
      { quizId },
    );

    if (!quiz) {
      response.status(404).json({ message: "Quiz not found." });
      return;
    }

    const course = await getCourseRecord(Number(quiz.courseId));
    const canManage = canManageCourse(request.user, course);
    if (!canManage && quiz.status !== "approved") {
      response.status(403).json({ message: "This quiz is not available yet." });
      return;
    }

    if (!canManage && !(await getEnrollment(request.user.id, Number(quiz.courseId)))) {
      response.status(403).json({ message: "Enroll in the course to submit the quiz." });
      return;
    }

    const answers = request.body.answers && typeof request.body.answers === "object" ? request.body.answers : {};
    const questions = await all(
      `
        SELECT id, correct_option AS correctOption
        FROM questions
        WHERE quiz_id = :quizId
      `,
      { quizId },
    );

    if (questions.length === 0) {
      response.status(400).json({ message: "This quiz has no questions yet." });
      return;
    }

    const score = questions.reduce((total, question) => {
      const submittedAnswer = text(answers[String(question.id)] || answers[question.id]).toLowerCase();
      return total + (submittedAnswer === question.correctOption ? 1 : 0);
    }, 0);

    await run(
      `
        INSERT INTO quiz_attempts (user_id, quiz_id, score, total, answers_json, submitted_at)
        VALUES (:userId, :quizId, :score, :total, :answersJson, :submittedAt)
      `,
      {
        userId: request.user.id,
        quizId,
        score,
        total: questions.length,
        answersJson: JSON.stringify(answers),
        submittedAt: nowIso(),
      },
    );

    await notifyUser(
      request.user.id,
      "Quiz submitted",
      `You scored ${score}/${questions.length} in ${quiz.title}.`,
      "/#workspace",
    );

    response.json({
      result: {
        score,
        total: questions.length,
        percentage: Math.round((score / questions.length) * 100),
      },
      course: await getCourseDetail(Number(quiz.courseId), request.user),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
