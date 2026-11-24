const mongoose = require("mongoose");

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

const storySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: [true, "Story owner is required"],
        },
        username: {
            type: String,
            required: [true, "Story username is required"],
            trim: true,
        },
        image_url: {
            type: String,
            required: [true, "Story image is required"],
        },
        thumbnail_url: {
            type: String,
            default: "",
        },
        caption: {
            type: String,
            default: "",
            trim: true,
            maxlength: [300, "Story captions are limited to 300 characters"],
        },
        seenBy: {
            type: [String],
            default: [],
        },
        expiresAt: {
            type: Date,
            required: [true, "Story expiry is required"],
        },
    },
    { timestamps: true }
);

storySchema.index({ username: 1, createdAt: -1 });
// TTL index: MongoDB removes stories once expiresAt is in the past.
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const storyModel = mongoose.model("stories", storySchema);

module.exports = storyModel;
module.exports.STORY_LIFETIME_MS = STORY_LIFETIME_MS;
