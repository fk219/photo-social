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
  const { user } = useAuth();
  const { feed, feedError, handleGetFeed, loading } = usePost();

  useEffect(() => {
    handleGetFeed();
  }, []);

  const posts = feed ?? [];
  const isFirstLoad = feed === null && !feedError;
  const frameCount = String(posts.length).padStart(2, "0");

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
                {isFirstLoad ? "—" : `${frameCount} frames`}
              </span>
            </div>
            <p className="journal-intro">
              A running contact sheet of photographs, posted one frame at a
              time.
            </p>
          </header>

          {isFirstLoad ? (
            <div className="feed-loading" role="status">
              <span className="sr-only">Loading the contact sheet…</span>
              <div className="skeleton-stack">
                <FeedSkeleton />
                <FeedSkeleton />
                <FeedSkeleton />
              </div>
            </div>
          ) : feedError && posts.length === 0 ? (
            <section
              className="feed-message feed-message--error"
              role="alert"
            >
              <p className="eyebrow">Roll unavailable</p>
              <h2>The contact sheet didn’t load.</h2>
              <p>
                {!user
                  ? "Sign in to open the journal and see the latest frames."
                  : feedError}
              </p>
              <div className="feed-message-actions">
                {!user && (
                  <Link to="/login" className="button primary-button">
                    Sign in
                  </Link>
                )}
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
            <div className="posts">
              {posts.map((post, index) => (
                <Post
                  key={post._id ?? index}
                  user={post.user}
                  post={post}
                  index={index}
                />
              ))}
            </div>
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
                <dd>{isFirstLoad ? "—" : frameCount}</dd>
              </div>
            </dl>

            <Link to="/create-post" className="rail-link">
              <span>Add a frame</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <p className="rail-colophon">Insta — a photo journal</p>
        </aside>
      </div>
    </main>
  );
};

export default Feed;
