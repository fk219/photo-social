const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        conversation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "conversations",
            required: [true, "Conversation is required"],
        },
        sender: {
            type: String,
            required: [true, "Sender is required"],
            trim: true,
        },
        text: {
            type: String,
            default: "",
            trim: true,
            maxlength: [2000, "Messages are limited to 2000 characters"],
        },
        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "posts",
            default: null,
        },
        readBy: {
            type: [String],
            default: [],
        },
    },
    { timestamps: true }
);

messageSchema.index({ conversation: 1, _id: -1 });

const messageModel = mongoose.model("messages", messageSchema);

module.exports = messageModel;
