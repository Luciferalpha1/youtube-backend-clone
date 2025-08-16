/*
! MAKING A STANDARDIZED ERROR HANDLING FORMAT (our own)
? make it more standardized.
which will help us to refine our codebase and make it a bit professional.
*/

class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went Wrong!",
    errors = [], //the actuall errors, put in an array.
    stack = "" // error stack. (if not empty string.)
  ) {
    super(message); //calling the constructor in the parent Error class so that initialization is done.
    this.statusCode = statusCode;
    this.data = null;
    this.errors = errors;
    this.success = false;

    //dont know much about this (too high level), can skip is not req.
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
