const express = require("express");
const identifyUser = require("../middleware/auth.middleware");
const { socialLimiter } = require("../middleware/rateLimit.middleware");
const {
    getNotificationsController,
    markAllNotificationsReadController,
    markNotificationReadController,
    getNotificationUnreadCountController,
} = require("../controllers/notification.controller");

const notificationRouter = express.Router();

notificationRouter.use(socialLimiter);
notificationRouter.use(identifyUser);

notificationRouter.get(
    "/unread-count",
    getNotificationUnreadCountController
);
notificationRouter.get("/", getNotificationsController);
notificationRouter.post(
    "/read-all",
    markAllNotificationsReadController
);
notificationRouter.post("/:id/read", markNotificationReadController);

module.exports = notificationRouter;
