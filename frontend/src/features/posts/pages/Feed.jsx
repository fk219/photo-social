import { useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import Post from "../components/Post";
import FeedTabs from "../components/FeedTabs";
import FeedRail from "../components/FeedRail";
import { usePost } from "../hooks/usePost";
import { useAuth } from "../../auth/hooks/useAuth";
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
  const countLabel =
    items !== null
      ? `${loadedCount} ${loadedCount === 1 ? "frame" : "frames"} loaded`
      : error
        ? "Feed unavailable"
        : "Loading frames";

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
          <span>Opening Mosaic...</span>
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
    <main className="feed-page" id="main-content">
      <div className="feed-shell">
        <div className="feed-column">
          <header className="feed-header">
            <div className="feed-header-top">
              <p className="eyebrow">
                {followingScope ? "Home / Following" : "Explore / Open gallery"}
              </p>
              <span className="feed-count">{countLabel}</span>
            </div>

            <h1>
              {followingScope ? (
                <>
                  Your people, in <em>frames.</em>
                </>
              ) : (
                <>
                  Find the <em>thread.</em>
                </>
              )}
            </h1>

            <p className="feed-intro">
              {followingScope
                ? "Frames from the creators you follow, plus your own, with the conversations still open."
                : "Frames from across Mosaic, newest first. Open a thread and join the conversation."}
            </p>
          </header>

          <FeedTabs scope={scope} signedIn={Boolean(user)} />

          {!user && !initializing && (
            <div className="guest-note">
              <p>You are reading Mosaic as a guest.</p>
              <div className="guest-note-links">
                <Link to="/login">Sign in</Link>
                <Link to="/register">Create an account</Link>
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
              <span className="sr-only">Loading frames...</span>
              <div className="skeleton-stack">
                <FeedSkeleton />
                <FeedSkeleton />
              </div>
            </div>
          ) : showError ? (
            <section className="feed-message feed-message--error" role="alert">
              <p className="eyebrow">Feed unavailable</p>
              <h2>The gallery did not load.</h2>
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
            <section className="feed-message" aria-labelledby="feed-empty-title">
              <p className="eyebrow">
                {followingScope ? "Following" : "Open gallery"}
              </p>
              <h2 id="feed-empty-title">
                {followingScope
                  ? "Your following feed is still blank."
                  : "No frames on the wall yet."}
              </h2>
              <p>
                {followingScope
                  ? "Follow a few visual creators and their frames will appear here with every new reply."
                  : "Mosaic is waiting for its first frame. Post a photograph and the take behind it."}
              </p>
              <div className="feed-message-actions">
                {followingScope ? (
                  <Link to="/explore" className="button primary-button">
                    Find creators in Explore
                  </Link>
                ) : user ? (
                  <Link to="/create-post" className="button primary-button">
                    Post the first frame
                  </Link>
                ) : (
                  <Link to="/register" className="button primary-button">
                    Create an account
                  </Link>
                )}
                {followingScope && (
                  <Link
                    to="/create-post"
                    className="button ghost-button"
                  >
                    Post a frame
                  </Link>
                )}
              </div>
            </section>
          ) : (
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
                    className={`button ghost-button${
                      loadingMore ? " is-loading" : ""
                    }`}
                    onClick={() => handleLoadMore(scope)}
                    disabled={loadingMore}
                    aria-busy={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <span className="spinner" aria-hidden="true" />
                        Loading frames...
                      </>
                    ) : (
                      "Load more frames"
                    )}
                  </button>
                ) : (
                  <p className="feed-end">
                    {loadedCount} {loadedCount === 1 ? "frame" : "frames"}.
                    End of this view.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <FeedRail posts={posts} loading={loading || initializing} />
      </div>
    </main>
  );
};

export default Feed;
