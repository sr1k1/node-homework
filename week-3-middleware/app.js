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

// body parsing
app.use(express.json({ limit: "1mb" }));

// content-type validation
app.use((req, res, next) => {
  if (req.method === "POST") {
    const contentType = req.get("Content-Type");
    if (!contentType || contentType.toLowerCase() !== "application/json") {
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

// error handling
app.use((err, req, res, next) => {
  return res
    .status(500)
    .json({ error: "Internal Server Error", requestId: req.requestId });
});

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
