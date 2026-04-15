const { StatusCodes } = require("http-status-codes");

const errorHandlerMiddleware = (err, req, res, next) => {
  console.error(
    "Internal server error: ",
    err.constructor.name,
    JSON.stringify(err, ["name", "message", "stack"]),
  );

  // Only send error response if response has not been sent to server yet; this ensures that
  // we don't try to send a second response to server and throw an error.
  if (!res.headersSent) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send("An internal server error occurred.");
  }
};

module.exports = errorHandlerMiddleware;
