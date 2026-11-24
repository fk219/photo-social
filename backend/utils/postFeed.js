const postModel = require("../models/post.model");
const userModel = require("../models/user.model");
const likeModel = require("../models/like.model");
const commentModel = require("../models/comment.model");
const saveModel = require("../models/save.model");
const followModel = require("../models/follow.model");
const { buildCursorMatch } = require("./postPipeline");
const { getThumbnailUrl } = require("./imagekit");

const fetchRecentComments = async (postIds) => {
    if (postIds.length === 0) return new Map();

    const rows = await commentModel.aggregate([
        { $match: { post: { $in: postIds }, parent: null } },
        { $sort: { _id: 1 } },
        {
            $setWindowFields: {
                partitionBy: "$post",
                sortBy: { _id: 1 },
                output: { commentRank: { $documentNumber: {} } },
            },
        },
        { $match: { commentRank: { $lte: 2 } } },
        {
            $project: {
                post: 1,
                user: 1,
                text: 1,
                createdAt: 1,
            },
        },
    ]);

    const usernames = [...new Set(rows.map((row) => row.user))];
    const users = usernames.length
        ? await userModel
              .find({ username: { $in: usernames } })
              .select("username profile_image")
              .lean()
        : [];
    const avatars = new Map(
        users.map((user) => [user.username, user.profile_image || ""])
    );

    const byPost = new Map();

    rows.forEach((row) => {
        const key = String(row.post);
        if (!byPost.has(key)) byPost.set(key, []);
        byPost.get(key).push({
            _id: row._id,
            user: row.user,
            text: row.text,
            createdAt: row.createdAt,
            profile_image: avatars.get(row.user) || "",
        });
    });

    return byPost;
};

/**
 * Batched feed read: one post query, one author query, one viewer-like query,
 * one save query, one follow query and one reply query. The old aggregation did
 * several lookups per post, which made the feed wait on a chain of small
 * database calls.
 */
const fetchPostsPage = async ({
    match = {},
    cursorId = null,
    cursorPost = null,
    limit = 10,
    viewerUsername = null,
    includeRecentComments = false,
}) => {
    const query = { ...match };

    if (cursorId) {
        Object.assign(query, buildCursorMatch(cursorPost, cursorId));
    }

    const rows = await postModel
        .find(query)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit + 1)
        .lean();

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const ids = page.map((post) => post._id);
    const authorIds = [...new Set(page.map((post) => String(post.user)))];

    const [authors, viewerLikes, viewerSaves, recentByPost] =
        await Promise.all([
            authorIds.length
                ? userModel
                      .find({ _id: { $in: authorIds } })
                      .select("username name bio profile_image")
                      .lean()
                : [],
            viewerUsername && ids.length
                ? likeModel
                      .find({ post: { $in: ids }, user: viewerUsername })
                      .select("post")
                      .lean()
                : [],
            viewerUsername && ids.length
                ? saveModel
                      .find({ post: { $in: ids }, user: viewerUsername })
                      .select("post")
                      .lean()
                : [],
            includeRecentComments ? fetchRecentComments(ids) : new Map(),
        ]);

    const viewerFollows =
        viewerUsername && authors.length
            ? await followModel
                  .find({
                      follower: viewerUsername,
                      followee: { $in: authors.map((a) => a.username) },
                      status: { $ne: "rejected" },
                  })
                  .select("followee")
                  .lean()
            : [];

    const authorMap = new Map(
        authors.map((author) => [String(author._id), author])
    );
    const likedSet = new Set(
        viewerLikes.map((like) => String(like.post))
    );
    const savedSet = new Set(
        viewerSaves.map((save) => String(save.post))
    );
    const followingSet = new Set(
        viewerFollows.map((follow) => follow.followee)
    );

    const posts = page.map((post) => {
        const author = authorMap.get(String(post.user));

        return {
            ...post,
            likesCount: Number(post.likesCount) || 0,
            commentsCount: Number(post.commentsCount) || 0,
            isLiked: likedSet.has(String(post._id)),
            isSaved: savedSet.has(String(post._id)),
            recentComments: recentByPost.get(String(post._id)) || [],
            user: author
                ? {
                      ...author,
                      name: author.name ?? "",
                      isFollowing:
                          Boolean(viewerUsername) &&
                          author.username !== viewerUsername &&
                          followingSet.has(author.username),
                  }
                : {
                      _id: post.user,
                      username: "unknown",
                      name: "",
                      bio: "",
                      profile_image: "",
                      isFollowing: false,
                  },
            thumbnail_url: getThumbnailUrl(post.image_url),
        };
    });

    return {
        posts,
        nextCursor:
            hasMore && page.length > 0
                ? String(page[page.length - 1]._id)
                : null,
    };
};

module.exports = { fetchPostsPage };
