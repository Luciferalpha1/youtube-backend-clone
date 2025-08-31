import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/*
Actual implementation of when /register URL is hit.
? Try to understand this more deeply (mainly the mongoose methods)
*/
const registerUser = asyncHandler(async (req, res) => {
  /*
  !REAL LOGIC FOR REGISTERING THE USER:
   1. get user details from frontend
   2. validation of all inputs. (if they are of correct type and not empty)
   3. Check if user already exists (username and email)
   4. check for images, majorly check for avatar
   5. If available then upload to cloudinary, avatar check.
   6. Create user object - create entry in db
   7. remove password and refresh token field from response. (you basically get whole object so removing the sensitive content is better. )
   8. Check for user creation 
   9. return this response if user is created or handle the error.

  req.body - this is the method that contains the incoming data (form, JSON)  (data can also come from some URL, we use different method for it.)
  */

  //! 1. Get details from frontend.
  const { fullName, email, username, password } = req.body;
  console.log("email", email);

  if (
    // Put all inputs into an array so we can check them easily
    [fullName, email, username, password].some(
      (field) =>
        // For each input (field), remove spaces at start and end using trim()
        // Example: "   hello  " -> "hello", "   " -> ""
        // Then check if it becomes an empty string ""
        field?.trim() === ""
    )
  ) {
    //using the ApiError class we made
    throw new ApiError(400, "All field are required.");
  }
  // validating email using string.includes()
  if (!email.includes("@")) {
    throw new ApiError(400, "Invalid email address");
  }

  //! 2. Checking if User already exists.
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError(409, "User with this username or email already.exists.");
  }

  //! 3. Checking for avatar: (also error handled)
  const avatarLocalFilePath = req.files?.avatar[0]?.path;
  const coverImageLocalFilePath = req.files?.coverImage[0]?.path;

  if (!avatarLocalFilePath) {
    throw new ApiError(400, "Avatar Image needed.");
  }

  console.log("Avatar Local File Path", avatarLocalFilePath);

  //! 4. Upload avatar to Cloudinary: (also error handled)
  const avatar = await uploadOnCloudinary(avatarLocalFilePath);
  const coverImage = await uploadOnCloudinary(coverImageLocalFilePath);

  if (!avatar) {
    throw new ApiError(400, "Avatar Images has not been uploaded.");
  }

  //! 5. Creating User in db
  /*
  creates user using create method in mongoose.
  .toLowerCase() is a string method.
  coverImage doesnt have error handling if you see, hence using optional chaining. 
  */
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(), //we prefer lowercase strings.
  });

  //! 8.Checking if user has been created or not
  //! 6. Also removing password and refreshToken while returning shi
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "User was not created.");
  }

  //! 9. Returning response of created user.
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User created successfully."));
});

export { registerUser };
