const { StatusCodes } = require("http-status-codes");

// Function imports
const { userSchema } = require("../validation/userSchema");

function register(req, res) {
  // Check for presense of req.body
  if (!req.body) {
    req.body = {};
  }

  console.log(req.body);
  // Validate body and raise appropriate error
  const { error, value } = userSchema.validate(req.body, {
    abortEarly: false,
  });

  console.log(value);
  // Send Bad Request to server if error present
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }

  // make copy of passed-in user
  const newUser = { ...value };

  // Add current user to list of all users and make user the logged-in user
  global.users.push(newUser);
  global.user_id = newUser;

  delete value.password;

  console.log("All users:");
  console.log(global.users);
  // Send back everything but the password
  res.status(StatusCodes.CREATED).json(value);
}

function logon(req, res) {
  // unpack email and password from request body
  const { email, password } = req.body;

  // Find existance of user with matching email
  const foundUser = global.users.find((userObj) => {
    return userObj.email === email;
  });

  // Authenticate only if user is found AND password matches
  if (foundUser && foundUser?.password === password) {
    global.user_id = foundUser;
    console.log("Current user");
    console.log(foundUser.name);
    res.status(StatusCodes.OK).json({ name: foundUser.name, email: email });
  }

  // Otherwise, return UNAUTHORIZED status and say that Authentication failed
  else {
    res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Authentication Failed." });
  }
  return;
}

function logoff(req, res) {
  // Set current user to null and return status code of OK
  global.user_id = null;
  res.sendStatus(StatusCodes.OK);
  return;
}

module.exports = { register, logon, logoff };
