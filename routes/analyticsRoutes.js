const express = require("express");
const {
  getUserAnalytics,
  getUserswithStats,
} = require("../controllers/analyticsController");

// Create router to hold all analytics routes
const router = express.Router();

// Routes
router.route("/users/:id").get(getUserAnalytics);
router.route("/users").get(getUserswithStats);

// Export to other files
module.exports = router;
