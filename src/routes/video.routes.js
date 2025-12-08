import { Router } from "express";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishAVideo,
  togglePublishStatus,
  updateVideoDetails,
} from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router
  .route("/")
  .get(getAllVideos) //get req for / router
  .post(
    //post req for / router
    verifyJWT,
    upload.fields([
      {
        name: "videoFile",
        maxCount: 1,
      },
      {
        name: "thumbnail",
        maxCount: 1,
      },
    ]),
    publishAVideo
  );

router
  .route("/v/:videoId")
  .get(verifyJWT, getVideoById)
  .delete(verifyJWT, deleteVideo)
  .patch(verifyJWT, upload.single("thumbnail"), updateVideoDetails);

router.route("/toggle/publish/:videoId").patch(verifyJWT, togglePublishStatus);
export default router;
