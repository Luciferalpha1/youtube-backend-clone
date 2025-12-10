import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    tweet: {
      type: Schema.Types.ObjectId,
      ref: "Tweet",
    },
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

/*
? WHY CANT isLiked be stored directly in the like model?

isLiked depends on who is viewing the data
answers this question - "Did this logged-in user like this resource?"

  For User A - isLiked may be true
  For User B - isLiked may be false.

Hence, it a per-user state, not a per-document state.

'isLiked' is a derived property, not a persistent field; its value changes per user, so it is computed during aggregation by checking if the current user's ID exists in the likes array.
*/

export const Like = mongoose.model("Like", likeSchema);
