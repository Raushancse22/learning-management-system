const bcrypt = require("bcryptjs");
const express = require("express");

const { authOptional, clearAuthCookie, publicUser, sendAuthCookie } = require("../auth");
const { all, get, isRole, lowerEmail, nowIso, run, text, toInt, withTransaction } = require("../db");
const { getCourseDetail, listCourseSummaries, notifyAdmins } = require("../services");

const router = express.Router();
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lowerEmail(email));
}

function normalizeMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 ? digits : "";
}

function maskMobile(mobile) {
  const normalized = normalizeMobile(mobile);
  if (normalized.length < 4) {
    return normalized;
  }

  return `${normalized.slice(0, 2)}******${normalized.slice(-2)}`;
}

function maskEmail(email) {
  const normalized = lowerEmail(email);
  if (!normalized.includes("@")) {
    return normalized;
  }

  const [name, domain] = normalized.split("@");
  if (name.length <= 2) {
    return `${name[0] || ""}***@${domain}`;
  }

  return `${name.slice(0, 2)}***@${domain}`;
}

function createOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getOtpExpiryIso() {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();
}

function normalizeExamPreparingFor(value, customValue = "") {
  const primary = text(value);
  if (primary.toLowerCase() === "other") {
    return text(customValue);
  }

  return primary;
}

function collectRegistrationFieldErrors({ name, mobile, email, examPreparingFor, password, role }) {
  const fieldErrors = {};

  if (!name) {
    fieldErrors.name = "Full name is required.";
  }

  if (!mobile) {
    fieldErrors.mobile = "Mobile number is required.";
  }

  if (!email) {
    fieldErrors.email = "Email is required.";
  } else if (!isValidEmail(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (!examPreparingFor) {
    fieldErrors.examPreparingFor = "Tell us what exam or learning track you are preparing for.";
  }

  if (!password) {
    fieldErrors.password = "Password is required.";
  } else if (password.length < 8) {
    fieldErrors.password = "Password must be at least 8 characters long.";
  }

  if (!isRole(role)) {
    fieldErrors.role = "Choose a valid role.";
  }

  return fieldErrors;
}

async function getExistingRegistrationConflicts({ email = "", mobile = "" }) {
  const rows = await all(
    `
      SELECT id, email, mobile
      FROM users
      WHERE (:email <> '' AND email = :email)
         OR (:mobile <> '' AND mobile = :mobile)
    `,
    { email, mobile },
  );

  const fieldErrors = {};
  if (email && rows.some((row) => lowerEmail(row.email) === email)) {
    fieldErrors.email = "Email already registered.";
  }

  if (mobile && rows.some((row) => normalizeMobile(row.mobile) === mobile)) {
    fieldErrors.mobile = "Mobile already registered.";
  }

  return fieldErrors;
}

async function getSignupVerification(email, mobile) {
  return get(
    `
      SELECT
        id,
        name,
        email,
        mobile,
        exam_preparing_for AS examPreparingFor,
        role,
        password_hash AS passwordHash,
        otp_hash AS otpHash,
        attempt_count AS attemptCount,
        created_at AS createdAt,
        updated_at AS updatedAt,
        expires_at AS expiresAt,
        verified_at AS verifiedAt
      FROM signup_verifications
      WHERE email = :email
        AND mobile = :mobile
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
    `,
    { email, mobile },
  );
}

router.post("/auth/register/check", async (request, response, next) => {
  try {
    const email = lowerEmail(request.body.email);
    const mobile = normalizeMobile(request.body.mobile);
    const fieldErrors = {};

    if (request.body.email && (!email || !isValidEmail(email))) {
      fieldErrors.email = "Enter a valid email address.";
    }

    if (request.body.mobile && !mobile) {
      fieldErrors.mobile = "Enter a valid mobile number.";
    }

    Object.assign(fieldErrors, await getExistingRegistrationConflicts({ email, mobile }));

    response.json({
      fields: {
        email: {
          available: !fieldErrors.email && Boolean(email),
          message: fieldErrors.email || (email ? "Email is available." : ""),
        },
        mobile: {
          available: !fieldErrors.mobile && Boolean(mobile),
          message: fieldErrors.mobile || (mobile ? "Mobile number is available." : ""),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/register/request-otp", async (request, response, next) => {
  try {
    const name = text(request.body.name);
    const email = lowerEmail(request.body.email);
    const mobile = normalizeMobile(request.body.mobile);
    const examPreparingFor = normalizeExamPreparingFor(request.body.examPreparingFor, request.body.customExamPreparingFor);
    const password = text(request.body.password);
    const role = isRole(text(request.body.role).toLowerCase()) ? text(request.body.role).toLowerCase() : "student";
    const fieldErrors = collectRegistrationFieldErrors({
      name,
      email,
      mobile,
      examPreparingFor,
      password,
      role,
    });

    Object.assign(fieldErrors, await getExistingRegistrationConflicts({ email, mobile }));

    if (Object.keys(fieldErrors).length > 0) {
      response.status(400).json({
        message: "Please fix the highlighted registration fields.",
        fieldErrors,
      });
      return;
    }

    const otpCode = createOtpCode();
    const createdAt = nowIso();
    const expiresAt = getOtpExpiryIso();

    await withTransaction(async () => {
      await run("DELETE FROM signup_verifications WHERE email = :email OR mobile = :mobile", { email, mobile });
      await run(
        `
          INSERT INTO signup_verifications (
            name,
            email,
            mobile,
            exam_preparing_for,
            role,
            password_hash,
            otp_hash,
            attempt_count,
            created_at,
            updated_at,
            expires_at
          )
          VALUES (
            :name,
            :email,
            :mobile,
            :examPreparingFor,
            :role,
            :passwordHash,
            :otpHash,
            0,
            :createdAt,
            :updatedAt,
            :expiresAt
          )
        `,
        {
          name,
          email,
          mobile,
          examPreparingFor,
          role,
          passwordHash: bcrypt.hashSync(password, 10),
          otpHash: bcrypt.hashSync(otpCode, 8),
          createdAt,
          updatedAt: createdAt,
          expiresAt,
        },
      );
    });

    response.status(201).json({
      message: "OTP generated successfully.",
      verification: {
        email,
        mobile,
        maskedEmail: maskEmail(email),
        maskedMobile: maskMobile(mobile),
        expiresAt,
        deliveryMode: "demo-preview",
        otpPreview: otpCode,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/register/verify-otp", async (request, response, next) => {
  try {
    const email = lowerEmail(request.body.email);
    const mobile = normalizeMobile(request.body.mobile);
    const otp = String(request.body.otp || "").replace(/\D/g, "");

    if (!email || !mobile || otp.length !== 6) {
      response.status(400).json({ message: "Email, mobile, and a valid 6-digit OTP are required." });
      return;
    }

    const verification = await getSignupVerification(email, mobile);
    if (!verification || verification.verifiedAt) {
      response.status(404).json({ message: "No pending registration was found for this email and mobile number." });
      return;
    }

    if (new Date(verification.expiresAt).getTime() < Date.now()) {
      response.status(400).json({ message: "This OTP has expired. Request a new code to continue." });
      return;
    }

    if (Number(verification.attemptCount || 0) >= OTP_MAX_ATTEMPTS) {
      response.status(429).json({ message: "Too many incorrect OTP attempts. Request a new code to continue." });
      return;
    }

    if (!bcrypt.compareSync(otp, verification.otpHash)) {
      await run(
        `
          UPDATE signup_verifications
          SET attempt_count = :attemptCount,
              updated_at = :updatedAt
          WHERE id = :verificationId
        `,
        {
          verificationId: Number(verification.id),
          attemptCount: Number(verification.attemptCount || 0) + 1,
          updatedAt: nowIso(),
        },
      );

      response.status(400).json({ message: "Incorrect OTP. Please try again." });
      return;
    }

    const now = nowIso();
    let newUserId = 0;

    await withTransaction(async () => {
      const conflictErrors = await getExistingRegistrationConflicts({ email, mobile });
      if (Object.keys(conflictErrors).length > 0) {
        const error = new Error(conflictErrors.email || conflictErrors.mobile || "This account already exists.");
        error.statusCode = 409;
        throw error;
      }

      newUserId = Number(
        (
          await run(
            `
              INSERT INTO users (
                name,
                email,
                mobile,
                exam_preparing_for,
                password_hash,
                role,
                email_verified_at,
                mobile_verified_at,
                created_at
              )
              VALUES (
                :name,
                :email,
                :mobile,
                :examPreparingFor,
                :passwordHash,
                :role,
                :emailVerifiedAt,
                :mobileVerifiedAt,
                :createdAt
              )
            `,
            {
              name: verification.name,
              email,
              mobile,
              examPreparingFor: verification.examPreparingFor,
              passwordHash: verification.passwordHash,
              role: verification.role,
              emailVerifiedAt: now,
              mobileVerifiedAt: now,
              createdAt: now,
            },
          )
        ).lastInsertRowid,
      );

      await run(
        `
          UPDATE signup_verifications
          SET verified_at = :verifiedAt,
              updated_at = :updatedAt
          WHERE id = :verificationId
        `,
        {
          verificationId: Number(verification.id),
          verifiedAt: now,
          updatedAt: now,
        },
      );
    });

    const user = publicUser(
      await get(
        `
          SELECT id, name, email, mobile, exam_preparing_for, role, email_verified_at, mobile_verified_at, created_at
          FROM users
          WHERE id = :userId
        `,
        { userId: newUserId },
      ),
    );
    sendAuthCookie(response, user);
    await notifyAdmins("New verified signup", `${user.name} joined the LMS for ${user.examPreparingFor || "learning"} as ${user.role}.`, "/#admin");
    response.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/register", async (request, response, next) => {
  try {
    response.status(400).json({ message: "Use the OTP registration flow to create a new account." });
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
        SELECT id, name, email, mobile, exam_preparing_for, password_hash AS passwordHash, role, email_verified_at, mobile_verified_at, created_at
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
