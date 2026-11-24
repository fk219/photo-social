const mongoose = require("mongoose");

const notificationModel = require("../models/notification.model");
const postModel = require("../models/post.model");
const commentModel = require("../models/comment.model");
const userModel = require("../models/user.model");
const { parseLimit } = require("../utils/postPipeline");
const { resolveObjectIdCursor } = require("../utils/cursor");
const { getThumbnailUrl } = require("../utils/imagekit");

const serializePost = (post) => {
    if (!post) return null;

    return {
        _id: post._id,
        image_url: post.image_url,
        thumbnail_url: getThumbnailUrl(post.image_url),
        caption: post.caption ?? "",
    };
};

const getNotificationsController = async (req, res) => {
    const limit = parseLimit(req.query.limit, 20, 50);
    const { cursorId, error } = resolveObjectIdCursor(req.query.cursor);

    if (error) {
        return res.status(400).json({ message: error });
    }

    const query = { recipient: req.user.username };

    if (cursorId) {
        query._id = { $lt: cursorId };
    }

    const [rows, unreadCount] = await Promise.all([
        notificationModel
            .find(query)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .lean(),
        notificationModel.countDocuments({
            recipient: req.user.username,
            read: false,
        }),
    ]);

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const actors = [
        ...new Set(page.map((notification) => notification.actor)),
    ];
    const postIds = [
        ...new Set(
            page
                .map((notification) => notification.post)
                .filter(Boolean)
                .map(String)
        ),
    ];
    const commentIds = [
        ...new Set(
            page
                .map((notification) => notification.comment)
                .filter(Boolean)
                .map(String)
        ),
    ];

    const [users, posts, comments] = await Promise.all([
        userModel
            .find({ username: { $in: actors } })
            .select("username name profile_image")
            .lean(),
        postIds.length
            ? postModel
                  .find({ _id: { $in: postIds } })
                  .select("image_url caption")
                  .lean()
            : [],
        commentIds.length
            ? commentModel
                  .find({ _id: { $in: commentIds } })
                  .select("text")
                  .lean()
            : [],
    ]);

    const userMap = new Map(users.map((user) => [user.username, user]));
    const postMap = new Map(
        posts.map((post) => [String(post._id), post])
    );
    const commentMap = new Map(
        comments.map((comment) => [String(comment._id), comment])
    );

    return res.status(200).json({
        notifications: page.map((notification) => {
            const actor = userMap.get(notification.actor);
            const post = notification.post
                ? postMap.get(String(notification.post))
                : null;
            const comment = notification.comment
                ? commentMap.get(String(notification.comment))
                : null;

            return {
                _id: notification._id,
                type: notification.type,
                actor: {
                    username: actor?.username ?? notification.actor,
                    name: actor?.name ?? "",
                    profile_image: actor?.profile_image ?? "",
                },
                post: serializePost(post),
                comment: comment
                    ? {
                          _id: comment._id,
                          text: comment.text,
                      }
                    : null,
                read: Boolean(notification.read),
                createdAt: notification.createdAt,
            };
        }),
        nextCursor:
            hasMore && page.length > 0
                ? String(page[page.length - 1]._id)
                : null,
        unreadCount,
    });
};

const markAllNotificationsReadController = async (req, res) => {
    await notificationModel.updateMany(
        { recipient: req.user.username, read: false },
        { $set: { read: true } }
    );

    return res.status(200).json({
        message: "All notifications marked as read.",
        unreadCount: 0,
    });
};

const markNotificationReadController = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid notification id." });
    }

    const notification = await notificationModel.findOneAndUpdate(
        { _id: id, recipient: req.user.username },
        { $set: { read: true } },
        { new: true }
    );

    if (!notification) {
        return res.status(404).json({ message: "Notification Not Found" });
    }

    const unreadCount = await notificationModel.countDocuments({
        recipient: req.user.username,
        read: false,
    });

    return res.status(200).json({
        message: "Notification marked as read.",
        notificationId: notification._id,
        read: true,
        unreadCount,
    });
};

const getNotificationUnreadCountController = async (req, res) => {
    const unreadCount = await notificationModel.countDocuments({
        recipient: req.user.username,
        read: false,
    });

    return res.status(200).json({ unreadCount });
};

module.exports = {
    getNotificationsController,
    markAllNotificationsReadController,
    markNotificationReadController,
    getNotificationUnreadCountController,
};
