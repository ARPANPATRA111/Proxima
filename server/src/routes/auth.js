const express = require("express");
const db = require("../database");
const {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} = require("../middleware/auth");
const { authenticate } = require("../middleware");

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

const validateEmail = (email) => {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required" };
  }
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: "Invalid email format" };
  }
  if (trimmed.length > 255) {
    return { valid: false, error: "Email too long" };
  }
  return { valid: true, value: trimmed };
};

const validatePassword = (password) => {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    };
  }
  if (password.length > 128) {
    return { valid: false, error: "Password too long" };
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one letter and one number",
    };
  }
  return { valid: true, value: password };
};

const validateName = (name) => {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Name is required" };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) {
    return { valid: false, error: "Name must be between 2 and 50 characters" };
  }
  return { valid: true, value: trimmed };
};

const validateRole = (role) => {
  if (!role || !["teacher", "student"].includes(role)) {
    return { valid: false, error: "Role must be 'teacher' or 'student'" };
  }
  return { valid: true, value: role };
};
router.post("/register", async (req, res) => {
  try {
    const email = validateEmail(req.body.email);
    if (!email.valid) {
      return res.status(400).json({ error: email.error, field: "email" });
    }

    const password = validatePassword(req.body.password);
    if (!password.valid) {
      return res.status(400).json({ error: password.error, field: "password" });
    }

    const name = validateName(req.body.name);
    if (!name.valid) {
      return res.status(400).json({ error: name.error, field: "name" });
    }

    const role = validateRole(req.body.role);
    if (!role.valid) {
      return res.status(400).json({ error: role.error, field: "role" });
    }

    const existing = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email.value);

    if (existing) {
      return res.status(409).json({
        error: "User with this email already exists",
        code: "USER_EXISTS",
      });
    }

    const passwordHash = await hashPassword(password.value);

    const result = db
      .prepare(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES (?, ?, ?, ?)`
      )
      .run(email.value, passwordHash, name.value, role.value);

    const user = {
      id: result.lastInsertRowid,
      email: email.value,
      name: name.value,
      role: role.value,
    };

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    db.prepare(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES (?, ?, ?)`
    ).run(user.id, refreshToken, refreshTokenExpiry.toISOString());

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    console.error("[auth/register] error:", err.message);
    res.status(500).json({
      error: "Registration failed",
      code: "REGISTRATION_ERROR",
    });
  }
});
router.post("/login", async (req, res) => {
  try {
    const email = validateEmail(req.body.email);
    if (!email.valid) {
      return res.status(400).json({ error: email.error, field: "email" });
    }

    const password = validatePassword(req.body.password);
    if (!password.valid) {
      return res.status(400).json({ error: password.error, field: "password" });
    }

    const user = db
      .prepare("SELECT id, email, password_hash, name, role FROM users WHERE email = ?")
      .get(email.value);

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    const passwordMatch = await comparePassword(
      password.value,
      user.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    db.prepare("DELETE FROM refresh_tokens WHERE user_id = ?").run(user.id);
    db.prepare(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES (?, ?, ?)`
    ).run(user.id, refreshToken, refreshTokenExpiry.toISOString());

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    console.error("[auth/login] error:", err.message);
    res.status(500).json({
      error: "Login failed",
      code: "LOGIN_ERROR",
    });
  }
});
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: "Refresh token is required",
        code: "NO_TOKEN",
      });
    }

    let decoded;
    try {
      decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          error: "Refresh token has expired. Please login again.",
          code: "TOKEN_EXPIRED",
        });
      }
      return res.status(403).json({
        error: "Invalid refresh token",
        code: "INVALID_TOKEN",
      });
    }

    if (decoded.type !== "refresh") {
      return res.status(403).json({
        error: "Invalid token type",
        code: "INVALID_TOKEN_TYPE",
      });
    }

    const storedToken = db
      .prepare(
        `SELECT id, user_id, expires_at FROM refresh_tokens 
         WHERE token = ? AND expires_at > datetime('now')`
      )
      .get(refreshToken);

    if (!storedToken) {
      return res.status(401).json({
        error: "Refresh token not found or expired",
        code: "TOKEN_NOT_FOUND",
      });
    }

    const user = db
      .prepare("SELECT id, email, name, role FROM users WHERE id = ?")
      .get(decoded.userId);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    const newAccessToken = generateAccessToken(user);

    res.json({
      tokens: {
        accessToken: newAccessToken,
        refreshToken,
      },
    });
  } catch (err) {
    console.error("[auth/refresh] error:", err.message);
    res.status(500).json({
      error: "Token refresh failed",
      code: "REFRESH_ERROR",
    });
  }
});
router.post("/logout", authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      db.prepare("DELETE FROM refresh_tokens WHERE token = ?").run(refreshToken);
    }

    res.json({ message: "Logout successful" });
  } catch (err) {
    console.error("[auth/logout] error:", err.message);
    res.status(500).json({
      error: "Logout failed",
      code: "LOGOUT_ERROR",
    });
  }
});
router.get("/me", authenticate, (req, res) => {
  try {
    const user = db
      .prepare("SELECT id, email, name, role FROM users WHERE id = ?")
      .get(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("[auth/me] error:", err.message);
    res.status(500).json({
      error: "Failed to fetch user",
      code: "FETCH_ERROR",
    });
  }
});

module.exports = router;
