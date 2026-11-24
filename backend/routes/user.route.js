const express = require("express");
const {
    followUserController,
    unfollowUserController,
    getProfileController,
    updateMeController,
    uploadAvatarController,
    getFollowersController,
    getFollowingController,
    getSuggestedUsersController,
    getBlockedUsersController,
    blockUserController,
    unblockUserController,
    reportUserController,
} = require("../controllers/user.controller");
const identifyUser = require("../middleware/auth.middleware");
const {
    identifyUserReadOnly,
} = require("../middleware/auth.middleware");
const { mediaLimiter } = require("../middleware/rateLimit.middleware");
const { upload } = require("../utils/upload");

const userRouter = express.Router();

/**
 * Static routes must stay ahead of /:username or Express treats "suggested"
 * and "blocked" as usernames.
 */
userRouter.get("/suggested", identifyUser, getSuggestedUsersController);
userRouter.get("/blocked", identifyUser, getBlockedUsersController);
userRouter.patch("/me", identifyUser, updateMeController);
userRouter.post(
    "/me/avatar",
    mediaLimiter,
    identifyUser,
    upload.single("image"),
    uploadAvatarController
);

userRouter.get(
    "/:username/followers",
    identifyUserReadOnly,
    getFollowersController
);
userRouter.get(
    "/:username/following",
    identifyUserReadOnly,
    getFollowingController
);

/**
 * @route POST /api/users/follow/:username
 * @description Follows a User
 * @access Private
 */
userRouter.post("/follow/:username", identifyUser, followUserController);
userRouter.post("/unfollow/:username", identifyUser, unfollowUserController);

userRouter.post("/:username/block", identifyUser, blockUserController);
userRouter.delete("/:username/block", identifyUser, unblockUserController);
userRouter.post("/:username/report", identifyUser, reportUserController);

/**
 * @route GET /api/users/:username
 * @description Public profile and paginated portfolio
 * @access Public (isFollowing is set when a cookie is present)
 */
userRouter.get("/:username", identifyUserReadOnly, getProfileController);

module.exports = userRouter;
