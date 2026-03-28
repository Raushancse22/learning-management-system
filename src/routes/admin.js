const express = require("express");

const { authRequired, getUserById, roleRequired } = require("../auth");
const { all, get, isRole, nowIso, run, text, toInt } = require("../db");
const { countAdmins, getCourseDetail, getCourseRecord, listCourseSummaries, notifyRole, notifyUser } = require("../services");

const router = express.Router();

router.get("/admin/users", authRequired, roleRequired("admin"), async (_request, response, next) => {
  try {
    const users = (
      await all(
        `
          SELECT
            u.id,
            u.name,
            u.email,
            u.role,
            u.created_at AS createdAt,
            (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) AS enrollmentsCount,
            (SELECT COUNT(*) FROM courses c WHERE c.instructor_id = u.id) AS coursesCount
          FROM users u
          ORDER BY u.created_at DESC
        `,
      )
    ).map((row) => ({
      id: Number(row.id),
      name: row.name,
      email: row.email,
      role: row.role,
      createdAt: row.createdAt,
      enrollmentsCount: Number(row.enrollmentsCount || 0),
      coursesCount: Number(row.coursesCount || 0),
    }));

    response.json({ users });
  } catch (error) {
    next(error);
  }
});

router.patch("/admin/users/:id", authRequired, roleRequired("admin"), async (request, response, next) => {
  try {
    const userId = toInt(request.params.id);
    const role = text(request.body.role).toLowerCase();

    if (!userId || !isRole(role)) {
      response.status(400).json({ message: "A valid user id and role are required." });
      return;
    }

    const targetUser = await getUserById(userId);
    if (!targetUser) {
      response.status(404).json({ message: "User not found." });
      return;
    }

    if (targetUser.role === "admin" && role !== "admin" && (await countAdmins()) <= 1) {
      response.status(400).json({ message: "At least one admin account must remain on the platform." });
      return;
    }

    await run("UPDATE users SET role = :role WHERE id = :userId", { role, userId });
    await notifyUser(userId, "Role updated", `Your account role has been updated to ${role}.`, "/#auth");
    response.json({ user: await getUserById(userId) });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/analytics", authRequired, roleRequired("admin"), async (request, response, next) => {
  try {
    const usersByRole = (
      await all(
        `
          SELECT role, COUNT(*) AS count
          FROM users
          GROUP BY role
          ORDER BY role ASC
        `,
      )
    ).map((row) => ({
      role: row.role,
      count: Number(row.count),
    }));

    const courseStatuses = (
      await all(
        `
          SELECT status, COUNT(*) AS count
          FROM courses
          GROUP BY status
          ORDER BY status ASC
        `,
      )
    ).map((row) => ({
      status: row.status,
      count: Number(row.count),
    }));

    const stats = {
      totalUsers: Number((await get("SELECT COUNT(*) AS count FROM users"))?.count || 0),
      totalCourses: Number((await get("SELECT COUNT(*) AS count FROM courses"))?.count || 0),
      approvedCourses: Number((await get("SELECT COUNT(*) AS count FROM courses WHERE status = 'approved'"))?.count || 0),
      pendingCourses: Number((await get("SELECT COUNT(*) AS count FROM courses WHERE status = 'pending'"))?.count || 0),
      totalEnrollments: Number((await get("SELECT COUNT(*) AS count FROM enrollments"))?.count || 0),
      completedLessons: Number((await get("SELECT COUNT(*) AS count FROM lesson_progress"))?.count || 0),
      quizAttempts: Number((await get("SELECT COUNT(*) AS count FROM quiz_attempts"))?.count || 0),
    };

    const pendingCourses = await listCourseSummaries({
      viewerId: request.user.id,
      whereClause: "c.status = 'pending'",
    });

    response.json({
      stats,
      usersByRole,
      courseStatuses,
      pendingCourses,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/admin/courses/:id/approval", authRequired, roleRequired("admin"), async (request, response, next) => {
  try {
    const courseId = toInt(request.params.id);
    const status = text(request.body.status).toLowerCase();

    if (!courseId || !["approved", "rejected"].includes(status)) {
      response.status(400).json({ message: "Choose either approved or rejected." });
      return;
    }

    const course = await getCourseRecord(courseId);
    if (!course) {
      response.status(404).json({ message: "Course not found." });
      return;
    }

    await run(
      `
        UPDATE courses
        SET status = :status,
            updated_at = :updatedAt
        WHERE id = :courseId
      `,
      {
        status,
        updatedAt: nowIso(),
        courseId,
      },
    );

    if (status === "approved") {
      await notifyUser(Number(course.instructorId), "Course approved", `"${course.title}" is now live for learners.`, "/#studio");
      await notifyRole("student", "New course available", `${course.title} has just been approved and published.`, "/#catalog");
    } else {
      await notifyUser(Number(course.instructorId), "Course rejected", `"${course.title}" needs more updates before it can be published.`, "/#studio");
    }

    response.json(await getCourseDetail(courseId, request.user));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
