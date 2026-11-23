const multer = require("multer");

const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                message:
                    "This photograph is too large. The maximum upload size is 5 MB.",
            });
        }

        if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({
                message:
                    "Unexpected upload field. Send one image under the 'image' field.",
            });
        }

        return res.status(400).json({
            message: "The photograph could not be processed. Try another file.",
        });
    }

    if (err?.status === 400 || err?.statusCode === 400) {
        return res.status(400).json({ message: err.message });
    }

    if (err?.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Invalid JSON body." });
    }

    if (err?.type === "entity.too.large") {
        return res.status(413).json({ message: "Request body is too large." });
    }

    if (err?.code === 11000) {
        return res.status(409).json({
            message: "That record already exists.",
        });
    }

    if (err?.name === "ValidationError") {
        const firstError = Object.values(err.errors ?? {})[0];
        return res.status(400).json({
            message: firstError?.message || "Validation failed.",
        });
    }

    if (err?.name === "CastError") {
        return res.status(400).json({ message: "Invalid identifier." });
    }

    console.error("Unhandled API error:", err);
    return res.status(500).json({
        message: "Something went wrong on the server. Try again.",
    });
};

module.exports = errorHandler;
