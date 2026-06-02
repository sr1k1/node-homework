// dotenv to get database urls from .env and save in process.env
require("dotenv").config();

// import utility function to wait for route handlers to complete
const waitForRouteHandlerCompletion = require("./waitForRouteHandlerCompletion");

// set database url to test database to avoid mutating our actual db
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

// import prisma and http mocks to establish mode of communicating with db
const prisma = require("../db/prisma");
const httpMocks = require("node-mocks-http");

// Import controller functions to test
const {
  index,
  show,
  create,
  update,
  deleteTask,
} = require("../controllers/taskController");
const { EventEmitter } = require("pg-cursor");

// Useful globals
let user1 = null;
let user2 = null;
let saveRes = null;
let saveData = null;
let saveTaskId = null;

// Before processing the describe stanzas, empty the test database
// and create the needed user records
beforeAll(async () => {
  // clear tasks database
  await prisma.task.deleteMany();

  // clear users database
  await prisma.user.deleteMany();

  // Create user 1 (Bob)
  user1 = await prisma.user.create({
    data: {
      name: "Bob",
      email: "bob@sample.com",
      hashedPassword: "nonsense",
    },
  });

  // Create user 2 (Alice)
  user2 = await prisma.user.create({
    data: {
      name: "Alice",
      email: "alice@sample.com",
      hashedPassword: "nonsense",
    },
  });
});

// Disconnect prisma after all operations
afterAll(() => {
  prisma.$disconnect();
});

// Begin testing
describe("testing task creation", () => {
  it("14. creates a task", async () => {
    // create mock request using node-http-mocks package
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });

    // save response in saveRes
    saveRes = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    // Await route handler to finish processing and saving relevant
    // information in res
    await waitForRouteHandlerCompletion(create, req, saveRes);

    // Confirm status code
    expectCookies(saveRes.statusCode).toBe(201);
  });
});
