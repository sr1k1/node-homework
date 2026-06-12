// General package imports
const express = require("express");
const prisma = require("./db/prisma");
const cookieParser = require("cookie-parser");

// Security package imports
const helmet = require("helmet");
const { xss } = require("express-xss-sanitizer");
const rateLimiter = require("express-rate-limit");

// Imported Routers
const userRouter = require("./routes/userRoutes");
const taskRouter = require("./routes/taskRoutes");
const analyticsRouter = require("./routes/analyticsRoutes");

// Imported Handlers
const notFoundHandler = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler");

// Create app using express()
const app = express();

// Enable "trust proxy" to allow our HTTP app to interface with
// the front end's HTTPS proxy and use secure cookies
app.set("trust proxy", 1);

// =============== Create middleware to use before passing into routes ============ //
// Rate limiter (prevent DOS attack)
app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000, // specify a 15 minute window
    max: 100, // each IP gets 100 requests per window specified above
  }),
);

// Helmet for more added protection
app.use(helmet());

// Parse JSON body
app.use(express.json({ limit: "1kb" }));

// Parse cookies
app.use(cookieParser());

// Sanitize request body and cookies to prevent cross site scripting attacks
app.use(xss());

// Log useful parameters for debugging
app.use((req, res, next) => {
  console.log(`Method: ${req.method}`);
  console.log(`Path: ${req.path}`);
  console.log(req.query);

  // Pass it along chain of functions
  next();
});

// =============== Create route handlers for app ============= //
// main page (e.g. process function when HTTP GET request received for "/")
app.get("/", (req, res) => {
  res.send({ message: "Hello, World!" });
});

app.post("/testpost", (req, res) => {
  res.send({ message: `Posted something!` });
});

// User routes
app.use("/api/users", userRouter);

// Task Routes
app.use("/api/tasks", taskRouter);

// Analytics Routes
app.use("/api/analytics", analyticsRouter);

// app health route
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res
      .status(500)
      .json({ status: "error", db: "not connected", error: err.message });
  }
});

// Not found handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

const port = process.env.PORT || 3000;

// listen is an async function
const server = app.listen(port, () =>
  console.log(`Server is listening on port ${port}...`),
);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use.`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});

// Port shutdown
let isShuttingDown = false;
async function shutdown(code = 0) {
  if (isShuttingDown) return; //early return
  isShuttingDown = true;
  console.log("Shutting down gracefully...");
  try {
    await new Promise((resolve) => server.close(resolve));
    console.log("HTTP server closed.");
    // If you have DB connections, close them here
    await prisma.$disconnect();
    console.log("Prisma disconnected");
  } catch (err) {
    console.error("Error during shutdown:", err);
    code = 1;
  } finally {
    console.log("Exiting process...");
    process.exit(code);
  }
}

process.on("SIGINT", () => shutdown(0)); // ctrl+c
process.on("SIGTERM", () => shutdown(0)); // e.g. `docker stop`
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  shutdown(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  shutdown(1);
});

module.exports = { app, server };
