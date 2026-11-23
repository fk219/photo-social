const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const BIO_LIMIT = 160;

const cookieOptions = {
    httpOnly: true,
    sameSite: "none",
    secure: true,
};

const publicUser = (user) => ({
    _id: user._id,
    username: user.username,
    email: user.email,
    bio: user.bio ?? "",
    profileImage: user.profile_image,
    profile_image: user.profile_image,
});

const normalizeImageUrl = (value) => {
    if (typeof value !== "string") return { image: null };
    const image = value.trim();

    if (!image) return { image: null };

    let parsed;

    try {
        parsed = new URL(image);
    } catch {
        return { error: "Profile image must be a valid http(s) URL." };
    }

    if (!["http:", "https:"].includes(parsed.protocol) || image.length > 2048) {
        return { error: "Profile image must be a valid http(s) URL." };
    }

    return { image };
};

const registerController = async (req, res) => {
    const { username, email, password, bio, profileImage, profile_image } =
        req.body ?? {};
    const cleanUsername =
        typeof username === "string" ? username.trim() : "";
    const cleanEmail = typeof email === "string" ? email.trim() : "";

    if (!cleanUsername || !cleanEmail || typeof password !== "string") {
        return res.status(400).json({
            message: "Username, email and password are required.",
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            message: "Password must be at least 6 characters.",
        });
    }

    const cleanBio = typeof bio === "string" ? bio.trim() : "";

    if (cleanBio.length > BIO_LIMIT) {
        return res.status(400).json({
            message: `Bios are limited to ${BIO_LIMIT} characters.`,
        });
    }

    const image = normalizeImageUrl(profileImage ?? profile_image);

    if (image.error) {
        return res.status(400).json({ message: image.error });
    }

    const isUserAlreadyExists = await userModel.findOne({
        $or: [{ email: cleanEmail }, { username: cleanUsername }],
    });

    if (isUserAlreadyExists) {
        return res.status(409).json({
            message:
                "User Already Exists: " +
                (isUserAlreadyExists.email === cleanEmail
                    ? "Email Already Exists"
                    : "Username Already Exists!"),
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
        username: cleanUsername,
        email: cleanEmail,
        password: hashedPassword,
        bio: cleanBio,
        ...(image.image ? { profile_image: image.image } : {}),
    });

    const token = jwt.sign(
        {
            id: user._id,
            username: user.username,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d",
        }
    );

    res.cookie("token", token, cookieOptions);

    res.status(201).json({
        message: "User Registered Successfully",
        user: publicUser(user),
    });
};

const loginController = async (req, res) => {
    const { username, email, password } = req.body ?? {};
    const identifier = {
        username: typeof username === "string" ? username.trim() : "",
        email: typeof email === "string" ? email.trim() : "",
    };

    if (
        (!identifier.username && !identifier.email) ||
        typeof password !== "string"
    ) {
        return res.status(400).json({
            message: "Enter your username and password.",
        });
    }

    const user = await userModel
        .findOne({
            $or: [
                ...(identifier.username
                    ? [{ username: identifier.username }]
                    : []),
                ...(identifier.email ? [{ email: identifier.email }] : []),
            ],
        })
        .select("+password");

    if (!user) {
        return res.status(409).json({
            message: "User is not found!",
        });
    }

    const doesPasswordMatch = await bcrypt.compare(password, user.password);

    if (!doesPasswordMatch) {
        return res.status(401).json({
            message: "Incorrect Password!!",
        });
    }

    const token = jwt.sign(
        {
            id: user._id,
            username: user.username,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    res.cookie("token", token, cookieOptions);

    res.status(200).json({
        message: "User Logged In Successfully",
        user: publicUser(user),
    });
};

const getMeController = async (req, res) => {
    const user = await userModel.findById(req.user.id).lean();

    if (!user) {
        return res.status(404).json({
            message: "User Not Found",
        });
    }

    res.status(200).json(publicUser(user));
};

const logoutController = (req, res) => {
    res.clearCookie("token", cookieOptions);
    res.status(200).json({ message: "Logged out successfully." });
};

module.exports = {
    registerController,
    loginController,
    getMeController,
    logoutController,
};
