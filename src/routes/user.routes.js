import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

/*
This is how we write routers, keeping this is in a seperate file
*/
const router = Router();

router.route("/register").post(registerUser);

export default router; // can be imported using any name.
