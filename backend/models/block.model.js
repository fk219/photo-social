const mongoose = require("mongoose");

const blockSchema = new mongoose.Schema(
    {
        blocker: {
            type: String,
            required: [true, "Blocker is required"],
            trim: true,
        },
        blocked: {
            type: String,
            required: [true, "Blocked user is required"],
            trim: true,
        },
    },
    { timestamps: true }
);

blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
blockSchema.index({ blocked: 1, blocker: 1 });

const blockModel = mongoose.model("blocks", blockSchema);

module.exports = blockModel;
