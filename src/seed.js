const bcrypt = require("bcryptjs");

const { get, nowIso, run, withTransaction } = require("./db");

const demoUsers = {
  admin: {
    name: "Ava Admin",
    legacyName: "Ava Admin",
    role: "admin",
    email: "admin@gatematelearning.dev",
    legacyEmail: "admin@learnsphere.dev",
    password: "Admin@123",
  },
  instructor: {
    name: "Noah Instructor",
    legacyName: "Noah Instructor",
    role: "instructor",
    email: "instructor@gatematelearning.dev",
    legacyEmail: "instructor@learnsphere.dev",
    password: "Instructor@123",
  },
  student: {
    name: "Mia Student",
    legacyName: "Mia Student",
    role: "student",
    email: "student@gatematelearning.dev",
    legacyEmail: "student@learnsphere.dev",
    password: "Student@123",
  },
};

async function upsertDemoUser(config, createdAt) {
  const existing = await get(
    `
      SELECT id
      FROM users
      WHERE email = :email
         OR email = :legacyEmail
         OR (name = :name AND role = :role)
         OR (name = :legacyName AND role = :role)
      LIMIT 1
    `,
    {
      email: config.email,
      legacyEmail: config.legacyEmail,
      name: config.name,
      legacyName: config.legacyName,
      role: config.role,
    },
  );

  const passwordHash = bcrypt.hashSync(config.password, 10);

  if (existing) {
    await run(
      `
        UPDATE users
        SET name = :name,
            email = :email,
            password_hash = :passwordHash,
            role = :role
        WHERE id = :userId
      `,
      {
        name: config.name,
        email: config.email,
        passwordHash,
        role: config.role,
        userId: Number(existing.id),
      },
    );

    return Number(existing.id);
  }

  return Number(
    (
      await run(
        `
          INSERT INTO users (name, email, password_hash, role, created_at)
          VALUES (:name, :email, :passwordHash, :role, :createdAt)
        `,
        {
          name: config.name,
          email: config.email,
          passwordHash,
          role: config.role,
          createdAt,
        },
      )
    ).lastInsertRowid,
  );
}

async function upsertCourse({ title, legacyTitle, description, category, introText, instructorId, status, createdAt }) {
  const existing = await get(
    `
      SELECT id
      FROM courses
      WHERE title = :title
         OR title = :legacyTitle
      LIMIT 1
    `,
    { title, legacyTitle },
  );

  if (existing) {
    await run(
      `
        UPDATE courses
        SET title = :title,
            description = :description,
            category = :category,
            intro_text = :introText,
            instructor_id = :instructorId,
            status = :status,
            updated_at = :updatedAt
        WHERE id = :courseId
      `,
      {
        title,
        description,
        category,
        introText,
        instructorId,
        status,
        updatedAt: createdAt,
        courseId: Number(existing.id),
      },
    );

    return Number(existing.id);
  }

  return Number(
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
          instructorId,
          status,
          createdAt,
          updatedAt: createdAt,
        },
      )
    ).lastInsertRowid,
  );
}

async function upsertLesson({ courseId, position, title, summary, videoType, videoUrl, materialPath, createdAt }) {
  const existing = await get(
    `
      SELECT id
      FROM lessons
      WHERE course_id = :courseId AND position = :position
      LIMIT 1
    `,
    { courseId, position },
  );

  if (existing) {
    await run(
      `
        UPDATE lessons
        SET title = :title,
            summary = :summary,
            video_type = :videoType,
            video_url = :videoUrl,
            material_path = :materialPath
        WHERE id = :lessonId
      `,
      {
        title,
        summary,
        videoType,
        videoUrl,
        materialPath,
        lessonId: Number(existing.id),
      },
    );

    return Number(existing.id);
  }

  return Number(
    (
      await run(
        `
          INSERT INTO lessons (course_id, title, summary, position, video_type, video_url, material_path, created_at)
          VALUES (:courseId, :title, :summary, :position, :videoType, :videoUrl, :materialPath, :createdAt)
        `,
        {
          courseId,
          title,
          summary,
          position,
          videoType,
          videoUrl,
          materialPath,
          createdAt,
        },
      )
    ).lastInsertRowid,
  );
}

async function upsertQuiz({ courseId, title, instructions, questions, createdAt }) {
  const existing = await get("SELECT id FROM quizzes WHERE course_id = :courseId LIMIT 1", { courseId });

  let quizId = existing ? Number(existing.id) : 0;

  if (existing) {
    await run(
      `
        UPDATE quizzes
        SET title = :title,
            instructions = :instructions
        WHERE id = :quizId
      `,
      {
        title,
        instructions,
        quizId,
      },
    );

    await run("DELETE FROM questions WHERE quiz_id = :quizId", { quizId });
  } else {
    quizId = Number(
      (
        await run(
          `
            INSERT INTO quizzes (course_id, title, instructions, created_at)
            VALUES (:courseId, :title, :instructions, :createdAt)
          `,
          {
            courseId,
            title,
            instructions,
            createdAt,
          },
        )
      ).lastInsertRowid,
    );
  }

  for (const question of questions) {
    await run(
      `
        INSERT INTO questions (quiz_id, prompt, option_a, option_b, option_c, option_d, correct_option)
        VALUES (:quizId, :prompt, :optionA, :optionB, :optionC, :optionD, :correctOption)
      `,
      {
        quizId,
        prompt: question.prompt,
        optionA: question.optionA,
        optionB: question.optionB,
        optionC: question.optionC,
        optionD: question.optionD,
        correctOption: question.correctOption,
      },
    );
  }
}

async function upsertNotification({ userId, title, legacyTitle, message, link, createdAt }) {
  const existing = await get(
    `
      SELECT id
      FROM notifications
      WHERE user_id = :userId
        AND (title = :title OR title = :legacyTitle)
      LIMIT 1
    `,
    {
      userId,
      title,
      legacyTitle,
    },
  );

  if (existing) {
    await run(
      `
        UPDATE notifications
        SET title = :title,
            message = :message,
            link = :link
        WHERE id = :notificationId
      `,
      {
        title,
        message,
        link,
        notificationId: Number(existing.id),
      },
    );
    return;
  }

  await run(
    `
      INSERT INTO notifications (user_id, role_target, title, message, link, created_at)
      VALUES (:userId, NULL, :title, :message, :link, :createdAt)
    `,
    {
      userId,
      title,
      message,
      link,
      createdAt,
    },
  );
}

async function syncDemoContent() {
  const createdAt = nowIso();

  const adminId = await upsertDemoUser(demoUsers.admin, createdAt);
  const instructorId = await upsertDemoUser(demoUsers.instructor, createdAt);
  const studentId = await upsertDemoUser(demoUsers.student, createdAt);

  const generativeAiCourseId = await upsertCourse({
    title: "Generative AI Mastery",
    legacyTitle: "AI Foundations for Product Builders",
    description:
      "Learn prompting, LLM workflows, evaluation, AI agents, and real-world generative AI use cases through guided lessons.",
    category: "Generative AI",
    introText:
      "This demo course is perfect for testing enrollment, lesson progress, and quiz submission in Gatemate Learning.",
    instructorId,
    status: "approved",
    createdAt,
  });

  const cppCourseId = await upsertCourse({
    title: "C++ Programming and Problem Solving",
    legacyTitle: "Modern Web Studio",
    description:
      "Build strong C++ fundamentals with syntax, functions, arrays, STL basics, and problem-solving techniques used in coding interviews.",
    category: "C++",
    introText:
      "Use this demo track to explore how technical programming courses look inside the platform.",
    instructorId: adminId,
    status: "approved",
    createdAt,
  });

  const pendingCourseId = await upsertCourse({
    title: "DSA and STL Accelerator",
    legacyTitle: "Data Analytics Sprint",
    description:
      "A pending demo course for the admin approval flow, focused on data structures, STL patterns, and coding speed.",
    category: "Programming",
    introText:
      "Admins can approve or reject this course to test moderation, notifications, and review workflows.",
    instructorId,
    status: "pending",
    createdAt,
  });

  const aiLessonOneId = await upsertLesson({
    courseId: generativeAiCourseId,
    position: 1,
    title: "Introduction to Generative AI",
    summary:
      "Understand what generative AI is, how LLM-based products work, and where prompt-driven systems fit into modern software.",
    videoType: "external",
    videoUrl: "https://www.youtube.com/watch?v=2ePf9rue1Ao",
    materialPath: "",
    createdAt,
  });

  const aiLessonTwoId = await upsertLesson({
    courseId: generativeAiCourseId,
    position: 2,
    title: "Prompt Engineering and Evaluation",
    summary:
      "Learn to write better prompts, compare model outputs, and evaluate answer quality using repeatable criteria.",
    videoType: "external",
    videoUrl: "https://www.youtube.com/watch?v=5fK8S4Q6v3U",
    materialPath: "",
    createdAt,
  });

  await upsertLesson({
    courseId: cppCourseId,
    position: 1,
    title: "C++ Syntax, Variables, and Input Output",
    summary:
      "Start with basic syntax, data types, operators, and console input-output for beginner-friendly C++ programming.",
    videoType: "none",
    videoUrl: "",
    materialPath: "",
    createdAt,
  });

  await upsertLesson({
    courseId: cppCourseId,
    position: 2,
    title: "Functions, Arrays, and STL Basics",
    summary:
      "Move into reusable logic, arrays, vectors, and the STL tools that matter for contests and interview prep.",
    videoType: "none",
    videoUrl: "",
    materialPath: "",
    createdAt,
  });

  await upsertQuiz({
    courseId: generativeAiCourseId,
    title: "Generative AI Checkpoint",
    instructions: "Choose the best answer for each generative AI question.",
    createdAt,
    questions: [
      {
        prompt: "Which technology is most closely associated with text generation from prompts?",
        optionA: "Large language models",
        optionB: "Relational databases",
        optionC: "CSS preprocessors",
        optionD: "Package managers",
        correctOption: "a",
      },
      {
        prompt: "Why is prompt evaluation important in generative AI systems?",
        optionA: "It removes the need for testing",
        optionB: "It helps compare output quality and reliability",
        optionC: "It guarantees zero hallucinations",
        optionD: "It disables role-based access",
        correctOption: "b",
      },
    ],
  });

  const enrollment = await get(
    `
      SELECT id
      FROM enrollments
      WHERE user_id = :userId AND course_id = :courseId
      LIMIT 1
    `,
    {
      userId: studentId,
      courseId: generativeAiCourseId,
    },
  );

  if (enrollment) {
    await run(
      `
        UPDATE enrollments
        SET last_lesson_id = :lastLessonId
        WHERE id = :enrollmentId
      `,
      {
        lastLessonId: aiLessonTwoId,
        enrollmentId: Number(enrollment.id),
      },
    );
  } else {
    await run(
      `
        INSERT INTO enrollments (user_id, course_id, enrolled_at, last_lesson_id)
        VALUES (:userId, :courseId, :enrolledAt, :lastLessonId)
      `,
      {
        userId: studentId,
        courseId: generativeAiCourseId,
        enrolledAt: createdAt,
        lastLessonId: aiLessonTwoId,
      },
    );
  }

  await run(
    `
      INSERT INTO lesson_progress (user_id, course_id, lesson_id, completed_at)
      VALUES (:userId, :courseId, :lessonId, :completedAt)
      ON CONFLICT (user_id, lesson_id) DO NOTHING
    `,
    {
      userId: studentId,
      courseId: generativeAiCourseId,
      lessonId: aiLessonOneId,
      completedAt: createdAt,
    },
  );

  await upsertNotification({
    userId: studentId,
    title: "Welcome to Gatemate Learning",
    legacyTitle: "Welcome to LearnSphere",
    message:
      "Your demo learner account is enrolled in Generative AI Mastery so you can test progress tracking right away.",
    link: `/learn/${generativeAiCourseId}`,
    createdAt,
  });

  await upsertNotification({
    userId: instructorId,
    title: "Pending review",
    legacyTitle: "Pending review",
    message: "Your DSA and STL Accelerator course is waiting for admin approval.",
    link: `/studio/courses/${pendingCourseId}`,
    createdAt,
  });

  await upsertNotification({
    userId: adminId,
    title: "Approval queue ready",
    legacyTitle: "Approval queue ready",
    message: "A demo course is waiting in the moderation queue so you can test admin workflows.",
    link: "/admin",
    createdAt,
  });
}

async function seedDatabase() {
  await withTransaction(async () => {
    await syncDemoContent();
  });
}

module.exports = {
  seedDatabase,
};
