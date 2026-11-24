const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
    {
        participants: {
            type: [String],
            required: [true, "Conversation participants are required"],
            validate: {
                validator: (value) =>
                    Array.isArray(value) && value.length === 2,
                message: "A conversation must have exactly two participants",
            },
        },
        pairKey: {
            type: String,
            required: [true, "Conversation pair key is required"],
            unique: true,
        },
        lastMessage: {
            type: String,
            default: "",
            maxlength: [2000, "Last message is too long"],
        },
        lastMessageAt: {
            type: Date,
            default: Date.now,
        },
        lastSender: {
            type: String,
            default: "",
        },
        unread: [
            {
                _id: false,
                user: {
                    type: String,
                    required: true,
                },
                count: {
                    type: Number,
                    default: 0,
                    min: 0,
                },
            },
        ],
    },
    { timestamps: true }
);

conversationSchema.index({ participants: 1, lastMessageAt: -1, updatedAt: -1 });

const conversationModel = mongoose.model(
    "conversations",
    conversationSchema
);

module.exports = conversationModel;
