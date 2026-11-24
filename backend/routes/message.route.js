const express = require("express");
const identifyUser = require("../middleware/auth.middleware");
const { socialLimiter } = require("../middleware/rateLimit.middleware");
const {
    getConversationsController,
    startConversationController,
    getConversationMessagesController,
    sendMessageController,
    markConversationReadController,
    getUnreadMessageCountController,
} = require("../controllers/message.controller");

const messageRouter = express.Router();

messageRouter.use(socialLimiter);
messageRouter.use(identifyUser);

messageRouter.get("/unread-count", getUnreadMessageCountController);
messageRouter.get("/conversations", getConversationsController);
messageRouter.post("/conversations", startConversationController);
messageRouter.get(
    "/conversations/:id",
    getConversationMessagesController
);
messageRouter.post(
    "/conversations/:id/messages",
    sendMessageController
);
messageRouter.post(
    "/conversations/:id/read",
    markConversationReadController
);

module.exports = messageRouter;
