import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(
  // CROSS ORIGIN RESOURCE SHARING: (learn about this more)
  // Settings CORS_ORIGIN=* in .env file, basically allows anyone to talk to our sever.
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// EXPRESS MIDDLEWARE. (what/how data is going to be stored in server,(if needed))

app.use(express.json({ limit: "16kb" })); //for data as json,
app.use(express.urlencoded({ extended: true, limit: "16kb" })); //for data coming in as URL
app.use(express.static("public")); //for saving pdf's,images, etc in the server, currently using public folder as storage folder
app.use(cookieParser());

export { app };
