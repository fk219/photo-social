const mongoose = require("mongoose");

const conversationModel = require("../models/conversation.model");
const messageModel = require("../models/message.model");
const postModel = require("../models/post.model");
const userModel = require("../models/user.model");
const { parseLimit } = require("../utils/postPipeline");
const { resolveObjectIdCursor } = require("../utils/cursor");
const {
    normalizeUsername,
    isBlockedBetween,
} = require("../utils/social");
const { getThumbnailUrl } = require("../utils/imagekit");

const MESSAGE_LIMIT = 2000;
const AFTER_POLL_LIMIT = 100;

const conversationPairKey = (first, second) =>
    [first, second].sort().join("|");

const loadConversationUsers = async (conversation) => {
    const users = await userModel
        .find({ username: { $in: conversation.participants } })
        .select("username name profile_image bio")
        .lean();

    return new Map(users.map((user) => [user.username, user]));
};

const serializeConversation = (conversation, viewerUsername, userMap) => {
    const otherUsername =
        conversation.participants.find(
            (username) => username !== viewerUsername
        ) ?? "";
    const other = userMap.get(otherUsername);
    const unread = (conversation.unread ?? []).find(
        (entry) => entry.user === viewerUsername
    );

    return {
        _id: conversation._id,
        participants: conversation.participants.map((username) => {
            const user = userMap.get(username);

            return {
                username,
                name: user?.name ?? "",
                profile_image: user?.profile_image ?? "",
            };
        }),
        otherUser: {
            username: other?.username ?? otherUsername,
            name: other?.name ?? "",
            profile_image: other?.profile_image ?? "",
            bio: other?.bio ?? "",
        },
        lastMessage: conversation.lastMessage ?? "",
        lastMessageAt:
            conversation.lastMessageAt ??
            conversation.updatedAt ??
            conversation.createdAt ??
            null,
        lastSender: conversation.lastSender ?? "",
        unreadCount: Number(unread?.count) || 0,
        updatedAt: conversation.updatedAt,
    };
};

const serializeMessage = (message, viewerUsername) => {
    const post =
        message.post && typeof message.post === "object" && message.post.image_url
            ? {
                  _id: message.post._id,
                  image_url: message.post.image_url,
                  thumbnail_url: getThumbnailUrl(message.post.image_url),
                  caption: message.post.caption ?? "",
                  user: {
                      username:
                          message.post.user &&
                          typeof message.post.user === "object"
                              ? message.post.user.username ?? "unknown"
                              : "unknown",
                      name:
                          message.post.user &&
                          typeof message.post.user === "object"
                              ? message.post.user.name ?? ""
                              : "",
                      profile_image:
                          message.post.user &&
                          typeof message.post.user === "object"
                              ? message.post.user.profile_image ?? ""
                              : "",
                  },
              }
            : null;

    return {
        _id: message._id,
        sender: message.sender,
        text: message.text ?? "",
        post,
        readBy: message.readBy ?? [],
        createdAt: message.createdAt,
        isMine: message.sender === viewerUsername,
    };
};

const ensureUnreadEntries = async (conversation) => {
    const missing = conversation.participants.filter(
        (username) =>
            !(conversation.unread ?? []).some(
                (entry) => entry.user === username
            )
    );

    if (missing.length === 0) return conversation;

    return conversationModel.findByIdAndUpdate(
        conversation._id,
        {
            $push: {
                unread: {
                    $each: missing.map((username) => ({
                        user: username,
                        count: 0,
                    })),
                },
            },
        },
        { new: true }
    );
};

const buildConversationCursorMatch = async (cursorId) => {
    const cursor = await conversationModel
        .findById(cursorId)
        .select("lastMessageAt updatedAt")
        .lean();

    if (!cursor) {
        return { error: "Invalid conversations cursor." };
    }

    const updatedAt = cursor.updatedAt ?? new Date(0);

    if (cursor.lastMessageAt) {
        return {
            match: {
                $or: [
                    { lastMessageAt: { $lt: cursor.lastMessageAt } },
                    {
                        lastMessageAt: cursor.lastMessageAt,
                        updatedAt: { $lt: updatedAt },
                    },
                    {
                        lastMessageAt: cursor.lastMessageAt,
                        updatedAt,
                        _id: { $lt: cursor._id },
                    },
                    { lastMessageAt: null },
                ],
            },
        };
    }

    return {
        match: {
            $or: [
                {
                    lastMessageAt: null,
                    updatedAt: { $lt: updatedAt },
                },
                {
                    lastMessageAt: null,
                    updatedAt,
                    _id: { $lt: cursor._id },
                },
            ],
        },
    };
};

const getConversationsController = async (req, res) => {
    const limit = parseLimit(req.query.limit, 20, 50);
    const { cursorId, error } = resolveObjectIdCursor(req.query.cursor);

    if (error) {
        return res.status(400).json({ message: error });
    }

    const query = { participants: req.user.username };

    if (cursorId) {
        const cursor = await buildConversationCursorMatch(cursorId);

        if (cursor.error) {
            return res.status(400).json({ message: cursor.error });
        }

        Object.assign(query, cursor.match);
    }

    const rows = await conversationModel
        .find(query)
        .sort({ lastMessageAt: -1, updatedAt: -1, _id: -1 })
        .limit(limit + 1)
        .lean();

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const usernames = [
        ...new Set(page.flatMap((conversation) => conversation.participants)),
    ];
    const users = await userModel
        .find({ username: { $in: usernames } })
        .select("username name profile_image bio")
        .lean();
    const userMap = new Map(
        users.map((user) => [user.username, user])
    );

    return res.status(200).json({
        conversations: page.map((conversation) =>
            serializeConversation(
                conversation,
                req.user.username,
                userMap
            )
        ),
        nextCursor:
            hasMore && page.length > 0
                ? String(page[page.length - 1]._id)
                : null,
    });
};

const startConversationController = async (req, res) => {
    const username = normalizeUsername(req.body?.username);

    if (!username) {
        return res.status(400).json({
            message: "Enter the username you want to message.",
        });
    }

    if (username === req.user.username) {
        return res.status(400).json({
            message: "You cannot message yourself.",
        });
    }

    const otherUser = await userModel
        .findOne({ username })
        .select("username")
        .lean();

    if (!otherUser) {
        return res.status(404).json({ message: "User Not Found" });
    }

    if (await isBlockedBetween(req.user.username, username)) {
        return res.status(403).json({
            message: "You cannot start a conversation with this account.",
        });
    }

    const pairKey = conversationPairKey(req.user.username, username);
    let conversation = await conversationModel.findOne({ pairKey });

    if (!conversation) {
        try {
            conversation = await conversationModel.create({
                participants: [req.user.username, username],
                pairKey,
                lastMessage: "",
                lastMessageAt: new Date(),
                lastSender: "",
                unread: [
                    { user: req.user.username, count: 0 },
                    { user: username, count: 0 },
                ],
            });
        } catch (error) {
            if (error?.code !== 11000) throw error;
            conversation = await conversationModel.findOne({ pairKey });
        }
    }

    if (!conversation) {
        return res.status(409).json({
            message: "The conversation could not be created. Try again.",
        });
    }

    conversation = await ensureUnreadEntries(conversation);

    if (!conversation) {
        return res.status(409).json({
            message: "The conversation could not be created. Try again.",
        });
    }

    const userMap = await loadConversationUsers(conversation);

    return res.status(200).json({
        conversation: serializeConversation(
            conversation,
            req.user.username,
            userMap
        ),
    });
};

const getConversationMessagesController = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid conversation id." });
    }

    const conversation = await conversationModel.findById(id).lean();

    if (!conversation) {
        return res.status(404).json({ message: "Conversation Not Found" });
    }

    if (!conversation.participants.includes(req.user.username)) {
        return res.status(403).json({
            message: "You are not part of this conversation.",
        });
    }

    const after =
        typeof req.query.after === "string" ? req.query.after.trim() : "";

    if (after) {
        if (!mongoose.isValidObjectId(after)) {
            return res.status(400).json({
                message: "Invalid message cursor.",
            });
        }

        const limit = parseLimit(req.query.limit, AFTER_POLL_LIMIT, AFTER_POLL_LIMIT);
        const rows = await messageModel
            .find({
                conversation: id,
                _id: { $gt: after },
            })
            .sort({ _id: 1 })
            .limit(limit)
            .populate({
                path: "post",
                select: "image_url caption user",
                populate: {
                    path: "user",
                    select: "username name profile_image",
                },
            })
            .lean();

        const userMap = await loadConversationUsers(conversation);
        const serializedConversation = serializeConversation(
            conversation,
            req.user.username,
            userMap
        );

        return res.status(200).json({
            conversation: serializedConversation,
            otherUser: serializedConversation.otherUser,
            messages: rows.map((message) =>
                serializeMessage(message, req.user.username)
            ),
            nextCursor: null,
        });
    }

    const limit = parseLimit(req.query.limit, 30, 50);
    const { cursorId, error } = resolveObjectIdCursor(req.query.cursor);

    if (error) {
        return res.status(400).json({ message: error });
    }

    const query = { conversation: id };

    if (cursorId) {
        query._id = { $lt: cursorId };
    }

    const rows = await messageModel
        .find(query)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .populate({
            path: "post",
            select: "image_url caption user",
            populate: {
                path: "user",
                select: "username name profile_image",
            },
        })
        .lean();

    const hasMore = rows.length > limit;
    const newestPage = rows.slice(0, limit);
    const ascending = [...newestPage].reverse();
    const userMap = await loadConversationUsers(conversation);
    const serializedConversation = serializeConversation(
        conversation,
        req.user.username,
        userMap
    );

    return res.status(200).json({
        conversation: serializedConversation,
        otherUser: serializedConversation.otherUser,
        messages: ascending.map((message) =>
            serializeMessage(message, req.user.username)
        ),
        nextCursor:
            hasMore && newestPage.length > 0
                ? String(newestPage[newestPage.length - 1]._id)
                : null,
    });
};

const sendMessageController = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid conversation id." });
    }

    const conversation = await conversationModel.findById(id).lean();

    if (!conversation) {
        return res.status(404).json({ message: "Conversation Not Found" });
    }

    if (!conversation.participants.includes(req.user.username)) {
        return res.status(403).json({
            message: "You are not part of this conversation.",
        });
    }

    const otherUsername =
        conversation.participants.find(
            (username) => username !== req.user.username
        ) ?? "";

    if (
        await isBlockedBetween(req.user.username, otherUsername)
    ) {
        return res.status(403).json({
            message: "You cannot send messages to this account.",
        });
    }

    const rawText = req.body?.text;
    const rawPostId = req.body?.postId;

    if (rawText !== undefined && typeof rawText !== "string") {
        return res.status(400).json({ message: "Message text must be text." });
    }

    const text = typeof rawText === "string" ? rawText.trim() : "";

    if (text.length > MESSAGE_LIMIT) {
        return res.status(400).json({
            message: `Messages are limited to ${MESSAGE_LIMIT} characters.`,
        });
    }

    let post = null;

    if (
        rawPostId !== undefined &&
        rawPostId !== null &&
        rawPostId !== ""
    ) {
        if (
            typeof rawPostId !== "string" ||
            !mongoose.isValidObjectId(rawPostId)
        ) {
            return res.status(400).json({ message: "Invalid post id." });
        }

        post = await postModel
            .findById(rawPostId)
            .select("_id image_url caption user")
            .populate("user", "username name profile_image")
            .lean();

        if (!post) {
            return res.status(404).json({ message: "Post Not Found" });
        }
    }

    if (!text && !post) {
        return res.status(400).json({
            message: "Write a message or share a post.",
        });
    }

    const message = await messageModel.create({
        conversation: id,
        sender: req.user.username,
        text,
        post: post?._id ?? null,
        readBy: [req.user.username],
    });

    let updatedConversation = await conversationModel.findOneAndUpdate(
        { _id: id, participants: req.user.username },
        {
            $set: {
                lastMessage: text || "Shared a post",
                lastMessageAt: new Date(),
                lastSender: req.user.username,
            },
            $inc: { "unread.$[entry].count": 1 },
        },
        {
            arrayFilters: [{ "entry.user": otherUsername }],
            new: true,
        }
    );

    if (!updatedConversation) {
        return res.status(404).json({ message: "Conversation Not Found" });
    }

    if (
        !(updatedConversation.unread ?? []).some(
            (entry) => entry.user === otherUsername
        )
    ) {
        updatedConversation = await conversationModel.findByIdAndUpdate(
            id,
            {
                $push: {
                    unread: { user: otherUsername, count: 1 },
                },
            },
            { new: true }
        );
    }

    if (!updatedConversation) {
        return res.status(404).json({ message: "Conversation Not Found" });
    }

    const userMap = await loadConversationUsers(updatedConversation);
    const serializedMessage = serializeMessage(
        {
            ...message.toObject(),
            post,
        },
        req.user.username
    );

    return res.status(201).json({
        message: serializedMessage,
        conversation: serializeConversation(
            updatedConversation,
            req.user.username,
            userMap
        ),
    });
};

const markConversationReadController = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid conversation id." });
    }

    const conversation = await conversationModel.findById(id).lean();

    if (!conversation) {
        return res.status(404).json({ message: "Conversation Not Found" });
    }

    if (!conversation.participants.includes(req.user.username)) {
        return res.status(403).json({
            message: "You are not part of this conversation.",
        });
    }

    const otherUsername =
        conversation.participants.find(
            (username) => username !== req.user.username
        ) ?? "";

    await Promise.all([
        messageModel.updateMany(
            {
                conversation: id,
                sender: otherUsername,
                readBy: { $ne: req.user.username },
            },
            { $addToSet: { readBy: req.user.username } }
        ),
        conversationModel.updateOne(
            { _id: id },
            { $set: { "unread.$[entry].count": 0 } },
            { arrayFilters: [{ "entry.user": req.user.username }] }
        ),
    ]);

    return res.status(200).json({ unreadCount: 0 });
};

const getUnreadMessageCountController = async (req, res) => {
    const rows = await conversationModel.aggregate([
        { $match: { participants: req.user.username } },
        { $unwind: "$unread" },
        { $match: { "unread.user": req.user.username } },
        {
            $group: {
                _id: null,
                total: { $sum: "$unread.count" },
            },
        },
    ]);

    return res.status(200).json({
        unreadCount: Number(rows[0]?.total) || 0,
    });
};

module.exports = {
    getConversationsController,
    startConversationController,
    getConversationMessagesController,
    sendMessageController,
    markConversationReadController,
    getUnreadMessageCountController,
};
