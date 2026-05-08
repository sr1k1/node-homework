const { StatusCodes } = require("http-status-codes");

// Function imports
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

// Database connection pool import
const pool = require("./../db/pg-pool");

// ======================= Helper Functions ======================= //
// Counter function to create unique id for each task
const taskCounter = (() => {
  let lastTaskNumber = 0;

  // Return function whose context (variable lastTaskNumber) is
  // saved even when function use is complete.
  return () => {
    lastTaskNumber += 1;
    return lastTaskNumber;
  };
})();

// Sanitizing List
function sanitizeList(taskList) {
  const { userId, ...sanitizedTask } = taskList;
  return sanitizedTask;
}

// ============ Route handler functions =========== //

async function create(req, res) {
  // Create req.body if not already present
  if (!req.body) {
    req.body = {};
  }

  // Validate req.body input
  const { error, value } = taskSchema.validate(req.body, {
    abortEarly: false,
  });

  // Send bad request if error present; otherwise, continue as normal
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }

  // Insert all relevant task attributes into tasks table
  const task = await pool.query(
    `INSERT INTO tasks (title, is_completed, user_id) 
    VALUES ($1, $2, $3) RETURNING id, title, is_completed`,
    [value.title, value.isCompleted, global.user_id],
  );

  // Return task object as is; it only has the id, title, and is_completed status,
  // so no need for sanitization
  return res.status(StatusCodes.CREATED).json(task.rows[0]);
}

// Returns sanitized list of tasks for current user
async function index(req, res) {
  // First filter out tasks only related to current user
  const tasks = await pool.query(
    "SELECT id, title, is_completed FROM tasks WHERE user_id = $1",
    [global.user_id],
  );

  // If no user tasks found (i.e. num rows is 0), raise 404 not found
  if (!tasks.rows.length) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Tasks were not found." });
  }

  // Return row of data
  return res.json(tasks.rows);
}

// Returns task with particular ID for current user
async function show(req, res) {
  // Pull out id of requested task
  const taskToFind = parseInt(req.params?.id);

  // If no task (i.e. if above is null), return 400 code
  if (!taskToFind) {
    return res
      .status(400)
      .json({ message: "The task ID passed is not valid." });
  }

  // Query for particular task
  const taskToShow = pool.query(
    `SELECT id, title, is_completed FROM tasks
    WHERE id = $1 AND user_id = $2`,
    [taskToFind, global.user_id],
  );

  // Return task
  return res.json(taskToShow.rows);
}

// Updates task with given ID for current user
async function update(req, res) {
  // Create a req.body if not already included
  if (!req.body) {
    req.body = {};
  }

  // Validate body and raise appropriate error as necessary
  const { error, value } = patchTaskSchema.validate(req.body, {
    abortEarly: false,
  });

  // Send bad request if error present; otherwise, continue as normal
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }

  // Pull out id of requested task
  const taskToFindId = parseInt(req.params?.id);

  // If no task (i.e. if above is null), return 400 code
  if (!taskToFindId) {
    return res
      .status(400)
      .json({ message: "The task ID passed is not valid." });
  }

  // We have our value (either title or isCompleted or both) and the unique
  // id for the task. As such, we now find and update task on our table of tasks.

  // Change keys from camelCase to snake_case
  let originalKeys = Object.keys(value); // array

  // array with keys in snake_case
  let new_keys = originalKeys.map((key) =>
    key === "isCompleted" ? "is_completed" : key,
  );

  // Iterate through array of snake_case keys with index to construct
  // SET clauses using $(number) (number reference) notation
  const setClauses = new_keys.map((key, i) => `${key} = $${i + 1}`).join(", ");

  // Set number references for task id and user id
  const taskIdRef = `$${new_keys.length + 1}`;
  const userIdRef = `$${new_keys.length + 2}`;

  // Update task and return relevant info to send back to server
  const updatedTask = await pool.query(
    `UPDATE tasks 
    SET ${setClauses} 
    WHERE id = ${taskIdRef} AND user_id = ${userIdRef} 
    RETURNING id, title, is_completed`,
    [...Object.values(value), taskToFindId, global.user_id],
  );

  // if empty rows object, send not found error
  if (!updatedTask.rows.length) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Task could not be found." });
  }

  // Return updated object
  return res.json(updatedTask.rows[0]);
}

async function deleteTask(req, res) {
  // Locate task using id passed, if any
  const taskToFindId = parseInt(req.params?.id);

  // If no task (i.e. if above is null), return 400 code
  if (!taskToFindId) {
    return res
      .status(400)
      .json({ message: "The task ID passed is not valid." });
  }

  // At this point, we have a task id and a user id (from active user in global variable)
  // As such, we can jump into deleting task from table and returning id, title, and isCompleted
  const deletedTask = await pool.query(
    `DELETE FROM tasks 
    WHERE id = $1 AND user_id = $2 
    RETURNING id, title, is_completed`,
    [taskToFindId, global.user_id],
  );

  // If deletedTask is empty, send 404 error
  if (!deletedTask.rows.length) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "The task you are trying to delete cannot be found. " });
  }

  // Return deleted task
  return res.json(deletedTask.rows[0]);
}

module.exports = { create, index, show, update, deleteTask };
