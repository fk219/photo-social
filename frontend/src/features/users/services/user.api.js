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
