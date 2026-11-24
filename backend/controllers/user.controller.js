const followModel = require("../models/follow.model");
const userModel = require("../models/user.model");
const postModel = require("../models/post.model");
const commentModel = require("../models/comment.model");
const blockModel = require("../models/block.model");
const reportModel = require("../models/report.model");
const {
    parseLimit,
} = require("../utils/postPipeline");
const { fetchPostsPage } = require("../utils/postFeed");
const { resolvePostCursor, resolveObjectIdCursor } = require("../utils/cursor");
const {
    NAME_LIMIT,
    BIO_LIMIT,
    normalizeUsername,
    getBlockedUsernames,
    isBlockedBetween,
    isValidObjectId,
} = require("../utils/social");
const {
    notifyFollow,
    removeFollowNotification,
} = require("../utils/notify");
const {
    hasValidImageSignature,
    uploadImageBuffer,
} = require("../utils/upload");

const REPORT_TARGET_TYPES = new Set(["post", "comment", "user"]);

const followUserController = async (req, res) => {
    const followerUsername = req.user.username;
    const followeeUsername = normalizeUsername(req.params.username);

    if (!followeeUsername) {
        return res.status(400).json({ message: "Username is required." });
    }

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

    if (await isBlockedBetween(followerUsername, followeeUsername)) {
        return res.status(403).json({
            message: "You cannot follow this account.",
        });
    }

    const existing = await followModel
        .findOne({
            follower: followerUsername,
            followee: followeeUsername,
        })
        .select("status")
        .lean();

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

    if (existing?.status !== "approved") {
        try {
            await notifyFollow({
                recipient: followeeUsername,
                actor: followerUsername,
            });
        } catch (error) {
            console.error("Follow notification failed:", error.message);
        }
    }

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
    const followeeUsername = normalizeUsername(req.params.username);

    if (!followeeUsername) {
        return res.status(400).json({ message: "Username is required." });
    }

    if (followerUsername === followeeUsername) {
        return res.status(400).json({
            message: "You cannot unfollow yourself.",
        });
    }

    await followModel.deleteOne({
        follower: followerUsername,
        followee: followeeUsername,
    });

    try {
        await removeFollowNotification({
            follower: followerUsername,
            followee: followeeUsername,
        });
    } catch (error) {
        console.error("Follow notification cleanup failed:", error.message);
    }

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
    const username = normalizeUsername(req.params.username);

    if (!username) {
        return res.status(400).json({ message: "Username is required." });
    }

    const user = await userModel
        .findOne({ username })
        .select("username name bio profile_image")
        .lean();

    if (!user) {
        return res.status(404).json({ message: "User Not Found" });
    }

    const viewerUsername = req.user?.username ?? null;
    const isMe = viewerUsername === username;
    const isBlocked =
        Boolean(viewerUsername) &&
        !isMe &&
        (await isBlockedBetween(viewerUsername, username));

    if (isBlocked) {
        const [followersCount, followingCount] = await Promise.all([
            followModel.countDocuments({
                followee: username,
                status: { $ne: "rejected" },
            }),
            followModel.countDocuments({
                follower: username,
                status: { $ne: "rejected" },
            }),
        ]);

        return res.status(200).json({
            message: "Profile fetched successfully.",
            profile: {
                _id: user._id,
                username: user.username,
                name: user.name ?? "",
                bio: user.bio ?? "",
                profile_image: user.profile_image,
                postsCount: 0,
                followersCount,
                followingCount,
                isFollowing: false,
                isBlocked: true,
                isMe: false,
            },
            posts: [],
            nextCursor: null,
        });
    }

    const limit = parseLimit(req.query.limit, 12, 30);
    const { cursorId, cursorPost, error } = await resolvePostCursor(
        postModel,
        req.query.cursor
    );

    if (error) {
        return res.status(400).json({ message: error });
    }

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
            viewerUsername && !isMe
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
            name: user.name ?? "",
            bio: user.bio ?? "",
            profile_image: user.profile_image,
            postsCount,
            followersCount,
            followingCount,
            isFollowing: Boolean(isFollowing),
            isBlocked: false,
            isMe,
        },
        posts,
        nextCursor,
    });
};

const updateMeController = async (req, res) => {
    const updates = {};
    const body = req.body ?? {};

    if (Object.prototype.hasOwnProperty.call(body, "name")) {
        if (typeof body.name !== "string") {
            return res.status(400).json({ message: "Name must be text." });
        }

        const name = body.name.trim();

        if (name.length > NAME_LIMIT) {
            return res.status(400).json({
                message: `Names are limited to ${NAME_LIMIT} characters.`,
            });
        }

        updates.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(body, "bio")) {
        if (typeof body.bio !== "string") {
            return res.status(400).json({ message: "Bio must be text." });
        }

        const bio = body.bio.trim();

        if (bio.length > BIO_LIMIT) {
            return res.status(400).json({
                message: `Bios are limited to ${BIO_LIMIT} characters.`,
            });
        }

        updates.bio = bio;
    }

    if (
        Object.prototype.hasOwnProperty.call(body, "profile_image")
    ) {
        if (typeof body.profile_image !== "string") {
            return res.status(400).json({
                message: "Profile image must be a URL.",
            });
        }

        const profileImage = body.profile_image.trim();

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
            message: "Send a name, bio or profile image to update.",
        });
    }

    const user = await userModel
        .findByIdAndUpdate(req.user.id, { $set: updates }, {
            new: true,
            runValidators: true,
        })
        .select("username name email bio profile_image")
        .lean();

    if (!user) {
        return res.status(404).json({ message: "User Not Found" });
    }

    return res.status(200).json({
        message: "Profile updated.",
        user: {
            username: user.username,
            name: user.name ?? "",
            email: user.email,
            bio: user.bio ?? "",
            profile_image: user.profile_image,
        },
    });
};

const uploadAvatarController = async (req, res) => {
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

    let uploadedFile;

    try {
        uploadedFile = await uploadImageBuffer(
            req.file.buffer,
            req.file.mimetype,
            { folder: "insta-clone/avatars", prefix: "avatar" }
        );
    } catch (error) {
        console.error("ImageKit avatar upload failed:", error?.message || error);
        return res.status(502).json({
            message:
                "The avatar could not be sent to media storage. Try again.",
        });
    }

    const user = await userModel
        .findByIdAndUpdate(
            req.user.id,
            { $set: { profile_image: uploadedFile.url } },
            { new: true, runValidators: true }
        )
        .select("username name email bio profile_image")
        .lean();

    if (!user) {
        return res.status(404).json({ message: "User Not Found" });
    }

    return res.status(200).json({
        message: "Avatar updated.",
        user: {
            username: user.username,
            name: user.name ?? "",
            email: user.email,
            bio: user.bio ?? "",
            profile_image: user.profile_image,
            profileImage: user.profile_image,
        },
    });
};

const getFollowListController = async (req, res, direction) => {
    const username = normalizeUsername(req.params.username);

    if (!username) {
        return res.status(400).json({ message: "Username is required." });
    }

    const target = await userModel
        .findOne({ username })
        .select("_id")
        .lean();

    if (!target) {
        return res.status(404).json({ message: "User Not Found" });
    }

    const limit = parseLimit(req.query.limit, 20, 50);
    const { cursorId, error } = resolveObjectIdCursor(req.query.cursor);

    if (error) {
        return res.status(400).json({ message: error });
    }

    const query =
        direction === "followers"
            ? { followee: username, status: { $ne: "rejected" } }
            : { follower: username, status: { $ne: "rejected" } };

    if (cursorId) {
        query._id = { $lt: cursorId };
    }

    const rows = await followModel
        .find(query)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .lean();

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const usernames = page.map((follow) =>
        direction === "followers" ? follow.follower : follow.followee
    );
    const viewerUsername = req.user?.username ?? null;

    const [users, viewerFollows] = await Promise.all([
        userModel
            .find({ username: { $in: usernames } })
            .select("username name bio profile_image")
            .lean(),
        viewerUsername && usernames.length
            ? followModel
                  .find({
                      follower: viewerUsername,
                      followee: { $in: usernames },
                      status: { $ne: "rejected" },
                  })
                  .select("followee")
                  .lean()
            : [],
    ]);

    const userMap = new Map(users.map((user) => [user.username, user]));
    const followingSet = new Set(
        viewerFollows.map((follow) => follow.followee)
    );

    return res.status(200).json({
        users: usernames
            .map((name) => userMap.get(name))
            .filter(Boolean)
            .map((user) => ({
                _id: user._id,
                username: user.username,
                name: user.name ?? "",
                bio: user.bio ?? "",
                profile_image: user.profile_image ?? "",
                isFollowing:
                    Boolean(viewerUsername) &&
                    user.username !== viewerUsername &&
                    followingSet.has(user.username),
            })),
        nextCursor:
            hasMore && page.length > 0
                ? String(page[page.length - 1]._id)
                : null,
    });
};

const getFollowersController = (req, res) =>
    getFollowListController(req, res, "followers");

const getFollowingController = (req, res) =>
    getFollowListController(req, res, "following");

const getSuggestedUsersController = async (req, res) => {
    const viewerUsername = req.user.username;
    const limit = parseLimit(req.query.limit, 5, 20);
    const blocked = await getBlockedUsernames(viewerUsername);
    const followed = await followModel.distinct("followee", {
        follower: viewerUsername,
        status: { $ne: "rejected" },
    });
    const excluded = new Set([
        viewerUsername,
        ...blocked,
        ...followed,
    ]);
    const excludedArray = [...excluded];

    const ranked = await followModel.aggregate([
        {
            $match: {
                status: { $ne: "rejected" },
                followee: { $nin: excludedArray },
            },
        },
        {
            $group: {
                _id: "$followee",
                followersCount: { $sum: 1 },
            },
        },
        { $sort: { followersCount: -1, _id: 1 } },
        { $limit: limit + 20 },
    ]);

    const rankedUsers = ranked.length
        ? await userModel
              .find({
                  username: { $in: ranked.map((row) => row._id) },
              })
              .select("username name bio profile_image")
              .lean()
        : [];
    const rankedMap = new Map(
        rankedUsers.map((user) => [user.username, user])
    );
    const picked = [];

    for (const row of ranked) {
        const user = rankedMap.get(row._id);

        if (!user) continue;

        picked.push(user);

        if (picked.length >= limit) break;
    }

    if (picked.length < limit) {
        const fill = await userModel
            .find({
                username: {
                    $nin: [
                        ...excluded,
                        ...picked.map((user) => user.username),
                    ],
                },
            })
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit - picked.length)
            .select("username name bio profile_image")
            .lean();

        picked.push(...fill);
    }

    const names = picked.map((user) => user.username);
    const counts = names.length
        ? await followModel.aggregate([
              {
                  $match: {
                      followee: { $in: names },
                      status: { $ne: "rejected" },
                  },
              },
              {
                  $group: {
                      _id: "$followee",
                      count: { $sum: 1 },
                  },
              },
          ])
        : [];
    const countMap = new Map(
        counts.map((row) => [row._id, row.count])
    );

    return res.status(200).json({
        users: picked.map((user) => ({
            _id: user._id,
            username: user.username,
            name: user.name ?? "",
            bio: user.bio ?? "",
            profile_image: user.profile_image ?? "",
            followersCount: Number(countMap.get(user.username)) || 0,
            isFollowing: false,
        })),
    });
};

const getBlockedUsersController = async (req, res) => {
    const blocks = await blockModel
        .find({ blocker: req.user.username })
        .sort({ _id: -1 })
        .select("blocked")
        .lean();
    const usernames = blocks.map((block) => block.blocked);
    const users = await userModel
        .find({ username: { $in: usernames } })
        .select("username name bio profile_image")
        .lean();
    const userMap = new Map(
        users.map((user) => [user.username, user])
    );

    return res.status(200).json({
        users: usernames
            .map((name) => userMap.get(name))
            .filter(Boolean)
            .map((user) => ({
                username: user.username,
                name: user.name ?? "",
                bio: user.bio ?? "",
                profile_image: user.profile_image ?? "",
            })),
    });
};

const blockUserController = async (req, res) => {
    const blockedUsername = normalizeUsername(req.params.username);

    if (!blockedUsername) {
        return res.status(400).json({ message: "Username is required." });
    }

    if (blockedUsername === req.user.username) {
        return res.status(400).json({
            message: "You cannot block yourself.",
        });
    }

    const target = await userModel
        .findOne({ username: blockedUsername })
        .select("_id")
        .lean();

    if (!target) {
        return res.status(404).json({ message: "User Not Found" });
    }

    await blockModel.findOneAndUpdate(
        {
            blocker: req.user.username,
            blocked: blockedUsername,
        },
        {
            $setOnInsert: {
                blocker: req.user.username,
                blocked: blockedUsername,
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await followModel.deleteMany({
        $or: [
            {
                follower: req.user.username,
                followee: blockedUsername,
            },
            {
                follower: blockedUsername,
                followee: req.user.username,
            },
        ],
    });

    await Promise.all([
        removeFollowNotification({
            follower: req.user.username,
            followee: blockedUsername,
        }),
        removeFollowNotification({
            follower: blockedUsername,
            followee: req.user.username,
        }),
    ]);

    return res.status(200).json({ isBlocked: true });
};

const unblockUserController = async (req, res) => {
    const blockedUsername = normalizeUsername(req.params.username);

    if (!blockedUsername) {
        return res.status(400).json({ message: "Username is required." });
    }

    if (blockedUsername === req.user.username) {
        return res.status(400).json({
            message: "You cannot unblock yourself.",
        });
    }

    const target = await userModel
        .findOne({ username: blockedUsername })
        .select("_id")
        .lean();

    if (!target) {
        return res.status(404).json({ message: "User Not Found" });
    }

    await blockModel.deleteOne({
        blocker: req.user.username,
        blocked: blockedUsername,
    });

    return res.status(200).json({ isBlocked: false });
};

const reportUserController = async (req, res) => {
    const username = normalizeUsername(req.params.username);

    if (!username) {
        return res.status(400).json({ message: "Username is required." });
    }

    const target = await userModel
        .findOne({ username })
        .select("_id")
        .lean();

    if (!target) {
        return res.status(404).json({ message: "User Not Found" });
    }

    const reason =
        typeof req.body?.reason === "string"
            ? req.body.reason.trim()
            : "";

    if (reason.length < 3 || reason.length > 500) {
        return res.status(400).json({
            message: "Report reasons must be between 3 and 500 characters.",
        });
    }

    const targetType =
        typeof req.body?.targetType === "string"
            ? req.body.targetType.trim()
            : "user";

    if (!REPORT_TARGET_TYPES.has(targetType)) {
        return res.status(400).json({
            message: "Report target type must be post, comment, or user.",
        });
    }

    if (targetType === "user" && username === req.user.username) {
        return res.status(400).json({
            message: "You cannot report yourself.",
        });
    }

    let targetId = String(target._id);

    if (targetType !== "user") {
        const rawTargetId =
            typeof req.body?.targetId === "string"
                ? req.body.targetId.trim()
                : "";

        if (!isValidObjectId(rawTargetId)) {
            return res.status(400).json({
                message: "A valid report target id is required.",
            });
        }

        if (targetType === "post") {
            const postExists = await postModel.exists({ _id: rawTargetId });

            if (!postExists) {
                return res.status(404).json({ message: "Post Not Found" });
            }
        } else {
            const commentExists = await commentModel.exists({
                _id: rawTargetId,
            });

            if (!commentExists) {
                return res.status(404).json({ message: "Comment Not Found" });
            }
        }

        targetId = rawTargetId;
    }

    await reportModel.create({
        reporter: req.user.username,
        targetType,
        targetId,
        reason,
    });

    return res.status(201).json({
        message: "Report submitted. Our team will review it.",
    });
};

module.exports = {
    followUserController,
    unfollowUserController,
    getProfileController,
    updateMeController,
    uploadAvatarController,
    getFollowersController,
    getFollowingController,
    getSuggestedUsersController,
    getBlockedUsersController,
    blockUserController,
    unblockUserController,
    reportUserController,
    BIO_LIMIT,
    NAME_LIMIT,
};
