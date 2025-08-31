import dotenv from "dotenv"; // Loading .env correctly.
dotenv.config({ path: "./.env" });
import connectDB from "./db/index.js";
import { app } from "./app.js";

connectDB()
  //async functions always return a promise hence,

  .then(() => {
    const server = app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is now running at PORT: ${process.env.PORT}`);

      //app.listen returns a HTTP server instance, so storing it in a variable makes sense.

      server.on("error", (error) => {
        console.log("Express Server Error!!", error);
      });
    });
  })
  .catch((error) => {
    console.log("MongoDB connection FAILED!", error);
    process.exit(1); //stop node.js here? if things dont work.
  });
