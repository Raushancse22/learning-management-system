const express = require("express");

const { authRequired, roleRequired } = require("../auth");
const { all, nowIso, run, text, toInt } = require("../db");
const {
  attachManagedCourse,
  attachManagedLesson,
  getCourseDetail,
  getCourseRecord,
  listCourseSummaries,
  notifyAdmins,
  notifyEnrolledLearners,
  notifyRole,
  parseQuestionPayload,
} = require("../services");
const { cleanupRequestFiles, upload } = require("../uploads");
const { persistUploadedFile, safeDeleteUpload } = require("../storage");

const router = express.Router();

router.get("/manage/courses", authRequired, roleRequired("instructor", "admin"), async (request, response, next) => {
  try {
    const courses =
      request.user.role === "admin"
        ? await listCourseSummaries({ viewerId: request.user.id, whereClause: "1 = 1" })
        : await listCourseSummaries({
            viewerId: request.user.id,
            whereClause: "c.instructor_id = :ownerId",
            params: { ownerId: request.user.id },
          });

    response.json({ courses });
  } catch (error) {
    next(error);
  }
});

router.post("/courses", authRequired, roleRequired("instructor", "admin"), async (request, response, next) => {
  try {
    const title = text(request.body.title);
    const description = text(request.body.description);
    const category = text(request.body.category);
    const introText = text(request.body.introText);

    if (!title || !description || !category) {
      response.status(400).json({ message: "Title, description, and category are required." });
      return;
    }

    const createdAt = nowIso();
    const status = request.user.role === "admin" ? "approved" : "pending";
    const courseId = Number(
      (
        await run(
          `
            INSERT INTO courses (title, description, category, intro_text, instructor_id, status, created_at, updated_at)
            VALUES (:title, :description, :category, :introText, :instructorId, :status, :createdAt, :updatedAt)
          `,
          {
            title,
            description,
            category,
            introText,
            instructorId: request.user.id,
            status,
            createdAt,
            updatedAt: createdAt,
          },
        )
      ).lastInsertRowid,
    );

    if (status === "pending") {
      await notifyAdmins("Course approval requested", `${request.user.name} submitted "${title}" for approval.`, "/#admin");
    } else {
      await notifyRole("student", "New course available", `${title} is now live in the course catalog.`, "/#catalog");
    }

    response.status(201).json(await getCourseDetail(courseId, request.user));
  } catch (error) {
    next(error);
  }
});

router.put("/courses/:id", authRequired, roleRequired("instructor", "admin"), attachManagedCourse("id"), async (request, response, next) => {
  try {
    const title = text(request.body.title);
    const description = text(request.body.description);
    const category = text(request.body.category);
    const introText = text(request.body.introText);

    if (!title || !description || !category) {
      response.status(400).json({ message: "Title, description, and category are required." });
      return;
    }

    const status = request.user.role === "admin" ? request.course.status : "pending";

    await run(
      `
        UPDATE courses
        SET title = :title,
            description = :description,
            category = :category,
            intro_text = :introText,
            status = :status,
            updated_at = :updatedAt
        WHERE id = :courseId
      `,
      {
        title,
        description,
        category,
        introText,
        status,
        updatedAt: nowIso(),
        courseId: Number(request.course.id),
      },
    );

    if (request.user.role === "instructor") {
      await notifyAdmins("Course updated", `${request.user.name} updated "${title}" and it is ready for review again.`, "/#admin");
    }

    response.json(await getCourseDetail(Number(request.course.id), request.user));
  } catch (error) {
    next(error);
  }
});

router.delete("/courses/:id", authRequired, roleRequired("instructor", "admin"), attachManagedCourse("id"), async (request, response, next) => {
  try {
    const assets = await all(
      `
        SELECT video_url AS videoUrl, material_path AS materialPath
        FROM lessons
        WHERE course_id = :courseId
      `,
      { courseId: Number(request.course.id) },
    );

    await run("DELETE FROM courses WHERE id = :courseId", { courseId: Number(request.course.id) });
    for (const asset of assets) {
      await safeDeleteUpload(asset.videoUrl);
      await safeDeleteUpload(asset.materialPath);
    }

    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/courses/:courseId/lessons",
  authRequired,
  roleRequired("instructor", "admin"),
  attachManagedCourse("courseId"),
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "materialFile", maxCount: 1 },
  ]),
  async (request, response, next) => {
    try {
      const title = text(request.body.title);
      const summary = text(request.body.summary);
      const position = toInt(request.body.position) || 1;
      const externalVideoUrl = text(request.body.videoUrl);
      const uploadedVideo = request.files?.videoFile?.[0];
      const uploadedMaterial = request.files?.materialFile?.[0];

      if (!title) {
        cleanupRequestFiles(request);
        response.status(400).json({ message: "Lesson title is required." });
        return;
      }

      const videoType = uploadedVideo ? "upload" : externalVideoUrl ? "external" : "none";
      const videoUrl = uploadedVideo ? await persistUploadedFile(uploadedVideo, { kind: "video" }) : externalVideoUrl;
      const materialPath = uploadedMaterial ? await persistUploadedFile(uploadedMaterial, { kind: "material" }) : "";

      await run(
        `
          INSERT INTO lessons (course_id, title, summary, position, video_type, video_url, material_path, created_at)
          VALUES (:courseId, :title, :summary, :position, :videoType, :videoUrl, :materialPath, :createdAt)
        `,
        {
          courseId: Number(request.course.id),
          title,
          summary,
          position,
          videoType,
          videoUrl,
          materialPath,
          createdAt: nowIso(),
        },
      );

      const course = await getCourseRecord(Number(request.course.id));
      if (course.status === "approved") {
        await notifyEnrolledLearners(
          Number(request.course.id),
          "New lesson added",
          `${title} was added to ${course.title}.`,
          "/#workspace",
        );
      }

      response.status(201).json(await getCourseDetail(Number(request.course.id), request.user));
    } catch (error) {
      cleanupRequestFiles(request);
      next(error);
    }
  },
);

router.put(
  "/lessons/:id",
  authRequired,
  roleRequired("instructor", "admin"),
  attachManagedLesson,
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "materialFile", maxCount: 1 },
  ]),
  async (request, response, next) => {
    try {
      const title = text(request.body.title) || request.lesson.title;
      const summary = text(request.body.summary);
      const position = toInt(request.body.position) || 1;
      const externalVideoUrl = text(request.body.videoUrl);
      const uploadedVideo = request.files?.videoFile?.[0];
      const uploadedMaterial = request.files?.materialFile?.[0];

      let nextVideoType = request.lesson.videoType || "none";
      let nextVideoUrl = request.lesson.videoUrl || "";
      if (uploadedVideo) {
        nextVideoType = "upload";
        nextVideoUrl = await persistUploadedFile(uploadedVideo, { kind: "video" });
      } else if (externalVideoUrl) {
        nextVideoType = "external";
        nextVideoUrl = externalVideoUrl;
      } else if (!nextVideoUrl) {
        nextVideoType = "none";
      }

      const nextMaterialPath = uploadedMaterial
        ? await persistUploadedFile(uploadedMaterial, { kind: "material" })
        : request.lesson.materialPath || "";

      if (request.lesson.videoType === "upload" && request.lesson.videoUrl && (uploadedVideo || externalVideoUrl)) {
        await safeDeleteUpload(request.lesson.videoUrl);
      }
      if (uploadedMaterial && request.lesson.materialPath) {
        await safeDeleteUpload(request.lesson.materialPath);
      }

      await run(
        `
          UPDATE lessons
          SET title = :title,
              summary = :summary,
              position = :position,
              video_type = :videoType,
              video_url = :videoUrl,
              material_path = :materialPath
          WHERE id = :lessonId
        `,
        {
          title,
          summary,
          position,
          videoType: nextVideoType,
          videoUrl: nextVideoUrl,
          materialPath: nextMaterialPath,
          lessonId: Number(request.lesson.id),
        },
      );

      response.json(await getCourseDetail(Number(request.lesson.courseId), request.user));
    } catch (error) {
      cleanupRequestFiles(request);
      next(error);
    }
  },
);

router.delete("/lessons/:id", authRequired, roleRequired("instructor", "admin"), attachManagedLesson, async (request, response, next) => {
  try {
    await safeDeleteUpload(request.lesson.videoUrl);
    await safeDeleteUpload(request.lesson.materialPath);
    await run("DELETE FROM lessons WHERE id = :lessonId", { lessonId: Number(request.lesson.id) });
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post("/courses/:courseId/quizzes", authRequired, roleRequired("instructor", "admin"), attachManagedCourse("courseId"), async (request, response, next) => {
  try {
    const title = text(request.body.title);
    const instructions = text(request.body.instructions);
    const questions = parseQuestionPayload(request.body.questions);

    if (!title) {
      response.status(400).json({ message: "Quiz title is required." });
      return;
    }

    if (questions.length === 0) {
      response.status(400).json({ message: "Add at least one valid multiple-choice question." });
      return;
    }

    await run("DELETE FROM quizzes WHERE course_id = :courseId", { courseId: Number(request.course.id) });
    const quizId = Number(
      (
        await run(
          `
            INSERT INTO quizzes (course_id, title, instructions, created_at)
            VALUES (:courseId, :title, :instructions, :createdAt)
          `,
          {
            courseId: Number(request.course.id),
            title,
            instructions,
            createdAt: nowIso(),
          },
        )
      ).lastInsertRowid,
    );

    for (const question of questions) {
      await run(
        `
          INSERT INTO questions (quiz_id, prompt, option_a, option_b, option_c, option_d, correct_option)
          VALUES (:quizId, :prompt, :optionA, :optionB, :optionC, :optionD, :correctOption)
        `,
        {
          quizId,
          prompt: question.prompt,
          optionA: question.options.a,
          optionB: question.options.b,
          optionC: question.options.c,
          optionD: question.options.d,
          correctOption: question.correctOption,
        },
      );
    }

    response.status(201).json(await getCourseDetail(Number(request.course.id), request.user));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
