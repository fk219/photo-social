const mongoose = require("mongoose");

const saveSchema = new mongoose.Schema(
    {
        user: {
            type: String,
            required: [true, "Username is required to save a post"],
            trim: true,
        },
        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "posts",
            required: [true, "Post is required to save a post"],
        },
    },
    { timestamps: true }
);

saveSchema.index({ user: 1, post: 1 }, { unique: true });
saveSchema.index({ post: 1 });

const saveModel = mongoose.model("saves", saveSchema);

module.exports = saveModel;
