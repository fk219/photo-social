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

export const usePost = () => {
  const context = useContext(PostContext);
  const { user } = useAuth();
  const {
    loading,
    setLoading,
    feed,
    setFeed,
    post,
    feedError,
    setFeedError,
    nextCursor,
    setNextCursor,
    loadingMore,
    setLoadingMore,
    loadMoreError,
    setLoadMoreError,
  } = context;

  const patchPost = useCallback(
    (postId, patch) => {
      setFeed((current) =>
        current
          ? current.map((item) => {
              if (item._id !== postId) return item;
              const next =
                typeof patch === "function" ? patch(item) : patch;
              return { ...item, ...next };
            })
          : current
      );
    },
    [setFeed]
  );

  const handleGetFeed = useCallback(async () => {
    setFeedError("");
    setLoadMoreError("");
    setLoading(true);

    try {
      const data = await getFeed({ limit: 10 });
      const posts = Array.isArray(data?.posts) ? data.posts : [];
      setFeed(posts);
      setNextCursor(data?.nextCursor ?? null);
    } catch (err) {
      setFeedError(
        getErrorMessage(err, "The contact sheet could not be loaded.")
      );
    } finally {
      setLoading(false);
    }
  }, [
    setFeed,
    setFeedError,
    setLoadMoreError,
    setLoading,
    setNextCursor,
  ]);

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    setLoadMoreError("");

    try {
      const data = await getFeed({ cursor: nextCursor, limit: 10 });
      const incoming = Array.isArray(data?.posts) ? data.posts : [];

      setFeed((current) => {
        const existing = current ?? [];
        const seen = new Set(existing.map((item) => item._id));
        const fresh = incoming.filter((item) => !seen.has(item._id));
        return [...existing, ...fresh];
      });
      setNextCursor(data?.nextCursor ?? null);
    } catch (err) {
      setLoadMoreError(
        getErrorMessage(err, "The next frames could not be loaded.")
      );
    } finally {
      setLoadingMore(false);
    }
  }, [
    loadingMore,
    nextCursor,
    setFeed,
    setLoadMoreError,
    setLoadingMore,
    setNextCursor,
  ]);

  const handleCreatePost = async (imageFile, caption) => {
    setLoading(true);

    try {
      const data = await createPost(imageFile, caption);
      const created = data?.post;

      if (created) {
        const author =
          created.user && created.user.username ? created.user : user;

        setFeed((current) => [
          {
            ...created,
            user: author,
            isLiked: created.isLiked ?? false,
            likesCount: created.likesCount ?? 0,
            commentsCount: created.commentsCount ?? 0,
          },
          ...(current ?? []),
        ]);
      }

      return data;
    } finally {
      setLoading(false);
    }
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
  };

  const handleDeletePost = async (postId) => {
    await deletePost(postId);
    setFeed((current) =>
      current ? current.filter((item) => item._id !== postId) : current
    );
  };

  return {
    loading,
    feed,
    feedError,
    nextCursor,
    loadingMore,
    loadMoreError,
    post,
    handleGetFeed,
    handleLoadMore,
    handleCreatePost,
    handleLike,
    handleUnlike,
    handleDeletePost,
    patchPost,
  };
};
