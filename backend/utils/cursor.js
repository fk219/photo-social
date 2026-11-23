const mongoose = require("mongoose");

/**
 * Cursor is the id of the last post in the previous page. The document's
 * createdAt/_id pair is used for the compound sort boundary.
 */
const resolvePostCursor = async (postModel, rawCursor) => {
    const cursor = typeof rawCursor === "string" ? rawCursor.trim() : "";

    if (!cursor) return { cursorId: null, cursorPost: null };

    if (!mongoose.isValidObjectId(cursor)) {
        return { error: "Invalid pagination cursor." };
    }

    const cursorId = new mongoose.Types.ObjectId(cursor);
    const cursorPost = await postModel
        .findById(cursorId)
        .select("_id createdAt")
        .lean();

    return { cursorId, cursorPost };
};

module.exports = { resolvePostCursor };
