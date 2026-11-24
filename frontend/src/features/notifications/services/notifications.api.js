import { socialApi } from "../../shared/api/client";

export const getNotifications = async ({ cursor = null, limit = 20 } = {}) => {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  const response = await socialApi.get("/notifications", { params });
  return response.data;
};

export const markNotificationRead = async (notificationId) => {
  const response = await socialApi.post(`/notifications/${notificationId}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await socialApi.post("/notifications/read-all");
  return response.data;
};

export const getNotificationsUnreadCount = async () => {
  const response = await socialApi.get("/notifications/unread-count");
  return response.data;
};
