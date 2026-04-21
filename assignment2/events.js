const Emitter = require("node:events");

// Create emitter
const timeEmitter = new Emitter();

// ===================== Helper functions ========================== //
// Create time normalizer (i.e. tack on a 0 if number is less than 10)
function standardizeTime(timeNum) {
  if (timeNum < 10) {
    return `0${timeNum}`;
  }
  return `${timeNum}`;
}

// Create current time object
function getTime() {
  // Create new Date object.
  const currentDate = new Date();

  // Return time from current date object
  return `${standardizeTime(currentDate.getHours())}:${standardizeTime(currentDate.getMinutes())}:${standardizeTime(currentDate.getSeconds())}`;
}

// Create listener logic for emitter
timeEmitter.on("time", (timeObj) => {
  timeObj.currentTime = getTime();
  console.log(`Time received: ${timeObj.currentTime}`);
});

// Test emitter logic
setInterval(() => {
  timeEmitter.emit("time", {});
  return;
}, 5000);

module.exports = timeEmitter;
