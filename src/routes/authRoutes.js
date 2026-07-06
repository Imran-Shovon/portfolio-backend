const express = require("express");
const rateLimit = require("express-rate-limit");
const { login, refresh, logout } = require("../controllers/authController");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: "Too many login attempts, try again later",
  },
});

router.post("/login", loginLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);

module.exports = router;
