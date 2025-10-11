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

export const Subscription = mongoose.model("Subscription", subscriptionSchema);

/*
Everytime someone hits subscribe, a new document is created which has the name of the subscriber(user) and also the channel to which you are subscribing. 
If you want to know the number of subsribers for a particular channel then, you have to select the documents that contain the respective channel.

eg: If A has subscribed to CH1, B has subscribed to CH1, C has subscibed to CH2, D has subscribed to CH3, E has subscribed to CH2

  now if you want to find the the number of subscribers for the   "CH1", you just have to match the documents having that channel.

Similarly,
  if you want to find how many channels a particular user has subscribed to,
  you just have to match the documents in which the user is present.


count how many documents have been made which consits of "CH1" as the channel name

count how many documents have been made which consists of "A" as the subscriber.

You will have to count the number of documents where the channel name will be the "one whose subscribers you have to find."
All this is done by aggregation pipelines.
*/
