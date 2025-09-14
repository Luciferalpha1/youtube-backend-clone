import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessandRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId); // got user from db. (fresh instance)
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    //Adding refreshToken to the user object i.e in the db
    user.refreshToken = refreshToken;
    /*
    Saving this inside the DB,
    note: the userSchema tells us that password/avatar/email etc field are required and here we are only sending/adding the refreshToken inside the user object in the db.
    Although we have email,avatar etc already stored in the obj, we dont have password field as we had removed it already.
    Hence we use "validateBeforeSave: false" as we dont want any schemaValidation during the saving of refreshToken in the db.
    */
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Access and Refresh Token couldnt be generated.");
  }
};

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

//? Crazy Login Functionality.
const loginUser = asyncHandler(async (req, res) => {
  //! TODOS FOR LOGIN USER:
  /*
  1. Receive Login Request from frontend (req.body)
  2. Check if email/username is provided. (error handle if not provided)
  3. Find User in database
  4. Verify Password 
  5. Give user access token and refresh token (important)
  6. send cookies(secure)
  7. Send respone with accessToken (not password)
*/
  //! 1. Receive Info from frontend.
  const { email, username, password } = req.body;

  //! 2. Check if email/username is provided.
  if (!(username || email)) {
    new ApiError(400, "username or email is mandatory.");
  }

  //! 3. Finding User in database by either username or password.
  /*
  User cannot be used here as it is an object of monogoDB's mongoose, methods availble using User object is "findone() etc."
  The response back from mongoDB (instance) is stored in "user" which is defined below, so use this instance if you want details already fetched from mongoDB.
  */
  const user = await User.findOne({
    $or: [{ username }, { email }], //mongoose "or" operator (very useful)
  });

  if (!user) {
    throw new ApiError(
      400,
      "User does not exist. Make sure to register yourself"
    );
  }

  //! 4. Verfication of password
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid email or password.");
  }

  //! 5. User AccessToken and RefreshToken
  /*
  called the generateAcessandRefreshToken function which returns accessToken and refreshToken.
  */
  const { accessToken, refreshToken } = await generateAccessandRefreshToken(
    user._id
  );

  //fresh instance of user which is created just after user has logged in (without password and refreshToken)
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //! 6. Send in Cookies (using cookie parser)
  /*
  
  */
  // makes the cookies secure and only modifiable by the server.
  const options = {
    httpOnly: true,
    secure: true,
  };

  //! 7. Return Respone to frontend.
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully."
      )
    );
});

//? Crazy Logout Functionality.
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id, //to find. (this user was from the authmiddlewares we made, check for clarity.)
    {
      $set: {
        refreshToken: null, //to update.
      },
    },
    {
      new: true, //returns the updated document.
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  //updating the cookies (clearing them)
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully."));
});

export { logoutUser, registerUser, loginUser };
