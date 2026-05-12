const { StatusCodes } = require("http-status-codes");

// Import(s) for db connection
const pool = require("./../db/pg-pool");
const prisma = require("./../db/prisma");

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
async function register(req, res, next) {
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
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Validation failed", details: error.details });
  }

  let user = null;
  // Hash password and store it in value before saving to database
  value.hashedPassword = await hashPassword(value.password);

  // Attempt inserting this new user into table; error thrown if email
  // is already registered
  try {
    user = await prisma.user.create({
      data: {
        name: value.name,
        email: value.email,
        hashedPassword: value.hashedPassword,
      },
      select: { name: true, email: true, id: true },
    });
  } catch (err) {
    // Email might already be registered
    // Error name and code unique to Prisma client email error
    if (err.name === "PrismaClientKnownRequestError" && err.code === "P2002") {
      return res.status(400).json({ message: "Email already registered." });
    }

    // If error not of unique email violation, pass to error handler
    return next(err);
  }

  // Set global user to new user and send object to server
  global.user_id = user.id;

  res.status(StatusCodes.CREATED).json({ name: user.name, email: user.email });
}

async function logon(req, res) {
  // unpack email and password from request body
  let { email, password } = req.body;

  // Set all emails to lower case because future joi validations lower case the emails,
  // so that Joi doesn't potentially fail validation later
  email = email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Check if a user was found; if not, send back 401 error
  if (user) {
    // Compare password to stored hash; return unauthenticated if mismatch
    const arePasswordsMatching = await comparePassword(
      password,
      user.hashedPassword,
    );

    if (arePasswordsMatching) {
      global.user_id = user.id;
      return res
        .status(StatusCodes.OK)
        .json({ name: user.name, email: user.email });
    } else {
      // Otherwise, return UNAUTHORIZED status and say that Authentication failed
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Authentication Failed." });
    }
  } else {
    // No user matching email found; send 401
    res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "User matching email not found." });
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
