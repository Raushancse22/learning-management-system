const express = require("express");

const { authRequired } = require("../auth");
const { run, get, all, text, toInt, nowIso } = require("../db");
const {
  buildDashboard,
  canManageCourse,
  ensureEnrollment,
  getCourseDetail,
  getCourseRecord,
  getEnrollment,
  notifyUser,
} = require("../services");

const router = express.Router();

router.get("/dashboard", authRequired, async (request, response, next) => {
  try {
    response.json(await buildDashboard(request.user));
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
