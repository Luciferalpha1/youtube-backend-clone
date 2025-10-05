import dotenv from "dotenv"; // Added this cuz cloudinary doesnt want my .env (wtf)
dotenv.config();

import { v2 as cloudinary } from "cloudinary";
import fs from "fs"; // file handling package in node.js
import { ApiError } from "./ApiError.js";

/*
BASIC CLOUDINARY CONFIG: read documentation for more details.
cloudinary's returns a "response" object, url is a method from the object.
*/

// cloudinary configuration.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      console.log("Invalid File Path!");
    }
    // main line.
    const respone = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file has been uploaded succesfully. (show with URL)
    // console.log("File is uploaded on Cloudinary.", respone.url);
    fs.unlinkSync(localFilePath);
    return respone;
  } catch (error) {
    console.log("Cloudinary Config:", cloudinary.config()); //checking the .env files.
    console.log("Cloudinary Upload Error", error); //good practice for .env errors I faced.
    /*remove the locally saved temporary file as the upload 
    operation got failed.
    hence we used unlinkSync (others call it delete.)
    */
    fs.unlinkSync(localFilePath);
    return null;
  }
};

// removes images that were uploaded on cloudinary.
const destroyOnCloudinary = async (fileUrl) => {
  try {
    if (!fileUrl) {
      throw new ApiError(400, "URL not found to destory.");
    }

    // regex- regular expression,very helpful in removing/finding/matching certain things in strings.
    const regex = /[\w\.\$]+(?=.png|.jpg|.gif)/;

    //.exec() will match the given parameter according to the regex.
    let matches = regex.exec(fileUrl); //matches will be an array as .exec will return an array.

    if (matches !== null) {
      await cloudinary.uploader
        .destroy(matches[0])
        .then((result) => console.log(result)); //logs to console the result which is returned by .destroy.
    }
  } catch (error) {
    throw new ApiError(400, "Error while deleting existing image.");
  }
};

export { uploadOnCloudinary, destroyOnCloudinary };
