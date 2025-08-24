import { asyncHandler } from "../utils/asyncHandler.js";

/*
Actual implementation of whe /register URL is hit.
*/
const registerUser = asyncHandler(async (req, res) => {
  res.status(200).json({
    message: "ok",
  });
});

export { registerUser };
