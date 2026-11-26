const mongoose = require("mongoose");

const postModel = require("../models/post.model");
const likeModel = require("../models/like.model");
const commentModel = require("../models/comment.model");
const commentLikeModel = require("../models/commentLike.model");
const userModel = require("../models/user.model");
const followModel = require("../models/follow.model");
const saveModel = require("../models/save.model");
const notificationModel = require("../models/notification.model");
const {
    parseLimit,
    serializePost,
} = require("../utils/postPipeline");
const { fetchPostsPage } = require("../utils/postFeed");
const { getOrLoadPublicFeed } = require("../utils/feedCache");
const { resolvePostCursor, resolveObjectIdCursor } = require("../utils/cursor");
const {
    getBlockedUsernames,
    getBlockedAuthorIds,
    isBlockedBetween,
} = require("../utils/social");
const {
    notifyPostLike,
    removePostLikeNotification,
    notifyMentions,
} = require("../utils/notify");
const {
    hasValidImageSignature,
    uploadImageBuffer,
} = require("../utils/upload");

const findCursorPost = (rawCursor) => resolvePostCursor(postModel, rawCursor);

const loadPostAuthor = async (postId) => {
    const post = await postModel.findById(postId).select("user").lean();

    if (!post) return { post: null, author: null };

    const author = await userModel
        .findById(post.user)
        .select("username")
        .lean();

    return { post, author };
};

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

    try {
        uploadedFile = await uploadImageBuffer(
            req.file.buffer,
            req.file.mimetype,
            { folder: "photosocial", prefix: "post" }
        );
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
        .select("username name bio profile_image")
        .lean();

    try {
        await notifyMentions({
            text: caption,
            actor: req.user.username,
            postId: post._id,
            exclude: [req.user.username],
        });
    } catch (error) {
        console.error("Post mention notification failed:", error.message);
    }

    return res.status(201).json({
        message: "Post Created Successfully",
        post: serializePost({
            ...post.toObject(),
            likesCount: 0,
            commentsCount: 0,
            isLiked: false,
            isSaved: false,
            user: author
                ? { ...author, isFollowing: false }
                : { username: "unknown", name: "", bio: "", profile_image: "" },
        }),
    });
};

const getPostController = async (req, res) => {
    const posts = await postModel
        .find({ user: req.user.id })
        .sort({ _id: -1 })
        .populate("user", "username name bio profile_image")
        .lean();

    const ids = posts.map((post) => post._id);
    const saves =
        ids.length > 0
            ? await saveModel
                  .find({ user: req.user.username, post: { $in: ids } })
                  .select("post")
                  .lean()
            : [];
    const savedSet = new Set(saves.map((save) => String(save.post)));

    res.status(200).json({
        message: "All Posts Fetched Successfully",
        posts: posts.map((post) =>
            serializePost({
                ...post,
                likesCount: post.likesCount ?? 0,
                commentsCount: post.commentsCount ?? 0,
                isLiked: false,
                isSaved: savedSet.has(String(post._id)),
                user: post.user
                    ? { ...post.user, isFollowing: false }
                    : post.user,
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
        .populate("user", "username name bio profile_image")
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

    const [likesCount, commentsCount, isSaved] = await Promise.all([
        likeModel.countDocuments({ post: postId }),
        commentModel.countDocuments({ post: postId }),
        saveModel.exists({
            post: postId,
            user: req.user.username,
        }),
    ]);

    res.status(200).json({
        message: "Post Details Fetched Successfully",
        post: serializePost({
            ...post,
            likesCount,
            commentsCount,
            isSaved: Boolean(isSaved),
            user: post.user
                ? { ...post.user, isFollowing: false }
                : post.user,
        }),
    });
};

const getFeedController = async (req, res) => {
    const limit = parseLimit(req.query.limit);
    const scope = req.query.scope === "following" ? "following" : "all";
    const viewerUsername = req.user?.username ?? null;

    if (scope === "following" && !viewerUsername) {
        return res.status(401).json({
            message: "Sign in to see the accounts you follow.",
        });
    }

    const { cursorId, cursorPost, error } = await findCursorPost(
        req.query.cursor
    );

    if (error) {
        return res.status(400).json({ message: error });
    }

    const blockedIds = viewerUsername
        ? (await getBlockedAuthorIds(viewerUsername)).ids
        : [];
    let match = {};

    if (scope === "following") {
        const followees = await followModel.distinct("followee", {
            follower: viewerUsername,
            status: { $ne: "rejected" },
        });
        // A member's own posts belong in their home feed alongside the
        // accounts they follow.
        const usernames = [...new Set([...followees, viewerUsername])];
        const authorIds = await userModel.distinct("_id", {
            username: { $in: usernames },
        });

        if (authorIds.length === 0) {
            return res.status(200).json({
                message: "Feed fetched successfully.",
                posts: [],
                nextCursor: null,
                scope,
            });
        }

        match = { user: { $in: authorIds, $nin: blockedIds } };
    } else if (blockedIds.length > 0) {
        match = { user: { $nin: blockedIds } };
    }

    const cacheable = scope === "all" && !viewerUsername;
    const cacheCursor = typeof req.query.cursor === "string" ? req.query.cursor : "";

    if (cacheable) {
        const page = await getOrLoadPublicFeed({
            scope,
            cursor: cacheCursor,
            limit,
            load: () =>
                fetchPostsPage({
                    match,
                    cursorId,
                    cursorPost,
                    limit,
                    viewerUsername,
                    includeRecentComments: true,
                }),
        });

        res.set("Cache-Control", "public, max-age=10, stale-while-revalidate=60");
        return res.status(200).json({
            message: "Feed fetched successfully.",
            posts: page.posts,
            nextCursor: page.nextCursor,
            scope,
        });
    }

    const { posts, nextCursor } = await fetchPostsPage({
        match,
        cursorId,
        cursorPost,
        limit,
        viewerUsername,
        includeRecentComments: true,
    });

    return res.status(200).json({
        message: "Feed fetched successfully.",
        posts,
        nextCursor,
        scope,
    });
};

const getPostByIdController = async (req, res) => {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
        return res.status(400).json({ message: "Invalid post id." });
    }

    const viewerUsername = req.user?.username ?? null;
    const { posts } = await fetchPostsPage({
        match: { _id: postId },
        limit: 1,
        viewerUsername,
        includeRecentComments: true,
    });

    if (posts.length === 0) {
        return res.status(404).json({ message: "Post Not Found" });
    }

    const post = posts[0];

    if (
        viewerUsername &&
        post.user?.username &&
        (await isBlockedBetween(viewerUsername, post.user.username))
    ) {
        return res.status(404).json({ message: "Post Not Found" });
    }

    return res.status(200).json({
        message: "Post fetched successfully.",
        post,
    });
};

const getSavedPostsController = async (req, res) => {
    const limit = parseLimit(req.query.limit, 12, 30);
    const { cursorId, error } = resolveObjectIdCursor(req.query.cursor);

    if (error) {
        return res.status(400).json({ message: error });
    }

    const query = { user: req.user.username };

    if (cursorId) {
        query._id = { $lt: cursorId };
    }

    const rows = await saveModel
        .find(query)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .select("post")
        .lean();

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const postIds = page.map((save) => save.post);
    const viewerUsername = req.user.username;

    const { posts: fetchedPosts } =
        postIds.length > 0
            ? await fetchPostsPage({
                  match: { _id: { $in: postIds } },
                  limit: postIds.length,
                  viewerUsername,
                  includeRecentComments: true,
              })
            : { posts: [] };

    const postMap = new Map(
        fetchedPosts.map((post) => [String(post._id), post])
    );
    const posts = page
        .map((save) => postMap.get(String(save.post)))
        .filter(Boolean)
        .map((post) => ({ ...post, isSaved: true }));

    return res.status(200).json({
        message: "Saved posts fetched successfully.",
        posts,
        nextCursor:
            hasMore && page.length > 0
                ? String(page[page.length - 1]._id)
                : null,
    });
};

const savePostController = async (req, res) => {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
        return res.status(400).json({ message: "Invalid post id." });
    }

    const { post, author } = await loadPostAuthor(postId);

    if (!post) {
        return res.status(404).json({ message: "Post Not Found" });
    }

    if (
        author &&
        (await isBlockedBetween(req.user.username, author.username))
    ) {
        return res.status(403).json({
            message: "You cannot interact with this post.",
        });
    }

    await saveModel.findOneAndUpdate(
        { user: req.user.username, post: postId },
        {
            $setOnInsert: {
                user: req.user.username,
                post: postId,
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const savedCount = await saveModel.countDocuments({ post: postId });

    return res.status(200).json({ isSaved: true, savedCount });
};

const unSavePostController = async (req, res) => {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
        return res.status(400).json({ message: "Invalid post id." });
    }

    const exists = await postModel.exists({ _id: postId });

    if (!exists) {
        return res.status(404).json({ message: "Post Not Found" });
    }

    await saveModel.deleteOne({
        user: req.user.username,
        post: postId,
    });

    const savedCount = await saveModel.countDocuments({ post: postId });

    return res.status(200).json({ isSaved: false, savedCount });
};

const getPostLikesController = async (req, res) => {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
        return res.status(400).json({ message: "Invalid post id." });
    }

    const exists = await postModel.exists({ _id: postId });

    if (!exists) {
        return res.status(404).json({ message: "Post Not Found" });
    }

    const limit = parseLimit(req.query.limit, 30, 50);
    const { cursorId, error } = resolveObjectIdCursor(req.query.cursor);

    if (error) {
        return res.status(400).json({ message: error });
    }

    const viewerUsername = req.user?.username ?? null;
    const query = { post: postId };

    if (cursorId) {
        query._id = { $lt: cursorId };
    }

    if (viewerUsername) {
        const blocked = await getBlockedUsernames(viewerUsername);

        if (blocked.size > 0) {
            query.user = { $nin: [...blocked] };
        }
    }

    const rows = await likeModel
        .find(query)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .select("user")
        .lean();

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const usernames = [...new Set(page.map((like) => like.user))];
    const users = await userModel
        .find({ username: { $in: usernames } })
        .select("username name profile_image")
        .lean();
    const viewerFollows =
        viewerUsername && usernames.length
            ? await followModel
                  .find({
                      follower: viewerUsername,
                      followee: { $in: usernames },
                      status: { $ne: "rejected" },
                  })
                  .select("followee")
                  .lean()
            : [];
    const userMap = new Map(users.map((user) => [user.username, user]));
    const followingSet = new Set(
        viewerFollows.map((follow) => follow.followee)
    );

    return res.status(200).json({
        users: page
            .map((like) => userMap.get(like.user))
            .filter(Boolean)
            .map((user) => ({
                username: user.username,
                name: user.name ?? "",
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

const likePostController = async (req, res) => {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
        return res.status(400).json({ message: "Invalid post id." });
    }

    const { post, author } = await loadPostAuthor(postId);

    if (!post) {
        return res.status(404).json({
            message: "The Post You are trying to Like Does Not Exists",
        });
    }

    if (
        author &&
        (await isBlockedBetween(req.user.username, author.username))
    ) {
        return res.status(403).json({
            message: "You cannot interact with this post.",
        });
    }

    const existing = await likeModel
        .findOne({ post: postId, user: req.user.username })
        .select("_id")
        .lean();

    await likeModel.findOneAndUpdate(
        { post: postId, user: req.user.username },
        { $setOnInsert: { post: postId, user: req.user.username } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (!existing && author?.username) {
        try {
            await notifyPostLike({
                recipient: author.username,
                actor: req.user.username,
                postId,
            });
        } catch (error) {
            console.error("Like notification failed:", error.message);
        }
    }

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

    try {
        await removePostLikeNotification({
            actor: req.user.username,
            postId,
        });
    } catch (error) {
        console.error("Like notification cleanup failed:", error.message);
    }

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
            message: "You can only delete your own posts.",
        });
    }

    const commentIds = await commentModel
        .find({ post: postId })
        .distinct("_id");

    await Promise.all([
        postModel.deleteOne({ _id: postId }),
        likeModel.deleteMany({ post: postId }),
        commentModel.deleteMany({ post: postId }),
        commentLikeModel.deleteMany({ comment: { $in: commentIds } }),
        saveModel.deleteMany({ post: postId }),
        notificationModel.deleteMany({
            $or: [
                { post: postId },
                { comment: { $in: commentIds } },
            ],
        }),
    ]);

    return res.status(200).json({
        message: "Post deleted.",
        postId,
    });
};

module.exports = {
    createPostController,
    getPostController,
    getPostDetailsController,
    getFeedController,
    getPostByIdController,
    getSavedPostsController,
    savePostController,
    unSavePostController,
    getPostLikesController,
    likePostController,
    unLikePostController,
    deletePostController,
};
