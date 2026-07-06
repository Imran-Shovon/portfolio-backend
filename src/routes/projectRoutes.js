const express = require("express");
const protect = require("../middleware/auth");
const {
  getAllProjects,
  createProject,
  updateProject,
  deleteProject,
} = require("../controllers/projectController");

const router = express.Router();

router.use(protect); // everything below requires a valid access token

router.get("/", getAllProjects);
router.post("/", createProject);
router.put("/:id", updateProject);
router.delete("/:id", deleteProject);

module.exports = router;
