const { StatusCodes } = require("http-status-codes");

// Function imports
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

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

function create(req, res) {
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

  // Create new task object and tether to user's email + unique id
  const newTask = {
    ...value,
    id: taskCounter(),
    userId: global.user_id.email,
  };

  global.tasks.push(newTask);

  // Return sanitized list
  return res.status(StatusCodes.CREATED).json(sanitizeList(newTask));
}

// Returns sanitized list of tasks for current user
function index(req, res) {
  // First filter out tasks only related to current user
  const userTasks = global.tasks.filter(
    (task) => task.userId === global.user_id.email,
  );

  // If no user tasks found, raise 404 not found
  if (userTasks.length === 0) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Tasks were not found." });
  }

  // Remove userId from all tasks on list (create copy of each task first)
  const sanitizedTaskList = userTasks.map((task) => {
    return sanitizeList(task);
  });

  // Send to server
  res.json(sanitizedTaskList);
}

// Returns task with particular ID for current user
function show(req, res) {
  // Pull out id of requested task
  const taskToFind = parseInt(req.params?.id);

  // If no task (i.e. if above is null), return 400 code
  if (!taskToFind) {
    return res
      .status(400)
      .json({ message: "The task ID passed is not valid." });
  }

  // Find task with this id for given user; if not found,
  // send error response to server.
  const taskIndex = global.tasks.findIndex(
    (task) => task.id === taskToFind && task.userId === global.user_id.email,
  );

  if (taskIndex === -1) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "That task was not found" });
  }

  // Otherwise, pull out sanitized copy of task and return it
  return res.json(sanitizeList(global.tasks[taskIndex]));
}

// Updates task with given ID for current user
function update(req, res) {
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
  const taskToFind = parseInt(req.params?.id);

  // If no task (i.e. if above is null), return 400 code
  if (!taskToFind) {
    return res
      .status(400)
      .json({ message: "The task ID passed is not valid." });
  }

  // Find task with this id for given user; if not found,
  // send error response to server.
  const taskIndex = global.tasks.findIndex(
    (task) => task.id === taskToFind && task.userId === global.user_id.email,
  );

  if (taskIndex === -1) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "That task was not found" });
  }

  // Otherwise, modify current task and return sanitized version of task
  const currentTask = global.tasks[taskIndex];
  Object.assign(currentTask, value);

  // Sanitized task
  return res.json(sanitizeList(value));
}

function deleteTask(req, res) {
  // Locate task using id passed, if any
  const taskToFind = parseInt(req.params?.id);

  // If no task (i.e. if above is null), return 400 code
  if (!taskToFind) {
    return res
      .status(400)
      .json({ message: "The task ID passed is not valid." });
  }

  // Find corresponding index of task in global task object for user
  // We are looking for index so that when deleting task, we can splice it out
  const taskIndex = global.tasks.findIndex(
    (task) => task.id === taskToFind && task.userId === global.user_id.email,
  );

  // If task doesn't exist, send Not Found
  if (taskIndex === -1) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "That task was not found" });
  }

  // Otherwise, pull out sanitized copy of task and delete task from database
  const sanitizedTask = sanitizeList(global.tasks[taskIndex]);
  global.tasks.splice(taskIndex, 1);

  return res.json(sanitizedTask);
}

module.exports = { create, index, show, update, deleteTask };
