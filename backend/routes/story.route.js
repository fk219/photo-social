const express = require("express");
const identifyUser = require("../middleware/auth.middleware");
const {
    socialLimiter,
    mediaLimiter,
} = require("../middleware/rateLimit.middleware");
const { upload } = require("../utils/upload");
const {
    getStoriesFeedController,
    createStoryController,
    markStorySeenController,
    deleteStoryController,
    getUserStoriesController,
} = require("../controllers/story.controller");

const storyRouter = express.Router();

storyRouter.use(socialLimiter);
storyRouter.use(identifyUser);

storyRouter.get("/feed", getStoriesFeedController);
storyRouter.post(
    "/",
    mediaLimiter,
    upload.single("image"),
    createStoryController
);
storyRouter.get("/:username", getUserStoriesController);
storyRouter.post("/:id/seen", markStorySeenController);
storyRouter.delete("/:id", deleteStoryController);

module.exports = storyRouter;
