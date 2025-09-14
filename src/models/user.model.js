import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, //cloudinary url(files,images)
      required: true,
    },
    coverImage: {
      type: String,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

/*
-pre: a hook, before just doing any task, we want this middleware to run.
-save: before saving do this
-didnt use arrow functions as we dont get "this" context.
-bcrypt syntax: bcrypt.hash(what to hash, how many rounds of salt.)
! the problem: whenever we will try to save the password, it will hash it.
! hence by using an if condition, we solve the problem.

? LOGIC:
  this.isModified is an inbuilt func in mongoose, allows us to check
  if a property has been changed.
 -checked a negative condition and returned next
  (could have also done, normal if logic.)

 - bonus: async returns a promise, mongoose waits for the promise that
 your functions returns.
    if the func resolves, it continues (no need to use next)
    if the func throws an error (rejected promise), it automatically
    passes the error forward.
*/

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

/*
? NOTE THIS IS A PERSONALIZED WAY OF WRITING A METHOD
! METHOD FOR COMPARISION OF USERS GIVEN PASSWORD WITH DB
! bcrypt can encrypt as well as compare the passwords that you have sent
When a user logs in:
They give you their email + password.
You look up the user by email in the DB.
Then you must check if the entered password matches the saved hash.
You can’t just compare strings, because the DB stores a hash, not the raw password.
-ps: returns true or false if password from DB matches/doesnt match.


note: "this.password" is the hashed password in the db.
"password" is the password sent by the user in req.body.
*/

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

/*
! This will be used in authentication purposes. (both)
📌 Flow in one line:
👉 User logs in → token generated → client stores token → client sends token with every request
 → server verifies token → user stays authenticated.
*/
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
