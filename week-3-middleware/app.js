const express = require("express");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const dogsRouter = require("./routes/dogs");

const app = express();

// =============== Your middleware here =============== //

// == Middleware for all requests == //
// Create and add unique requestID to all requests
app.use((req, res, next) => {
  req.requestId = uuidv4();

  // Set requestID to response header
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

// Log timestamp
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}]: ${req.method} ${req.path} (${req.requestId})`);
  next();
});

// security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// body parsing
app.use(express.json({ limit: "1mb" }));

// content-type validation
app.use((req, res, next) => {
  if (req.method === "POST") {
    const contentType = req.get("Content-Type");
    if (
      !contentType ||
      !contentType.toLowerCase().includes("application/json")
    ) {
      return res.status(400).json({
        error: "Content-Type must be application/json",
        requestId: req.requestId,
      });
    }
  }
  next();
});

// static image serving
app.use(express.static(path.join(__dirname, "public")));

//routes
app.use("/", dogsRouter); // Do not remove this line

// Custom error handling
app.use((err, req, res, next) => {
  console.log(err.message);
  // Pull out error value
  const errVal = err?.statusCode || 500;

  if (errVal >= 500) {
    console.error(`ERROR: Error ${err.message}`);
  } else {
    console.warn(`WARN: ${err.name} ${err.message}`);
  }

  // Send error response to server
  res.status(errVal).json({
    error: err.message || "Internal Server Error",
    requestId: req.requestId,
  });
});

// // Internal Server Error
// app.use((err, req, res, next) => {
//   return res
//     .status(500)
//     .json({ error: "Internal Server Error", requestId: req.requestId });
// });

// not found (404) handler
app.use((req, res) => {
  return res.status(404).json({
    error: "Route not found",
    requestId: req.requestId,
  });
});
const server = app.listen(3000, () =>
  console.log("Server listening on port 3000"),
);
module.exports = server;
