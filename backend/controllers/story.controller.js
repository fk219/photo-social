const mongoose = require("mongoose");

const storyModel = require("../models/story.model");
const userModel = require("../models/user.model");
const followModel = require("../models/follow.model");
const {
    normalizeUsername,
    getBlockedUsernames,
    isBlockedBetween,
} = require("../utils/social");
const { getThumbnailUrl } = require("../utils/imagekit");
const {
    hasValidImageSignature,
    uploadImageBuffer,
} = require("../utils/upload");

const STORY_LIFETIME_MS = storyModel.STORY_LIFETIME_MS;
const STORY_CAPTION_LIMIT = 300;
const STORY_FEED_LIMIT = 300;

const serializeStory = (story, viewerUsername) => ({
    _id: story._id,
    image_url: story.image_url,
    thumbnail_url:
        story.thumbnail_url || getThumbnailUrl(story.image_url),
    caption: story.caption ?? "",
    createdAt: story.createdAt,
    expiresAt: story.expiresAt,
    seen: (story.seenBy ?? []).includes(viewerUsername),
    isMine: story.username === viewerUsername,
});

const getStoriesFeedController = async (req, res) => {
    const viewerUsername = req.user.username;
    const blocked = await getBlockedUsernames(viewerUsername);
    const followed = await followModel.distinct("followee", {
        follower: viewerUsername,
        status: { $ne: "rejected" },
    });
    const hasFollows = followed.length > 0;
    const query = {
        expiresAt: { $gt: new Date() },
    };

    if (hasFollows) {
        query.username = {
            $in: [...new Set([viewerUsername, ...followed])],
            $nin: [...blocked],
        };
    } else if (blocked.size > 0) {
        query.username = { $nin: [...blocked] };
    }

    const rows = await storyModel
        .find(query)
        .sort({ createdAt: -1, _id: -1 })
        .limit(STORY_FEED_LIMIT)
        .lean();

    const usernames = [...new Set(rows.map((story) => story.username))];
    const users = await userModel
        .find({ username: { $in: usernames } })
        .select("username name profile_image")
        .lean();
    const userMap = new Map(
        users.map((user) => [user.username, user])
    );
    const groups = new Map();

    rows.forEach((story) => {
        const user = userMap.get(story.username);

        if (!user) return;

        if (!groups.has(story.username)) {
            groups.set(story.username, {
                user: {
                    username: user.username,
                    name: user.name ?? "",
                    profile_image: user.profile_image ?? "",
                },
                stories: [],
                allSeen: true,
                isMine: story.username === viewerUsername,
            });
        }

        const group = groups.get(story.username);
        const serialized = serializeStory(story, viewerUsername);

        group.stories.push(serialized);

        if (!serialized.seen) group.allSeen = false;
    });

    const allGroups = [...groups.values()];
    const ownGroups = allGroups.filter((group) => group.isMine);
    const otherGroups = allGroups
        .filter((group) => !group.isMine)
        .sort((first, second) => {
            if (first.allSeen !== second.allSeen) {
                return first.allSeen ? 1 : -1;
            }

            const firstDate = first.stories[0]?.createdAt ?? 0;
            const secondDate = second.stories[0]?.createdAt ?? 0;

            return new Date(secondDate) - new Date(firstDate);
        });

    return res.status(200).json({
        groups: [...ownGroups, ...otherGroups],
    });
};

const createStoryController = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            message:
                "Attach a JPEG, PNG, or WebP photograph under the 'image' field.",
        });
    }

    if (!hasValidImageSignature(req.file.buffer)) {
        return res.status(400).json({
            message:
                "That file is not a valid JPEG, PNG, or WebP photograph.",
        });
    }

    if (
        req.body?.caption !== undefined &&
        typeof req.body.caption !== "string"
    ) {
        return res.status(400).json({
            message: "Story captions must be text.",
        });
    }

    const caption =
        typeof req.body?.caption === "string"
            ? req.body.caption.trim()
            : "";

    if (caption.length > STORY_CAPTION_LIMIT) {
        return res.status(400).json({
            message: `Story captions are limited to ${STORY_CAPTION_LIMIT} characters.`,
        });
    }

    let uploadedFile;

    try {
        uploadedFile = await uploadImageBuffer(
            req.file.buffer,
            req.file.mimetype,
            { folder: "photosocial/stories", prefix: "story" }
        );
    } catch (error) {
        console.error("ImageKit story upload failed:", error?.message || error);
        return res.status(502).json({
            message:
                "The story could not be sent to media storage. Try again.",
        });
    }

    const story = await storyModel.create({
        user: req.user.id,
        username: req.user.username,
        image_url: uploadedFile.url,
        thumbnail_url: getThumbnailUrl(uploadedFile.url),
        caption,
        seenBy: [],
        expiresAt: new Date(Date.now() + STORY_LIFETIME_MS),
    });

    return res.status(201).json({
        message: "Story created.",
        story: serializeStory(story.toObject(), req.user.username),
    });
};

const markStorySeenController = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid story id." });
    }

    const story = await storyModel.findById(id).select("username expiresAt").lean();

    if (!story || story.expiresAt <= new Date()) {
        return res.status(404).json({ message: "Story Not Found" });
    }

    if (await isBlockedBetween(req.user.username, story.username)) {
        return res.status(404).json({ message: "Story Not Found" });
    }

    await storyModel.updateOne(
        { _id: id },
        { $addToSet: { seenBy: req.user.username } }
    );

    return res.status(200).json({ seen: true });
};

const deleteStoryController = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid story id." });
    }

    const story = await storyModel.findById(id).select("user").lean();

    if (!story) {
        return res.status(404).json({ message: "Story Not Found" });
    }

    if (story.user.toString() !== req.user.id) {
        return res.status(403).json({
            message: "You can only delete your own stories.",
        });
    }

    await storyModel.deleteOne({ _id: id });

    return res.status(200).json({
        message: "Story deleted.",
        storyId: id,
    });
};

const getUserStoriesController = async (req, res) => {
    const username = normalizeUsername(req.params.username);

    if (!username) {
        return res.status(400).json({ message: "Username is required." });
    }

    const user = await userModel
        .findOne({ username })
        .select("username name profile_image")
        .lean();

    if (!user) {
        return res.status(404).json({ message: "User Not Found" });
    }

    if (await isBlockedBetween(req.user.username, username)) {
        return res.status(200).json({ stories: [] });
    }

    const stories = await storyModel
        .find({
            username,
            expiresAt: { $gt: new Date() },
        })
        .sort({ createdAt: -1, _id: -1 })
        .lean();

    return res.status(200).json({
        stories: stories.map((story) =>
            serializeStory(story, req.user.username)
        ),
    });
};

module.exports = {
    getStoriesFeedController,
    createStoryController,
    markStorySeenController,
    deleteStoryController,
    getUserStoriesController,
};
