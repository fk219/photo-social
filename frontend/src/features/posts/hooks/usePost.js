import { useContext } from "react";
import { PostContext } from "../post.context.jsx";
import { useAuth } from "../../auth/hooks/useAuth";
import { getErrorMessage } from "../../shared/utils/error";
import {
  createPost,
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
  } = context;

  const handleGetFeed = async () => {
    setFeedError("");
    setLoading(true);

    try {
      const data = await getFeed();
      const posts = Array.isArray(data?.posts) ? [...data.posts] : [];
      setFeed(posts.reverse()); // Latest post first
    } catch (err) {
      setFeedError(
        getErrorMessage(err, "The contact sheet could not be loaded.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (imageFile, caption) => {
    setLoading(true);

    try {
      const data = await createPost(imageFile, caption);
      const created = data?.post;

      if (created) {
        const author =
          created.user &&
          typeof created.user === "object" &&
          created.user.username
            ? created.user
            : user;

        setFeed((current) => [
          {
            ...created,
            user: author,
            isLiked: created.isLiked ?? false,
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
    await likePost(postId);
    setFeed((current) =>
      current
        ? current.map((item) =>
            item._id === postId ? { ...item, isLiked: true } : item
          )
        : current
    );
  };

  const handleUnlike = async (postId) => {
    await unLikePost(postId);
    setFeed((current) =>
      current
        ? current.map((item) =>
            item._id === postId ? { ...item, isLiked: false } : item
          )
        : current
    );
  };

  return {
    loading,
    feed,
    feedError,
    post,
    handleGetFeed,
    handleCreatePost,
    handleLike,
    handleUnlike,
  };
};
