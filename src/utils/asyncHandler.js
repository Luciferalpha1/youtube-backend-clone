//! having to write try/catch for every async/await block is repetitive, hence this will handle it.
/*
? a more easy way to understand aysncHandlers,
   function asyncHandler(fn) {       
    return async function () {
        // ... do something, e.g., try/catch
        await fn(); 
    }
}


fn - the function that has to be wrapped.
req,res,next - taken from the function passed in fn.
await fn() - waiting for the code which is wrapped to execute first.
catch - basic error/json message show when error pops.
next(err) - next(err) is called when you want to use the express's error handler itself.
next() - when you want the func to jump to the next middleware.




const aysncHandler = (fn) => async (req, res, next) => {
  try {
    await fn();
  } catch (error) {
    res.status(error.code || 500).json({
      success: false,
      message: error.message,
    });
  }
};

*/
// A BETTER WAY TO WRITE THE HANDLER. (will learn this deeply more.)
const asyncHandler = (requestHandler) => {
  (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
