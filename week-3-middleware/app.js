const express = require("express");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const dogsRouter = require("./routes/dogs");

// Import status codes
const { StatusCodes } = require("http-status-codes");

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
app.use(express.json());

// content-type validation

// Validate POST request header
// app.use((req, res, next) => {
//   if (req.method === "POST") {
//     if (req.headers["content-type"] !== "application/json") {
//       res.status(StatusCodes.BAD_REQUEST).json({message: "Incorrect content type."});
//     }
//     return;
//   }
//   next();
// });

// static image serving
app.use(express.static(path.join(__dirname, "public")));

//routes
app.use("/", dogsRouter); // Do not remove this line

// error handling
app.use((err, req, res, next) => {
  return res
    .status(StatusCodes.INTERNAL_SERVER_ERROR)
    .json({ error: "Internal Server Error", requestId: req.requestId });
});

// 404 handler

const server = app.listen(3000, () =>
  console.log("Server listening on port 3000"),
);
module.exports = server;
