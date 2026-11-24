const express = require("express");
const {
    identifyUserReadOnly,
} = require("../middleware/auth.middleware");
const { socialLimiter } = require("../middleware/rateLimit.middleware");
const {
    getSearchController,
    getTrendingTagsController,
} = require("../controllers/search.controller");

const searchRouter = express.Router();

searchRouter.use(socialLimiter);

searchRouter.get("/trending", identifyUserReadOnly, getTrendingTagsController);
searchRouter.get("/", identifyUserReadOnly, getSearchController);

module.exports = searchRouter;
