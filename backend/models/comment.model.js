const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
    {
        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "posts",
            required: [true, "Post ID is Required for a Comment"],
            index: true,
        },
        user: {
            type: String,
            required: [true, "Username is Required for a Comment"],
            trim: true,
        },
        text: {
            type: String,
            required: [true, "Comment text is Required"],
            trim: true,
            maxlength: [500, "Comment cannot be longer than 500 characters"],
        },
        parent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "comments",
            default: null,
        },
        likesCount: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { timestamps: true }
);

commentSchema.index({ post: 1, _id: -1 });
commentSchema.index({ post: 1, parent: 1, _id: -1 });

const commentModel = mongoose.model("comments", commentSchema);

module.exports = commentModel;
