import { v2 as cloudinary } from "cloudinary";
import fs from "fs"; // file handling package in node.js

/*
BASIC CLOUDINARY CONFIG: read documentation for more details.
*/

// cloudinary configuration.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // API secret key!
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
    console.log("File is uploaded on Cloudinary.", respone.url);
    return respone;
  } catch (error) {
    /*remove the locally saved temporary file as the upload 
    operation got failed.
    hence we used unlinkSync (others call it delete.)
    */
    fs.unlinkSync(localFilePath);
    return null;
  }
};

export { uploadOnCloudinary };
