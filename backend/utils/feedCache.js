const { fetchPostsPage } = require("./postFeed");

const TTL_MS = 15 * 1000;
const store = new Map();

const keyFor = (scope, cursor, limit) =>
    `${scope}:${cursor || "first"}:${limit}`;

const read = (scope, cursor, limit) => {
    const key = keyFor(scope, cursor, limit);
    const entry = store.get(key);

    if (!entry) return null;

    if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return null;
    }

    return entry.value;
};

const write = (scope, cursor, limit, value) => {
    store.set(keyFor(scope, cursor, limit), {
        value,
        expiresAt: Date.now() + TTL_MS,
    });
};

/**
 * The guest Explore feed is the same for every visitor for a short window.
 * Caching it removes the database round trips from repeat visits and from the
 * first request after a restart, which is warmed by `warmFeedCache`.
 */
const warmFeedCache = async () => {
    const page = await fetchPostsPage({
        includeRecentComments: true,
        limit: 10,
    });
    write("all", null, 10, page);
    return page;
};

module.exports = { TTL_MS, read, write, warmFeedCache };
