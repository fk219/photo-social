import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PostGrid, {
  PostGridSkeleton,
} from "../../posts/components/PostGrid";
import PostModal from "../../posts/components/PostModal";
import { getErrorMessage } from "../../shared/utils/error";
import { formatCount } from "../../shared/utils/format";
import { getSavedPosts } from "../../posts/services/post.api";
import "../style/saved.scss";

const PAGE_SIZE = 12;

const Saved = () => {
  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [total, setTotal] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedPost, setSelectedPost] = useState(null);
  const mountedRef = useRef(true);
  const removedRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    setStatus("loading");
    setError("");
    setLoadMoreError("");

    getSavedPosts({ limit: PAGE_SIZE })
      .then((data) => {
        if (!active) return;

        const rows = Array.isArray(data?.posts)
          ? data.posts.map((post) => ({ ...post, isSaved: true }))
          : [];
        const count =
          typeof data?.total === "number"
            ? data.total
            : typeof data?.count === "number"
              ? data.count
              : null;

        setPosts(rows);
        setNextCursor(data?.nextCursor ?? null);
        setTotal(count);
        setStatus("ready");
      })
      .catch((err) => {
        if (!active) return;

        setError(
          getErrorMessage(
            err,
            "Your saved posts could not be loaded. Try again."
          )
        );
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const handlePostUpdate = (postId, patch) => {
    if (!postId) return;

    if (patch?.isSaved === false) {
      if (removedRef.current?.post?._id === postId) {
        setSelectedPost((current) =>
          current && current._id === postId
            ? { ...current, ...patch }
            : current
        );
        return;
      }

      const index = posts.findIndex((post) => post._id === postId);

      if (index >= 0) {
        removedRef.current = { post: posts[index], index };
        setPosts((current) =>
          current.filter((post) => post._id !== postId)
        );
        setTotal((current) =>
          typeof current === "number"
            ? Math.max(0, current - 1)
            : current
        );
      }

      setSelectedPost((current) =>
        current && current._id === postId
          ? { ...current, ...patch }
          : current
      );
      return;
    }

    if (
      patch?.isSaved === true &&
      removedRef.current?.post?._id === postId
    ) {
      const removed = removedRef.current;

      removedRef.current = null;
      setPosts((current) => {
        if (current.some((post) => post._id === postId)) {
          return current.map((post) =>
            post._id === postId ? { ...post, ...patch } : post
          );
        }

        const next = [...current];
        next.splice(
          Math.min(removed.index, next.length),
          0,
          { ...removed.post, ...patch }
        );
        return next;
      });
      setTotal((current) =>
        typeof current === "number" ? current + 1 : current
      );
    }

    setPosts((current) =>
      current.map((post) =>
        post._id === postId ? { ...post, ...patch } : post
      )
    );
    setSelectedPost((current) =>
      current && current._id === postId
        ? { ...current, ...patch }
        : current
    );
  };

  const handlePostDeleted = (postId) => {
    setPosts((current) =>
      current.filter((post) => post._id !== postId)
    );
    setTotal((current) =>
      typeof current === "number" ? Math.max(0, current - 1) : current
    );
    setSelectedPost(null);
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    setLoadMoreError("");

    try {
      const data = await getSavedPosts({
        cursor: nextCursor,
        limit: PAGE_SIZE,
      });

      if (!mountedRef.current) return;

      const incoming = Array.isArray(data?.posts)
        ? data.posts.map((post) => ({ ...post, isSaved: true }))
        : [];

      setPosts((current) => {
        const seen = new Set(current.map((post) => post._id));
        return [
          ...current,
          ...incoming.filter((post) => !seen.has(post._id)),
        ];
      });
      setNextCursor(data?.nextCursor ?? null);

      if (typeof data?.total === "number") setTotal(data.total);
    } catch (err) {
      if (mountedRef.current) {
        setLoadMoreError(
          getErrorMessage(err, "More saved posts could not be loaded.")
        );
      }
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  };

  const countValue =
    typeof total === "number"
      ? formatCount(total)
      : `${formatCount(posts.length)}${nextCursor ? "+" : ""}`;
  const isSingle =
    typeof total === "number"
      ? total === 1
      : posts.length === 1 && !nextCursor;
  const isInitialLoading = status === "loading" && posts.length === 0;
  const isInitialError = status === "error" && posts.length === 0;

  return (
    <main className="saved-page" id="main-content">
      <div className="page-shell page-shell--saved">
        <header className="saved-head">
          <h1>Saved</h1>
          <p className="saved-count">
            {countValue} {isSingle ? "post" : "posts"}
          </p>
        </header>

        {isInitialLoading ? (
          <div role="status">
            <span className="sr-only">Loading your saved posts...</span>
            <PostGridSkeleton count={PAGE_SIZE} />
          </div>
        ) : isInitialError ? (
          <section className="saved-state" role="alert">
            <h2>Saved posts unavailable</h2>
            <p>{error}</p>
            <button
              type="button"
              className="button primary-button"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Try again
            </button>
          </section>
        ) : posts.length === 0 ? (
          <section className="saved-state" aria-labelledby="saved-empty-title">
            <span className="saved-empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1Z" />
              </svg>
            </span>
            <h2 id="saved-empty-title">No saved posts yet</h2>
            <p>
              When you save a post, it will be waiting here for you. Explore
              PhotoSocial to find something worth keeping.
            </p>
            <Link to="/explore" className="button primary-button">
              Explore posts
            </Link>
          </section>
        ) : (
          <>
            {error && (
              <div className="saved-inline-alert" role="alert">
                <p>{error}</p>
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => setReloadKey((key) => key + 1)}
                >
                  Try again
                </button>
              </div>
            )}

            <PostGrid posts={posts} onSelect={setSelectedPost} />

            <div className="saved-more">
              {loadMoreError && (
                <p className="saved-inline-error" role="alert">
                  {loadMoreError}
                </p>
              )}

              {nextCursor && (
                <button
                  type="button"
                  className="button secondary-button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  aria-busy={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      Loading...
                    </>
                  ) : (
                    "Load more saved posts"
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onPostUpdate={handlePostUpdate}
          onDeleted={handlePostDeleted}
        />
      )}
    </main>
  );
};

export default Saved;
