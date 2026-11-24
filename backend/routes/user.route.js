const express = require("express");
const {
    followUserController,
    unfollowUserController,
    getProfileController,
    updateMeController,
} = require("../controllers/user.controller");
const identifyUser = require("../middleware/auth.middleware");
const {
    identifyUserOptional,
} = require("../middleware/auth.middleware");

const userRouter = express.Router();

/**
 * @route GET /api/users/:username
 * @description Public profile and paginated portfolio
 * @access Public (isFollowing is set when a cookie is present)
 */
userRouter.get("/:username", identifyUserOptional, getProfileController);

userRouter.patch("/me", identifyUser, updateMeController);

/**
 * @route POST /api/users/follow/:username
 * @description Follows a User
 * @access Private
 */
userRouter.post("/follow/:username", identifyUser, followUserController);
userRouter.post("/unfollow/:username", identifyUser, unfollowUserController);

module.exports = userRouter;
