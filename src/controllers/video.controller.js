import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { Video } from "../models/video.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";

//? If users wants to publish/upload his video.
const publishAVideo = asyncHandler(async (req, res) => {
  //videoFile would be handled by multer.
  const { title, description } = req.body;

  //check if title and description is not ""
  if ([title, description].some((field) => field.trim() === "")) {
    throw new ApiError(400, "All fields are required.");
  }

  //getting video and thumbnail local path using multer and handling the errors.
  const videoFileLocalPath = req.files?.videoFile[0].path;
  const thumbnailFileLocalPath = req.files?.thumbnail[0].path;

  if (!videoFileLocalPath) {
    throw new ApiError(400, "Video File is required.");
  }

  if (!thumbnailFileLocalPath) {
    throw new ApiError(400, "Thumbnail is required.");
  }

  //If everything is fine, upload on cloudinary
  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailFileLocalPath);

  if (!videoFile) {
    throw new ApiError(400, "Video file couldnt be uploaded to server");
  }

  if (!thumbnail) {
    throw new ApiError(400, "thumbnail coulndt be uploaded to server");
  }

  //create structure in db
  const video = await Video.create({
    title,
    description,
    duration: videoFile.duration, //from cloudinary return object.
    videoFile: {
      url: videoFile.url,
      public_id: videoFile.public_id,
    },
    thumbnail: {
      url: thumbnail.url,
      public_id: thumbnail.public_id,
    },
    owner: req.user?._id, //from verifyJWT
    isPublished: false, //we dont want the video to be direclty published, we will set this is later controllers.
  });

  //checking if video is actually sent to db
  const uploadedVideo = await Video.findById(video._id);

  if (!uploadedVideo) {
    throw new ApiError(500, "Video upload failed. Please try again!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200), video, "Video uploaded successfully!");
});

//? Show all details about video to user.
const getVideoById = asyncHandler(async (req, res) => {
  //! When user clicks on a video, show him all details about video.
  // ! check if user is subscribed to channel, has liked, add this video to watch history and increment the views of the vid
  //getting video_id from url
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Such Video File doesnt exist.");
  }

  if (!isValidObjectId(req.user?._id)) {
    throw new ApiError(400, "Such User doesnt exist.");
  }

  //? Using Aggregation to find each value, read carefully.
  const videoDetails = await Video.aggregate([
    {
      /* video_id from the params is a string so first converting it to an ObjectId datatype, for it to match with a value in the DB.
       */
      $match: {
        _id: new mongoose.ObjectId(videoId),
      },
    },
    {
      //for number of likes in video
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      //for owner of video
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            //number of subscribers of owner.
            $lookup: {
              from: "subscribers",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: {
                $size: "$subscribers",
              },
              //this is for the viewer who is watching Owner's channel.
              isSubscribed: {
                $cond: {
                  if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              username: 1,
              "avatar.url": 1,
              subscribersCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    //adding fields again.
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        //checking is viewer has liked or not.
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        "videoFile.url": 1,
        title: 1,
        description: 1,
        views: 1,
        duration: 1,
        comments: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
      },
    },
  ]);

  if (!videoDetails) {
    throw new ApiError(500, "Failed to fetch video details.");
  }

  /*increment the views if video is fetched successfully as user now watches the video,
  $inc is used to increment or decrement a fields value
  */
  await User.findByIdAndUpdate(req.user?._id, {
    $inc: {
      views: 1,
    },
  });

  /*
  Add this video_id to users watchHistory.

  $addToSet is a MongoDB update operator that adds a value to an array field —
  only if that value doesn’t already exist in the array.

   In simple words:
   “Add this value to the array once, but don’t duplicate it.”
  */

  await User.findByIdAndUpdate(req.user?._id, {
    $addToSet: {
      watchHistory: videoId,
    },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        videoDetails[0],
        "Video details fetched successfully."
      )
    );
});

export { publishAVideo, getVideoById };
