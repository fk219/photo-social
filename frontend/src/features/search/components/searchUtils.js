import { formatCount } from "../../shared/utils/format";

export const SEARCH_TYPES = ["all", "people", "posts", "tags"];

export const normalizeSearchType = (value) =>
  SEARCH_TYPES.includes(value) ? value : "all";

export const normalizeUsers = (data) => {
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.suggestedUsers)) return data.suggestedUsers;
  if (Array.isArray(data?.suggested)) return data.suggested;
  if (Array.isArray(data)) return data;

  return [];
};

export const normalizeTags = (data) => {
  const source = Array.isArray(data?.tags)
    ? data.tags
    : Array.isArray(data?.trendingTags)
      ? data.trendingTags
      : Array.isArray(data)
        ? data
        : [];

  return source
    .map((item) => {
      if (typeof item === "string") {
        return { tag: item.replace(/^#/, ""), count: null };
      }

      return {
        tag: String(item?.tag ?? item?.name ?? "").replace(/^#/, ""),
        count:
          typeof item?.count === "number"
            ? item.count
            : typeof item?.postsCount === "number"
              ? item.postsCount
              : null,
      };
    })
    .filter((item) => item.tag);
};

export const normalizeSearchResults = (data) => ({
  users: normalizeUsers(data),
  posts: Array.isArray(data?.posts) ? data.posts : [],
  tags: normalizeTags(data),
});

export const EMPTY_RESULTS = {
  users: [],
  posts: [],
  tags: [],
};

export const tagLabel = (tag) => `#${String(tag).replace(/^#/, "")}`;

export const tagCountLabel = (count) => {
  if (typeof count !== "number" || count < 0) return "";

  return `${formatCount(count)} ${count === 1 ? "post" : "posts"}`;
};
