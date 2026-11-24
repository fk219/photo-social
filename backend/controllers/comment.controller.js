const mongoose = require("mongoose");

const commentModel = require("../models/comment.model");
const commentLikeModel = require("../models/commentLike.model");
const notificationModel = require("../models/notification.model");
const postModel = require("../models/post.model");
const userModel = require("../models/user.model");
const { parseLimit } = require("../utils/postPipeline");
const { resolveObjectIdCursor } = require("../utils/cursor");
const { isBlockedBetween, isValidObjectId } = require("../utils/social");
const { notifyCommentActivity } = require("../utils/notify");

const COMMENT_LIMIT = 500;

const serializeComment = (
    comment,
    { avatars = new Map(), likeCounts = new Map(), likedIds = new Set() } = {},
    replies = [],
    repliesCount = 0
) => {
    const id = String(comment._id);

    return {
        _id: id,
        user: comment.user,
        text: comment.text,
        profile_image: avatars.get(comment.user) ?? null,
        createdAt: comment.createdAt,
        parent: comment.parent ? String(comment.parent) : null,
        likesCount: likeCounts.get(id) ?? 0,
        isLiked: likedIds.has(id),
        replies,
        repliesCount,
    };
};

const loadCommentMeta = async (comments, viewerUsername) => {
    if (comments.length === 0) {
        return {
            avatars: new Map(),
            likeCounts: new Map(),
            likedIds: new Set(),
        };
    }

    const ids = comments.map((comment) => comment._id);
    const usernames = [...new Set(comments.map((comment) => comment.user))];

    const [authors, likeRows, viewerLikes] = await Promise.all([
        userModel
            .find({ username: { $in: usernames } })
            .select("username profile_image")
            .lean(),
        commentLikeModel.aggregate([
            { $match: { comment: { $in: ids } } },
            { $group: { _id: "$comment", count: { $sum: 1 } } },
        ]),
        viewerUsername
            ? commentLikeModel
                  .find({
                      comment: { $in: ids },
                      user: viewerUsername,
                  })
                  .select("comment")
                  .lean()
            : [],
    ]);

    return {
        avatars: new Map(
            authors.map((author) => [
                author.username,
                author.profile_image ?? null,
            ])
        ),
        likeCounts: new Map(
            likeRows.map((row) => [String(row._id), row.count])
        ),
        likedIds: new Set(
            viewerLikes.map((like) => String(like.comment))
        ),
    };
};

const getCommentRepliesController = async (req, res) => {
    const { postId, commentId } = req.params;

    if (
        !mongoose.isValidObjectId(postId) ||
        !mongoose.isValidObjectId(commentId)
    ) {
        return res.status(400).json({ message: "Invalid comment reference." });
    }

    const parent = await commentModel
        .findOne({ _id: commentId, post: postId })
        .select("_id")
        .lean();

    if (!parent) {
        return res.status(404).json({ message: "Comment Not Found" });
    }

    const limit = parseLimit(req.query.limit, 20, 50);
    const { cursorId, error } = resolveObjectIdCursor(req.query.cursor);

    if (error) {
        return res.status(400).json({ message: error });
    }

    const query = { post: postId, parent: commentId };

    if (cursorId) {
        query._id = { $gt: cursorId };
    }

    const rows = await commentModel
        .find(query)
        .sort({ _id: 1 })
        .limit(limit + 1)
        .lean();

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const viewerUsername = req.user?.username ?? null;
    const meta = await loadCommentMeta(page, viewerUsername);

    return res.status(200).json({
        replies: page.map((reply) =>
            serializeComment(reply, meta, [], 0)
        ),
        nextCursor:
            hasMore && page.length > 0
                ? String(page[page.length - 1]._id)
                : null,
    });
};

const createCommentController = async (req, res) => {
    const { postId } = req.params;
    const body = req.body ?? {};

    if (!mongoose.isValidObjectId(postId)) {
        return res.status(400).json({ message: "Invalid post id." });
    }

    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) {
        return res.status(400).json({ message: "Write a comment before posting." });
    }

    if (text.length > COMMENT_LIMIT) {
        return res.status(400).json({
            message: `Comments are limited to ${COMMENT_LIMIT} characters.`,
        });
    }

    const post = await postModel.findById(postId).select("user").lean();

    if (!post) {
        return res.status(404).json({ message: "Post Not Found" });
    }

    const postAuthor = await userModel
        .findById(post.user)
        .select("username")
        .lean();

    if (
        postAuthor &&
        (await isBlockedBetween(req.user.username, postAuthor.username))
    ) {
        return res.status(403).json({
            message: "You cannot comment on this post.",
        });
    }

    let parentId = null;
    let parent = null;

    if (
        body.parentId !== undefined &&
        body.parentId !== null &&
        body.parentId !== ""
    ) {
        if (!isValidObjectId(body.parentId)) {
            return res.status(400).json({ message: "Invalid parent comment." });
        }

        parent = await commentModel
            .findOne({ _id: body.parentId, post: postId })
            .select("_id parent user")
            .lean();

        if (!parent) {
            return res.status(404).json({ message: "Parent comment not found." });
        }

        if (parent.parent) {
            return res.status(400).json({
                message: "Replies can only be one level deep.",
            });
        }

        parentId = parent._id;
    }

    const comment = await commentModel.create({
        post: postId,
        user: req.user.username,
        text,
        parent: parentId,
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

    try {
        await notifyCommentActivity({
            postId,
            postOwner: postAuthor?.username ?? null,
            parentAuthor: parent?.user ?? null,
            commentId: comment._id,
            actor: req.user.username,
            text,
        });
    } catch (error) {
        console.error("Comment notification failed:", error.message);
    }

    return res.status(201).json({
        message: "Comment added.",
        comment: serializeComment(comment, {
            avatars: new Map([
                [req.user.username, author?.profile_image ?? null],
            ]),
        }),
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
    const { cursorId, error } = resolveObjectIdCursor(req.query.cursor);

    if (error) {
        return res.status(400).json({ message: error });
    }

    const query = { post: postId, parent: null };

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
    const pageIds = page.map((comment) => comment._id);

    const replyGroups =
        pageIds.length > 0
            ? await commentModel.aggregate([
                  {
                      $match: {
                          post: new mongoose.Types.ObjectId(postId),
                          parent: { $in: pageIds },
                      },
                  },
                  { $sort: { parent: 1, _id: 1 } },
                  {
                      $group: {
                          _id: "$parent",
                          replies: { $push: "$$ROOT" },
                          repliesCount: { $sum: 1 },
                      },
                  },
                  {
                      $project: {
                          replies: { $slice: ["$replies", 2] },
                          repliesCount: 1,
                      },
                  },
              ])
            : [];

    const replyMap = new Map(
        replyGroups.map((group) => [String(group._id), group])
    );
    const allComments = [
        ...page,
        ...replyGroups.flatMap((group) => group.replies),
    ];
    const viewerUsername = req.user?.username ?? null;
    const meta = await loadCommentMeta(allComments, viewerUsername);

    const comments = page.map((comment) => {
        const group = replyMap.get(String(comment._id));
        const replies = (group?.replies ?? []).map((reply) =>
            serializeComment(reply, meta, [], 0)
        );

        return serializeComment(
            comment,
            meta,
            replies,
            group?.repliesCount ?? 0
        );
    });

    return res.status(200).json({
        message: "Comments fetched successfully.",
        comments,
        commentsCount,
        nextCursor:
            hasMore && page.length > 0
                ? String(page[page.length - 1]._id)
                : null,
    });
};

const likeCommentController = async (req, res) => {
    const { postId, commentId } = req.params;

    if (
        !mongoose.isValidObjectId(postId) ||
        !mongoose.isValidObjectId(commentId)
    ) {
        return res.status(400).json({ message: "Invalid comment reference." });
    }

    const comment = await commentModel
        .findOne({ _id: commentId, post: postId })
        .select("user")
        .lean();

    if (!comment) {
        return res.status(404).json({ message: "Comment Not Found" });
    }

    if (
        await isBlockedBetween(req.user.username, comment.user)
    ) {
        return res.status(403).json({
            message: "You cannot interact with this comment.",
        });
    }

    await commentLikeModel.findOneAndUpdate(
        { comment: commentId, user: req.user.username },
        {
            $setOnInsert: {
                comment: commentId,
                user: req.user.username,
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const likesCount = await commentLikeModel.countDocuments({
        comment: commentId,
    });

    await commentModel.updateOne(
        { _id: commentId },
        { $set: { likesCount } }
    );

    return res.status(200).json({ likesCount, isLiked: true });
};

const unLikeCommentController = async (req, res) => {
    const { postId, commentId } = req.params;

    if (
        !mongoose.isValidObjectId(postId) ||
        !mongoose.isValidObjectId(commentId)
    ) {
        return res.status(400).json({ message: "Invalid comment reference." });
    }

    const exists = await commentModel.exists({
        _id: commentId,
        post: postId,
    });

    if (!exists) {
        return res.status(404).json({ message: "Comment Not Found" });
    }

    await commentLikeModel.deleteOne({
        comment: commentId,
        user: req.user.username,
    });

    const likesCount = await commentLikeModel.countDocuments({
        comment: commentId,
    });

    await commentModel.updateOne(
        { _id: commentId },
        { $set: { likesCount } }
    );

    return res.status(200).json({ likesCount, isLiked: false });
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

    const replyIds = await commentModel
        .find({ parent: commentId })
        .distinct("_id");
    const allIds = [comment._id, ...replyIds];

    await Promise.all([
        commentLikeModel.deleteMany({ comment: { $in: allIds } }),
        notificationModel.deleteMany({ comment: { $in: allIds } }),
        commentModel.deleteMany({ _id: { $in: allIds } }),
    ]);

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
    getCommentRepliesController,
    likeCommentController,
    unLikeCommentController,
    deleteCommentController,
};
