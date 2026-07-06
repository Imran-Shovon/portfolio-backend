const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateTokens");

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save();

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.json({
    success: true,
    data: { accessToken, user: { id: user._id, name: user.name, email: user.email } },
  });
};

// POST /api/auth/refresh
const refresh = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ success: false, message: "No refresh token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select("+refreshToken");

    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ success: false, message: "Invalid refresh token" });
    }

    const accessToken = generateAccessToken(user._id);
    res.json({ success: true, data: { accessToken } });
  } catch (error) {
    return res.status(403).json({ success: false, message: "Invalid or expired refresh token" });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) {
    await User.findOneAndUpdate({ refreshToken: token }, { refreshToken: null });
  }
  res.clearCookie("refreshToken");
  res.json({ success: true, message: "Logged out" });
};

module.exports = { login, refresh, logout };
