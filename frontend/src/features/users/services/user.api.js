import { userApi } from "../../shared/api/client";

export const getProfile = async (
  username,
  { cursor = null, limit = 12 } = {}
) => {
  const params = { limit };

  if (cursor) params.cursor = cursor;

  const response = await userApi.get(`/${encodeURIComponent(username)}`, {
    params,
  });
  return response.data;
};

export const updateMe = async (updates) => {
  const response = await userApi.patch("/me", updates);
  return response.data;
};

export const followUser = async (username) => {
  const response = await userApi.post(
    `/follow/${encodeURIComponent(username)}`
  );
  return response.data;
};

export const unfollowUser = async (username) => {
  const response = await userApi.post(
    `/unfollow/${encodeURIComponent(username)}`
  );
  return response.data;
};

export const getFollowers = async (
  username,
  { cursor = null, limit = 20 } = {}
) => {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  const response = await userApi.get(
    `/${encodeURIComponent(username)}/followers`,
    { params }
  );
  return response.data;
};

export const getFollowing = async (
  username,
  { cursor = null, limit = 20 } = {}
) => {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  const response = await userApi.get(
    `/${encodeURIComponent(username)}/following`,
    { params }
  );
  return response.data;
};

export const getSuggestedUsers = async (limit = 5) => {
  const response = await userApi.get("/suggested", { params: { limit } });
  return response.data;
};

export const getBlockedUsers = async () => {
  const response = await userApi.get("/blocked");
  return response.data;
};

export const blockUser = async (username) => {
  const response = await userApi.post(
    `/${encodeURIComponent(username)}/block`
  );
  return response.data;
};

export const unblockUser = async (username) => {
  const response = await userApi.delete(
    `/${encodeURIComponent(username)}/block`
  );
  return response.data;
};

export const reportUser = async (username, payload) => {
  const response = await userApi.post(
    `/${encodeURIComponent(username)}/report`,
    payload
  );
  return response.data;
};

export const uploadAvatar = async (imageFile) => {
  const formData = new FormData();
  formData.append("image", imageFile);
  const response = await userApi.post("/me/avatar", formData);
  return response.data;
};
