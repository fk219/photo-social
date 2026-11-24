const express = require("express");
const identifyUser = require("../middleware/auth.middleware");
const { identifyUserReadOnly } = require("../middleware/auth.middleware");
const { postLimiter } = require("../middleware/rateLimit.middleware");
const {
    createPostController,
    getPostController,
    getPostDetailsController,
    getFeedController,
    getPostByIdController,
    getSavedPostsController,
    savePostController,
    unSavePostController,
    getPostLikesController,
    likePostController,
    unLikePostController,
    deletePostController,
} = require("../controllers/post.controller");
const {
    createCommentController,
    getCommentsController,
    getCommentRepliesController,
    likeCommentController,
    unLikeCommentController,
    deleteCommentController,
} = require("../controllers/comment.controller");
const { upload } = require("../utils/upload");

const postRouter = express.Router();

postRouter.use(postLimiter);

postRouter.get("/feed", identifyUserReadOnly, getFeedController);
postRouter.get("/saved", identifyUser, getSavedPostsController);
postRouter.get("/", identifyUser, getPostController);
postRouter.post("/", identifyUser, upload.single("image"), createPostController);

postRouter.get("/:postId", identifyUserReadOnly, getPostByIdController);

postRouter.get("/:postId/comments", identifyUserReadOnly, getCommentsController);
postRouter.post("/:postId/comments", identifyUser, createCommentController);
postRouter.get(
    "/:postId/comments/:commentId/replies",
    identifyUserReadOnly,
    getCommentRepliesController
);
postRouter.post(
    "/:postId/comments/:commentId/like",
    identifyUser,
    likeCommentController
);
postRouter.delete(
    "/:postId/comments/:commentId/like",
    identifyUser,
    unLikeCommentController
);
postRouter.delete(
    "/:postId/comments/:commentId",
    identifyUser,
    deleteCommentController
);

postRouter.get("/:postId/likes", identifyUserReadOnly, getPostLikesController);
postRouter.post("/:postId/save", identifyUser, savePostController);
postRouter.delete("/:postId/save", identifyUser, unSavePostController);

postRouter.post("/details/:postId", identifyUser, getPostDetailsController);
postRouter.post("/like/:postId", identifyUser, likePostController);
postRouter.post("/unlike/:postId", identifyUser, unLikePostController);

postRouter.delete("/:postId", identifyUser, deletePostController);

module.exports = postRouter;
