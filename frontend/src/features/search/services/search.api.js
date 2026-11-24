import { socialApi } from "../../shared/api/client";

export const search = async (
  query,
  { type = "all", cursor = null, limit = 20 } = {}
) => {
  // The UI calls this tab "people"; the API calls the same collection "users".
  const apiType = type === "people" ? "users" : type;
  const params = { q: query, type: apiType, limit };
  if (cursor) params.cursor = cursor;
  const response = await socialApi.get("/search", { params });
  return response.data;
};

export const getTrendingTags = async () => {
  const response = await socialApi.get("/search/trending");
  return response.data;
};
