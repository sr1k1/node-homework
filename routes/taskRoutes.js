const express = require("express");

// Import task routing functions
const {
  create,
  bulkCreate,
  index,
  show,
  update,
  deleteTask,
} = require("../controllers/taskController");

// Create router to hold all routes from here
const router = express.Router();

// Routes
router.route("").post(create);
router.route("/bulk").post(bulkCreate);
router.route("").get(index);
router.route("/:id").get(show);
router.route("/:id").patch(update);
router.route("/:id").delete(deleteTask);

// Export router
module.exports = router;
