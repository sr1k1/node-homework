const express = require("express");
const {
  getUserAnalytics,
  getUsersWithStats,
  searchTasks,
} = require("../controllers/analyticsController");

// import jwtMiddleware
const jwtMiddleware = require("./../middleware/jwtMiddleware");

// Create router to hold all analytics routes
const router = express.Router();

// Ensure logged-in user using jwtMiddleware
router.use(jwtMiddleware);

// User Routes
router.route("/users/:id").get(getUserAnalytics);
router.route("/users").get(getUsersWithStats);

// Task Routes
router.route("/tasks/search").get(searchTasks);

// Export to other files
module.exports = router;
