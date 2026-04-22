// Create custom error classes that inherit from Error superclass
class ValidationError extends Error {
  constructor(message) {
    super(message); // call Error class with message
    this.name = "ValidationError"; // name attribute when an instance of this class is created
    this.statusCode = 400;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = 404;
  }
}

class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnauthorizedError";
    this.statusCode = 401;
  }
}

module.exports = { ValidationError, NotFoundError, UnauthorizedError };
