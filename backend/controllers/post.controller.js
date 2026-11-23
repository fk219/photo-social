const mongoose = require("mongoose");

const postModel = require("../models/post.model");
const likeModel = require("../models/like.model");
const commentModel = require("../models/comment.model");
const userModel = require("../models/user.model");
const {
    parseLimit,
    buildPostPipeline,
    serializePost,
    serializePosts,
} = require("../utils/postPipeline");
const { resolvePostCursor } = require("../utils/cursor");

const ImageKit = require("@imagekit/nodejs/index.js");
const { toFile } = require("@imagekit/nodejs/index.js");

const imagekitInstance = new ImageKit({
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});

const hasValidImageSignature = (buffer) => {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;

    const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const png =
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47;
    const webp =
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP";

    return jpeg || png || webp;
};

const findCursorPost = (rawCursor) => resolvePostCursor(postModel, rawCursor);

const createPostController = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            message:
                "Attach a JPEG, PNG, or WebP photograph under the 'image' field.",
        });
    }

    if (!hasValidImageSignature(req.file.buffer)) {
        return res.status(400).json({
            message:
                "That file is not a valid JPEG, PNG, or WebP photograph.",
        });
    }

    const caption =
        typeof req.body.caption === "string" ? req.body.caption.trim() : "";

    if (caption.length > 2200) {
        return res.status(400).json({
            message: "Captions are limited to 2200 characters.",
        });
    }

    let uploadedFile;

    const extension =
        req.file.mimetype === "image/png"
            ? ".png"
            : req.file.mimetype === "image/webp"
              ? ".webp"
              : ".jpg";
    const uploadName = `frame-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}${extension}`;

    try {
        uploadedFile = await imagekitInstance.files.upload({
            file: await toFile(Buffer.from(req.file.buffer), uploadName),
            fileName: uploadName,
            folder: "insta-clone",
        });
    } catch (error) {
        console.error("ImageKit upload failed:", error?.message || error);
        return res.status(502).json({
            message:
                "The photograph could not be sent to media storage. Try again.",
        });
    }

    const post = await postModel.create({
        caption,
        image_url: uploadedFile.url,
        user: req.user.id,
    });

    const author = await userModel
        .findById(req.user.id)
        .select("username bio profile_image")
        .lean();

    return res.status(201).json({
        message: "Post Created Successfully",
        post: serializePost({
            ...post.toObject(),
            likesCount: 0,
            commentsCount: 0,
            isLiked: false,
            user: author,
        }),
    });
};

const getPostController = async (req, res) => {
    const posts = await postModel
        .find({ user: req.user.id })
        .sort({ _id: -1 })
        .populate("user", "username bio profile_image")
        .lean();

    res.status(200).json({
        message: "All Posts Fetched Successfully",
        posts: posts.map((post) =>
            serializePost({
                ...post,
                likesCount: post.likesCount ?? 0,
                commentsCount: post.commentsCount ?? 0,
                isLiked: false,
            })
        ),
    });
};

const getPostDetailsController = async (req, res) => {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
        return res.status(400).json({ message: "Invalid post id." });
    }

    const post = await postModel
        .findById(postId)
        .populate("user", "username bio profile_image")
        .lean();

    if (!post) {
        return res.status(404).json({
            message: "Post Not Found",
        });
    }

    const isValidUser = post.user?._id?.toString() === req.user.id;

    if (!isValidUser) {
        return res.status(403).json({
            message: "Forbidden Content: You can only view your own posts.",
        });
    }

    const [likesCount, commentsCount] = await Promise.all([
        likeModel.countDocuments({ post: postId }),
        commentModel.countDocuments({ post: postId }),
    ]);

    res.status(200).json({
        message: "Post Details Fetched Successfully",
        post: serializePost({
            ...post,
            likesCount,
            commentsCount,
        }),
    });
};

const getFeedController = async (req, res) => {
    const limit = parseLimit(req.query.limit);
    const { cursorId, cursorPost, error } = await findCursorPost(
        req.query.cursor
    );

    if (error) {
        return res.status(400).json({ message: error });
    }

    const rows = await postModel.aggregate(
        buildPostPipeline({
            cursorId,
            cursorPost,
            limit,
            viewerUsername: req.user.username,
        })
    );

    const { posts, nextCursor } = serializePosts(rows, limit);

    return res.status(200).json({
        message: "Feed fetched successfully.",
        posts,
        nextCursor,
    });
};

const likePostController = async (req, res) => {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
        return res.status(400).json({ message: "Invalid post id." });
    }

    const doesPostExist = await postModel.exists({ _id: postId });

    if (!doesPostExist) {
        return res.status(404).json({
            message: "The Post You are trying to Like Does Not Exists",
        });
    }

    await likeModel.findOneAndUpdate(
        { post: postId, user: req.user.username },
        { $setOnInsert: { post: postId, user: req.user.username } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const likesCount = await likeModel.countDocuments({ post: postId });
    await postModel.updateOne({ _id: postId }, { $set: { likesCount } });

    return res.status(200).json({
        message: "Post Liked Successfully",
        isLiked: true,
        likesCount,
    });
};

const unLikePostController = async (req, res) => {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
        return res.status(400).json({ message: "Invalid post id." });
    }

    const doesPostExist = await postModel.exists({ _id: postId });

    if (!doesPostExist) {
        return res.status(404).json({
            message: "Post Does Not Exists",
        });
    }

    await likeModel.deleteOne({
        post: postId,
        user: req.user.username,
    });

    const likesCount = await likeModel.countDocuments({ post: postId });
    await postModel.updateOne({ _id: postId }, { $set: { likesCount } });

    return res.status(200).json({
        message: "Post Unliked Successfully",
        isLiked: false,
        likesCount,
    });
};

const deletePostController = async (req, res) => {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
        return res.status(400).json({ message: "Invalid post id." });
    }

    const post = await postModel.findById(postId).select("user").lean();

    if (!post) {
        return res.status(404).json({ message: "Post Not Found" });
    }

    if (post.user.toString() !== req.user.id) {
        return res.status(403).json({
            message: "You can only delete your own frames.",
        });
    }

    await Promise.all([
        postModel.deleteOne({ _id: postId }),
        likeModel.deleteMany({ post: postId }),
        commentModel.deleteMany({ post: postId }),
    ]);

    return res.status(200).json({
        message: "Frame deleted.",
        postId,
    });
};

module.exports = {
    createPostController,
    getPostController,
    getPostDetailsController,
    getFeedController,
    likePostController,
    unLikePostController,
    deletePostController,
};
