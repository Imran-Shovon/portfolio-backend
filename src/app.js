const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const sanitizeInput = require("./middleware/sanitize");

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const publicRoutes = require("./routes/publicRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

const allowedOrigins = [
  process.env.DASHBOARD_ORIGIN,
  process.env.PORTFOLIO_ORIGIN,
].filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(sanitizeInput);
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

// General API rate limit
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
  }),
);

app.get("/api/health", (req, res) =>
  res.json({ success: true, message: "API is running" }),
);

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes); // protected, used by dashboard
app.use("/api/public", publicRoutes); // public, used by portfolio

app.use(notFound);
app.use(errorHandler);

module.exports = app;
