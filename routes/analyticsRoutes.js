const express = require("express");
const {
  getUserProductivity,
  getAllUsersProductivity,
} = require("../controllers/analyticsController");

// Create router to hold all analytics routes
const router = express.Router();

// Routes
router.route("/users/:id").get(getUserProductivity);
router.route("/users").get(getAllUsersProductivity);

// Export to other files
module.exports = router;
