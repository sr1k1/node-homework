// Import jwt and StatusCodes
const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");

// Define function to send 401 unauthorized
function send401(res) {
  return res
    .status(StatusCodes.UNAUTHORIZED)
    .json({ message: "No user is authenticated. " });
}

// Attach function that does authentication to this file's export
module.exports = async (req, res, next) => {
  // Check for tokens
  const token = req?.cookies?.jwt;

  // Send 401 if no token
  if (!token) {
    return send401(res);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return send401(res);
    }

    // This is where id is kept for subsequent access control
    req.user = { id: decoded.id };

    // Check for cross site request forgery in select methods
    const reqMethods = ["POST", "PATCH", "PUT", "DELETE", "CONNECT"];
    if (reqMethods.includes(req.method)) {
      if (req.get("X-CSRF-TOKEN") != decoded.csrfToken) {
        return send401(res);
      }
    }

    // If successful verification, send to next middleware
    next();
  });

  return;
};
