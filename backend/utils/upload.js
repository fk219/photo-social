const multer = require("multer");
const ImageKit = require("@imagekit/nodejs/index.js");
const { toFile } = require("@imagekit/nodejs/index.js");

const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
            const error = new Error(
                "Unsupported image type. Use a JPEG, PNG, or WebP photograph."
            );
            error.status = 400;
            return cb(error);
        }

        cb(null, true);
    },
});

const imagekitInstance = new ImageKit({
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});

const hasValidImageSignature = (buffer) => {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;

    const jpeg =
        buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const png =
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47;
    const webp =
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP";

    return jpeg || png || webp;
};

const extensionFor = (mimetype) => {
    if (mimetype === "image/png") return ".png";
    if (mimetype === "image/webp") return ".webp";
    return ".jpg";
};

const uploadImageBuffer = async (
    buffer,
    mimetype,
    { folder, prefix = "image" } = {}
) => {
    const extension = extensionFor(mimetype);
    const uploadName = `${prefix}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}${extension}`;

    return imagekitInstance.files.upload({
        file: await toFile(Buffer.from(buffer), uploadName),
        fileName: uploadName,
        folder,
    });
};

module.exports = {
    ALLOWED_IMAGE_TYPES,
    upload,
    hasValidImageSignature,
    uploadImageBuffer,
};
