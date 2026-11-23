const mongoose = require("mongoose");

const blacklistSchema = new mongoose.Schema(
    {
        token: {
            type: String,
            required: true,
            unique: true,
        },
    },
    { timestamps: true }
);

// A logged-out JWT is kept until its own expiry window passes.
blacklistSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const blacklistModel = mongoose.model("blacklist", blacklistSchema);

module.exports = blacklistModel;
