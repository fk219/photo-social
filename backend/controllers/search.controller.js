const postModel = require("../models/post.model");
const userModel = require("../models/user.model");
const followModel = require("../models/follow.model");
const { fetchPostsPage } = require("../utils/postFeed");
const { resolvePostCursor } = require("../utils/cursor");
const { parseLimit } = require("../utils/postPipeline");
const {
    escapeRegex,
    getBlockedUsernames,
} = require("../utils/social");

const SEARCH_TYPES = new Set(["all", "users", "posts", "tags"]);
const MAX_QUERY_LENGTH = 80;
const SAMPLE_SIZE = 300;

const extractHashtags = (caption) => {
    if (typeof caption !== "string" || !caption) return [];

    const tags = new Set();
    const pattern = /#([\p{L}\p{N}_]{1,50})/gu;
    let match;

    while ((match = pattern.exec(caption)) !== null) {
        tags.add(match[1]);
    }

    return [...tags];
};

const countTags = (captions, seed = "") => {
    const prefix = seed.toLowerCase();
    const counts = new Map();

    captions.forEach((caption) => {
        extractHashtags(caption).forEach((tag) => {
            const key = tag.toLowerCase();

            if (prefix && !key.startsWith(prefix)) return;

            const entry = counts.get(key) ?? { tag, count: 0 };
            entry.count += 1;
            counts.set(key, entry);
        });
    });

    return [...counts.values()]
        .sort(
            (first, second) =>
                second.count - first.count ||
                first.tag.localeCompare(second.tag)
        )
        .map((entry) => entry);
};

const getSearchController = async (req, res) => {
    const rawQuery = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const type =
        typeof req.query.type === "string" ? req.query.type.trim() : "all";

    if (!SEARCH_TYPES.has(type)) {
        return res.status(400).json({
            message: "Search type must be all, users, posts, or tags.",
        });
    }

    if (rawQuery.length > MAX_QUERY_LENGTH) {
        return res.status(400).json({
            message: `Search queries are limited to ${MAX_QUERY_LENGTH} characters.`,
        });
    }

    if (!rawQuery) {
        return res.status(200).json({
            users: [],
            posts: [],
            tags: [],
            nextCursor: null,
        });
    }

    const viewerUsername = req.user?.username ?? null;
    const blocked = viewerUsername
        ? await getBlockedUsernames(viewerUsername)
        : new Set();
    const blockedArray = [...blocked];
    const requestedLimit = parseLimit(req.query.limit, 20, 30);
    const userLimit = type === "all" ? 6 : Math.min(requestedLimit, 8);
    const postLimit = type === "all" ? 12 : Math.min(requestedLimit, 12);
    const tagLimit = type === "all" ? 6 : Math.min(requestedLimit, 20);
    const pattern = new RegExp(escapeRegex(rawQuery), "i");

    let users = [];
    let posts = [];
    let tags = [];
    let nextCursor = null;

    if (type === "all" || type === "users") {
        const userQuery = {
            $or: [{ username: pattern }, { name: pattern }],
        };

        if (blockedArray.length > 0) {
            userQuery.username = { $nin: blockedArray };
        }

        const rows = await userModel
            .find(userQuery)
            .sort({ username: 1 })
            .limit(userLimit)
            .select("username name bio profile_image")
            .lean();
        const usernames = rows.map((user) => user.username);

        const [followCounts, viewerFollows] = await Promise.all([
            usernames.length
                ? followModel.aggregate([
                      {
                          $match: {
                              followee: { $in: usernames },
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
                : [],
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

        const followerMap = new Map(
            followCounts.map((row) => [row._id, row.count])
        );
        const followingSet = new Set(
            viewerFollows.map((follow) => follow.followee)
        );

        users = rows.map((user) => ({
            _id: user._id,
            username: user.username,
            name: user.name ?? "",
            bio: user.bio ?? "",
            profile_image: user.profile_image ?? "",
            followersCount: Number(followerMap.get(user.username)) || 0,
            isFollowing:
                Boolean(viewerUsername) &&
                user.username !== viewerUsername &&
                followingSet.has(user.username),
        }));
    }

    let blockedAuthorIds = [];

    if (
        blockedArray.length > 0 &&
        (type === "all" || type === "posts" || type === "tags")
    ) {
        blockedAuthorIds = await userModel.distinct("_id", {
            username: { $in: blockedArray },
        });
    }

    if (type === "all" || type === "posts") {
        const match = { caption: pattern };

        if (blockedAuthorIds.length > 0) {
            match.user = { $nin: blockedAuthorIds };
        }

        let cursorId = null;
        let cursorPost = null;

        if (type === "posts") {
            const cursor = await resolvePostCursor(
                postModel,
                req.query.cursor
            );

            if (cursor.error) {
                return res.status(400).json({ message: cursor.error });
            }

            cursorId = cursor.cursorId;
            cursorPost = cursor.cursorPost;
        }

        const page = await fetchPostsPage({
            match,
            cursorId,
            cursorPost,
            limit: postLimit,
            viewerUsername,
        });

        posts = page.posts;
        nextCursor = type === "posts" ? page.nextCursor : null;
    }

    if (type === "all" || type === "tags") {
        const tagSeed = rawQuery.startsWith("#")
            ? rawQuery.slice(1).trim()
            : rawQuery;

        if (tagSeed) {
            const tagMatch = {};

            if (rawQuery.startsWith("#")) {
                tagMatch.caption = new RegExp(
                    `#${escapeRegex(tagSeed)}`,
                    "i"
                );
            }

            if (blockedAuthorIds.length > 0) {
                tagMatch.user = { $nin: blockedAuthorIds };
            }

            const rows = await postModel
                .find(tagMatch)
                .sort({ createdAt: -1, _id: -1 })
                .limit(SAMPLE_SIZE)
                .select("caption")
                .lean();

            tags = countTags(
                rows.map((post) => post.caption),
                tagSeed
            ).slice(0, tagLimit);
        }
    }

    return res.status(200).json({
        users,
        posts,
        tags,
        nextCursor,
    });
};

const getTrendingTagsController = async (req, res) => {
    const viewerUsername = req.user?.username ?? null;
    const match = {
        createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
    };

    if (viewerUsername) {
        const blocked = await getBlockedUsernames(viewerUsername);

        if (blocked.size > 0) {
            const blockedIds = await userModel.distinct("_id", {
                username: { $in: [...blocked] },
            });

            match.user = { $nin: blockedIds };
        }
    }

    const rows = await postModel
        .find(match)
        .sort({ createdAt: -1, _id: -1 })
        .limit(SAMPLE_SIZE)
        .select("caption")
        .lean();

    return res.status(200).json({
        tags: countTags(rows.map((post) => post.caption)).slice(0, 8),
    });
};

module.exports = {
    getSearchController,
    getTrendingTagsController,
};
