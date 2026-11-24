const mongoose = require("mongoose");

const NOTIFICATION_TYPES = ["like", "comment", "reply", "follow", "mention"];

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: String,
            required: [true, "Notification recipient is required"],
            trim: true,
        },
        actor: {
            type: String,
            required: [true, "Notification actor is required"],
            trim: true,
        },
        type: {
            type: String,
            required: true,
            enum: {
                values: NOTIFICATION_TYPES,
                message: "Invalid notification type",
            },
        },
        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "posts",
            default: null,
        },
        comment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "comments",
            default: null,
        },
        read: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

const notificationModel = mongoose.model(
    "notifications",
    notificationSchema
);

module.exports = notificationModel;
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
