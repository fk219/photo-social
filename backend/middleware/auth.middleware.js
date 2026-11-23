const jwt = require("jsonwebtoken");
const blacklistModel = require("../models/blacklist.model");

const readToken = (req) => req.cookies?.token;

const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return null;
    }
};

const identifyUser = async (req, res, next) => {
    const token = readToken(req);

    if (!token) {
        return res.status(401).json({
            message: "Unauthorised Access: No Token Provided",
        });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({
            message: "Unauthorised Access: Invalid Token",
        });
    }

    try {
        const revoked = await blacklistModel.exists({ token });
        if (revoked) {
            return res.status(401).json({
                message: "Unauthorised Access: Session ended",
            });
        }
    } catch (error) {
        console.error("Session check failed:", error.message);
        return res.status(503).json({
            message: "Session check unavailable. Try again.",
        });
    }

    req.user = decoded;
    return next();
};

/**
 * Public pages (a photographer's portfolio) should render for signed-out
 * visitors while still knowing who is viewing when a cookie is present.
 */
const identifyUserOptional = async (req, res, next) => {
    const token = readToken(req);

    if (!token) {
        req.user = null;
        return next();
    }

    const decoded = verifyToken(token);

    if (!decoded) {
        req.user = null;
        return next();
    }

    try {
        const revoked = await blacklistModel.exists({ token });
        req.user = revoked ? null : decoded;
    } catch {
        req.user = null;
    }

    return next();
};

module.exports = identifyUser;
module.exports.identifyUser = identifyUser;
module.exports.identifyUserOptional = identifyUserOptional;
