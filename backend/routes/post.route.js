const express = require("express");
const identifyUser = require("../middleware/auth.middleware");
const { postLimiter } = require("../middleware/rateLimit.middleware");
const {
    createPostController,
    getPostController,
    getPostDetailsController,
    getFeedController,
    likePostController,
    unLikePostController,
    deletePostController,
} = require("../controllers/post.controller");
const {
    createCommentController,
    getCommentsController,
    deleteCommentController,
} = require("../controllers/comment.controller");

const multer = require("multer");

const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
            const error = new Error(
                "Unsupported image type. Use a JPEG, PNG, or WebP photograph."
            );
            error.status = 400;
            return cb(error);
        }

        cb(null, true);
    },
});

const postRouter = express.Router();

postRouter.use(postLimiter);

postRouter.get("/feed", identifyUser, getFeedController);
postRouter.get("/", identifyUser, getPostController);
postRouter.post("/", identifyUser, upload.single("image"), createPostController);

postRouter.get("/:postId/comments", identifyUser, getCommentsController);
postRouter.post("/:postId/comments", identifyUser, createCommentController);
postRouter.delete(
    "/:postId/comments/:commentId",
    identifyUser,
    deleteCommentController
);

postRouter.post("/details/:postId", identifyUser, getPostDetailsController);
postRouter.post("/like/:postId", identifyUser, likePostController);
postRouter.post("/unlike/:postId", identifyUser, unLikePostController);

postRouter.delete("/:postId", identifyUser, deletePostController);

module.exports = postRouter;
