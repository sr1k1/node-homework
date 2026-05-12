const { StatusCodes } = require("http-status-codes");

// Function imports
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

// Database connection import (Prisma)
const prisma = require("./../db/prisma");

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
  const task = await prisma.task.create({
    data: {
      title: value.title,
      isCompleted: value.isCompleted,
      userId: global.user_id,
    },
    select: { id: true, isCompleted: true, title: true },
  });

  // Return task object as is; it only has the id, title, and is_completed status,
  // so no need for sanitization
  return res.status(StatusCodes.CREATED).json(task);
}

// Returns sanitized list of tasks for current user
async function index(req, res) {
  // First filter out tasks only related to current user
  const tasks = await prisma.task.findMany({
    where: {
      // find only the task for this user
      userId: global.user_id,
    },
    select: {
      title: true,
      isCompleted: true,
      id: true,
    },
  });

  // If no user tasks found (i.e. num rows is 0), raise 404 not found
  if (!tasks.length) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Tasks were not found." });
  }

  // Return row of data
  return res.json(tasks);
}

// Returns task with particular ID for current user
async function show(req, res, next) {
  // Pull out id of requested task
  const taskToFindId = parseInt(req.params?.id);

  // If no task (i.e. if above is null), return 400 code
  if (!taskToFindId) {
    return res
      .status(400)
      .json({ message: "The task ID passed is not valid." });
  }

  // Query for particular task using Prisma
  let taskToShow = null;
  try {
    taskToShow = await prisma.task.findUnique({
      where: {
        id: taskToFindId,
        userId: global.user_id,
      },
      select: { id: true, title: true, isCompleted: true },
    });

    // Throw error if taskToShow is null (default return if no task found)
    if (taskToShow === null) {
      throw new Error("Task not found.");
    }
  } catch (err) {
    // record not found error
    if (err.code === "P2025" || taskToShow === null) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "The task was not found." });
    }

    // Other errors get sent to global handler
    next(err);
  }

  // Return task
  return res.json(taskToShow);
}

// Updates task with given ID for current user
async function update(req, res, next) {
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
  console.log(taskToFindId);

  // If no task (i.e. if above is null), return 400 code
  if (!taskToFindId) {
    return res
      .status(400)
      .json({ message: "The task ID passed is not valid." });
  }

  // We have our value (either title or isCompleted or both) and the unique
  // id for the task. As such, we now find and update task on our table of tasks.
  let task = null;
  try {
    task = await prisma.task.update({
      data: value,
      where: {
        id: taskToFindId,
        userId: global.user_id,
      },
      select: { title: true, isCompleted: true, id: true },
    });
  } catch (err) {
    // If record not found
    if (err.code === "P2025") {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "The task was not found." });
      // Any other errors
    } else {
      return next(err);
    }
  }

  // Return updated object
  return res.json(task);
}

async function deleteTask(req, res, next) {
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
  let deletedTask = null;

  try {
    deletedTask = await prisma.task.delete({
      where: {
        id: taskToFindId,
        userId: global.user_id,
      },
      select: { id: true, isCompleted: true, title: true },
    });
  } catch (err) {
    // Not found error
    if (err.code === "P2025") {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "The task you are trying to delete cannot be found.",
      });
    }
    // Pass on to next handler
    next(err);
  }

  // Return deleted task
  return res.json(deletedTask);
}

module.exports = { create, index, show, update, deleteTask };
