const userModel = require("../models/user.model");
const blacklistModel = require("../models/blacklist.model");
const postModel = require("../models/post.model");
const commentModel = require("../models/comment.model");
const likeModel = require("../models/like.model");
const followModel = require("../models/follow.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const BIO_LIMIT = 160;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;
const DEMO_EMAIL = "demo@insta.local";

const cookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
};

const publicUser = (user) => ({
    _id: user._id,
    username: user.username,
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
    const { username, email, password, bio, profileImage, profile_image } =
        req.body ?? {};
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
        .select("username email bio profile_image createdAt updatedAt")
        .lean();

    if (!user) {
        return res.status(404).json({ message: "User Not Found" });
    }

    const [posts, comments, likes, follows] = await Promise.all([
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
    ]);

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
        "Content-Disposition": `attachment; filename="journal-export-${safeUsername}.json"`,
    });

    return res.status(200).json({
        format: "journal-account-export",
        version: 1,
        exportedAt: new Date().toISOString(),
        account: {
            id: String(user._id),
            username: user.username,
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
            text: comment.text,
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

    const postIds = await postModel.find({ user: user._id }).distinct("_id");
    const token = req.cookies?.token;

    await Promise.all([
        commentModel.deleteMany({
            $or: [
                { user: user.username },
                { post: { $in: postIds } },
            ],
        }),
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
