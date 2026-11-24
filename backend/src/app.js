const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");

const authRouter = require("../routes/auth.route");
const postRouter = require("../routes/post.route");
const userRouter = require("../routes/user.route");
const messageRouter = require("../routes/message.route");
const notificationRouter = require("../routes/notification.route");
const searchRouter = require("../routes/search.route");
const storyRouter = require("../routes/story.route");
const errorHandler = require("../middleware/error.middleware");

const app = express();

// Render/Vercel sit in front of the API; this lets rate limiting key on the
// real client address without trusting an arbitrary proxy chain.
app.set("trust proxy", 1);

const allowedOrigins = (
    process.env.CORS_ORIGINS ||
    [
        "http://localhost:5173",
        "https://insta-clone.furqankhan.dev",
    ].join(",")
)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
    })
);

// Cookie-auth writes must come from an allowed origin. Same-origin browser
// requests still send Origin, and curl without one is allowed.
app.use((req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
        return res.status(403).json({ message: "Origin not allowed." });
    }
    return next();
});

app.get("/", (req, res) => {
    res.send("All API's are working!");
});

app.use("/api/auth", authRouter);
app.use("/api/posts", postRouter);
app.use("/api/users", userRouter);
app.use("/api/messages", messageRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/search", searchRouter);
app.use("/api/stories", storyRouter);

app.use((req, res) => {
    res.status(404).json({ message: "API route not found." });
});

app.use(errorHandler);

module.exports = app;
