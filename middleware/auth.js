// Imports
const StatusCodes = require("http-status-codes");

module.exports = function (req, res, next) {
  // If no logged-in user, return UNAUTHORIZED status code.
  if (!global.user_id) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: "unauthorized" });
    return;
  }

  next();
};
