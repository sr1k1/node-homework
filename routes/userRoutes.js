const express = require("express");

// route handler functions
const { register, logon, logoff } = require("../controllers/userController");

// Create router to handle all user routes
const router = express.Router();

// User registration
router.route("/register").post(register);

// User log on and off
router.route("/logon").post(logon);
router.route("/logoff").post(logoff);

module.exports = router;
