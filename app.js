const express = require("express");

// Global variables (to temporarily store records in memory)
global.user_id; // Stores current logged-in user object or null
global.users; // array of user objects
global.tasks; // array of task objects

// Imported Routers
const userRouter = require("./routes/userRoutes");

// Imported Handlers
const notFoundHandler = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler");

// Create app using express()
const app = express();

// Initialize global variables
global.user_id = null;
global.users = [];
global.tasks = [];

// =============== Create middleware to use before passing into routes ============ //
// Parse JSON body
app.use(express.json({ limit: "1kb" }));

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

// Not found handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

const port = process.env.PORT || 3000;

// listen is an async function
const server = app.listen(port, () =>
  console.log(`Server is listening on port ${port}...`),
);

// Port shutdown
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use.`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});

let isShuttingDown = false;
async function shutdown(code = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log("Shutting down gracefully...");
  try {
    await new Promise((resolve) => server.close(resolve));
    console.log("HTTP server closed.");
    // If you have DB connections, close them here
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
