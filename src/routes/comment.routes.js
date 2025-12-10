import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares";
import {
  addComment,
  deleteComment,
  getCommentsById,
  updateComment,
} from "../controllers/comment.controller";

const router = Router();

//route for addComment
router.route("/c/:videoId").post(verifyJWT, addComment);
//route for getting all comments based on videoId
router.route("/c/:videoId").get(verifyJWT, getCommentsById);
//route for updating a specific comment
router.route("/c/:commentId").patch(verifyJWT, updateComment);
//route for deleting a specific comment
router.route("/c/:commentId").delete(verifyJWT, deleteComment);

export default router;
