const fs = require("fs");

const { DatabaseSync } = require("node:sqlite");

const { DB_PATH } = require("../src/config");
const { initializeDatabase, pool, isPostgres } = require("../src/db");
const { ensureStorageReady, isSupabaseStorage, migrateLocalAsset } = require("../src/storage");

const TABLES = ["users", "courses", "lessons", "enrollments", "lesson_progress", "quizzes", "questions", "quiz_attempts", "notifications"];

function readRows(sqlite, sql) {
  return sqlite.prepare(sql).all();
}

async function resetSequences(client) {
  for (const tableName of TABLES) {
    await client.query(
      `SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), COALESCE(MAX(id), 0) + 1, false) FROM ${tableName}`,
    );
  }
}

async function main() {
  if (!isPostgres || !pool) {
    throw new Error("Set DATABASE_PROVIDER=postgres and DATABASE_URL before running the cloud migration.");
  }

  if (!isSupabaseStorage) {
    throw new Error("Set STORAGE_PROVIDER=supabase plus your Supabase credentials before running the cloud migration.");
  }

  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Local SQLite database not found at ${DB_PATH}. Start the app once locally before migrating.`);
  }

  await initializeDatabase();
  await ensureStorageReady();

  const sqlite = new DatabaseSync(DB_PATH);
  sqlite.exec("PRAGMA foreign_keys = ON;");

  const client = await pool.connect();

  try {
    const users = readRows(sqlite, "SELECT id, name, email, password_hash, role, created_at FROM users ORDER BY id ASC");
    const courses = readRows(
      sqlite,
      "SELECT id, title, description, category, intro_text, instructor_id, status, created_at, updated_at FROM courses ORDER BY id ASC",
    );
    const lessons = readRows(
      sqlite,
      "SELECT id, course_id, title, summary, position, video_type, video_url, material_path, created_at FROM lessons ORDER BY id ASC",
    );
    const enrollments = readRows(
      sqlite,
      "SELECT id, user_id, course_id, enrolled_at, last_lesson_id FROM enrollments ORDER BY id ASC",
    );
    const lessonProgress = readRows(
      sqlite,
      "SELECT id, user_id, course_id, lesson_id, completed_at FROM lesson_progress ORDER BY id ASC",
    );
    const quizzes = readRows(sqlite, "SELECT id, course_id, title, instructions, created_at FROM quizzes ORDER BY id ASC");
    const questions = readRows(
      sqlite,
      "SELECT id, quiz_id, prompt, option_a, option_b, option_c, option_d, correct_option FROM questions ORDER BY id ASC",
    );
    const quizAttempts = readRows(
      sqlite,
      "SELECT id, user_id, quiz_id, score, total, answers_json, submitted_at FROM quiz_attempts ORDER BY id ASC",
    );
    const notifications = readRows(
      sqlite,
      "SELECT id, user_id, role_target, title, message, link, created_at, read_at FROM notifications ORDER BY id ASC",
    );

    await client.query("BEGIN");
    await client.query(
      "TRUNCATE TABLE notifications, quiz_attempts, questions, quizzes, lesson_progress, enrollments, lessons, courses, users RESTART IDENTITY CASCADE",
    );

    for (const row of users) {
      await client.query(
        `
          INSERT INTO users (id, name, email, password_hash, role, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [row.id, row.name, row.email, row.password_hash, row.role, row.created_at],
      );
    }

    for (const row of courses) {
      await client.query(
        `
          INSERT INTO courses (id, title, description, category, intro_text, instructor_id, status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [row.id, row.title, row.description, row.category, row.intro_text, row.instructor_id, row.status, row.created_at, row.updated_at],
      );
    }

    for (const row of lessons) {
      const videoUrl = row.video_type === "upload" ? await migrateLocalAsset(row.video_url, { kind: "video" }) : row.video_url;
      const materialPath = row.material_path ? await migrateLocalAsset(row.material_path, { kind: "material" }) : row.material_path;

      await client.query(
        `
          INSERT INTO lessons (id, course_id, title, summary, position, video_type, video_url, material_path, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [row.id, row.course_id, row.title, row.summary, row.position, row.video_type, videoUrl, materialPath, row.created_at],
      );
    }

    for (const row of enrollments) {
      await client.query(
        `
          INSERT INTO enrollments (id, user_id, course_id, enrolled_at, last_lesson_id)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [row.id, row.user_id, row.course_id, row.enrolled_at, row.last_lesson_id],
      );
    }

    for (const row of lessonProgress) {
      await client.query(
        `
          INSERT INTO lesson_progress (id, user_id, course_id, lesson_id, completed_at)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [row.id, row.user_id, row.course_id, row.lesson_id, row.completed_at],
      );
    }

    for (const row of quizzes) {
      await client.query(
        `
          INSERT INTO quizzes (id, course_id, title, instructions, created_at)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [row.id, row.course_id, row.title, row.instructions, row.created_at],
      );
    }

    for (const row of questions) {
      await client.query(
        `
          INSERT INTO questions (id, quiz_id, prompt, option_a, option_b, option_c, option_d, correct_option)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [row.id, row.quiz_id, row.prompt, row.option_a, row.option_b, row.option_c, row.option_d, row.correct_option],
      );
    }

    for (const row of quizAttempts) {
      await client.query(
        `
          INSERT INTO quiz_attempts (id, user_id, quiz_id, score, total, answers_json, submitted_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [row.id, row.user_id, row.quiz_id, row.score, row.total, row.answers_json, row.submitted_at],
      );
    }

    for (const row of notifications) {
      await client.query(
        `
          INSERT INTO notifications (id, user_id, role_target, title, message, link, created_at, read_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [row.id, row.user_id, row.role_target, row.title, row.message, row.link, row.created_at, row.read_at],
      );
    }

    await resetSequences(client);
    await client.query("COMMIT");

    console.log(
      `Migrated ${users.length} users, ${courses.length} courses, ${lessons.length} lessons, and ${notifications.length} notifications to cloud storage.`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    sqlite.close();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Cloud migration failed:", error);
  process.exit(1);
});
