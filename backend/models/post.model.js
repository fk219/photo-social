const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
    {
        caption: {
            type: String,
            default: "",
            maxlength: [2200, "Caption cannot be longer than 2200 characters"],
        },
        image_url: {
            type: String,
            required: [true, "Image URL is Required for creating a post!"],
        },
        user: {
            ref: "users",
            type: mongoose.Schema.Types.ObjectId,
            required: [true, "Post must be associated with a user!"],
        },
        // Denormalised counters. The feed also computes these with $lookup so
        // posts created before these fields existed still show correct numbers.
        likesCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        commentsCount: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { timestamps: true }
);

postSchema.index({ createdAt: -1, _id: -1 });
postSchema.index({ user: 1, createdAt: -1, _id: -1 });

const postModel = mongoose.model("posts", postSchema);

module.exports = postModel;
