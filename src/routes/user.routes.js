import { Router } from "express";
import {
  logoutUser,
  loginUser,
  registerUser,
  refreshAccessToken,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

/*
This is how we write routers, keeping this is in a seperate file
*/
const router = Router();

router.route("/register").post(
  //multer middleware for avatar and coverImage.
  //error i got: "upload" object expected .fields to be an array but I passed 2 obj. (RESOLVED)
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

// Login Route
router.route("/login").post(loginUser);

//secured routes:
//Logout Route (here verifyJWT is a middleware.)
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);

export default router; // can be imported using any name.
