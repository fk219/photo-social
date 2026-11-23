const jwt = require("jsonwebtoken");

const readToken = (req) => req.cookies?.token;

const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return null;
    }
};

const identifyUser = (req, res, next) => {
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

    req.user = decoded;
    next();
};

/**
 * Public pages (a photographer's portfolio) should render for signed-out
 * visitors while still knowing who is viewing when a cookie is present.
 */
const identifyUserOptional = (req, res, next) => {
    const token = readToken(req);
    req.user = token ? verifyToken(token) : null;
    next();
};

module.exports = identifyUser;
module.exports.identifyUser = identifyUser;
module.exports.identifyUserOptional = identifyUserOptional;
