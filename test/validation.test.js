// Import all schemas to test
const { userSchema } = require("../validation/userSchema");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

describe("user object validation tests", () => {
  it("1. doesn't permit a trivial password", () => {
    const user = {
      name: "Bob",
      email: "bob@sample.com",
      password: "password",
    };
    const { error } = userSchema.validate(user, { abortEarly: false });

    // Search for password context key in error that is expected to be raised
    expect(
      error.details.find((detail) => {
        return detail.context.key === "password";
      }),
    ).toBeDefined();
  });
  it("2. the user schema requires that an email be specified", () => {
    const user = {
      name: "Bob",
      password: "4#uN@teLyyHehe",
    };
    const { error } = userSchema.validate(user, { abortEarly: false });

    // search for email context key in expected error
    expect(
      error.details.find((detail) => {
        return detail.context.key === "email";
      }),
    ).toBeDefined();
  });
  it("3. the user schema does notaccept an invalid email", () => {
    const user = {
      name: "Bob",
      email: "bohemiansticks",
      password: "4#uN@teLyyHehe",
    };
    const { error } = userSchema.validate(user, { abortEarly: false });

    expect(
      error.details.find((detail) => {
        return detail.context.key === "email";
      }),
    ).toBeDefined();
  });
  it("4. the user schema requires a password", () => {
    const user = {
      name: "Bob",
      email: "bob@sample.com",
    };
    const { error } = userSchema.validate(user, { abortEarly: false });

    expect(
      error.details.find((detail) => {
        return detail.context.key === "password";
      }),
    ).toBeDefined();
  });
  it("5. the user schema requires name", () => {
    const user = {
      email: "bob@sample.com",
      password: "4#uN@teLyyHehe",
    };
    const { error } = userSchema.validate(user, { abortEarly: false });

    expect(
      error.details.find((detail) => {
        return detail.context.key === "name";
      }),
    ).toBeDefined();
  });
  it("6. the name must be valid (3 to 30 characters)", () => {
    const user = {
      name: "Bo",
      email: "bob@sample.com",
      password: "4#uN@teLyyHehe",
    };
    const { error } = userSchema.validate(user, { abortEarly: false });

    expect(
      error.details.find((detail) => {
        return detail.context.key === "name";
      }),
    ).toBeDefined();
  });
  it("7. if validation performed on a valid user object, error comes back falsy", () => {
    const user = {
      name: "Bob",
      email: "bob@sample.com",
      password: "4#uN@teLyyHehe",
    };
    const { error } = userSchema.validate(user, { abortEarly: false });

    // Expect for there to be no errors
    expect(error).toBeFalsy();
  });
});

describe("task object validation tests", () => {
  it("8. the task schema requires a title", () => {
    const task = {
      isCompleted: "false",
      priority: "medium",
    };

    const { error } = taskSchema.validate(task, { abortEarly: false });

    // Expect error key to be "title"
    expect(
      error.details.find((detail) => {
        return detail.context.key === "title";
      }),
    ).toBeDefined();
  });
  it("9. if an isCompleted value is specified, it must be valid", () => {
    const task = {
      title: "the first task",
      isCompleted: "falsetto",
    };

    const { error } = taskSchema.validate(task, { abortEarly: false });

    // Expect isCompleted to be flagged
    expect(
      error.details.find((detail) => {
        return detail.context.key === "isCompleted";
      }),
    ).toBeDefined();
  });
  it("10. if isCompleted not present but an otherwise valid object, isCompleted is set to false", () => {
    const task = {
      title: "the first task",
    };

    const { value } = taskSchema.validate(task, { abortEarly: false });

    // Expect no error
    expect(value.isCompleted).toBe(false);
  });
  it("11. if isCompleted is true, it must remain true after validation", () => {
    const task = {
      title: "the first task",
      isCompleted: true,
    };

    const { value } = taskSchema.validate(task, { abortEarly: false });

    // Expect isCompleted to be true
    expect(value.isCompleted).toBe(true);
  });
});

describe("patchTaskSchema validation tests", () => {
  it("12. patchTaskSchema does not require a title", () => {
    const task = {
      isCompleted: false,
    };
    const { error } = patchTaskSchema.validate(task, { abortEarly: false });

    expect(error).toBeFalsy();
  });
  it("13. if no value is provided for isCompleted, this remains undefined in return", () => {
    const task = {
      priority: "low",
    };
    const { value } = patchTaskSchema.validate(task, { abortEarly: false });

    expect(value.isCompleted).toBeUndefined();
  });
});
