import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { Like } from "../models/like.model";

//? get videos liked by current user,
const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideosAggregate = await Like.aggregate([
    //all likedBy documents of current user
    {
      $match: {
        likedBy: new mongoose.ObjectId(req.user?._id),
      },
    },
    //videos liked by user
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideos",
        //details for owner of a video
        pipleline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "ownerDetails",
            },
          },
          /*
                $unwind: ownerDetails - That means each video document will include owner details embedded as ownerDetails.
                */
          {
            $unwind: "$ownerDetails",
          },
        ],
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      //WHAT ALL TO SHOW AS OUTPUT
      //_id: 0 at top removes the Like document’s id from results; you’re returning an array of likedVideo objects. Output will be an array.
      $project: {
        _id: 0,
        likedVideo: {
          _id: 1,
          "videoFile.url": 1,
          "thumbnail.url": 1,
          owner: 1,
          title: 1,
          description: 1,
          views: 1,
          duration: 1,
          createdAt: 1,
          isPublished: 1,
          ownerDetails: {
            username: 1,
            fullname: 1,
          },
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        likedVideosAggregate,
        "Liked Videos fetched successfully!"
      )
    );
});

//? if Like button is pressed on a video,
const toggleVideoLike = asyncHandler(async (req, res) => {
  //! STEPS:
  /*
    1. get data from frontend (videoId)
    2. check if user has already liked a video
    3. if true, delete the like document, send a response of isLiked: false.
    4. create a like document, adding video and current user.
    5. return response, isLiked: true.
  */

  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(404, "This video doesnt exists!");
  }

  //checking if user has already liked the video
  const alreadyLiked = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id,
  });

  // toggling the current state(isLiked: true) to next state(isLiked: false.)
  if (alreadyLiked) {
    //deleting the "alreadyLiked" document as we are toggling like.
    await Like.findByIdAndDelete(alreadyLiked._id);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          isLiked: false,
        },
        "Success!"
      )
    );
  }

  //if current user has not liked the video
  await Like.create({
    video: videoId,
    likedBy: req.user?._id,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isLiked: true,
      },
      "Success!"
    )
  );
});

//? if Like button is pressed on a comment,
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "This isnt a valid comment!");
  }

  //check if user has already liked.
  const alreadyLiked = await Like.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });

  if (alreadyLiked) {
    await Like.findByIdAndDelete(alreadyLiked._id);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          isLiked: false,
        },
        "Success!"
      )
    );
  }

  //liked comment document creation (if user has not liked the comment)
  await Like.create({
    comment: commentId,
    likedBy: req.user?._id,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isLiked: true,
      },
      "Success!"
    )
  );
});

export { getLikedVideos, toggleVideoLike, toggleCommentLike };
