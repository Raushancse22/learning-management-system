const bcrypt = require("bcryptjs");
const express = require("express");

const { authOptional, clearAuthCookie, publicUser, sendAuthCookie } = require("../auth");
const { all, get, isRole, lowerEmail, nowIso, run, text, toInt } = require("../db");
const { getCourseDetail, listCourseSummaries, notifyAdmins } = require("../services");

const router = express.Router();

router.post("/auth/register", async (request, response, next) => {
  try {
    const name = text(request.body.name);
    const email = lowerEmail(request.body.email);
    const password = text(request.body.password);
    const role = text(request.body.role).toLowerCase();

    if (!name || !email || !password || !isRole(role)) {
      response.status(400).json({ message: "Name, email, password, and role are required." });
      return;
    }

    if (password.length < 6) {
      response.status(400).json({ message: "Password must be at least 6 characters long." });
      return;
    }

    const existingUser = await get("SELECT id FROM users WHERE email = :email", { email });
    if (existingUser) {
      response.status(409).json({ message: "That email is already registered." });
      return;
    }

    const newUserId = Number(
      (
        await run(
          `
            INSERT INTO users (name, email, password_hash, role, created_at)
            VALUES (:name, :email, :passwordHash, :role, :createdAt)
          `,
          {
            name,
            email,
            passwordHash: bcrypt.hashSync(password, 10),
            role,
            createdAt: nowIso(),
          },
        )
      ).lastInsertRowid,
    );

    const user = publicUser(await get("SELECT id, name, email, role, created_at FROM users WHERE id = :userId", { userId: newUserId }));
    sendAuthCookie(response, user);
    await notifyAdmins("New platform signup", `${user.name} joined the LMS as ${user.role}.`, "/#admin");
    response.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/login", async (request, response, next) => {
  try {
    const email = lowerEmail(request.body.email);
    const password = text(request.body.password);

    if (!email || !password) {
      response.status(400).json({ message: "Email and password are required." });
      return;
    }

    const userRow = await get(
      `
        SELECT id, name, email, password_hash AS passwordHash, role, created_at
        FROM users
        WHERE email = :email
      `,
      { email },
    );

    if (!userRow || !bcrypt.compareSync(password, userRow.passwordHash)) {
      response.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const user = publicUser(userRow);
    sendAuthCookie(response, user);
    response.json({ user });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/logout", (_request, response) => {
  clearAuthCookie(response);
  response.json({ ok: true });
});

router.get("/auth/me", authOptional, (request, response) => {
  response.json({ user: request.user || null });
});

router.get("/catalog", authOptional, async (request, response, next) => {
  try {
    const search = text(request.query.search);
    const category = text(request.query.category);
    const viewerId = request.user?.id || 0;
    const searchPattern = `%${search.toLowerCase()}%`;

    const courses = await listCourseSummaries({
      viewerId,
      whereClause: [
        "c.status = 'approved'",
        "(:category = '' OR c.category = :category)",
        "(:search = '' OR LOWER(c.title) LIKE :searchPattern OR LOWER(c.description) LIKE :searchPattern OR LOWER(c.category) LIKE :searchPattern)",
      ].join(" AND "),
      params: {
        category,
        search,
        searchPattern,
      },
    });

    const categories = (
      await all(
        `
          SELECT DISTINCT category
          FROM courses
          WHERE status = 'approved'
          ORDER BY category ASC
        `,
      )
    ).map((row) => row.category);

    response.json({ courses, categories });
  } catch (error) {
    next(error);
  }
});

router.get("/courses/:id", authOptional, async (request, response, next) => {
  try {
    const courseId = toInt(request.params.id);
    if (!courseId) {
      response.status(400).json({ message: "Invalid course id." });
      return;
    }

    const payload = await getCourseDetail(courseId, request.user);
    if (!payload) {
      response.status(404).json({ message: "Course not found or not available to you." });
      return;
    }

    response.json(payload);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
