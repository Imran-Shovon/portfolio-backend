const Project = require("../models/Project");

// GET /api/public/projects  (public)
const getPublicProjects = async (req, res) => {
  const projects = await Project.find().sort({ order: 1, createdAt: -1 });
  res.json({ success: true, data: projects });
};

// GET /api/public/projects/:slug  (public)
const getProjectBySlug = async (req, res) => {
  const project = await Project.findOne({ slug: req.params.slug });
  if (!project) return res.status(404).json({ success: false, message: "Project not found" });
  res.json({ success: true, data: project });
};

// GET /api/projects  (dashboard, protected)
const getAllProjects = async (req, res) => {
  const projects = await Project.find().sort({ order: 1, createdAt: -1 });
  res.json({ success: true, data: projects });
};

// POST /api/projects  (dashboard, protected)
const createProject = async (req, res) => {
  const project = await Project.create(req.body);
  res.status(201).json({ success: true, data: project });
};

// PUT /api/projects/:id  (dashboard, protected)
const updateProject = async (req, res) => {
  const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!project) return res.status(404).json({ success: false, message: "Project not found" });
  res.json({ success: true, data: project });
};

// DELETE /api/projects/:id  (dashboard, protected)
const deleteProject = async (req, res) => {
  const project = await Project.findByIdAndDelete(req.params.id);
  if (!project) return res.status(404).json({ success: false, message: "Project not found" });
  res.json({ success: true, message: "Project deleted" });
};

module.exports = {
  getPublicProjects,
  getProjectBySlug,
  getAllProjects,
  createProject,
  updateProject,
  deleteProject,
};
