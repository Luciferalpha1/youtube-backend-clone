import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middleswares/multer.middlewares.js";
import { User } from "../models/user.model.js";
/*
This is how we write routers, keeping this is in a seperate file
*/
const router = Router();

router.route("/register").post(
  //multer middleware for avatar and coverImage.
  upload.fields(
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    }
  ),
  registerUser
);

export default router; // can be imported using any name.
