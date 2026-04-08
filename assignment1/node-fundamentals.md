# Node.js Fundamentals

## What is Node.js?

Node is essentially JavaScript that is runnable by our local machines. Given that JavaScript ordinarily runs on the browser-side in a sandbox, Node allows us to use JavaScript in a less restrictive environment.

## How does Node.js differ from running JavaScript in the browser?

Node.js differs from running JavaScript in the browser in that we are offered different freedoms and different restrictions on what we can and cannot do with JavaScript. Unlike browser-side JS, Node does not have access to the window and document objects; however, Node **is** able to access the global object, which gives it access to the machine's file system and various networking APIs. A wealth of other benefits become available as a result (e.g. manipulating system files, beginning programs in the CLI, REPL), but we are overall offered a more flexible sandbox to work with JavaScript code.

## What is the V8 engine, and how does Node use it?

The V8 engine is the system that parses and runs JavaScript code. The engine was created by Google Chrome to run JS code within the browser, but because the engine is independent of the browser, it was later used to power JS code parsing and execution in Node!

Source: https://nodejs.org/learn/getting-started/the-v8-javascript-engine

## What are some key use cases for Node.js?

Node.js is very helpful in creating code for backend purposes! Some of these key use cases include creating servers that respond to requests with data and creating APIs for others to use for... well, retrieving data!

## Explain the difference between CommonJS and ES Modules. Give a code example of each.

The main difference between CommonJS and ES modules is the syntax we use in importing and exporting functions. Below highlights some of these differences:

**CommonJS (default in Node.js):**

```js
// Exporting
module.exports { fcn1, fcn2 };


// Importing
const { fcn1, fcn2 } = require("./file/to/path.js")
```

**ES Modules (supported in modern Node.js):**

```js
// Exporting
export { fcn1, fcn2 };

// Importing
import { fcn1, fcn2 } from "./file/to/path.js";
```
