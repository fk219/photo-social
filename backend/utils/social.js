const mongoose = require("mongoose");

const blockModel = require("../models/block.model");
const userModel = require("../models/user.model");

const NAME_LIMIT = 60;
const BIO_LIMIT = 160;

const escapeRegex = (value) =>
    String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const trimString = (value) => (typeof value === "string" ? value.trim() : "");

const isValidObjectId = (value) => mongoose.isValidObjectId(value);

const normalizeUsername = (value) => {
    const username = trimString(value);

    if (!username || username.length > 80) return "";

    return username;
};

/**
 * Usernames blocked in either direction are hidden from the viewer. One query
 * per request keeps list endpoints from repeating block checks per row.
 */
const getBlockedUsernames = async (viewerUsername) => {
    if (!viewerUsername) return new Set();

    const rows = await blockModel
        .find({
            $or: [
                { blocker: viewerUsername },
                { blocked: viewerUsername },
            ],
        })
        .select("blocker blocked")
        .lean();

    const blocked = new Set();

    rows.forEach((row) => {
        if (row.blocker !== viewerUsername) blocked.add(row.blocker);
        if (row.blocked !== viewerUsername) blocked.add(row.blocked);
    });

    return blocked;
};

const isBlockedBetween = async (first, second) => {
    if (!first || !second || first === second) return false;

    const blocked = await blockModel.exists({
        $or: [
            { blocker: first, blocked: second },
            { blocker: second, blocked: first },
        ],
    });

    return Boolean(blocked);
};

const getBlockedAuthorIds = async (viewerUsername) => {
    const blocked = await getBlockedUsernames(viewerUsername);

    if (blocked.size === 0) return { blocked, ids: [] };

    const ids = await userModel.distinct("_id", {
        username: { $in: [...blocked] },
    });

    return { blocked, ids };
};

const publicUserSummary = (user) => ({
    username: user?.username ?? "",
    name: user?.name ?? "",
    profile_image: user?.profile_image ?? "",
});

/**
 * @mentions use the same characters as usernames, capped so a pasted wall of
 * text cannot trigger thousands of lookups.
 */
const parseMentions = (text) => {
    if (typeof text !== "string" || !text) return [];

    const mentions = new Set();
    const pattern = /@([a-zA-Z0-9._-]{1,40})/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
        // Do not treat the punctuation after a mention as part of the name:
        // "@demo_mosaic." should notify demo_mosaic.
        const username = match[1].replace(/[._-]+$/, "");

        if (username) mentions.add(username);
        if (mentions.size >= 20) break;
    }

    return [...mentions];
};

module.exports = {
    NAME_LIMIT,
    BIO_LIMIT,
    escapeRegex,
    trimString,
    isValidObjectId,
    normalizeUsername,
    getBlockedUsernames,
    getBlockedAuthorIds,
    isBlockedBetween,
    publicUserSummary,
    parseMentions,
};
