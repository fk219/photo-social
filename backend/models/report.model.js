const mongoose = require("mongoose");

const REPORT_TARGET_TYPES = ["post", "comment", "user"];

const reportSchema = new mongoose.Schema(
    {
        reporter: {
            type: String,
            required: [true, "Reporter is required"],
            trim: true,
        },
        targetType: {
            type: String,
            required: true,
            enum: {
                values: REPORT_TARGET_TYPES,
                message: "Invalid report target type",
            },
        },
        targetId: {
            type: String,
            required: [true, "Report target is required"],
            trim: true,
        },
        reason: {
            type: String,
            required: [true, "Report reason is required"],
            trim: true,
            maxlength: [500, "Report reasons are limited to 500 characters"],
        },
    },
    { timestamps: true }
);

reportSchema.index({ createdAt: -1 });

const reportModel = mongoose.model("reports", reportSchema);

module.exports = reportModel;
module.exports.REPORT_TARGET_TYPES = REPORT_TARGET_TYPES;
