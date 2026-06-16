const { StatusCodes } = require("http-status-codes");

// Define function to send 401 unauthorized
function send401(res) {
  return res
    .status(StatusCodes.UNAUTHORIZED)
    .json({ message: "No user is authenticated. " });
}

// Attach function that does authentication to this file's export
module.exports = async (req, res, next) => {
  // Check for manager role; if it doesn't exist, raise error
  if (req.user.role !== "manager") {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "User is not allowed down this route" });
  }
  // Else, you may proceed
  next();
};
