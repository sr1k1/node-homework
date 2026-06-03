require("dotenv").config();
const request = require("supertest");

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const prisma = require("../db/prisma");

// helpful globals
let agent;
let saveRes;

// import app and server
const { app, server } = require("../app");

beforeAll(async () => {
  // clear database
  await prisma.Task.deleteMany();
  await prisma.User.deleteMany();

  agent = request.agent(app);
});

afterAll(async () => {
  prisma.$disconnect();
  server.close();
});

// Tests

describe("register a user", () => {
  let saveRes = null;

  it("46. it creates the user entry", async () => {
    const newUser = {
      name: "John Deere",
      email: "jdeere@example.com",
      password: "Pa$$word20",
    };

    saveRes = await agent.post("/api/users/register").send(newUser);
    expect(saveRes.status).toBe(201);
  });

  it("47. registration returns an object with the expected name", async () => {
    expect(saveRes.body.user.name).toBe("John Deere");
  });

  it("48. registration returns an object with a csrfToken", async () => {
    expect(saveRes.body.csrfToken).toBeDefined();
  });

  it("49. you can log in as the newly registered user", async () => {
    const returningUser = {
      email: "jdeere@example.com",
      password: "Pa$$word20",
    };

    saveRes = await agent.post("/api/users/logon").send(returningUser);
    expect(saveRes.status).toBe(200);
  });

  it("50. verify that you are logged in (i.e. /api/tasks should not return a 401", async () => {
    saveRes = await agent.get("/api/tasks");
    expect(saveRes.status).toBe(200);
  });

  it("51. verify that you can log out", async () => {
    saveRes = await agent.post("/api/users/logoff");
    expect(saveRes.status).toBe(200);
  });

  it("52. make sure you are really logged out: /api/tasks should now return a 401", async () => {
    saveRes = await agent.get("/api/tasks");
    expect(saveRes.status).toBe(401);
  });
});
