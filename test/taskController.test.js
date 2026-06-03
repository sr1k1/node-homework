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
  it("14. cannot create a task without a user id", async () => {
    // create mock request using node-http-mocks package
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });

    // save response in saveRes; EventEmitter class given so that res can emit events (like "finish"?)
    saveRes = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    // Call expect.assertions to ensure that our expect gets called for sure
    // (and that our test fails if that expect ISN'T run)
    expect.assertions(1);
    try {
      // Await route handler to finish processing and saving relevant information in res
      await waitForRouteHandlerCompletion(create, req, saveRes);
    } catch (e) {
      expect(e.name).toBe("TypeError");
    }
  });

  it("15. cannot create a task with bogus id", async () => {
    // create mock request using node-http-mocks package
    const req = httpMocks.createRequest({
      user: { id: 9999 },
      method: "POST",
      body: { title: "first task" },
    });

    saveRes = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    expect.assertions(1);
    try {
      // Await route handler to finish processing and saving relevant information in res
      await waitForRouteHandlerCompletion(create, req, saveRes);
    } catch (e) {
      expect(e.name).toBe("PrismaClientKnownRequestError");
    }
  });

  it("16. valid user id leads create() to succees with 201", async () => {
    // create mock request using node-http-mocks package
    const req = httpMocks.createRequest({
      user: { id: user1.id },
      method: "POST",
      body: { title: "first task" },
    });

    saveRes = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    expect.assertions(1);

    // Await route handler to finish processing and saving relevant information in res
    await waitForRouteHandlerCompletion(create, req, saveRes);
    expect(saveRes.statusCode).toBe(201);
  });

  it("17. object returned from create() call has expected call", async () => {
    // retrieve data from JSON and analyze components
    saveData = saveRes._getJSONData();

    expect.assertions(1);
    expect(saveData.title).toBe("first task");
  });

  it("18. object has right value for isCompleted", async () => {
    expect.assertions(1);
    expect(saveData.isCompleted).toBe(false);
  });

  it("19. object has no value for userId", async () => {
    expect.assertions(1);
    expect(saveData.userId).toBeUndefined();

    // save id of object
    saveTaskId = saveData.id;
  });
});

describe("test getting created tasks with index", () => {
  it("20. you can't get a list of tasks without a user id", async () => {
    // create mock request using node-http-mocks package
    const req = httpMocks.createRequest({
      method: "GET",
    });

    saveRes = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    expect.assertions(1);

    try {
      // Await route handler to finish processing and saving relevant information in res
      await waitForRouteHandlerCompletion(index, req, saveRes);
      expect(saveRes.statusCode).toBe(201);
    } catch (e) {
      expect(e.name).toBe("TypeError");
    }
  });

  it("21. if you use user1 id, call returns a 200", async () => {
    // create mock request using node-http-mocks package
    const req = httpMocks.createRequest({
      user: { id: user1.id },
      method: "GET",
    });

    saveRes = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    expect.assertions(1);
    await waitForRouteHandlerCompletion(index, req, saveRes);

    expect(saveRes.statusCode).toBe(200);
  });

  it("22. returned object has a tasks array of length 1", async () => {
    // parse returned JSON data
    saveData = saveRes._getJSONData();

    expect.assertions(1);
    expect(saveData.tasks.length).toBe(1);
  });

  it("23. the title in the first array object is as expected", async () => {
    expect.assertions(1);
    expect(saveData.tasks[0].title).toBe("first task");
  });

  it("24. the first array object does not contain a userId", async () => {
    expect.assertions(1);
    expect(saveData.tasks[0].userId).toBeUndefined();
  });

  it("25. if you get a list of tasks using userId from user2, you get a 404", async () => {
    // create mock request using node-http-mocks package
    const req = httpMocks.createRequest({
      user: { id: user2.id },
      method: "GET",
    });

    saveRes = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    expect.assertions(1);
    await waitForRouteHandlerCompletion(index, req, saveRes);

    expect(saveRes.statusCode).toBe(404);
  });

  it("26. you can retrieve the created task using show()", async () => {
    const req = httpMocks.createRequest({
      user: { id: user1.id },
      params: { id: saveTaskId.toString() },
      method: "GET",
    });
    saveRes = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    expect.assertions(1);
    await waitForRouteHandlerCompletion(show, req, saveRes);

    expect(saveRes.statusCode).toBe(200);
  });

  it("27. user2 can't get this entry, and instead we get a 404", async () => {
    const req = httpMocks.createRequest({
      user: { id: user2.id },
      params: { id: saveTaskId.toString() },
      method: "GET",
    });
    saveRes = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    expect.assertions(1);
    await waitForRouteHandlerCompletion(show, req, saveRes);

    expect(saveRes.statusCode).toBe(404);
  });
});

describe("test updating and deleting tasks", () => {
  it("28. user1 can set task with saveTaskId to isComplete: true", async () => {
    const req = httpMocks.createRequest({
      user: { id: user1.id },
      params: { id: saveTaskId.toString() },
      method: "PATCH",
      body: { isCompleted: true },
    });

    saveRes = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    // Send patch request, await termination, and verify if isCompleted has been changed
    expect.assertions(1);
    await waitForRouteHandlerCompletion(update, req, saveRes);

    saveData = saveRes._getJSONData();
    expect(saveData.isCompleted).toBe(true);
  });

  it("29. user2 cannot update this task.", async () => {
    const req = httpMocks.createRequest({
      user: { id: user2.id },
      params: { id: saveTaskId.toString() },
      method: "PATCH",
      body: { isCompleted: true },
    });

    saveRes = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    expect.assertions(1);
    await waitForRouteHandlerCompletion(update, req, saveRes);

    // Expected to return 404 error (user2 cannot find task defined by user 1)
    expect(saveRes.statusCode).toBe(404);
  });

  it("30. user2 cannot delete this task.", async () => {
    const req = httpMocks.createRequest({
      user: { id: user2.id },
      params: { id: saveTaskId.toString() },
      method: "DELETE",
    });

    saveRes = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    expect.assertions(1);
    await waitForRouteHandlerCompletion(deleteTask, req, saveRes);

    // Expected to return 404 error (user2 cannot find task defined by user 1)
    expect(saveRes.statusCode).toBe(404);
  });

  it("31. user1 can delete this task.", async () => {
    const req = httpMocks.createRequest({
      user: { id: user1.id },
      params: { id: saveTaskId.toString() },
      method: "DELETE",
    });

    saveRes = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    expect.assertions(1);
    await waitForRouteHandlerCompletion(deleteTask, req, saveRes);

    // Expected to return 404 error (user2 cannot find task defined by user 1)
    expect(saveRes.statusCode).toBe(200);
  });

  it("32. retrieving user1's tasks now returns a 404.", async () => {
    const req = httpMocks.createRequest({
      user: { id: user1.id },
      method: "GET",
    });
    saveRes = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    expect.assertions(1);
    await waitForRouteHandlerCompletion(index, req, saveRes);

    expect(saveRes.statusCode).toBe(404);
  });
});
