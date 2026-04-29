const { StatusCodes } = require("http-status-codes");

// Imports for hashing
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);

// Function imports
const { userSchema } = require("../validation/userSchema");

// Hashing functions
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

// Routers
async function register(req, res) {
  // Check for presense of req.body
  if (!req.body) {
    req.body = {};
  }

  // Validate body and raise appropriate error
  const { error, value } = userSchema.validate(req.body, {
    abortEarly: false,
  });

  // Send Bad Request to server if error present
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }

  // Hash password and store it in value before saving to database
  const hashedPassword = await hashPassword(value.password);
  value.password = hashedPassword;

  // make copy of passed-in user
  const newUser = { ...value };

  // Add current user to list of all users and make user the logged-in user
  global.users.push(newUser);
  global.user_id = newUser;

  delete value.password;

  // Send back everything but the password
  res.status(StatusCodes.CREATED).json(value);
}

async function logon(req, res) {
  // unpack email and password from request body
  const { email, password } = req.body;

  // Find existance of user with matching email
  const foundUser = global.users.find((userObj) => {
    return userObj.email === email;
  });

  // Authenticate only if user is found AND hashed password matches
  const arePasswordsMatching = await comparePassword(
    password,
    foundUser?.password,
  );

  if (foundUser && arePasswordsMatching) {
    global.user_id = foundUser;
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
