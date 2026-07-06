const express = require("express");
const { getPublicProjects, getProjectBySlug } = require("../controllers/projectController");
const Message = require("../models/Message");

const router = express.Router();

router.get("/projects", getPublicProjects);
router.get("/projects/:slug", getProjectBySlug);

// Contact form submission
router.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }
  const saved = await Message.create({ name, email, message });
  res.status(201).json({ success: true, data: saved });
});

module.exports = router;
