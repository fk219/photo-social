const userModel = require("../models/user.model");
const blacklistModel = require("../models/blacklist.model");
const postModel = require("../models/post.model");
const commentModel = require("../models/comment.model");
const likeModel = require("../models/like.model");
const followModel = require("../models/follow.model");
const conversationModel = require("../models/conversation.model");
const messageModel = require("../models/message.model");
const notificationModel = require("../models/notification.model");
const saveModel = require("../models/save.model");
const storyModel = require("../models/story.model");
const blockModel = require("../models/block.model");
const reportModel = require("../models/report.model");
const commentLikeModel = require("../models/commentLike.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const BIO_LIMIT = 160;
const NAME_LIMIT = 60;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;
const DEMO_EMAIL = "demo@photosocial.local";

const cookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
};

const publicUser = (user) => ({
    _id: user._id,
    username: user.username,
    name: user.name ?? "",
    email: user.email,
    bio: user.bio ?? "",
    profileImage: user.profile_image,
    profile_image: user.profile_image,
    createdAt: user.createdAt,
});

const normalizeImageUrl = (value) => {
    if (typeof value !== "string") return { image: null };
    const image = value.trim();

    if (!image) return { image: null };

    let parsed;

    try {
        parsed = new URL(image);
    } catch {
        return { error: "Profile image must be a valid http(s) URL." };
    }

    if (!["http:", "https:"].includes(parsed.protocol) || image.length > 2048) {
        return { error: "Profile image must be a valid http(s) URL." };
    }

    return { image };
};

const registerController = async (req, res) => {
    const {
        username,
        email,
        password,
        name,
        bio,
        profileImage,
        profile_image,
    } = req.body ?? {};
    const cleanUsername =
        typeof username === "string" ? username.trim() : "";
    const cleanEmail = typeof email === "string" ? email.trim() : "";

    if (!cleanUsername || !cleanEmail || typeof password !== "string") {
        return res.status(400).json({
            message: "Username, email and password are required.",
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            message: "Password must be at least 6 characters.",
        });
    }

    if (name !== undefined && typeof name !== "string") {
        return res.status(400).json({
            message: "Name must be text.",
        });
    }

    const cleanName = typeof name === "string" ? name.trim() : "";

    if (cleanName.length > NAME_LIMIT) {
        return res.status(400).json({
            message: `Names are limited to ${NAME_LIMIT} characters.`,
        });
    }

    const cleanBio = typeof bio === "string" ? bio.trim() : "";

    if (cleanBio.length > BIO_LIMIT) {
        return res.status(400).json({
            message: `Bios are limited to ${BIO_LIMIT} characters.`,
        });
    }

    const image = normalizeImageUrl(profileImage ?? profile_image);

    if (image.error) {
        return res.status(400).json({ message: image.error });
    }

    const isUserAlreadyExists = await userModel.findOne({
        $or: [{ email: cleanEmail }, { username: cleanUsername }],
    });

    if (isUserAlreadyExists) {
        return res.status(409).json({
            message:
                "User Already Exists: " +
                (isUserAlreadyExists.email === cleanEmail
                    ? "Email Already Exists"
                    : "Username Already Exists!"),
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
        username: cleanUsername,
        email: cleanEmail,
        password: hashedPassword,
        name: cleanName,
        bio: cleanBio,
        ...(image.image ? { profile_image: image.image } : {}),
    });

    const token = jwt.sign(
        {
            id: user._id,
            username: user.username,
            tokenVersion: user.tokenVersion ?? 0,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d",
        }
    );

    res.cookie("token", token, cookieOptions);

    res.status(201).json({
        message: "User Registered Successfully",
        user: publicUser(user),
    });
};

const loginController = async (req, res) => {
    const { username, email, password } = req.body ?? {};
    const identifier = {
        username: typeof username === "string" ? username.trim() : "",
        email: typeof email === "string" ? email.trim() : "",
    };

    if (
        (!identifier.username && !identifier.email) ||
        typeof password !== "string"
    ) {
        return res.status(400).json({
            message: "Enter your username and password.",
        });
    }

    const user = await userModel
        .findOne({
            $or: [
                ...(identifier.username
                    ? [{ username: identifier.username }]
                    : []),
                ...(identifier.email ? [{ email: identifier.email }] : []),
            ],
        })
        .select("+password");

    if (!user) {
        return res.status(401).json({
            message: "Invalid username or password.",
        });
    }

    const doesPasswordMatch = await bcrypt.compare(password, user.password);

    if (!doesPasswordMatch) {
        return res.status(401).json({
            message: "Invalid username or password.",
        });
    }

    const token = jwt.sign(
        {
            id: user._id,
            username: user.username,
            tokenVersion: user.tokenVersion ?? 0,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    res.cookie("token", token, cookieOptions);

    res.status(200).json({
        message: "User Logged In Successfully",
        user: publicUser(user),
    });
};

const getMeController = async (req, res) => {
    const user = await userModel.findById(req.user.id).lean();

    if (!user) {
        return res.status(404).json({
            message: "User Not Found",
        });
    }

    res.status(200).json(publicUser(user));
};

const logoutController = async (req, res) => {
    const token = req.cookies?.token;

    if (token) {
        try {
            await blacklistModel.updateOne(
                { token },
                { $setOnInsert: { token } },
                { upsert: true }
            );
        } catch (error) {
            console.error("Logout blacklist failed:", error.message);
        }
    }

    res.clearCookie("token", cookieOptions);
    res.status(200).json({ message: "Logged out successfully." });
};

const changePasswordController = async (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {};

    if (typeof currentPassword !== "string" || !currentPassword) {
        return res.status(400).json({
            message: "Enter your current password.",
        });
    }

    if (
        typeof newPassword !== "string" ||
        newPassword.length < PASSWORD_MIN ||
        newPassword.length > PASSWORD_MAX
    ) {
        return res.status(400).json({
            message: `New password must be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters.`,
        });
    }

    const user = await userModel.findById(req.user.id).select("+password");

    if (!user) {
        return res.status(404).json({ message: "User Not Found" });
    }

    if (String(user.email).toLowerCase() === DEMO_EMAIL) {
        return res.status(403).json({
            message: "The shared demo account cannot change its password.",
        });
    }

    const doesPasswordMatch = await bcrypt.compare(
        currentPassword,
        user.password
    );

    if (!doesPasswordMatch) {
        return res.status(401).json({
            message: "Current password is incorrect.",
        });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    res.clearCookie("token", cookieOptions);

    return res.status(200).json({
        message: "Password updated. All sessions were signed out.",
    });
};

const exportAccountController = async (req, res) => {
    const user = await userModel
        .findById(req.user.id)
        .select("username name email bio profile_image createdAt updatedAt")
        .lean();

    if (!user) {
        return res.status(404).json({ message: "User Not Found" });
    }

    const [
        posts,
        comments,
        likes,
        follows,
        conversations,
        notifications,
        saves,
        stories,
        blocks,
        reports,
        commentLikes,
    ] = await Promise.all([
        postModel
            .find({ user: user._id })
            .sort({ createdAt: 1, _id: 1 })
            .lean(),
        commentModel
            .find({ user: user.username })
            .sort({ createdAt: 1, _id: 1 })
            .lean(),
        likeModel
            .find({ user: user.username })
            .sort({ createdAt: 1, _id: 1 })
            .lean(),
        followModel
            .find({
                $or: [
                    { follower: user.username },
                    { followee: user.username },
                ],
            })
            .sort({ createdAt: 1, _id: 1 })
            .lean(),
        conversationModel
            .find({ participants: user.username })
            .sort({ createdAt: 1, _id: 1 })
            .lean(),
        notificationModel
            .find({
                $or: [
                    { recipient: user.username },
                    { actor: user.username },
                ],
            })
            .sort({ createdAt: 1, _id: 1 })
            .lean(),
        saveModel
            .find({ user: user.username })
            .sort({ createdAt: 1, _id: 1 })
            .lean(),
        storyModel
            .find({ user: user._id })
            .sort({ createdAt: 1, _id: 1 })
            .lean(),
        blockModel
            .find({
                $or: [
                    { blocker: user.username },
                    { blocked: user.username },
                ],
            })
            .sort({ createdAt: 1, _id: 1 })
            .lean(),
        reportModel
            .find({ reporter: user.username })
            .sort({ createdAt: 1, _id: 1 })
            .lean(),
        commentLikeModel
            .find({ user: user.username })
            .sort({ createdAt: 1, _id: 1 })
            .lean(),
    ]);

    const conversationIds = conversations.map(
        (conversation) => conversation._id
    );
    const messages = conversationIds.length
        ? await messageModel
              .find({
                  $or: [
                      { conversation: { $in: conversationIds } },
                      { sender: user.username },
                  ],
              })
              .sort({ createdAt: 1, _id: 1 })
              .lean()
        : await messageModel
              .find({ sender: user.username })
              .sort({ createdAt: 1, _id: 1 })
              .lean();

    const following = follows.filter(
        (follow) => follow.follower === user.username
    );
    const followers = follows.filter(
        (follow) => follow.followee === user.username
    );
    const safeUsername =
        user.username.replace(/[^a-z0-9_-]+/gi, "-") || "account";

    res.set({
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="photosocial-export-${safeUsername}.json"`,
    });

    return res.status(200).json({
        format: "photosocial-account-export",
        version: 1,
        exportedAt: new Date().toISOString(),
        account: {
            id: String(user._id),
            username: user.username,
            name: user.name ?? "",
            email: user.email,
            bio: user.bio ?? "",
            profileImage: user.profile_image,
            joinedAt: user.createdAt,
            updatedAt: user.updatedAt,
        },
        posts: posts.map((post) => ({
            id: String(post._id),
            caption: post.caption ?? "",
            imageUrl: post.image_url,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
        })),
        comments: comments.map((comment) => ({
            id: String(comment._id),
            postId: String(comment.post),
            parentId: comment.parent ? String(comment.parent) : null,
            text: comment.text,
            likesCount: Number(comment.likesCount) || 0,
            createdAt: comment.createdAt,
        })),
        commentReplies: comments
            .filter((comment) => comment.parent)
            .map((comment) => ({
                id: String(comment._id),
                postId: String(comment.post),
                parentId: String(comment.parent),
                text: comment.text,
                likesCount: Number(comment.likesCount) || 0,
                createdAt: comment.createdAt,
            })),
        likes: likes.map((like) => ({
            id: String(like._id),
            postId: String(like.post),
            createdAt: like.createdAt,
        })),
        follows: {
            following: following.map((follow) => ({
                followee: follow.followee,
                status: follow.status,
                createdAt: follow.createdAt,
            })),
            followers: followers.map((follow) => ({
                follower: follow.follower,
                status: follow.status,
                createdAt: follow.createdAt,
            })),
        },
        conversations: conversations.map((conversation) => ({
            id: String(conversation._id),
            participants: conversation.participants,
            lastMessage: conversation.lastMessage ?? "",
            lastMessageAt: conversation.lastMessageAt,
            lastSender: conversation.lastSender ?? "",
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
        })),
        messages: messages.map((message) => ({
            id: String(message._id),
            conversationId: String(message.conversation),
            sender: message.sender,
            text: message.text ?? "",
            postId: message.post ? String(message.post) : null,
            readBy: message.readBy ?? [],
            createdAt: message.createdAt,
        })),
        notifications: notifications.map((notification) => ({
            id: String(notification._id),
            recipient: notification.recipient,
            actor: notification.actor,
            type: notification.type,
            postId: notification.post ? String(notification.post) : null,
            commentId: notification.comment
                ? String(notification.comment)
                : null,
            read: Boolean(notification.read),
            createdAt: notification.createdAt,
        })),
        saves: saves.map((save) => ({
            id: String(save._id),
            postId: String(save.post),
            createdAt: save.createdAt,
        })),
        stories: stories.map((story) => ({
            id: String(story._id),
            imageUrl: story.image_url,
            thumbnailUrl: story.thumbnail_url,
            caption: story.caption ?? "",
            seenBy: story.seenBy ?? [],
            expiresAt: story.expiresAt,
            createdAt: story.createdAt,
        })),
        blocks: blocks.map((block) => ({
            id: String(block._id),
            blocker: block.blocker,
            blocked: block.blocked,
            createdAt: block.createdAt,
        })),
        reports: reports.map((report) => ({
            id: String(report._id),
            targetType: report.targetType,
            targetId: report.targetId,
            reason: report.reason,
            createdAt: report.createdAt,
        })),
        commentLikes: commentLikes.map((commentLike) => ({
            id: String(commentLike._id),
            commentId: String(commentLike.comment),
            createdAt: commentLike.createdAt,
        })),
    });
};

const deleteAccountController = async (req, res) => {
    const { password } = req.body ?? {};

    if (typeof password !== "string" || !password) {
        return res.status(400).json({
            message: "Enter your password to delete the account.",
        });
    }

    const user = await userModel
        .findById(req.user.id)
        .select("username email +password")
        .lean();

    if (!user) {
        return res.status(404).json({ message: "User Not Found" });
    }

    if (String(user.email).toLowerCase() === DEMO_EMAIL) {
        return res.status(403).json({
            message: "The demo account cannot be deleted.",
        });
    }

    const doesPasswordMatch = await bcrypt.compare(password, user.password);

    if (!doesPasswordMatch) {
        return res.status(401).json({
            message: "Password is incorrect.",
        });
    }

    const postIds = await postModel
        .find({ user: user._id })
        .distinct("_id");
    const baseCommentIds = await commentModel
        .find({
            $or: [
                { user: user.username },
                { post: { $in: postIds } },
            ],
        })
        .distinct("_id");
    const replyIds = baseCommentIds.length
        ? await commentModel
              .find({ parent: { $in: baseCommentIds } })
              .distinct("_id")
        : [];
    const commentIdMap = new Map();

    [...baseCommentIds, ...replyIds].forEach((id) => {
        commentIdMap.set(String(id), id);
    });

    const commentIds = [...commentIdMap.values()];
    const conversationIds = await conversationModel
        .find({ participants: user.username })
        .distinct("_id");
    const token = req.cookies?.token;

    await Promise.all([
        commentLikeModel.deleteMany({
            $or: [
                { user: user.username },
                { comment: { $in: commentIds } },
            ],
        }),
        notificationModel.deleteMany({
            $or: [
                { recipient: user.username },
                { actor: user.username },
                { post: { $in: postIds } },
                { comment: { $in: commentIds } },
            ],
        }),
        saveModel.deleteMany({
            $or: [
                { user: user.username },
                { post: { $in: postIds } },
            ],
        }),
        storyModel.deleteMany({
            $or: [
                { user: user._id },
                { username: user.username },
            ],
        }),
        blockModel.deleteMany({
            $or: [
                { blocker: user.username },
                { blocked: user.username },
            ],
        }),
        reportModel.deleteMany({ reporter: user.username }),
        conversationModel.deleteMany({ _id: { $in: conversationIds } }),
        messageModel.deleteMany({
            $or: [
                { conversation: { $in: conversationIds } },
                { sender: user.username },
            ],
        }),
        commentModel.deleteMany({ _id: { $in: commentIds } }),
        likeModel.deleteMany({
            $or: [
                { user: user.username },
                { post: { $in: postIds } },
            ],
        }),
        followModel.deleteMany({
            $or: [
                { follower: user.username },
                { followee: user.username },
            ],
        }),
        postModel.deleteMany({ user: user._id }),
        token
            ? blacklistModel.deleteMany({ token })
            : Promise.resolve(),
    ]);

    await userModel.deleteOne({ _id: user._id });

    res.clearCookie("token", cookieOptions);

    return res.status(200).json({
        message: "Account deleted. All sessions were signed out.",
    });
};

module.exports = {
    registerController,
    loginController,
    getMeController,
    logoutController,
    changePasswordController,
    exportAccountController,
    deleteAccountController,
};
