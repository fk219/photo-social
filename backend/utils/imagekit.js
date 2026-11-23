const FEED_THUMBNAIL_WIDTH = 800;
const FEED_THUMBNAIL_QUALITY = 80;

/**
 * ImageKit supports query-string transformations, so we can keep the original
 * URL in MongoDB and ask for a smaller rendition only when serving a feed.
 */
const getImageKitUrl = (url, transformation) => {
    if (typeof url !== "string" || !url) return url;

    try {
        const parsed = new URL(url);

        if (!parsed.hostname.endsWith("imagekit.io")) return url;

        const existing = parsed.searchParams.get("tr");
        if (!existing) {
            parsed.searchParams.set("tr", transformation);
        }

        return parsed.toString();
    } catch {
        return url;
    }
};

const getThumbnailUrl = (url) =>
    getImageKitUrl(
        url,
        `w-${FEED_THUMBNAIL_WIDTH},q-${FEED_THUMBNAIL_QUALITY}`
    );

module.exports = {
    getImageKitUrl,
    getThumbnailUrl,
    FEED_THUMBNAIL_WIDTH,
    FEED_THUMBNAIL_QUALITY,
};
