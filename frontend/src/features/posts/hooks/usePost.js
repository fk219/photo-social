import { useCallback, useContext } from "react";
import { PostContext } from "../post.context.jsx";
import { useAuth } from "../../auth/hooks/useAuth";
import { getErrorMessage } from "../../shared/utils/error";
import {
  createPost,
  deletePost,
  getFeed,
  likePost,
  unLikePost,
} from "../services/post.api.js";

const FEED_LIMIT = 10;

const EMPTY_FEED = {
  items: null,
  nextCursor: null,
  loading: false,
  error: "",
  loadingMore: false,
  loadMoreError: "",
  viewer: null,
};

export const usePost = () => {
  const context = useContext(PostContext);
  const { user } = useAuth();
  const { feeds, setFeeds } = context;

  const getFeedState = (scope) => feeds[scope] ?? EMPTY_FEED;

  const updateFeed = useCallback(
    (scope, updater) => {
      setFeeds((current) => {
        const currentFeed = current[scope] ?? EMPTY_FEED;
        const nextFeed = updater(currentFeed);

        if (nextFeed === currentFeed) return current;

        return { ...current, [scope]: nextFeed };
      });
    },
    [setFeeds]
  );

  const patchPost = useCallback(
    (postId, patch) => {
      if (!postId) return;

      setFeeds((current) => {
        let touched = false;
        const next = {};

        for (const [scope, feed] of Object.entries(current)) {
          if (!feed?.items) {
            next[scope] = feed;
            continue;
          }

          let scopeTouched = false;
          const items = feed.items.map((item) => {
            if (item._id !== postId) return item;

            const value =
              typeof patch === "function" ? patch(item) : patch;
            scopeTouched = true;

            return { ...item, ...value };
          });

          if (scopeTouched) {
            touched = true;
            next[scope] = { ...feed, items };
          } else {
            next[scope] = feed;
          }
        }

        return touched ? next : current;
      });
    },
    [setFeeds]
  );

  const handleGetFeed = useCallback(
    async (scope = "explore") => {
      const viewerName = user?.username ?? null;

      updateFeed(scope, (state) => ({
        ...state,
        loading: true,
        error: "",
        loadMoreError: "",
        viewer: viewerName,
      }));

      try {
        const data = await getFeed({ scope, limit: FEED_LIMIT });
        const posts = Array.isArray(data?.posts) ? data.posts : [];

        updateFeed(scope, (state) => ({
          ...state,
          items: posts,
          nextCursor: data?.nextCursor ?? null,
          loading: false,
        }));
      } catch (err) {
        const status = err?.response?.status;
        const fallback =
          status === 401
            ? scope === "following"
              ? "Your session ended. Sign in again to see this feed."
              : "Explore could not be opened right now. Try again in a moment."
            : "The feed could not be loaded. Try again.";

        updateFeed(scope, (state) => ({
          ...state,
          loading: false,
          error:
            status === 401
              ? fallback
              : getErrorMessage(err, fallback),
        }));
      }
    },
    [updateFeed, user]
  );

  const handleLoadMore = useCallback(
    async (scope = "explore") => {
      const current = feeds[scope] ?? EMPTY_FEED;

      if (!current.nextCursor || current.loadingMore) return;

      const cursor = current.nextCursor;

      updateFeed(scope, (state) => ({
        ...state,
        loadingMore: true,
        loadMoreError: "",
      }));

      try {
        const data = await getFeed({
          scope,
          cursor,
          limit: FEED_LIMIT,
        });
        const incoming = Array.isArray(data?.posts) ? data.posts : [];

        updateFeed(scope, (state) => {
          const existing = state.items ?? [];
          const seen = new Set(existing.map((item) => item._id));

          return {
            ...state,
            items: [
              ...existing,
              ...incoming.filter((item) => !seen.has(item._id)),
            ],
            nextCursor: data?.nextCursor ?? null,
            loadingMore: false,
          };
        });
      } catch (err) {
        updateFeed(scope, (state) => ({
          ...state,
          loadingMore: false,
          loadMoreError: getErrorMessage(
            err,
            "More frames could not be loaded."
          ),
        }));
      }
    },
    [feeds, updateFeed]
  );

  const handleCreatePost = async (imageFile, caption) => {
    const data = await createPost(imageFile, caption);
    const created = data?.post;

    if (created) {
      const author =
        created.user && created.user.username ? created.user : user;
      const item = {
        ...created,
        user: author,
        isLiked: Boolean(created.isLiked),
        likesCount: created.likesCount ?? 0,
        commentsCount: created.commentsCount ?? 0,
        recentComments: created.recentComments ?? [],
      };

      setFeeds((current) => {
        const next = { ...current };

        ["following", "explore"].forEach((scope) => {
          const feed = current[scope];

          if (!feed?.items) return;

          next[scope] = {
            ...feed,
            items: [
              item,
              ...feed.items.filter((post) => post._id !== item._id),
            ],
          };
        });

        return next;
      });
    }

    return data;
  };

  const handleLike = async (postId) => {
    const data = await likePost(postId);

    patchPost(postId, (item) => ({
      isLiked: true,
      likesCount:
        typeof data?.likesCount === "number"
          ? data.likesCount
          : (item.likesCount ?? 0) + (item.isLiked ? 0 : 1),
    }));

    return data;
  };

  const handleUnlike = async (postId) => {
    const data = await unLikePost(postId);

    patchPost(postId, (item) => ({
      isLiked: false,
      likesCount:
        typeof data?.likesCount === "number"
          ? data.likesCount
          : Math.max(0, (item.likesCount ?? 0) - (item.isLiked ? 1 : 0)),
    }));

    return data;
  };

  const handleDeletePost = async (postId) => {
    await deletePost(postId);

    setFeeds((current) => {
      const next = {};

      for (const [scope, feed] of Object.entries(current)) {
        next[scope] = feed?.items
          ? {
              ...feed,
              items: feed.items.filter((item) => item._id !== postId),
            }
          : feed;
      }

      return next;
    });
  };

  return {
    feeds,
    getFeedState,
    handleGetFeed,
    handleLoadMore,
    handleCreatePost,
    handleLike,
    handleUnlike,
    handleDeletePost,
    patchPost,
  };
};
