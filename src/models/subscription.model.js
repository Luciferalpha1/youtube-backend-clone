import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      //one who is subscribing to the user
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    channel: {
      type: Schema.Types.ObjectId, //one to whom "subscriber" is subscribing.
      ref: "User",
    },
  },
  { timestamps: true }
);

export const subscription = mongoose.model("Subscription", subscriptionSchema);
