import { postApi } from "../../shared/api/client";

export const getFeed = async ({
  cursor = null,
  limit = 10,
  scope = "all",
} = {}) => {
  const params = { limit, scope: scope === "following" ? "following" : "all" };

  if (cursor) params.cursor = cursor;

  const response = await postApi.get("/feed", { params });
  return response.data;
};

export const createPost = async (imageFile, caption) => {
  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("caption", caption);

  const response = await postApi.post("/", formData);
  return response.data;
};

export const deletePost = async (postId) => {
  const response = await postApi.delete(`/${postId}`);
  return response.data;
};

export const likePost = async (postId) => {
  const response = await postApi.post(`/like/${postId}`);
  return response.data;
};

export const unLikePost = async (postId) => {
  const response = await postApi.post(`/unlike/${postId}`);
  return response.data;
};

export const getComments = async (postId, { cursor = null, limit = 20 } = {}) => {
  const params = { limit };

  if (cursor) params.cursor = cursor;

  const response = await postApi.get(`/${postId}/comments`, { params });
  return response.data;
};

export const addComment = async (postId, text) => {
  const response = await postApi.post(`/${postId}/comments`, { text });
  return response.data;
};

export const deleteComment = async (postId, commentId) => {
  const response = await postApi.delete(
    `/${postId}/comments/${commentId}`
  );
  return response.data;
};
