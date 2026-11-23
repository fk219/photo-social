const mongoose = require("mongoose");

const commentModel = require("../models/comment.model");
const postModel = require("../models/post.model");
const userModel = require("../models/user.model");
const { parseLimit } = require("../utils/postPipeline");

const COMMENT_LIMIT = 500;

const serializeComment = (comment, profileImage = null) => ({
    _id: String(comment._id),
    user: comment.user,
    text: comment.text,
    profile_image: profileImage,
    createdAt: comment.createdAt,
});

const createCommentController = async (req, res) => {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
        return res.status(400).json({ message: "Invalid post id." });
    }

    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";

    if (!text) {
        return res.status(400).json({ message: "Write a comment before posting." });
    }

    if (text.length > COMMENT_LIMIT) {
        return res.status(400).json({
            message: `Comments are limited to ${COMMENT_LIMIT} characters.`,
        });
    }

    const postExists = await postModel.exists({ _id: postId });

    if (!postExists) {
        return res.status(404).json({ message: "Post Not Found" });
    }

    const comment = await commentModel.create({
        post: postId,
        user: req.user.username,
        text,
    });

    const [commentsCount, author] = await Promise.all([
        commentModel.countDocuments({ post: postId }),
        userModel
            .findById(req.user.id)
            .select("username profile_image")
            .lean(),
    ]);

    // Keep the denormalised counter exact for older posts too.
    await postModel.updateOne(
        { _id: postId },
        { $set: { commentsCount } }
    );

    return res.status(201).json({
        message: "Comment added.",
        comment: serializeComment(comment, author?.profile_image ?? null),
        commentsCount,
    });
};

const getCommentsController = async (req, res) => {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
        return res.status(400).json({ message: "Invalid post id." });
    }

    const postExists = await postModel.exists({ _id: postId });

    if (!postExists) {
        return res.status(404).json({ message: "Post Not Found" });
    }

    const limit = parseLimit(req.query.limit, 20, 50);
    const rawCursor =
        typeof req.query.cursor === "string" ? req.query.cursor.trim() : "";
    let cursorId = null;

    if (rawCursor) {
        if (!mongoose.isValidObjectId(rawCursor)) {
            return res.status(400).json({
                message: "Invalid comments cursor.",
            });
        }

        cursorId = new mongoose.Types.ObjectId(rawCursor);
    }

    const query = { post: postId };

    if (cursorId) {
        query._id = { $lt: cursorId };
    }

    const [rows, commentsCount] = await Promise.all([
        commentModel
            .find(query)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .lean(),
        commentModel.countDocuments({ post: postId }),
    ]);

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const usernames = [...new Set(page.map((comment) => comment.user))];
    const authors = await userModel
        .find({ username: { $in: usernames } })
        .select("username profile_image")
        .lean();
    const avatars = new Map(
        authors.map((author) => [author.username, author.profile_image])
    );

    return res.status(200).json({
        message: "Comments fetched successfully.",
        comments: page.map((comment) =>
            serializeComment(comment, avatars.get(comment.user) ?? null)
        ),
        commentsCount,
        nextCursor: hasMore ? String(page[page.length - 1]._id) : null,
    });
};

const deleteCommentController = async (req, res) => {
    const { postId, commentId } = req.params;

    if (
        !mongoose.isValidObjectId(postId) ||
        !mongoose.isValidObjectId(commentId)
    ) {
        return res.status(400).json({ message: "Invalid comment reference." });
    }

    const comment = await commentModel
        .findOne({ _id: commentId, post: postId })
        .lean();

    if (!comment) {
        return res.status(404).json({ message: "Comment Not Found" });
    }

    if (comment.user !== req.user.username) {
        return res.status(403).json({
            message: "You can only delete your own comments.",
        });
    }

    await commentModel.deleteOne({ _id: commentId });

    const commentsCount = await commentModel.countDocuments({ post: postId });
    await postModel.updateOne(
        { _id: postId },
        { $set: { commentsCount } }
    );

    return res.status(200).json({
        message: "Comment deleted.",
        commentId,
        commentsCount,
    });
};

module.exports = {
    createCommentController,
    getCommentsController,
    deleteCommentController,
};
