const mongoose = require("mongoose");

const commentLikeSchema = new mongoose.Schema(
    {
        comment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "comments",
            required: [true, "Comment is required for a comment like"],
        },
        user: {
            type: String,
            required: [true, "Username is required for a comment like"],
            trim: true,
        },
    },
    { timestamps: true }
);

commentLikeSchema.index({ comment: 1, user: 1 }, { unique: true });

const commentLikeModel = mongoose.model(
    "commentLikes",
    commentLikeSchema
);

module.exports = commentLikeModel;
