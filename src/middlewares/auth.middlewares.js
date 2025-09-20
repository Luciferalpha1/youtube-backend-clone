import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    /*
      ? Remember that we had sent a res (containing cookies) when the user logs in. As cookies are two way accessible, they can be requested also, hence req.cookies is used.
  
  
      ? For mobile phones:
      Login → server returns access + refresh tokens.
      Use access token in Authorization: Bearer ....
      When expired → send refresh token → get new access token.
      Logout → delete refresh token from DB + clear app storage.
  
      Authorization is mainly sent in this format, "Bearer sdosdsndd...". As we only want the accessToken, we are replacing the "Bearer " with "" to only get the accessToken.
      */

    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized Request.");
    }

    //! if token is correct, verify/decode it.
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    //we find the user on the basis of his decodedToken in the db, then get the id, where we remove the password and refreshToken.
    const verifiedUser = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!verifiedUser) {
      throw new ApiError(401, "Invalid Access Token");
    }

    // Remember, this is the current user which is completely logged in.
    req.user = verifiedUser;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access Token");
  }
});
