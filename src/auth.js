const jwt = require("jsonwebtoken");

const { get } = require("./db");

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function parseCookies(header = "") {
  return header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((accumulator, entry) => {
      const separator = entry.indexOf("=");
      if (separator === -1) {
        return accumulator;
      }

      const key = entry.slice(0, separator).trim();
      const value = entry.slice(separator + 1).trim();
      accumulator[key] = decodeURIComponent(value);
      return accumulator;
    }, {});
}

function publicUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at || row.createdAt,
  };
}

async function getUserById(userId) {
  return publicUser(
    await get(
      `
        SELECT id, name, email, role, created_at
        FROM users
        WHERE id = :userId
      `,
      { userId },
    ),
  );
}

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function sendAuthCookie(response, user) {
  const token = createToken(user);
  response.cookie("lms_token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: TOKEN_TTL_MS,
  });
}

function clearAuthCookie(response) {
  response.clearCookie("lms_token", {
    httpOnly: true,
    sameSite: "lax",
  });
}

async function resolveRequestUser(request) {
  const authHeader = request.headers.authorization || "";
  const cookies = parseCookies(request.headers.cookie);
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : cookies.lms_token;

  if (!token) {
    request.user = null;
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    request.user = await getUserById(Number(payload.sub));
  } catch {
    request.user = null;
  }
}

async function authOptional(request, _response, next) {
  try {
    await resolveRequestUser(request);
    next();
  } catch (error) {
    next(error);
  }
}

async function authRequired(request, response, next) {
  try {
    await resolveRequestUser(request);
    if (!request.user) {
      response.status(401).json({ message: "Please sign in to continue." });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}

function roleRequired(...roles) {
  return (request, response, next) => {
    if (!request.user || !roles.includes(request.user.role)) {
      response.status(403).json({ message: "You do not have access to this action." });
      return;
    }

    next();
  };
}

module.exports = {
  publicUser,
  getUserById,
  sendAuthCookie,
  clearAuthCookie,
  authOptional,
  authRequired,
  roleRequired,
};
