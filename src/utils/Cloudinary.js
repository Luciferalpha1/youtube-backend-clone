import dotenv from "dotenv"; // Added this cuz cloudinary doesnt want my .env (wtf)
dotenv.config();

import { v2 as cloudinary } from "cloudinary";
import fs from "fs"; // file handling package in node.js

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

export { uploadOnCloudinary };
