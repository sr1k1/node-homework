const os = require("os");
const path = require("path");
const fs = require("fs");

const sampleFilesDir = path.join(__dirname, "sample-files");
if (!fs.existsSync(sampleFilesDir)) {
  fs.mkdirSync(sampleFilesDir, { recursive: true });
}

// OS module
console.log("Platform: ", os.platform());
console.log(`CPU: ${os.cpus()[0]["model"]}`);
console.log("Total Memory: ", os.totalmem());

// Path module
// Join given path above with path to sample.txt
const path1 = "/sample/path";
const path2 = "/to/sample.txt";
const pathToSampleTxt = path.join(path1, path2);
console.log(`Joined path: ${pathToSampleTxt}`);

// fs.promises API
// Write file called demo.js
async function writeToDemo() {
  const demoFilePath = path.join(sampleFilesDir, "demo.txt");
  const content = "what to get, strawberries or blueberries?";

  // Write content to file
  await fs.promises.writeFile(demoFilePath, content);

  // Read content from file and print to console
  const fileResult = await fs.promises.readFile(demoFilePath, "utf8");
  console.log(`fs.promises read: ${fileResult}`);
}
writeToDemo();

// Streams for large files- log first 40 chars of each chunk

async function useReadableStreams() {
  // Begin by creating file
  const filePath = path.join(sampleFilesDir, "largefile.txt");
  await fs.promises.writeFile(filePath, "start\n");

  // Loop through and append the same phrase 100 times
  const content =
    "Good day to you sir... may I interest you in some strawberries and blueberries? I understand that you are in need of such delicacies. \n";
  for (let i = 0; i < 100; i++) {
    await fs.promises.appendFile(filePath, content);
  }

  // Once this is done, read the file stream
  const readFileStream = fs.createReadStream(filePath, {
    encoding: "utf8",
    highWaterMark: 1024,
  });

  // Console logging per chunk
  readFileStream.on("data", (chunk) => {
    console.log(
      "Read chunk: first 40 characters of line: ",
      chunk.slice(0, 40),
    );
  });

  // End behavior
  readFileStream.on("end", () => {
    console.log("Finished reading large file with streams.");
  });
  return;
}
useReadableStreams();
