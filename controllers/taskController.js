const { StatusCodes } = require("http-status-codes");

// Function imports
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

// Database connection import (Prisma)
const prisma = require("./../db/prisma");

// ======================= Helper functions ======================= //

// index
function createOrderBy(query) {
  // Pull out sortBy and sortDirection parameters from query and initialize
  // direction with default value
  const sortBy = query.sortBy;
  const sortDirection = query.sortDirection || "desc";

  // create list of all possible sort filters for our purposes
  const allSortFilters = [
    "createdAt",
    "title",
    "isCompleted",
    "priority",
    "id",
  ];

  // If sortBy value is in the above list of filters, return an object
  // with that sortBy and the given (or default) sort direction. This
  // check is present to prevent someone from attempting to sort with an invalid
  // value
  if (allSortFilters.includes(sortBy)) {
    return { [sortBy]: sortDirection };
  }

  // Otherwise, return default
  return { createdAt: "desc" };
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
  const task = await prisma.task.create({
    // Destructure title, isCompleted, and priority into object and add userId
    data: { ...value, userId: global.user_id },
    select: { id: true, title: true, isCompleted: true, priority: true },
  });

  // Return task object as is; it only has the id, title, and is_completed status,
  // so no need for sanitization
  return res.status(StatusCodes.CREATED).json(task);
}

async function bulkCreate(req, res, next) {
  // Check for tasks array in request body; if not, send Not Found error.
  const { tasks } = req.body;

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid request data." });
  }

  // Validate each task using joi, and if any task gives an error, send 400 invalid data to server
  const validatedTasks = [];
  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task, {
      abortEarly: false,
    });

    // Send bad request if error present and halt progression
    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Invalid data: Provided task does not match schema.",
      });
    }

    // Add (potentially modified) task to array above if all succeeds. Add userId to array
    validatedTasks.push({ ...value, userId: global.user_id });
  }

  // Add all tasks to database using createMany
  try {
    const result = await prisma.task.createMany({
      data: validatedTasks,
    });

    // Send success to server!
    return res.status(StatusCodes.CREATED).json({
      tasksCreated: result.count,
      totalRequested: validatedTasks.length,
    });

    // Catch errors in creating data
  } catch (error) {
    return next(error);
  }
}

// Returns sanitized list of tasks for current user
async function index(req, res) {
  const whereClause = { userId: global.user_id };

  // Parse filter query params and build where clause
  const { find, isCompleted, priority, min_date, max_date } = req.query;

  // find: task titles based on search word
  if (find) {
    whereClause.title = {
      contains: find,
      mode: "insensitive",
    };
  }

  // isCompleted: tasks matching isCompleted boolean
  if (isCompleted !== "undefined") {
    whereClause.isCompleted = isCompleted === "true";
  }

  // priority: matches given priority level (low, medium, high)
  if (priority) {
    whereClause.priority = priority;
  }

  // min and max dates: task falls within defined intervals
  // If either exist, create object in whereClause for createdAt
  if (min_date || max_date) {
    whereClause.createdAt = {};

    if (min_date) {
      whereClause.createdAt.gte = new Date(min_date);
    }
    if (max_date) {
      whereClause.createdAt.lte = new Date(max_date);
    }
  }

  // Parse page and limit from query parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  // Verify that both page and limit are within valid ranges and send error to server if not
  if (!page >= 1 || !(limit >= 1 && limit <= 100)) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Page or limit query not within appropriate ranges" });
  }

  // Calculate skip value (to know how many tasks to skip)
  const skip = (page - 1) * limit;

  // Filter out tasks only related to current user based on skip and limit
  const tasks = await prisma.task.findMany({
    where: whereClause,
    select: {
      title: true,
      isCompleted: true,
      id: true,
      priority: true,
      createdAt: true,
      User: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    take: limit,
    skip,
    orderBy: createOrderBy(req.query),
  });

  // If no user tasks found, raise 404 not found
  if (!tasks.length) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Tasks were not found." });
  }

  // Find count of total tasks for pagination metadata
  const totalUserTasksCount = await prisma.task.count({
    where: whereClause,
  });

  // Find total number of pages for pagination metadata
  const totalPages = Math.ceil(totalUserTasksCount / limit);

  // Build pagination object
  const pagination = {
    page,
    limit,
    total: totalUserTasksCount,
    pages: totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
  // Return row of data
  return res.json({
    tasks,
    pagination,
  });
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
      select: {
        title: true,
        isCompleted: true,
        id: true,
        priority: true,
        createdAt: true,
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
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
    console.log("Global user id in my file");
    console.log(global.user_id);
    const findTask = await prisma.task.findUnique({
      where: {
        id: taskToFindId,
      },
    });
    console.log("This is the task we are trying to find");
    console.log(findTask);
    task = await prisma.task.update({
      data: value,
      where: {
        id: taskToFindId,
        userId: global.user_id,
      },
      select: { title: true, isCompleted: true, id: true, priority: true },
    });
    // Return updated object
    return res.json(task);
  } catch (err) {
    console.log("We have an error!");
    console.log(err.message);
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
      select: { id: true, isCompleted: true, title: true, priority: true },
    });
    // Return deleted task
    return res.json(deletedTask);
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
}

module.exports = { create, bulkCreate, index, show, update, deleteTask };
