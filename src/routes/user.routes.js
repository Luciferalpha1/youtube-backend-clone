import { Router } from "express";
import {
  logoutUser,
  loginUser,
  registerUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getUserWatchHistory,
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
// using post as you are sending info
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);

//using get as you are retrieving data
router.route("/current-user").get(verifyJWT, getCurrentUser);

//using patch, to apply minimial/selective changes to a resource.
router.route("/update-account").patch(verifyJWT, updateAccountDetails);

//here upload.single was used as only a single file is being handled.
router
  .route("/change-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router
  .route("/change-coverImage")
  .patch(verifyJWT, upload.single("coverImage"), updateCoverImage);

// /c/:username is the parameter, as we used req.params in the controller.
router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
router.route("/history").get(verifyJWT, getUserWatchHistory);

export default router; // can be imported using any name.
