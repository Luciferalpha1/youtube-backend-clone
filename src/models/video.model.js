import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    videoFile: {
      type: String, //cloudinary URL
      required: true,
    },
    thumbnail: {
      type: String, //cloudinary URL
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number, //cloudinary URL
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

/*
! What is mongoose-aggregate-paginate (or paginate-v2)?
It’s a Mongoose plugin that combines both:
Use aggregate pipelines to filter/sort/group your data.
Then apply pagination automatically (with page, limit, etc.)

Pagination = splitting results into pages (like "Page 1: 10 results", "Page 2: next 10 results").
Why? Because returning thousands of records at once is inefficient.
*/

videoSchema.plugin(mongooseAggregatePaginate);
export const Video = mongoose.model("Video", videoSchema);
