const { StatusCodes } = require("http-status-codes");

// Import(s) for db connection
const pool = require("./../db/pg-pool");

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
  value.hashed_password = await hashPassword(value.password);

  // Attempt inserting this new user into table; error thrown if email
  // is already registered
  try {
    user = await pool.query(
      `INSERT INTO users (email, name, hashed_password) 
      VALUES ($1, $2, $3) RETURNING id, email, name`,
      [value.email, value.name, value.hashed_password],
    );
  } catch (e) {
    // Email might already be registered
    // Error codee for unique constraint for email violated
    if (e.code === "23505") {
      return res.status(400).json({ message: "Email already registered." });
    }

    // If error not of unique email violation, pass to error handler
    return next(e);
  }

  // Set global user to new user and send object to server
  global.user_id = user.rows[0].id;

  res
    .status(StatusCodes.CREATED)
    .json({ name: user.rows[0].name, email: user.rows[0].email });
}

async function logon(req, res) {
  // unpack email and password from request body
  const { email, password } = req.body;

  // Search database for user with matching email
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);

  // Check if a user was found; if not, send back 401 error
  if (result.rows.length) {
    // Compare password to stored hash; return unauthenticated if mismatch
    const arePasswordsMatching = await comparePassword(
      password,
      result.rows[0].hashed_password,
    );

    if (arePasswordsMatching) {
      global.user_id = result.rows[0].id;
      return res
        .status(StatusCodes.OK)
        .json({ name: result.rows[0].name, email: result.rows[0].email });
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
