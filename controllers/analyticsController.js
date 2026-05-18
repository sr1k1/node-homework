// Status codes
const { StatusCodes } = require("http-status-codes");

// Import prisma client
const prisma = require("../db/prisma");

// Get method to retrieve analytics data for given user
async function getUserProductivity(req, res) {
  // Parse and validate userID (send bad request to server if not given)
  const userId = parseInt(req.params?.id);

  if (!userId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "No user id was received." });
  }

  // Locate user in database using userId. Send Not Found status to server if not found.
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  // No user located --> send 404 to server
  if (!user) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "User was not found." });
  }

  // Count number of tasks by completion status (true or false)
  const taskStats = await prisma.task.groupBy({
    by: ["isCompleted"],
    where: {
      userId,
    },
    _count: {
      id: true,
    },
  });

  // Find recent tasks
  const recentTasks = await prisma.task.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      createdAt: true,
      userId: true,
      User: {
        select: { name: true },
      },
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  // Calculate weekly progress based on tasks created in the past week.

  // Set date to 7 days earlier by converting everything to milliseconds and performing
  // arithmatic
  const date7DaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const weeklyProgress = await prisma.task.groupBy({
    by: ["createdAt"],
    where: {
      userId,
      createdAt: {
        gte: date7DaysAgo,
      },
    },
    _count: { id: true },
  });

  // Send all data to server
  return res
    .status(StatusCodes.OK)
    .json({ taskStats, recentTasks, weeklyProgress });
}

async function getAllUsersProductivity(req, res) {
  // Parse pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Get all users and counts for their complete and incomplete tasks
  const usersRaw = await prisma.user.findMany({
    include: {
      Task: {
        where: { isCompleted: false },
        select: { id: true },
        take: 5,
      },
      _count: {
        select: {
          Task: true,
        },
      },
    },
    take: limit,
    skip,
  });

  // Sanitize result above by taking out hashedPassword
  const users = usersRaw.map((user) => {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      _count: user._count,
      Task: user.Task,
    };
  });

  // Construct pagination structure
  const totalUsers = await prisma.user.count();

  const totalPages = Math.ceil(totalUsers / limit);
  const pagination = {
    page,
    limit,
    total: totalUsers,
    pages: totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };

  // Return both objects
  return res.json({ users, pagination });
}

module.exports = { getUserProductivity, getAllUsersProductivity };
