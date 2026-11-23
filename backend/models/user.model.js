const mongoose = require("mongoose");

const DEFAULT_PROFILE_IMAGE = "https://ik.imagekit.io/fk219/default_profile.png";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            unique: [true, "Username Already Exists"],
            required: [true, "Username is Required"],
        },
        email: {
            type: String,
            unique: [true, "Duplicate Email Found!"],
            required: [true, "Email is Required"],
        },
        password: {
            type: String,
            required: [true, "Password is Required"],
            select: false,
        },
        bio: {
            type: String,
            default: "",
            maxlength: [160, "Bio cannot be longer than 160 characters"],
        },
        profile_image: {
            type: String,
            default: DEFAULT_PROFILE_IMAGE,
        },
    },
    { timestamps: true }
);

const userModel = mongoose.model("users", userSchema);

module.exports = userModel;
module.exports.DEFAULT_PROFILE_IMAGE = DEFAULT_PROFILE_IMAGE;
