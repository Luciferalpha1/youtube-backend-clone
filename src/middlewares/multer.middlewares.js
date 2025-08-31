import multer from "multer";

/*
Multer is the go-to package in Node.js for 
handling file uploads, especially when building APIs where users upload
profile pictures, documents, videos, etc.


What we have done here is written a custom storage configuration,
 which saves any file in our preffered destination. 
 - the file (ex: an image) is stored in the server's filesystem for a while and the we 
   send it to cloudinary ig.
(no custom files name)
(Add this later^^)
*/

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

export const upload = multer({ storage });
