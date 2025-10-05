import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
  destroyOnCloudinary,
  uploadOnCloudinary,
} from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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

const registerUser = asyncHandler(async (req, res) => {
  /*
    Actual implementation of when /register URL is hit.
    ? Try to understand this more deeply (mainly the mongoose methods)
    */
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

//? If AccessToken expires,
const refreshAccessToken = asyncHandler(async (req, res) => {
  /*
    The user's accessToken has expired now to refresh this, we will:
      1. Validate the current refreshToken in the cookie with the one in the DB (to check if authorized)
      2. If same, session starts again and the user now receives a new accessToken.
    */

  //req.body.refreshToken is for the mobile app.
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request.");
  }

  //Validation.
  /*
    The refreshToken which the user has(cookie), is encoded by JWT and the refreshToken in the DB is the original one (not encoded).
     hence,
      - decode it using jwt.verify
      - then match the decoded one with the DB  (this also means that the user is logged in)
      - if matched, then generate new accessToken and also refreshToken

      also this can throw errors hence using a try catch will be better.
    */

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    //refreshToken has _id refrence, check the generateRefreshToken().
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    //Checking if refreshToken is expired or already used.
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(
        401,
        "Refresh Token has expired or already been used."
      );
    }

    //If both are equal then only we make new accessToken.
    const { accessToken, refreshToken } = await generateAccessandRefreshToken(
      user._id
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          "200",
          { accessToken, refreshToken: refreshToken },
          "Refresh and Access tokens updated."
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "RefreshToken is invalid.");
  }
});

//? If user wants to change his password. (uses raw data in postman)
const changeCurrentPassword = asyncHandler(async (req, res) => {
  /*
    Firstly, we are going to take input fields from the user which is oldPassword and newPassword in req.body

    As a middleware (verifyJWT) is passed, we already have an instance of the user which is req.user,
    using that we can find its id.

    A personalized method was defined by us which was isPasswordCorrect(), using that we can verify the oldPassword first.

    If its correct, we can store the newPassword sent as user.password and save it in database.
  */

  const { oldPassword, newPassword, confirmPassword } = req.body;

  //this comes from middleware verfiyJWT.
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "The old password given is invalid.");
  }

  if (!(confirmPassword === newPassword)) {
    throw new ApiError(400, "Please re-enter the new password again.");
  }

  //if the oldPassword is correct.
  /*
    if you look at the user model, you can check that before saving we run a .pre, which says that
     - if a password is modified, then sent it hashed to the DB.
     - if not then, next()
  */
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password was changed successfully"));
});

//? controller to get currentuser.
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(
      new ApiResponse(200, req.user, "Current user was fetched successfully.")
    );
});

//? If user wants to update his details:
const updateAccountDetails = asyncHandler(async (req, res) => {
  //the fields user wants to update.
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are mandatory.");
  }

  // Self Explanatory.
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id, //instance comes from auth handler.
    {
      $set: {
        fullName: fullName, //fullname = newfullname (given by user)
        email: email, //email = newEmail (given by user)
      },
    },
    { new: true } //returns whole object with new values.
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Account Details updated Successfully.")
    );
});

//? If user wants to update his images(coverImage, avatar)
const updateUserAvatar = asyncHandler(async (req, res) => {
  /*
    Flow:
   1. multer middleware to handle files.
   2. if user is logged in, can change the coverImage/avatar. (auth middleware)
  */

  //initially we had taken req.files (in register controller) as user had option to send multiple files at the same time.
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError("Avatar file is missing.");
  }

  const updatedAvatar = await uploadOnCloudinary(avatarLocalPath);

  if (!updatedAvatar.url) {
    throw new ApiError(400, "Avatar File couldnt be uploaded.");
  }

  //Delete the oldAvatarImage on cloudinary (error handling has been done in the utility file.)
  await destroyOnCloudinary(req.user?.avatar);

  //Updating user.
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: updatedAvatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Avatar updated successfully."));
});

//? If user wants to update his cover image.
const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError("Cover image file is missing.");
  }

  const updatedCoverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!updatedCoverImage) {
    throw new ApiError(400, "File couldnt be uploaded.");
  }

  //deleting the old url from cloudinary.
  await destroyOnCloudinary(req.user?.coverImage);

  //updating on the DB
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: updatedCoverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Cover Image was updated Successfully.")
    );
});

//? Details required for creating user channel profile.
const getUserChannelProfile = asyncHandler(async (req, res) => {
  // we wil get the username from the url. (hence req.params is used)
  const { username } = req.params;

  //we used trim just to remove whitespaces.
  if (!username.trim()) {
    throw new ApiError(400, "Username not found!");
  }

  /*
   we could have used User.find({username}) as username is already in database. Then get its _id and performed aggregation. 
   But we can directly use $match to find the paramter. 


  ? $match
  Filters documents based on a specified query predicate. Matched documents are passed to the next pipeline stage.
  The syntax for the $match query predicate is identical to the syntax used in the query argument of a find() command.
  In our case, we find one specific user, so only one user is found and passed to the next pipeline.
  To perform a successful match, the types must be identical.
  { $match: { <query predicate> } }
   

  ? "query predicate"
   An expression that returns a boolean indicating whether a document matches the specified query. For example, { name: { $eq: "Alice" } }, which returns documents that have a field "name" whose value is the string "Alice".


  ? $lookup: (layman terms - lookup 1 in 2's file and also add 1's stuff in 2) (left outer join)
     from: "authors" - Specifies the Foreign Collection.
     localField: "author_id" - Specifies the field in the Input document.
     foreignField: "_id" - Specifies the matching field in the Foreign document.
     as: "author_info" - Specifies the name of the new array field in the output. 


     lookups can be multiple but also they are seperate documents,
     As we see below, we have created 2 $lookup documents and then added them using $addfields into the main documented  which is later projected using $project.
  */

  //? aggregation, returns an array which calculated result.

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(), //checking for username in the DB.
      },
    },
    //lookup for finding the subscribers for a channel
    {
      $lookup: {
        from: "subscriptions", //lowercase and plural in db also.
        localField: "_id",
        foreignField: "channel",
        as: "subscribers", // this will be an array.
      },
    },
    //lookup for finding the channels which user has subscribed to.
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo", // this will be an array.
      },
    },

    //add these fields in the schema.
    {
      $addFields: {
        subscribersCount: {
          //$size operator to count the number of elements in the subscribers array (created in the first $lookup). This gives the total number of subscribers for the channel.
          $size: "$subscribers", // Also the $ before subscribers is bcz subscribers is now a field.
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },

        //if subscribed, then returns true, and in frontend, subscribed button can be toggled.
        /* 
        isSubscribed:
         Uses the $cond (conditional) operator to determine if the currently logged-in user (identified by req.user?._id) is subscribed to this channel.
         if condition: It uses the $in operator to check if req.user?._id exists within the array of all subscriber IDs. The expression "$subscribers.subscriber" extracts an array containing only the subscriber ID from every document in the $subscribers array.
         then: If the ID is found (meaning the logged-in user is a subscriber), the field is set to true.
         else: If the ID is not found, the field is set to false.
        */
        isSubscribed: {
          //condition operator.
          $cond: {
            //if req.user.id is there inside the subscribers object, then return true.
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    /*
    The $project stage is a core operator in the MongoDB Aggregation Pipeline used to reshape or restructure documents in the resulting stream.
    It is primarily used to select, rename, calculate, or suppress fields to control exactly what information is passed to the next stage of the pipeline or returned to the user.
    */
    {
      $project: {
        username: 1,
        fullName: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        isSubscribed: 1,
        channelsSubscribedToCount: 1,
      },
    },
  ]);

  //aggregation returns an array, and mostly we will get only 1 value as username will be one. (unique)
  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exist.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully.")
    );
});

//? For fetching watch history of user.
const getUserWatchHistory = asyncHandler(async (req, res) => {
  /*
  For $match,
    we could have used req.user._id directly and could have found out the user, but 
    ? req.user._id is a string. (console.log and check this)
    You cannot pass req.user._id directly in the _id field within the aggregation's $match stage because the value of req.user._id is typically a plain string, but the MongoDB _id field is stored as a special ObjectId data type in the DB. 

    hence we converted it to objectId datatype using 
      new mongoose.ObjectId(req.user._id) 
      note: we wont optionally chain here as we will pass this through verifyJWT first so getting req.user._id will be very possible.



      ? note: we are here assuming that the watchHistory field has values which can be matched with _id(of the video model).
        we will have to write a seperate controller logic which will push these video_id (we get this from frontend) into the watchHistory array.

  */
  //! RETURNS AN ARRAY
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory", //assume it has (video_idA, video_idB)
        foreignField: "_id", // here _id is video_id.
        as: "watchHistory", // overwriting the existing watchHistory for better handling.
        /*
        Now if you look at the video model, there is a field called as owner, which is the one who has uploaded the video or the user.
        At this stage, its completely empty.
        Hence we will have to write a subpipeline that adds the "users" to the "owner" field using $Lookup.

          Remember we are currently in video model,
          lookup from users.
        */
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner", //this owner has everything about the user, but we need only a select few
              pipeline: [
                {
                  $project: {
                    username: 1,
                    email: 1,
                    fullName: 1,
                    avatar: 1,
                    //now this owner field is populated with a good structure and is an array.
                  },
                },
                {},
              ],
            },
          },
          {
            //as owner is array, we remove its first element and pass it, just so that its easy for the frontend.
            $addFields: {
              //overriting the same field,
              owner: {
                $first: "$owner", //will remove the first element of the "field" owner (hence $ sign)
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "watchHistory fetched successfully."
      )
    );
});

export {
  refreshAccessToken,
  logoutUser,
  registerUser,
  loginUser,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getUserWatchHistory,
};
