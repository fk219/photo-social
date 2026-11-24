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

export const getPost = async (postId) => {
  const response = await postApi.get(`/${postId}`);
  return response.data;
};

export const getSavedPosts = async ({ cursor = null, limit = 12 } = {}) => {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  const response = await postApi.get("/saved", { params });
  return response.data;
};

export const savePost = async (postId) => {
  const response = await postApi.post(`/${postId}/save`);
  return response.data;
};

export const unsavePost = async (postId) => {
  const response = await postApi.delete(`/${postId}/save`);
  return response.data;
};

export const getPostLikes = async (
  postId,
  { cursor = null, limit = 30 } = {}
) => {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  const response = await postApi.get(`/${postId}/likes`, { params });
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

export const addComment = async (postId, text, parentId = null) => {
  const body = { text };
  if (parentId) body.parentId = parentId;
  const response = await postApi.post(`/${postId}/comments`, body);
  return response.data;
};

export const deleteComment = async (postId, commentId) => {
  const response = await postApi.delete(
    `/${postId}/comments/${commentId}`
  );
  return response.data;
};

export const getCommentReplies = async (
  postId,
  commentId,
  { cursor = null, limit = 20 } = {}
) => {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  const response = await postApi.get(
    `/${postId}/comments/${commentId}/replies`,
    { params }
  );
  return response.data;
};

export const likeComment = async (postId, commentId) => {
  const response = await postApi.post(
    `/${postId}/comments/${commentId}/like`
  );
  return response.data;
};

export const unlikeComment = async (postId, commentId) => {
  const response = await postApi.delete(
    `/${postId}/comments/${commentId}/like`
  );
  return response.data;
};
