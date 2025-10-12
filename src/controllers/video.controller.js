import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {
  destroyOnCloudinary,
  uploadOnCloudinary,
} from "../utils/Cloudinary.js";
import { Video } from "../models/video.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Like, like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";

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
      public_id: "String",
      url: "String",
    },
    thumbnail: {
      public_id: "String",
      url: "String",
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

//? Update video details, given by user.
const updateVideoDetails = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const { videoId } = req.params;

  if (!(title && description)) {
    throw new ApiError(400, "Title and description are required.");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video/Video not found.");
  }

  //get video by _id
  const videoDetails = await Video.findById(videoId);

  if (!videoDetails) {
    throw new ApiError(404, "No Video Found. Try again!");
  }

  //only video owner should be able to edit the video
  /*
    Remember: Owner and req.user are 2 different entities.
      if video owner !== req.user then throw apierror.
  */
  if (videoDetails.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "This video cant be edited by you. Contact the owner of this video."
    );
  }

  //getting thumbnail from multer.
  /*
  in the route for this specific controller, upload.single() will be used.
  */
  const newThumbnailLocalPath = req.file?.path;

  if (newThumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is required.");
  }

  //upload new thumbnail in cloudinary.
  const newThumbnail = await uploadOnCloudinary(newThumbnailLocalPath);

  if (!newThumbnail) {
    throw new ApiError(400, "File couldnt be uploaded on cloudinary.");
  }

  //delete old thumbnail from cloudinary
  await destroyOnCloudinary(videoDetails.thumbnail.public_id);

  //update in db, with error handling
  const updatedVideo = Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title, //new title
        description, //new description
        thumbnail: {
          public_id: newThumbnail.public_id,
          url: newThumbnail.url,
        },
      },
    },
    { new: true }
  );

  if (!updatedVideo) {
    throw new ApiError(500, "Video updation failed. Please try again.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, "Video details updated successfully.")
    );
});

//? If user wants to delete this video (this includes all the details of the video too)
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  //check videoId is valid or not.
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  //get whole video document
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video was not found.");
  }

  //check if viewer is owner,
  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "You are not the owner of this video.");
  }

  //delete the video from database.
  const deleteVideo = await Video.findByIdAndDelete(video?._id);

  if (!deleteVideo) {
    throw new ApiError(
      400,
      "This video could not be deleted. Please try again!"
    );
  }

  //deletion of video,thumbnail from cloudinary.
  await destroyOnCloudinary(video.videoFile.public_id, "video");
  await destroyOnCloudinary(video.thumbnail.public_id, "image");

  //deleting the likes on the video
  await Like.deleteMany({
    video: videoId,
  });
  //deleting the comments on the video
  await Comment.deleteMany({
    video: videoId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video has been successfully deleted."));
});

//? Set publish status.
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const videoDetails = await Video.findById(videoId);

  if (!videoDetails) {
    throw new ApiError(400, "This video doesnt exist.");
  }

  if (videoDetails.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "You cant make changes to this video.");
  }

  /*
    Take the inital value of isPublished and then change it to new value/toggle it
    ex: if inital value of isPublished was true
      then !true = false.
 */
  const togglePublish = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !videoDetails.isPublished,
      },
    },
    { new: true }
  );

  if (!togglePublish) {
    throw new ApiError(500, "Failed to toggle video publish status.");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isPublished: togglePublish.isPublished,
      },
      "Video Publish toggled successfully!"
    )
  );
});

//? For a particular query, find all videos.
const getAllVideos = asyncHandler(async (req, res) => {
  /*
  Steps to implement getVideos function:
  
  1. Extract query parameters like page, limit, sort, search, etc. from req.query.
  2. Build a filter object (e.g., match by title or description using regex for search).
  3. Define sorting options (e.g., by createdAt or views).
  4. Use MongoDB aggregation pipeline to:
  - Match videos based on filters.
  - Lookup user/channel info if needed.
  - Sort videos according to the sort criteria.
  - Skip and limit documents for pagination.
  5. Execute the aggregation using Video.aggregate().
  6. Return the paginated list of videos as a JSON response.
  7. Handle any errors using try-catch and send an appropriate response.
  */

  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  const pipeline = [];
  /*
If user provided a search term, MongoDB Atlas will perform a full-text search.
 index: "search-videos" refers to a search index created in MongoDB Atlas UI.
 path: tells MongoDB which fields to search in (title and description).
*/

  //! SEARCHING BASED ON SEARCH QUERY. (atlas search index)
  if (query) {
    pipeline.push({
      $search: {
        index: "search-videos", //find here
        text: {
          query: query, //what to find
          path: [title, description], //search only on title and description
        },
      },
    });
  }

  //! FOR A PARTICULAR USER, GET ALL VIDEOS.
  //userId should exist here.
  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid User.");
    }

    /*
      we are trying to match the owner (of video) with the req.user,
      so that we can find the number of videos for this respective user.

      If a userId is given, only videos uploaded by that user are fetched.
    */
    pipeline.push({
      $match: {
        owner: new mongoose.ObjectId(userId),
      },
    });
  }

  //fetch videos that are isPublished: true
  pipeline.push({
    $match: {
      isPublished: true,
    },
  });

  //!!SORTING
  //sortBy - can be views, duration, createdAt
  //sortType - can be ascending(-1) or descending(+1)
  if (sortBy && sortType) {
    pipeline.push({
      $sort: {
        [sortBy]: sortType === "asc" ? -1 : 1,
      },
    });
  }
  // If sortBy and sortType is not given, sort using createdAt (ascending).
  else {
    pipeline.push({
      sortBy: {
        createdAt: -1,
      },
    });
  }

  //! FINDING DETAILS OF VIDEO OWNER.
  pipeline.push(
    {
      //Local collection: Video, Foreign collection: User
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              "avatar.url": 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
    //$unwind converts the ownerDetails array into a single object for ease of access
    {
      $unwind: "$ownerDetails",
    }
  );

  //! Aggregating the "pipeline" array.
  /*
  In other controlles, whenever we used aggregation pipelines, we always did
    const "modelname" = await model.aggregate([
          "here we used to write our pipelines"
    ])


    but as we have seperately made an array called "pipeline"
    we now have to aggregate it.
  */

  const videoAggregate = await Video.aggregate(pipeline);

  //! Pagination setup:
  // 1. Extracts 'page' and 'limit' values from the query parameters (default: page=1, limit=10)
  // 2. Converts them from strings to integers using parseInt(), the 10 means base is decimal meaning convert to decimal.
  // 3. Stores them in the 'options' object for pagination settings
  // 4. These options are passed to 'aggregatePaginate()' to:
  //      - Control which page of results to fetch
  //      - Control how many videos to display per page
  // Example: ?page=2&limit=5 → returns 5 videos from the 2nd page of results

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  //! AGGREGATION AND PAGINATION USECASE:
  //custom plugin (aggregatePaginate) is used. (check video model)
  const video = await Video.aggregatePaginate(videoAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, video, "All videos fetched successfully."));
});
export {
  publishAVideo,
  getVideoById,
  updateVideoDetails,
  deleteVideo,
  togglePublishStatus,
  getAllVideos,
};
