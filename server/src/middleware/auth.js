const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 12;

const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: "15m",
      issuer: "proxima-server",
      audience: "proxima-client",
    }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      type: "refresh",
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "7d",
      issuer: "proxima-server",
      audience: "proxima-client",
    }
  );
};

const verifyToken = (token, secret) => {
  return jwt.verify(token, secret, {
    issuer: "proxima-server",
    audience: "proxima-client",
  });
};

const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
};
