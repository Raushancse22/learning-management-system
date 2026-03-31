const { all, get, run, nowIso, toInt, text } = require("./db");

async function createNotification({ userId = null, roleTarget = null, title, message, link = "" }) {
  await run(
    `
      INSERT INTO notifications (user_id, role_target, title, message, link, created_at)
      VALUES (:userId, :roleTarget, :title, :message, :link, :createdAt)
    `,
    {
      userId,
      roleTarget,
      title: text(title),
      message: text(message),
      link: text(link),
      createdAt: nowIso(),
    },
  );
}

async function notifyAdmins(title, message, link = "") {
  await createNotification({ roleTarget: "admin", title, message, link });
}

async function notifyRole(roleTarget, title, message, link = "") {
  await createNotification({ roleTarget, title, message, link });
}

async function notifyUser(userId, title, message, link = "") {
  await createNotification({ userId, title, message, link });
}

async function notifyEnrolledLearners(courseId, title, message, link = "") {
  const learners = await all(
    `
      SELECT DISTINCT user_id AS userId
      FROM enrollments
      WHERE course_id = :courseId
    `,
    { courseId },
  );

  for (const learner of learners) {
    await notifyUser(Number(learner.userId), title, message, link);
  }
}

async function notifyLiveClassRegistrants(liveClassId, title, message, link = "") {
  const attendees = await all(
    `
      SELECT DISTINCT user_id AS userId
      FROM live_class_registrations
      WHERE live_class_id = :liveClassId
    `,
    { liveClassId },
  );

  for (const attendee of attendees) {
    await notifyUser(Number(attendee.userId), title, message, link);
  }
}

async function countAdmins() {
  const row = await get(
    `
      SELECT COUNT(*) AS count
      FROM users
      WHERE role = 'admin'
    `,
  );

  return Number(row?.count || 0);
}

function mapCourseSummary(row) {
  const lessonCount = Number(row.lessonCount || 0);
  const completedLessons = Number(row.completedLessons || 0);
  const progressPercent = lessonCount > 0 ? Math.round((completedLessons / lessonCount) * 100) : 0;

  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    category: row.category,
    introText: row.introText || "",
    status: row.status,
    instructorId: Number(row.instructorId),
    instructorName: row.instructorName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lessonCount,
    completedLessons,
    progressPercent,
    enrollmentCount: Number(row.enrollmentCount || 0),
    quizCount: Number(row.quizCount || 0),
    isEnrolled: Boolean(row.isEnrolled),
    lastLessonId: row.lastLessonId ? Number(row.lastLessonId) : null,
  };
}

async function listCourseSummaries({ viewerId = 0, whereClause = "1 = 1", params = {}, orderBy = "c.updated_at DESC" } = {}) {
  const rows = await all(
    `
      SELECT
        c.id,
        c.title,
        c.description,
        c.category,
        c.intro_text AS introText,
        c.status,
        c.instructor_id AS instructorId,
        c.created_at AS createdAt,
        c.updated_at AS updatedAt,
        u.name AS instructorName,
        (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lessonCount,
        (SELECT COUNT(*) FROM lesson_progress lp WHERE lp.course_id = c.id AND lp.user_id = :viewerId) AS completedLessons,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollmentCount,
        (SELECT COUNT(*) FROM quizzes q WHERE q.course_id = c.id) AS quizCount,
        EXISTS(SELECT 1 FROM enrollments e2 WHERE e2.course_id = c.id AND e2.user_id = :viewerId) AS isEnrolled,
        (SELECT e3.last_lesson_id FROM enrollments e3 WHERE e3.course_id = c.id AND e3.user_id = :viewerId) AS lastLessonId
      FROM courses c
      JOIN users u ON u.id = c.instructor_id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
    `,
    { viewerId, ...params },
  );

  return rows.map(mapCourseSummary);
}

async function getCourseRecord(courseId) {
  return get(
    `
      SELECT
        id,
        title,
        description,
        category,
        intro_text AS introText,
        instructor_id AS instructorId,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM courses
      WHERE id = :courseId
    `,
    { courseId },
  );
}

function canManageCourse(user, course) {
  return Boolean(user) && (user.role === "admin" || Number(course.instructorId) === Number(user.id));
}

function canManageLiveClass(user, liveClass) {
  return Boolean(user) && (user.role === "admin" || Number(liveClass.hostId) === Number(user.id));
}

function getLiveClassState(scheduledAt, durationMinutes = 60) {
  const startAt = new Date(scheduledAt);
  if (Number.isNaN(startAt.getTime())) {
    return "upcoming";
  }

  const safeDuration = Math.max(Number(durationMinutes || 60), 15);
  const endAt = new Date(startAt.getTime() + safeDuration * 60 * 1000);
  const now = Date.now();

  if (now >= endAt.getTime()) {
    return "completed";
  }

  if (now >= startAt.getTime()) {
    return "live";
  }

  return "upcoming";
}

function mapLiveClassSummary(row, user = null) {
  const durationMinutes = Math.max(Number(row.durationMinutes || 60), 15);
  const canManage = canManageLiveClass(user, row);
  const isRegistered = Boolean(row.isRegistered);

  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    category: row.category,
    hostId: Number(row.hostId),
    hostName: row.hostName,
    scheduledAt: row.scheduledAt,
    durationMinutes,
    attendeeCount: Number(row.attendeeCount || 0),
    isRegistered,
    canManage,
    meetingUrl: canManage || isRegistered ? row.meetingUrl : "",
    sessionState: getLiveClassState(row.scheduledAt, durationMinutes),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function listLiveClasses({ viewerId = 0, user = null, whereClause = "1 = 1", params = {} } = {}) {
  const rows = await all(
    `
      SELECT
        lc.id,
        lc.title,
        lc.description,
        lc.category,
        lc.host_id AS hostId,
        lc.meeting_url AS meetingUrl,
        lc.scheduled_at AS scheduledAt,
        lc.duration_minutes AS durationMinutes,
        lc.created_at AS createdAt,
        lc.updated_at AS updatedAt,
        u.name AS hostName,
        EXISTS(
          SELECT 1
          FROM live_class_registrations lcr
          WHERE lcr.live_class_id = lc.id AND lcr.user_id = :viewerId
        ) AS isRegistered,
        (
          SELECT COUNT(*)
          FROM live_class_registrations lcr2
          WHERE lcr2.live_class_id = lc.id
        ) AS attendeeCount
      FROM live_classes lc
      JOIN users u ON u.id = lc.host_id
      WHERE ${whereClause}
    `,
    { viewerId, ...params },
  );

  const sessions = rows.map((row) => mapLiveClassSummary(row, user));
  const stateOrder = { live: 0, upcoming: 1, completed: 2 };

  return sessions.sort((left, right) => {
    const stateDelta = (stateOrder[left.sessionState] ?? 9) - (stateOrder[right.sessionState] ?? 9);
    if (stateDelta !== 0) {
      return stateDelta;
    }

    const leftTime = new Date(left.scheduledAt).getTime();
    const rightTime = new Date(right.scheduledAt).getTime();
    if (left.sessionState === "completed" && right.sessionState === "completed") {
      return rightTime - leftTime;
    }

    return leftTime - rightTime;
  });
}

async function getLiveClassRecord(liveClassId) {
  return get(
    `
      SELECT
        lc.id,
        lc.title,
        lc.description,
        lc.category,
        lc.host_id AS hostId,
        lc.meeting_url AS meetingUrl,
        lc.scheduled_at AS scheduledAt,
        lc.duration_minutes AS durationMinutes,
        lc.created_at AS createdAt,
        lc.updated_at AS updatedAt,
        u.name AS hostName
      FROM live_classes lc
      JOIN users u ON u.id = lc.host_id
      WHERE lc.id = :liveClassId
    `,
    { liveClassId },
  );
}

async function getLiveClassRegistration(userId, liveClassId) {
  return get(
    `
      SELECT id, live_class_id AS liveClassId, user_id AS userId, registered_at AS registeredAt
      FROM live_class_registrations
      WHERE user_id = :userId AND live_class_id = :liveClassId
    `,
    { userId, liveClassId },
  );
}

async function ensureLiveClassRegistration(userId, liveClassId) {
  let registration = await getLiveClassRegistration(userId, liveClassId);
  if (!registration) {
    await run(
      `
        INSERT INTO live_class_registrations (live_class_id, user_id, registered_at)
        VALUES (:liveClassId, :userId, :registeredAt)
      `,
      {
        liveClassId,
        userId,
        registeredAt: nowIso(),
      },
    );
    registration = await getLiveClassRegistration(userId, liveClassId);
  }

  return registration;
}

async function getEnrollment(userId, courseId) {
  return get(
    `
      SELECT id, user_id AS userId, course_id AS courseId, enrolled_at AS enrolledAt, last_lesson_id AS lastLessonId
      FROM enrollments
      WHERE user_id = :userId AND course_id = :courseId
    `,
    { userId, courseId },
  );
}

async function ensureEnrollment(userId, courseId) {
  let enrollment = await getEnrollment(userId, courseId);
  if (!enrollment) {
    await run(
      `
        INSERT INTO enrollments (user_id, course_id, enrolled_at, last_lesson_id)
        VALUES (:userId, :courseId, :enrolledAt, NULL)
      `,
      {
        userId,
        courseId,
        enrolledAt: nowIso(),
      },
    );
    enrollment = await getEnrollment(userId, courseId);
  }

  return enrollment;
}

async function getCompletedLessonIds(userId, courseId) {
  if (!userId) {
    return [];
  }

  return (
    await all(
      `
        SELECT lesson_id AS lessonId
        FROM lesson_progress
        WHERE user_id = :userId AND course_id = :courseId
      `,
      { userId, courseId },
    )
  ).map((row) => Number(row.lessonId));
}

async function getLatestQuizAttempt(userId, quizId) {
  if (!userId || !quizId) {
    return null;
  }

  const row = await get(
    `
      SELECT score, total, submitted_at AS submittedAt
      FROM quiz_attempts
      WHERE user_id = :userId AND quiz_id = :quizId
      ORDER BY submitted_at DESC
      LIMIT 1
    `,
    { userId, quizId },
  );

  if (!row) {
    return null;
  }

  return {
    score: Number(row.score),
    total: Number(row.total),
    submittedAt: row.submittedAt,
    percentage: row.total ? Math.round((Number(row.score) / Number(row.total)) * 100) : 0,
  };
}

async function getNotificationsForUser(user) {
  if (!user) {
    return [];
  }

  return (
    await all(
      `
        SELECT id, title, message, link, created_at AS createdAt, read_at AS readAt
        FROM notifications
        WHERE user_id = :userId
           OR role_target = :role
           OR role_target = 'all'
        ORDER BY created_at DESC
        LIMIT 8
      `,
      {
        userId: user.id,
        role: user.role,
      },
    )
  ).map((row) => ({
    id: Number(row.id),
    title: row.title,
    message: row.message,
    link: row.link,
    createdAt: row.createdAt,
    readAt: row.readAt,
  }));
}

async function calculateStreak(userId) {
  const days = (
    await all(
      `
        SELECT DISTINCT substr(completed_at, 1, 10) AS day
        FROM lesson_progress
        WHERE user_id = :userId
        ORDER BY day DESC
      `,
      { userId },
    )
  ).map((row) => row.day);

  if (days.length === 0) {
    return 0;
  }

  let streak = 0;
  let cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);

  for (const day of days) {
    const currentDay = cursor.toISOString().slice(0, 10);
    if (day === currentDay) {
      streak += 1;
      cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
      continue;
    }

    if (streak === 0) {
      cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
      const previousDay = cursor.toISOString().slice(0, 10);
      if (day === previousDay) {
        streak += 1;
        cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
        continue;
      }
    }

    break;
  }

  return streak;
}

async function buildDashboard(user) {
  if (user.role === "student") {
    const enrolledCourses = await listCourseSummaries({
      viewerId: user.id,
      whereClause: "EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.user_id = :userId)",
      params: { userId: user.id },
    });

    const completedLessonsRow = await get("SELECT COUNT(*) AS count FROM lesson_progress WHERE user_id = :userId", { userId: user.id });
    const averageScoreRow = await get("SELECT AVG((score * 100.0) / total) AS averageScore FROM quiz_attempts WHERE user_id = :userId", {
      userId: user.id,
    });
    const recentAttempts = (
      await all(
        `
          SELECT qa.score, qa.total, qa.submitted_at AS submittedAt, q.title AS quizTitle, c.title AS courseTitle
          FROM quiz_attempts qa
          JOIN quizzes q ON q.id = qa.quiz_id
          JOIN courses c ON c.id = q.course_id
          WHERE qa.user_id = :userId
          ORDER BY qa.submitted_at DESC
          LIMIT 5
        `,
        { userId: user.id },
      )
    ).map((row) => ({
      score: Number(row.score),
      total: Number(row.total),
      percentage: row.total ? Math.round((Number(row.score) / Number(row.total)) * 100) : 0,
      submittedAt: row.submittedAt,
      quizTitle: row.quizTitle,
      courseTitle: row.courseTitle,
    }));

    return {
      role: "student",
      stats: {
        enrolledCourses: enrolledCourses.length,
        completedLessons: Number(completedLessonsRow?.count || 0),
        averageScore: Math.round(Number(averageScoreRow?.averageScore || 0)),
        streak: await calculateStreak(user.id),
      },
      courses: enrolledCourses,
      recentAttempts,
      notifications: await getNotificationsForUser(user),
    };
  }

  if (user.role === "instructor") {
    const myCourses = await listCourseSummaries({
      viewerId: user.id,
      whereClause: "c.instructor_id = :ownerId",
      params: { ownerId: user.id },
    });
    const learnersRow = await get(
      "SELECT COUNT(*) AS count FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE c.instructor_id = :ownerId",
      { ownerId: user.id },
    );
    const lessonsRow = await get(
      "SELECT COUNT(*) AS count FROM lessons l JOIN courses c ON c.id = l.course_id WHERE c.instructor_id = :ownerId",
      { ownerId: user.id },
    );
    const recentEnrollments = await all(
      `
        SELECT u.name AS studentName, c.title AS courseTitle, e.enrolled_at AS enrolledAt
        FROM enrollments e
        JOIN users u ON u.id = e.user_id
        JOIN courses c ON c.id = e.course_id
        WHERE c.instructor_id = :ownerId
        ORDER BY e.enrolled_at DESC
        LIMIT 5
      `,
      { ownerId: user.id },
    );

    return {
      role: "instructor",
      stats: {
        totalCourses: myCourses.length,
        approvedCourses: myCourses.filter((course) => course.status === "approved").length,
        pendingCourses: myCourses.filter((course) => course.status === "pending").length,
        learners: Number(learnersRow?.count || 0),
        lessons: Number(lessonsRow?.count || 0),
      },
      courses: myCourses,
      recentEnrollments,
      notifications: await getNotificationsForUser(user),
    };
  }

  const usersRow = await get("SELECT COUNT(*) AS count FROM users");
  const coursesRow = await get("SELECT COUNT(*) AS count FROM courses");
  const pendingCoursesRow = await get("SELECT COUNT(*) AS count FROM courses WHERE status = 'pending'");
  const enrollmentsRow = await get("SELECT COUNT(*) AS count FROM enrollments");
  const recentUsers = await all("SELECT id, name, email, role, created_at AS createdAt FROM users ORDER BY created_at DESC LIMIT 6");
  const pendingCourses = await listCourseSummaries({ viewerId: user.id, whereClause: "c.status = 'pending'" });

  return {
    role: "admin",
    stats: {
      totalUsers: Number(usersRow?.count || 0),
      totalCourses: Number(coursesRow?.count || 0),
      pendingCourses: Number(pendingCoursesRow?.count || 0),
      enrollments: Number(enrollmentsRow?.count || 0),
    },
    recentUsers: recentUsers.map((row) => ({ ...row, id: Number(row.id) })),
    pendingCourses,
    notifications: await getNotificationsForUser(user),
  };
}

async function getCourseDetail(courseId, user) {
  const viewerId = user?.id || 0;
  const summary = (
    await listCourseSummaries({
      viewerId,
      whereClause: "c.id = :courseId",
      params: { courseId },
    })
  )[0];

  if (!summary) {
    return null;
  }

  const canManage = canManageCourse(user, summary);
  if (summary.status !== "approved" && !canManage) {
    return null;
  }

  const lessons = (
    await all(
      `
        SELECT id, course_id AS courseId, title, summary, position, video_type AS videoType, video_url AS videoUrl, material_path AS materialPath, created_at AS createdAt
        FROM lessons
        WHERE course_id = :courseId
        ORDER BY position ASC, id ASC
      `,
      { courseId },
    )
  ).map((row) => ({
    id: Number(row.id),
    courseId: Number(row.courseId),
    title: row.title,
    summary: row.summary,
    position: Number(row.position),
    videoType: row.videoType,
    videoUrl: row.videoUrl,
    materialPath: row.materialPath,
    createdAt: row.createdAt,
  }));

  const completedLessonIds = user ? await getCompletedLessonIds(user.id, courseId) : [];
  const enrollment = user ? await getEnrollment(user.id, courseId) : null;
  const nextLesson = lessons.find((lesson) => !completedLessonIds.includes(lesson.id));
  const quizRow = await get("SELECT id, title, instructions, created_at AS createdAt FROM quizzes WHERE course_id = :courseId", { courseId });

  let quiz = null;
  if (quizRow) {
    const includeAnswers = canManage;
    const questions = (
      await all(
        `
          SELECT id, prompt, option_a AS optionA, option_b AS optionB, option_c AS optionC, option_d AS optionD, correct_option AS correctOption
          FROM questions
          WHERE quiz_id = :quizId
          ORDER BY id ASC
        `,
        { quizId: quizRow.id },
      )
    ).map((row) => ({
      id: Number(row.id),
      prompt: row.prompt,
      options: {
        a: row.optionA,
        b: row.optionB,
        c: row.optionC,
        d: row.optionD,
      },
      ...(includeAnswers ? { correctOption: row.correctOption } : {}),
    }));

    quiz = {
      id: Number(quizRow.id),
      title: quizRow.title,
      instructions: quizRow.instructions,
      createdAt: quizRow.createdAt,
      questions,
      latestAttempt: user ? await getLatestQuizAttempt(user.id, Number(quizRow.id)) : null,
    };
  }

  return {
    course: {
      ...summary,
      canManage,
      canApprove: Boolean(user && user.role === "admin"),
    },
    lessons,
    progress: {
      completedLessonIds,
      lastLessonId: enrollment?.lastLessonId ? Number(enrollment.lastLessonId) : null,
      nextLessonId: nextLesson ? nextLesson.id : null,
      progressPercent: summary.progressPercent,
      totalLessons: summary.lessonCount,
    },
    quiz,
  };
}

function parseQuestionPayload(rawQuestions) {
  const parsed = Array.isArray(rawQuestions)
    ? rawQuestions
    : (() => {
        if (typeof rawQuestions !== "string") {
          return [];
        }
        try {
          return JSON.parse(rawQuestions);
        } catch {
          return [];
        }
      })();

  return parsed
    .map((question) => ({
      prompt: text(question.prompt),
      options: {
        a: text(question.options?.a || question.optionA),
        b: text(question.options?.b || question.optionB),
        c: text(question.options?.c || question.optionC),
        d: text(question.options?.d || question.optionD),
      },
      correctOption: text(question.correctOption).toLowerCase(),
    }))
    .filter(
      (question) =>
        question.prompt &&
        question.options.a &&
        question.options.b &&
        question.options.c &&
        question.options.d &&
        ["a", "b", "c", "d"].includes(question.correctOption),
    );
}

function attachManagedCourse(paramName = "id") {
  return async (request, response, next) => {
    try {
      const courseId = toInt(request.params[paramName]);
      if (!courseId) {
        response.status(400).json({ message: "Invalid course id." });
        return;
      }

      const course = await getCourseRecord(courseId);
      if (!course) {
        response.status(404).json({ message: "Course not found." });
        return;
      }

      if (!canManageCourse(request.user, course)) {
        response.status(403).json({ message: "Only the course owner or admin can do that." });
        return;
      }

      request.course = course;
      next();
    } catch (error) {
      next(error);
    }
  };
}

function attachManagedLiveClass(paramName = "id") {
  return async (request, response, next) => {
    try {
      const liveClassId = toInt(request.params[paramName]);
      if (!liveClassId) {
        response.status(400).json({ message: "Invalid live class id." });
        return;
      }

      const liveClass = await getLiveClassRecord(liveClassId);
      if (!liveClass) {
        response.status(404).json({ message: "Live class not found." });
        return;
      }

      if (!canManageLiveClass(request.user, liveClass)) {
        response.status(403).json({ message: "Only the session host or admin can do that." });
        return;
      }

      request.liveClass = liveClass;
      next();
    } catch (error) {
      next(error);
    }
  };
}

async function attachManagedLesson(request, response, next) {
  try {
    const lessonId = toInt(request.params.id);
    if (!lessonId) {
      response.status(400).json({ message: "Invalid lesson id." });
      return;
    }

    const lesson = await get(
      `
        SELECT l.id, l.course_id AS courseId, l.title, l.video_type AS videoType, l.video_url AS videoUrl, l.material_path AS materialPath, c.instructor_id AS instructorId, c.status
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

    if (!canManageCourse(request.user, lesson)) {
      response.status(403).json({ message: "Only the course owner or admin can do that." });
      return;
    }

    request.lesson = lesson;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createNotification,
  notifyAdmins,
  notifyRole,
  notifyUser,
  notifyEnrolledLearners,
  notifyLiveClassRegistrants,
  countAdmins,
  mapCourseSummary,
  listCourseSummaries,
  getCourseRecord,
  canManageCourse,
  canManageLiveClass,
  getLiveClassState,
  mapLiveClassSummary,
  listLiveClasses,
  getLiveClassRecord,
  getLiveClassRegistration,
  ensureLiveClassRegistration,
  getEnrollment,
  ensureEnrollment,
  getCompletedLessonIds,
  getLatestQuizAttempt,
  getNotificationsForUser,
  buildDashboard,
  getCourseDetail,
  parseQuestionPayload,
  attachManagedCourse,
  attachManagedLiveClass,
  attachManagedLesson,
};
