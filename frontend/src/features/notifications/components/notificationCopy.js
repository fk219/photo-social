export const NOTIFICATION_ACTIONS = {
  like: "liked your post",
  comment: "commented on your post",
  reply: "replied to your comment",
  follow: "started following you",
  mention: "mentioned you",
};

export const getNotificationAction = (type) =>
  NOTIFICATION_ACTIONS[type] ?? "sent you a notification";

export const getNotificationTarget = (notification) => {
  const type = notification?.type;
  const actor = notification?.actor?.username;
  const postId = notification?.post?._id;

  if (type === "follow") {
    return actor ? `/u/${encodeURIComponent(actor)}` : "/explore";
  }

  if (postId) return `/p/${postId}`;

  if (actor) return `/u/${encodeURIComponent(actor)}`;

  return "/explore";
};
