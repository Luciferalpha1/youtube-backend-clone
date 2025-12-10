import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { Video } from "../models/video.model";
import { Comment } from "../models/comment.model";
import { ApiResponse } from "../utils/ApiResponse";
import { isValidObjectId } from "mongoose";

//? Add a comment to a video.
const addComment = asyncHandler(async (req, res) => {
  /*
   verifyJWT middleware is also added, to get owner for a particular comment.
    1. Get videoId and Content of comment from param and body
    2. Check for videoId and content. (if they are properly received or not.)
    3. create a comment using comment schema and add these properties.
*/

  //get data from frontend.
  const { videoId } = req.params;
  const { content } = req.body;

  if (!content) {
    throw new ApiError(404, "Content is required!");
  }

  const video = Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video doesnt exist/not found!");
  }

  //!creating a comment
  const comment = Comment.create({
    content,
    video: videoId,
    owner: req.user?._id,
  });

  if (!comment) {
    throw new ApiError(500, "Failed to add comment!");
  }

  //the whole commment goes to the frontend.
  return res
    .status(200)
    .json(new ApiResponse(201, comment, "comment added successfully!"));
});

//? Get all comments for a video
const getCommentsById = asyncHandler(async (res, req) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Failed to find video!");
  }

  const commentsAggregate = await Comment.aggregate([
    {
      //match video that has given videoId
      $match: {
        video: new mongoose.ObjectId(videoId),
      },
    },
    //who is the owner of the video?
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    //who all liked a certain comment?
    //liked.comment == comment._id
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likes",
      },
    },
    {
      $addFields: {
        //size of likes array = total likes on video
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $cond: {
            if: {
              //checking if the current user is in the likes document.
              $in: [req.user?._id, "$likes.likedBy"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    //sorting newest comments first.
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        likesCount: 1,
        owner: {
          username: 1,
          fullName: 1,
        },
        isLiked: 1,
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const comments = await Comment.aggregatePaginate(commentsAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched Successfully!"));
});

//? Update an existing comment
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Content not available");
  }

  // The comment you want to update
  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(400, "Comment was not found!");
  }

  //only comment owner can edit the comments, not any random user.
  if (req.user?._id.toString() !== comment.owner.toString()) {
    throw new ApiError(400, "You are not the owner of this comment!");
  }

  const updatedComment = await Comment.findByIdAndUpdate(
    comment._id,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );

  if (!updatedComment) {
    throw new ApiError(400, "Comment was not updated");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedComment, "Comment updated successfully!")
    );
});

//? Delete a comment!
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Not a valid comment!");
  }

  //comment document
  const comment = await Comment.findById(commentId);

  if (req.user?._id.toString() !== comment.owner.toString()) {
    throw new ApiError(400, "You are not the owner of this comme!");
  }

  //delete the comment from the database.
  const commentToBeDeleted = await Comment.findByIdAndDelete(commentId);

  if (!commentToBeDeleted) {
    throw new ApiError(404, "Server error, comment was not deleted!");
  }

  //deleting the likes of the comment
  await Like.deleteMany({
    comment: commentId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment was deleted successfully!"));
});

export { addComment, getCommentsById, updateComment, deleteComment };
