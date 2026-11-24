import { socialApi } from "../../shared/api/client";

export const getConversations = async ({ cursor = null, limit = 20 } = {}) => {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  const response = await socialApi.get("/messages/conversations", { params });
  return response.data;
};

export const startConversation = async (username) => {
  const response = await socialApi.post("/messages/conversations", {
    username,
  });
  return response.data;
};

export const getConversation = async (
  conversationId,
  { cursor = null, after = null, limit = 30 } = {}
) => {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  if (after) params.after = after;
  const response = await socialApi.get(
    `/messages/conversations/${conversationId}`,
    { params }
  );
  return response.data;
};

export const sendMessage = async (conversationId, { text, postId } = {}) => {
  const response = await socialApi.post(
    `/messages/conversations/${conversationId}/messages`,
    { text, postId }
  );
  return response.data;
};

export const markConversationRead = async (conversationId) => {
  const response = await socialApi.post(
    `/messages/conversations/${conversationId}/read`
  );
  return response.data;
};

export const getMessagesUnreadCount = async () => {
  const response = await socialApi.get("/messages/unread-count");
  return response.data;
};
