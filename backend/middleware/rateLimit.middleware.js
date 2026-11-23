const rateLimit = require("express-rate-limit");

const createLimiter = ({ max, message }) =>
    rateLimit({
        windowMs: 60 * 1000,
        limit: max,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: { message },
    });

const authLimiter = createLimiter({
    max: 10,
    message: "Too many authentication attempts. Try again in a minute.",
});

const postLimiter = createLimiter({
    max: 30,
    message: "Too many journal requests. Try again in a minute.",
});

module.exports = { authLimiter, postLimiter };
