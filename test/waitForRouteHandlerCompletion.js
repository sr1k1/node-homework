// "echo \"Error: no test specified\" && exit 1"

const waitForRouteHandlerCompletion = async (func, req, res) => {
  let next;

  // create promise that only resolves if response has result or next() is called
  const promise = new Promise((resolve, reject) => {
    // define "next" sensor using a mock function
    next = jest.fn((error) => {
      // if an error is encountered when processing the route handler,
      // the "next" function we have defined here will send that error up to the test
      // for us to see

      // If no error raised, that means that an actual next() function was attemptedly called in
      // the route handler, so resolve below
      if (error) {
        return reject(error);
        resolve();
      }
    });

    // if route handler processed successfully and response object was completely
    // created, no need for next and our process is resolved
    res.on("finish", () => {
      resolve();
    });
  });

  // await function and promise calls so that response object can
  // be adequately processed
  await func(req, res, next);
  await promise;
  return next; // can use .toHaveBeenCalled() to see if next was called, outside of this function's scope
};

// export function
module.exports = waitForRouteHandlerCompletion;
