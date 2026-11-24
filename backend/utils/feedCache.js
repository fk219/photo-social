const { fetchPostsPage } = require("./postFeed");

const FRESH_MS = 60 * 1000;
const STALE_MS = 10 * 60 * 1000;
const store = new Map();
const refreshing = new Set();

const keyFor = (scope, cursor, limit) =>
    `${scope}:${cursor || "first"}:${limit}`;

const write = (key, value) => {
    store.set(key, {
        value,
        expiresAt: Date.now() + FRESH_MS,
    });
};

/**
 * Guest feeds can be served stale for a few minutes while a background refresh
 * runs. That keeps repeat visits instant without showing a permanently stale
 * gallery.
 */
const getOrLoadPublicFeed = async ({ scope, cursor, limit, load }) => {
    const key = keyFor(scope, cursor, limit);
    const entry = store.get(key);
    const now = Date.now();

    if (entry && now < entry.expiresAt) {
        return entry.value;
    }

    if (entry && now < entry.expiresAt + STALE_MS) {
        if (!refreshing.has(key)) {
            refreshing.add(key);
            load()
                .then((value) => write(key, value))
                .catch(() => {})
                .finally(() => refreshing.delete(key));
        }

        return entry.value;
    }

    const value = await load();
    write(key, value);
    return value;
};

const warmFeedCache = async () => {
    const value = await fetchPostsPage({
        includeRecentComments: true,
        limit: 10,
    });
    write(keyFor("all", null, 10), value);
    return value;
};

module.exports = { FRESH_MS, STALE_MS, getOrLoadPublicFeed, warmFeedCache };
