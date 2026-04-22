const express = require("express");
const router = express.Router();

// Data imports
const dogs = require("../dogData.js");

// Import custom Error classes
const { ValidationError, NotFoundError } = require("../errors");

router.get("/dogs", (req, res) => {
  res.json(dogs);
});

router.post("/adopt", (req, res) => {
  const { name, address, email, dogName } = req.body;

  // if any required fields are missing
  if (!name || !email || !dogName) {
    throw new ValidationError("Missing required fields");
  }

  // if dog not available
  const requestedDog = dogs.find((dog) => dog.name === dogName);
  if (!requestedDog || requestedDog?.status !== "available") {
    throw new NotFoundError("Dog not found or not available");
  }

  return res.status(201).json({
    message: `Adoption request received. We will contact you at ${email} for further details.`,
  });
});

router.get("/error", (req, res) => {
  throw new Error("Internal Server Error");
});

module.exports = router;
