const fs = require("fs");
const path = require("path");

// Write a sample file for demonstration
const fileContent = "Hello, async world!";

// Save path name for access
const filePath = path.join(__dirname, "sample-files", "sample.txt");

fs.writeFile(filePath, fileContent, (error) => {
  if (error) {
    console.error(error);
  }
});

// Because fs.readFile is an asynchronous function, we only console.log
// the output once we have asynchronously obtained the content.

// 1. Callback style
// Pass callback function into fs.readFile

fs.readFile(filePath, "utf8", (err, fileLine) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`Callback read: ${fileLine}`);
  }
});

// Callback hell example (test and leave it in comments):

// Callback h*ll happens when you want to use the above style to make
// multiple asynchronous actions based on the last. For example, if I
// wanted to write multiple lines into the sample text file, it would
// look as follows:

// const content1 = "\n hello world";
// const content2 = "\n this is the second line";
// const content3 = "\n dear god how deep are we getting";

// // line 1
// fs.appendFile(filePath, content1, (error) => {
//   if (error) {
//     console.error(error);
//   } else {
//     // line 2
//     fs.appendFile(filePath, content2, (error) => {
//       if (error) {
//         console.error(error);
//       } else {
//         // line 3
//         fs.appendFile(filePath, content3, (error) => {
//           if (error) {
//             console.error(error);
//           }
//         });
//       }
//     });
//   }
// });

// 2. Promise style
// Create a promise that resolves or rejects based on successful retrieval
try {
  new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, fileLine) => {
      if (err) {
        reject(err);
      } else {
        resolve(fileLine);
      }
    });
  }).then((resolvedLine) => console.log(`Promise read: ${resolvedLine}`));
} catch (err) {
  console.error(err);
}

// 3. Async/Await style
// Create async function and await readfile before console logging!
async function asyncReadFile() {
  try {
    const retrievedLine = await new Promise((resolve, reject) => {
      fs.readFile(filePath, "utf8", (err, fileLine) => {
        if (err) {
          reject(err);
        } else {
          resolve(fileLine);
        }
      });
    });
    console.log(`Async/Await read: ${retrievedLine}`);
  } catch (err) {
    console.error(err);
  }
}
asyncReadFile();
