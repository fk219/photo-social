const followModel = require("../models/follow.model");
const userModel = require("../models/user.model");
const postModel = require("../models/post.model");
const {
    parseLimit,
} = require("../utils/postPipeline");
const { fetchPostsPage } = require("../utils/postFeed");
const { resolvePostCursor } = require("../utils/cursor");

const BIO_LIMIT = 160;

const followUserController = async (req, res) => {
    const followerUsername = req.user.username;
    const followeeUsername = req.params.username;

    if (followerUsername === followeeUsername) {
        return res.status(400).json({
            message: "You cannot Follow Yourself",
        });
    }

    const doesUserExists = await userModel.findOne({
        username: followeeUsername,
    });

    if (!doesUserExists) {
        return res.status(404).json({
            message:
                "User You are Trying to Follow A User Who Does Not Exists",
        });
    }

    await followModel.findOneAndUpdate(
        { follower: followerUsername, followee: followeeUsername },
        {
            $set: { status: "approved" },
            $setOnInsert: {
                follower: followerUsername,
                followee: followeeUsername,
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const followersCount = await followModel.countDocuments({
        followee: followeeUsername,
        status: { $ne: "rejected" },
    });

    return res.status(201).json({
        message: `User ${followerUsername} is now following ${followeeUsername}`,
        isFollowing: true,
        followersCount,
    });
};

const unfollowUserController = async (req, res) => {
    const followerUsername = req.user.username;
    const followeeUsername = req.params.username;

    await followModel.deleteOne({
        follower: followerUsername,
        followee: followeeUsername,
    });

    const followersCount = await followModel.countDocuments({
        followee: followeeUsername,
        status: { $ne: "rejected" },
    });

    return res.status(200).json({
        message: `You have successfully unfollowed ${followeeUsername}`,
        isFollowing: false,
        followersCount,
    });
};

const getProfileController = async (req, res) => {
    const username =
        typeof req.params.username === "string"
            ? req.params.username.trim()
            : "";

    if (!username) {
        return res.status(400).json({ message: "Username is required." });
    }

    const user = await userModel
        .findOne({ username })
        .select("username bio profile_image")
        .lean();

    if (!user) {
        return res.status(404).json({ message: "User Not Found" });
    }

    const limit = parseLimit(req.query.limit, 12, 30);
    const { cursorId, cursorPost, error } = await resolvePostCursor(
        postModel,
        req.query.cursor
    );

    if (error) {
        return res.status(400).json({ message: error });
    }

    const viewerUsername = req.user?.username ?? null;

    const [postsCount, followersCount, followingCount, isFollowing, page] =
        await Promise.all([
            postModel.countDocuments({ user: user._id }),
            followModel.countDocuments({
                followee: username,
                status: { $ne: "rejected" },
            }),
            followModel.countDocuments({
                follower: username,
                status: { $ne: "rejected" },
            }),
            viewerUsername && viewerUsername !== username
                ? followModel.exists({
                      follower: viewerUsername,
                      followee: username,
                      status: { $ne: "rejected" },
                  })
                : null,
            fetchPostsPage({
                match: { user: user._id },
                cursorId,
                cursorPost,
                limit,
                viewerUsername,
            }),
        ]);

    const { posts, nextCursor } = page;

    return res.status(200).json({
        message: "Profile fetched successfully.",
        profile: {
            _id: user._id,
            username: user.username,
            bio: user.bio ?? "",
            profile_image: user.profile_image,
            postsCount,
            followersCount,
            followingCount,
            isFollowing: Boolean(isFollowing),
        },
        posts,
        nextCursor,
    });
};

const updateMeController = async (req, res) => {
    const updates = {};

    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "bio")) {
        if (typeof req.body.bio !== "string") {
            return res.status(400).json({ message: "Bio must be text." });
        }

        const bio = req.body.bio.trim();

        if (bio.length > BIO_LIMIT) {
            return res.status(400).json({
                message: `Bios are limited to ${BIO_LIMIT} characters.`,
            });
        }

        updates.bio = bio;
    }

    if (
        Object.prototype.hasOwnProperty.call(
            req.body ?? {},
            "profile_image"
        )
    ) {
        if (typeof req.body.profile_image !== "string") {
            return res.status(400).json({
                message: "Profile image must be a URL.",
            });
        }

        const profileImage = req.body.profile_image.trim();

        if (!profileImage) {
            updates.profile_image = userModel.DEFAULT_PROFILE_IMAGE;
        } else {
            let parsed;

            try {
                parsed = new URL(profileImage);
            } catch {
                parsed = null;
            }

            if (
                !parsed ||
                !["http:", "https:"].includes(parsed.protocol) ||
                profileImage.length > 2048
            ) {
                return res.status(400).json({
                    message: "Profile image must be a valid http(s) URL.",
                });
            }

            updates.profile_image = profileImage;
        }
    }

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({
            message: "Send a bio or profile image to update.",
        });
    }

    const user = await userModel
        .findByIdAndUpdate(req.user.id, { $set: updates }, {
            new: true,
            runValidators: true,
        })
        .select("username email bio profile_image")
        .lean();

    if (!user) {
        return res.status(404).json({ message: "User Not Found" });
    }

    return res.status(200).json({
        message: "Profile updated.",
        user: {
            username: user.username,
            email: user.email,
            bio: user.bio ?? "",
            profile_image: user.profile_image,
        },
    });
};

module.exports = {
    followUserController,
    unfollowUserController,
    getProfileController,
    updateMeController,
    BIO_LIMIT,
};
