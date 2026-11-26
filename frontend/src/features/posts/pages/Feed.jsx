import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Post from "../components/Post";
import PostGrid, { PostGridSkeleton } from "../components/PostGrid";
import PostModal from "../components/PostModal";
import FeedTabs from "../components/FeedTabs";
import StoryRail from "../../stories/components/StoryRail";
import { usePost } from "../hooks/usePost";
import { useAuth } from "../../auth/hooks/useAuth";
import { formatCount } from "../../shared/utils/format";
import "../style/feed.scss";

const FeedSkeleton = () => (
  <div className="post-skeleton" aria-hidden="true">
    <div className="skeleton-head">
      <span className="skeleton-avatar" />
      <span className="skeleton-head-copy">
        <span className="skeleton-line skeleton-line--short" />
        <span className="skeleton-line skeleton-line--tiny" />
      </span>
    </div>
    <div className="skeleton-photo" />
    <div className="skeleton-body">
      <span className="skeleton-line skeleton-line--tiny" />
      <span className="skeleton-line skeleton-line--wide" />
      <span className="skeleton-line skeleton-line--medium" />
      <span className="skeleton-thread" />
    </div>
  </div>
);

const Feed = ({ scope = "explore" }) => {
  const { user, initializing } = useAuth();
  const { getFeedState, handleGetFeed, handleLoadMore } = usePost();
  const [selectedPost, setSelectedPost] = useState(null);

  const feedState = getFeedState(scope);
  const {
    items,
    loading,
    error,
    nextCursor,
    loadingMore,
    loadMoreError,
  } = feedState;

  const followingScope = scope === "following";
  const posts = items ?? [];
  const loadedCount = posts.length;
  const viewerName = user?.username ?? null;
  const feedViewer = feedState.viewer;

  useEffect(() => {
    if (initializing) return;
    if (followingScope && !user) return;
    if (loading) return;

    const needsViewerRefresh = feedViewer !== viewerName;

    if (items !== null && !needsViewerRefresh) return;
    if (error && !needsViewerRefresh) return;

    handleGetFeed(scope);
  }, [
    error,
    feedViewer,
    followingScope,
    handleGetFeed,
    initializing,
    items,
    loading,
    scope,
    user,
    viewerName,
  ]);

  if (followingScope && !user) {
    if (initializing) {
      return (
        <main className="route-loading" id="main-content" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>Opening PhotoSocial...</span>
        </main>
      );
    }

    return <Navigate to="/explore" replace />;
  }

  const isFirstLoad =
    initializing || ((items === null || loading) && !error && posts.length === 0);
  const showError = Boolean(error) && posts.length === 0;
  const showEmpty = !showError && items !== null && posts.length === 0;

  return (
    <main
      className={`feed-page${followingScope ? "" : " feed-page--explore"}`}
      id="main-content"
    >
      <div
        className={`page-shell ${
          followingScope ? "page-shell--feed" : "page-shell--explore"
        }`}
      >
        {followingScope && user && !initializing && <StoryRail />}

        <FeedTabs scope={scope} signedIn={Boolean(user)} />

        <h1 className={followingScope ? "sr-only" : "explore-title"}>
          {followingScope ? "Following" : "Explore"}
        </h1>

        {!user && !initializing && (
          <div className="guest-note">
            <p>You are browsing as a guest. Sign in to like, comment and follow.</p>
            <div className="guest-note-links">
              <Link to="/login">Sign in</Link>
              <Link to="/register">Create account</Link>
            </div>
          </div>
        )}

        {error && posts.length > 0 && (
          <div className="feed-inline-error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="quiet-button"
              onClick={() => handleGetFeed(scope)}
              disabled={loading}
            >
              Try again
            </button>
          </div>
        )}

        {isFirstLoad ? (
          <div className="feed-loading" role="status">
            <span className="sr-only">
              {followingScope ? "Loading your feed..." : "Loading posts..."}
            </span>
            {followingScope ? (
              <div className="skeleton-stack">
                <FeedSkeleton />
                <FeedSkeleton />
              </div>
            ) : (
              <PostGridSkeleton />
            )}
          </div>
        ) : showError ? (
          <section className="state-card" role="alert">
            <h2>Something went wrong</h2>
            <p>{error}</p>
            <button
              type="button"
              className="button primary-button"
              onClick={() => handleGetFeed(scope)}
              disabled={loading}
            >
              {loading ? "Trying again..." : "Try again"}
            </button>
          </section>
        ) : showEmpty ? (
          <section className="state-card" aria-labelledby="feed-empty-title">
            <h2 id="feed-empty-title">
              {followingScope ? "No posts here yet" : "No posts yet"}
            </h2>
            <p>
              {followingScope
                ? "Posts from the accounts you follow will appear here. Find people to follow in Explore."
                : user
                  ? "When someone shares a photo, it will show up here."
                  : "PhotoSocial is waiting for its first post. Create an account to share one."}
            </p>
            <div className="state-card-actions">
              {followingScope ? (
                <>
                  <Link to="/explore" className="button primary-button">
                    Explore posts
                  </Link>
                  <Link to="/create-post" className="button secondary-button">
                    Create a post
                  </Link>
                </>
              ) : user ? (
                <Link to="/create-post" className="button primary-button">
                  Create a post
                </Link>
              ) : (
                <Link to="/register" className="button primary-button">
                  Create an account
                </Link>
              )}
            </div>
          </section>
        ) : followingScope ? (
          <>
            <div className="posts">
              {posts.map((item, index) => (
                <Post key={item._id ?? index} post={item} index={index} />
              ))}
            </div>

            <div className="feed-more">
              {loadMoreError && (
                <p className="feed-more-error" role="alert">
                  {loadMoreError}
                </p>
              )}

              {nextCursor ? (
                <button
                  type="button"
                  className={`button secondary-button${
                    loadingMore ? " is-loading" : ""
                  }`}
                  onClick={() => handleLoadMore(scope)}
                  disabled={loadingMore}
                  aria-busy={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      Loading...
                    </>
                  ) : (
                    "Load more posts"
                  )}
                </button>
              ) : (
                <p className="feed-end">
                  {loadedCount === 1
                    ? "1 post. You're all caught up."
                    : `${formatCount(loadedCount)} posts. You're all caught up.`}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <PostGrid posts={posts} onSelect={setSelectedPost} />

            <div className="feed-more">
              {loadMoreError && (
                <p className="feed-more-error" role="alert">
                  {loadMoreError}
                </p>
              )}

              {nextCursor ? (
                <button
                  type="button"
                  className={`button secondary-button${
                    loadingMore ? " is-loading" : ""
                  }`}
                  onClick={() => handleLoadMore(scope)}
                  disabled={loadingMore}
                  aria-busy={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      Loading...
                    </>
                  ) : (
                    "Load more posts"
                  )}
                </button>
              ) : (
                <p className="feed-end">You have seen every post here.</p>
              )}
            </div>
          </>
        )}
      </div>

      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onPostUpdate={(postId, patch) =>
            setSelectedPost((current) =>
              current && current._id === postId
                ? { ...current, ...patch }
                : current
            )
          }
          onDeleted={() => setSelectedPost(null)}
        />
      )}
    </main>
  );
};

export default Feed;
