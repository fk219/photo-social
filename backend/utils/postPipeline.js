const { getThumbnailUrl } = require("./imagekit");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;

const parseLimit = (raw, fallback = DEFAULT_LIMIT, max = MAX_LIMIT) => {
    const parsed = Number.parseInt(raw, 10);

    if (!Number.isFinite(parsed)) return fallback;

    return Math.min(Math.max(parsed, 1), max);
};

const buildCursorMatch = (cursorPost, cursorId) => {
    if (!cursorPost) {
        // The cursor post may have been deleted while the reader was paging.
        // Falling back to _id keeps the next page from starting over.
        return { _id: { $lt: cursorId } };
    }

    if (cursorPost.createdAt) {
        return {
            $or: [
                { createdAt: { $lt: cursorPost.createdAt } },
                {
                    createdAt: cursorPost.createdAt,
                    _id: { $lt: cursorPost._id },
                },
                // Legacy posts have no timestamp and sort after every dated
                // post, so they are still ahead of this cursor.
                { createdAt: null },
            ],
        };
    }

    // Legacy posts without timestamps sort after dated posts. When the last
    // item is undated, only older undated posts should follow it.
    return {
        createdAt: null,
        _id: { $lt: cursorPost._id },
    };
};

/**
 * One pipeline for both the public feed and a profile's portfolio.
 * Counts come from $lookup rather than trusting only the denormalised fields,
 * which keeps posts created before those fields existed accurate.
 */
const buildPostPipeline = ({
    match = {},
    cursorPost = null,
    cursorId = null,
    limit = DEFAULT_LIMIT,
    viewerUsername = null,
    includeRecentComments = false,
}) => {
    const pipeline = [];

    if (match && Object.keys(match).length > 0) {
        pipeline.push({ $match: match });
    }

    if (cursorId) {
        pipeline.push({ $match: buildCursorMatch(cursorPost, cursorId) });
    }

    pipeline.push({ $sort: { createdAt: -1, _id: -1 } });
    pipeline.push({ $limit: limit + 1 });

    pipeline.push(
        {
            $lookup: {
                from: "likes",
                let: { postId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$post", "$$postId"] },
                        },
                    },
                    { $count: "count" },
                ],
                as: "likeStats",
            },
        },
        {
            $lookup: {
                from: "comments",
                let: { postId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$post", "$$postId"] },
                        },
                    },
                    { $count: "count" },
                ],
                as: "commentStats",
            },
        },
        {
            $lookup: {
                from: "users",
                let: { userId: "$user" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
                    {
                        $project: {
                            username: 1,
                            bio: 1,
                            profile_image: 1,
                        },
                    },
                ],
                as: "author",
            },
        }
    );

    if (includeRecentComments) {
        pipeline.push({
            $lookup: {
                from: "comments",
                let: { postId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$post", "$$postId"] },
                        },
                    },
                    { $sort: { _id: 1 } },
                    { $limit: 2 },
                    {
                        $lookup: {
                            from: "users",
                            let: { commenter: "$user" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $eq: ["$username", "$$commenter"],
                                        },
                                    },
                                },
                                { $project: { profile_image: 1 } },
                            ],
                            as: "commenter",
                        },
                    },
                    {
                        $project: {
                            text: 1,
                            user: 1,
                            createdAt: 1,
                            profile_image: {
                                $arrayElemAt: [
                                    "$commenter.profile_image",
                                    0,
                                ],
                            },
                        },
                    },
                ],
                as: "recentComments",
            },
        });
    }

    if (viewerUsername) {
        pipeline.push({
            $lookup: {
                from: "likes",
                let: { postId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$post", "$$postId"] },
                                    { $eq: ["$user", viewerUsername] },
                                ],
                            },
                        },
                    },
                    { $limit: 1 },
                    { $project: { _id: 1 } },
                ],
                as: "viewerLike",
            },
        });
    }

    pipeline.push({
        $project: {
            caption: 1,
            image_url: 1,
            createdAt: 1,
            updatedAt: 1,
            likesCount: {
                $ifNull: [
                    { $arrayElemAt: ["$likeStats.count", 0] },
                    0,
                ],
            },
            commentsCount: {
                $ifNull: [
                    { $arrayElemAt: ["$commentStats.count", 0] },
                    0,
                ],
            },
            recentComments: includeRecentComments
                ? { $ifNull: ["$recentComments", []] }
                : { $literal: [] },
            isLiked: viewerUsername
                ? { $gt: [{ $size: "$viewerLike" }, 0] }
                : { $literal: false },
            user: {
                _id: { $arrayElemAt: ["$author._id", 0] },
                username: { $arrayElemAt: ["$author.username", 0] },
                bio: { $arrayElemAt: ["$author.bio", 0] },
                profile_image: {
                    $arrayElemAt: ["$author.profile_image", 0],
                },
            },
        },
    });

    return pipeline;
};

const serializePost = (post) => ({
    ...post,
    thumbnail_url: getThumbnailUrl(post.image_url),
});

const serializePosts = (rows, limit) => {
    const hasMore = rows.length > limit;
    const posts = rows.slice(0, limit).map(serializePost);
    const nextCursor = hasMore ? String(posts[posts.length - 1]?._id ?? "") : null;

    return {
        posts,
        nextCursor: nextCursor || null,
    };
};

module.exports = {
    DEFAULT_LIMIT,
    MAX_LIMIT,
    parseLimit,
    buildPostPipeline,
    serializePost,
    serializePosts,
};
