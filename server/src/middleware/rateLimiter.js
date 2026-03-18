const rateLimit = require("express-rate-limit");

const isDevelopment = process.env.NODE_ENV === "development";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 1000 : 10,
  message: {
    error: "Too many authentication attempts, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const tokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 200 : 30,
  message: {
    error: "Too many token requests, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 500 : 100,
  message: {
    error: "Too many requests, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  tokenLimiter,
  generalLimiter,
};
