const express = require("express");
const {
  getUserAnalytics,
  getUserswithStats,
  searchTasks,
} = require("../controllers/analyticsController");

// Create router to hold all analytics routes
const router = express.Router();

// User Routes
router.route("/users/:id").get(getUserAnalytics);
router.route("/users").get(getUserswithStats);

// Task Routes
router.route("/tasks/search").get(searchTasks);

// Export to other files
module.exports = router;
