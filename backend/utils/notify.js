const notificationModel = require("../models/notification.model");
const userModel = require("../models/user.model");
const { isBlockedBetween, parseMentions } = require("./social");

const addNotification = async ({
    recipient,
    actor,
    type,
    post = null,
    comment = null,
}) => {
    if (!recipient || !actor || recipient === actor) return null;

    if (await isBlockedBetween(recipient, actor)) return null;

    return notificationModel.create({
        recipient,
        actor,
        type,
        post,
        comment,
    });
};

const removePostLikeNotification = ({ actor, postId }) =>
    notificationModel.deleteMany({
        actor,
        post: postId,
        type: "like",
    });

const removeFollowNotification = ({ follower, followee }) =>
    notificationModel.deleteMany({
        actor: follower,
        recipient: followee,
        type: "follow",
    });

const notifyMentions = async ({
    text,
    actor,
    postId = null,
    commentId = null,
    exclude = [],
}) => {
    const tokens = parseMentions(text);

    if (tokens.length === 0) return;

    const users = await userModel
        .find({ username: { $in: tokens } })
        .select("username")
        .lean();

    if (users.length === 0) return;

    const excluded = new Set([
        actor,
        ...exclude.filter((username) => typeof username === "string"),
    ]);
    const rows = [];

    for (const user of users) {
        if (excluded.has(user.username)) continue;

        if (await isBlockedBetween(user.username, actor)) continue;

        rows.push({
            recipient: user.username,
            actor,
            type: "mention",
            post: postId,
            comment: commentId,
            read: false,
        });
    }

    if (rows.length > 0) {
        await notificationModel.insertMany(rows, { ordered: false });
    }
};

/**
 * A new comment can produce up to three kinds of notification: a reply for the
 * parent author, a comment for the post owner, and mentions for everyone else
 * named in the text. A username never receives two notifications for one event.
 */
const notifyCommentActivity = async ({
    postId,
    postOwner,
    parentAuthor,
    commentId,
    actor,
    text,
}) => {
    const alreadyNotified = new Set([actor]);

    if (parentAuthor && parentAuthor !== actor) {
        await addNotification({
            recipient: parentAuthor,
            actor,
            type: "reply",
            post: postId,
            comment: commentId,
        });
        alreadyNotified.add(parentAuthor);
    }

    if (
        postOwner &&
        postOwner !== actor &&
        postOwner !== parentAuthor
    ) {
        await addNotification({
            recipient: postOwner,
            actor,
            type: "comment",
            post: postId,
            comment: commentId,
        });
        alreadyNotified.add(postOwner);
    }

    await notifyMentions({
        text,
        actor,
        postId,
        commentId,
        exclude: [...alreadyNotified],
    });
};

const notifyPostLike = ({ recipient, actor, postId }) =>
    addNotification({
        recipient,
        actor,
        type: "like",
        post: postId,
    });

const notifyFollow = ({ recipient, actor }) =>
    addNotification({
        recipient,
        actor,
        type: "follow",
    });

module.exports = {
    addNotification,
    removePostLikeNotification,
    removeFollowNotification,
    notifyMentions,
    notifyCommentActivity,
    notifyPostLike,
    notifyFollow,
};
