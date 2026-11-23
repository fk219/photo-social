import { useEffect } from "react";
import { Link } from "react-router-dom";
import Post from "../components/Post";
import { usePost } from "../hooks/usePost";
import { useAuth } from "../../auth/hooks/useAuth";
import "../style/feed.scss";

const FeedSkeleton = () => (
  <div className="post-skeleton" aria-hidden="true">
    <div className="skeleton-meta">
      <span className="skeleton-line skeleton-line--short" />
      <span className="skeleton-line skeleton-line--tiny" />
    </div>
    <div className="skeleton-photo" />
    <div className="skeleton-body">
      <div className="skeleton-author">
        <span className="skeleton-avatar" />
        <span className="skeleton-line skeleton-line--medium" />
      </div>
      <span className="skeleton-line skeleton-line--wide" />
      <span className="skeleton-line skeleton-line--wide" />
      <span className="skeleton-line skeleton-line--short" />
    </div>
  </div>
);

const Feed = () => {
  const { user, initializing } = useAuth();
  const {
    feed,
    feedError,
    handleGetFeed,
    handleLoadMore,
    loading,
    loadingMore,
    loadMoreError,
    nextCursor,
  } = usePost();
  const username = user?.username;

  useEffect(() => {
    if (initializing || !username) return;
    handleGetFeed();
  }, [handleGetFeed, initializing, username]);

  const posts = feed ?? [];
  const isFirstLoad = Boolean(username) && feed === null && !feedError;
  const frameCount = String(posts.length).padStart(2, "0");
  const frameLabel = nextCursor ? `${frameCount}+` : frameCount;
  const countLabel =
    !username || feed === null ? "Loading…" : `${frameLabel} frames`;

  return (
    <main className="feed-page">
      <div className="feed-shell">
        <div className="feed-column">
          <header className="journal-header">
            <p className="eyebrow">Contact sheet · Ongoing</p>
            <div className="journal-title-row">
              <h1>
                Recent <em>frames</em>
              </h1>
              <span className="journal-count">
                {countLabel}
              </span>
            </div>
            <p className="journal-intro">
              A running contact sheet of photographs, posted one frame at a
              time. Every member&rsquo;s profile doubles as a public portfolio.
            </p>
          </header>

          {initializing || isFirstLoad ? (
            <div className="feed-loading" role="status">
              <span className="sr-only">Loading the contact sheet…</span>
              <div className="skeleton-stack">
                <FeedSkeleton />
                <FeedSkeleton />
                <FeedSkeleton />
              </div>
            </div>
          ) : !user ? (
            <section className="feed-message" aria-labelledby="signed-out-title">
              <p className="eyebrow">Members only</p>
              <h2 id="signed-out-title">Open the journal.</h2>
              <p>
                Frames, notes and likes live behind a quiet sign-in. Public
                portfolios stay open to everyone.
              </p>
              <div className="feed-message-actions">
                <Link to="/login" className="button primary-button">
                  Sign in
                </Link>
                <Link to="/register" className="button ghost-button">
                  Create an account
                </Link>
              </div>
            </section>
          ) : feedError && posts.length === 0 ? (
            <section className="feed-message feed-message--error" role="alert">
              <p className="eyebrow">Roll unavailable</p>
              <h2>The contact sheet didn&rsquo;t load.</h2>
              <p>{feedError}</p>
              <div className="feed-message-actions">
                <button
                  type="button"
                  className="button ghost-button"
                  onClick={handleGetFeed}
                  disabled={loading}
                >
                  {loading ? "Trying again…" : "Try again"}
                </button>
              </div>
            </section>
          ) : posts.length === 0 ? (
            <section className="feed-message" aria-labelledby="empty-title">
              <p className="eyebrow">Roll empty</p>
              <h2 id="empty-title">No frames yet.</h2>
              <p>
                Every journal starts with a first photograph. Add one and start
                the contact sheet.
              </p>
              <Link to="/create-post" className="button primary-button">
                Add the first frame
              </Link>
            </section>
          ) : (
            <>
              <div className="posts">
                {posts.map((item, index) => (
                  <Post
                    key={item._id ?? index}
                    user={item.user}
                    post={item}
                    index={index}
                  />
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
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    aria-busy={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <span className="spinner" aria-hidden="true" />
                        Loading frames…
                      </>
                    ) : (
                      "Load more frames"
                    )}
                  </button>
                ) : (
                  <p className="feed-end">End of the roll · {frameCount} frames</p>
                )}
              </div>
            </>
          )}
        </div>

        <aside className="journal-rail" aria-label="About this journal">
          <div className="rail-card">
            <p className="eyebrow">About this journal</p>
            <h2>Notes from the field.</h2>
            <p>
              Insta is a contact sheet for slow looking: a frame, a caption, a
              date. Just photographs and the notes that come with them.
            </p>

            <div className="rail-rule" aria-hidden="true" />

            <dl className="rail-meta">
              <div>
                <dt>Format</dt>
                <dd>Digital contact sheet</dd>
              </div>
              <div>
                <dt>Frames</dt>
                <dd>{!username || feed === null ? "Loading…" : frameLabel}</dd>
              </div>
            </dl>

            <Link to="/create-post" className="rail-link">
              <span>Add a frame</span>
              <span aria-hidden="true">→</span>
            </Link>

            {user && (
              <Link
                to={`/u/${encodeURIComponent(user.username)}`}
                className="rail-link rail-link--profile"
              >
                <span>View my profile</span>
                <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>

          <p className="rail-colophon">Insta, a photo journal</p>
        </aside>
      </div>
    </main>
  );
};

export default Feed;
