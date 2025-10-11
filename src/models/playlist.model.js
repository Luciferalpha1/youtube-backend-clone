import mongoose, { Schema } from "mongoose";

const playlistSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    //array of all videos
    videos: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    //User
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Playlist = new mongoose.model("Playlist", playlistSchema);
