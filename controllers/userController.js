// ===================== Imports ===================== //
// Status codes for server
const { StatusCodes } = require("http-status-codes");

// Import(s) for db connection
const prisma = require("./../db/prisma");

// Imports for hashing
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);

// Imports for JWT
const jwt = require("jsonwebtoken");

// Function imports
const { userSchema } = require("../validation/userSchema");

// ===================== Hashing Fcns ===================== //
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

// ===================== JWT Creation ===================== //
// Create flags for jwt generation
function cookieFlags(req) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  };
}

// Setter for cookie based on request
function setJwtCookie(req, res, user) {
  const payload = {
    id: user.id,
    csrfToken: crypto.randomUUID(),
  };

  // Put payload into a jwt token and sign with secret key
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

  // create cookie with the token and attach to response
  // Cookie flags have to be different in production vs in testing.
  // (maxAge is time in milliseconds, 1hr here)
  res.cookie("jwt", token, { ...cookieFlags(req), maxAge: 3600000 });

  // return csrf token because we will need it in logon and register
  return payload.csrfToken;
}

// ===================== Routers ===================== //
async function register(req, res, next) {
  // Check for presense of req.body
  if (!req.body) {
    req.body = {};
  }

  // Verify if a real person is trying to log in using recaptcha
  let isPerson = false;

  if (req.body.recaptchaToken) {
    const token = req.body.recaptchaToken;
    const params = new URLSearchParams();

    // append our required parameters to params
    params.append("secret", process.env.RECAPTCHA_SECRET);
    params.append("response", token);
    params.append("remoteip", req.ip);

    // could throw error that we process as 500
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        body: params.toString(),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const data = await response.json();

    // if successful response to passed in token, resolve person's existence
    if (data.success) {
      isPerson = true;
    }

    delete req.body.recaptchaToken;

    // also verify the person if the recaptcha bypass is being used
  } else if (
    process.env.RECAPTCHA_BYPASS &&
    req.get("X-Recaptcha-Test") === process.env.RECAPTCHA_BYPASS
  ) {
    isPerson = true;
  }

  if (!isPerson) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Bot verification failed. Please complete the reCAPTCHA.",
    });
  }

  // Validate body and raise appropriate error
  const { error, value } = userSchema.validate(req.body, {
    abortEarly: false,
  });

  // Send Bad Request to server if error present in joi validation
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
    const userAndTaskCreationResult = await prisma.$transaction(async (tx) => {
      // Create user
      user = await tx.user.create({
        data: {
          name: value.name,
          email: value.email,
          hashedPassword: value.hashedPassword,
        },
        select: { name: true, email: true, id: true },
      });

      // Create three welcome tasks and put all three
      // task objects in a list to invoke createMany later
      const welcomeTasksData = [
        {
          title: "Complete your profile",
          userId: user.id,
          priority: "medium",
        },
        {
          title: "Add your first task",
          userId: user.id,
          priority: "high",
        },
        {
          title: "Explore the app",
          userId: user.id,
          priority: "low",
        },
      ];

      // Create all three tasks in database
      await tx.task.createMany({ data: welcomeTasksData });

      // Fetch all tasks to return upon registration completion
      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: user.id,
          title: { in: welcomeTasksData.map((task) => task.title) },
        },
        select: {
          id: true,
          title: true,
          isCompleted: true,
          userId: true,
          priority: true,
        },
      });

      // Return the user and welcome tasks
      return { user, welcomeTasks };
    });

    // Create JWT, set it in cookie, and extract CSRF token
    const csrfToken = setJwtCookie(req, res, user);

    return res.status(StatusCodes.CREATED).json({
      user: userAndTaskCreationResult.user,
      csrfToken,
      welcomeTasks: userAndTaskCreationResult.welcomeTasks,
      transactionStatus: "success",
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
}

async function logon(req, res) {
  // unpack email and password from request body
  let { email, password } = req.body;

  // Set all emails to lower case because future joi validations lower case the emails,
  // so that Joi doesn't potentially fail validation later
  email = email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  // Check if a user was found; if not, send back 401 error
  if (user) {
    // Look up in database again, but this time to retrieve password
    const userPass = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        hashedPassword: true,
      },
    });
    // Compare password to stored hash; return unauthenticated if mismatch
    const arePasswordsMatching = await comparePassword(
      password,
      userPass.hashedPassword,
    );

    if (arePasswordsMatching) {
      // Set cookie and return CSRF token as payload
      const csrfToken = setJwtCookie(req, res, user);

      return res.status(StatusCodes.OK).json({
        ...user,
        csrfToken,
      });
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
  // Clear cookie and return status code of OK
  res.clearCookie("jwt", cookieFlags(req));
  return res.sendStatus(StatusCodes.OK);
  return;
}

// Optional show method
async function show(req, res) {
  // Pull out userId if it exists
  const userId = parseInt(req.params?.id);

  // If no user id found, send bad request
  if (!userId) {
    return res
      .send(StatusCodes.BAD_REQUEST)
      .json({ message: "No user id supplemented." });
  }

  // If user id is given, find user and associate tasks.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      Task: {
        where: { isCompleted: false },
        select: {
          id: true,
          title: true,
          priority: true,
          createdAt: true,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    },
  });

  // Null value returned if no user found; send appropriate server response
  if (!user) {
    res.status(StatusCodes.NOT_FOUND).json({ message: "User not found. " });
  }

  // Send non-empty response to server
  return res.status(StatusCodes.OK).json(user);
}

module.exports = { register, logon, logoff, show };
