import { createContext, useState } from "react";

export const PostContext = createContext();

export const PostContextProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [post, setPost] = useState(null);
  const [feed, setFeed] = useState(null);
  const [feedError, setFeedError] = useState("");
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");

  return (
    <PostContext.Provider
      value={{
        loading,
        setLoading,
        post,
        setPost,
        feed,
        setFeed,
        feedError,
        setFeedError,
        nextCursor,
        setNextCursor,
        loadingMore,
        setLoadingMore,
        loadMoreError,
        setLoadMoreError,
      }}
    >
      {children}
    </PostContext.Provider>
  );
};
