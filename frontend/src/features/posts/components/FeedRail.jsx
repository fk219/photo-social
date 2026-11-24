import { Link } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import Avatar from "../../shared/components/Avatar";
import {
  formatCount,
  getUserAvatar,
} from "../../shared/utils/format";
import { openThread } from "../threadBus";

const FeedRail = ({ posts = [], loading = false }) => {
  const { user, initializing } = useAuth();

  const ranked = [...posts]
    .filter((post) => (Number(post?.commentsCount) || 0) > 0)
    .sort(
      (a, b) =>
        (Number(b.commentsCount) || 0) - (Number(a.commentsCount) || 0)
    )
    .slice(0, 3);

  const totals = posts.reduce(
    (result, post) => ({
      frames: result.frames + 1,
      replies: result.replies + (Number(post?.commentsCount) || 0),
      likes: result.likes + (Number(post?.likesCount) || 0),
    }),
    { frames: 0, replies: 0, likes: 0 }
  );

  const countsPending = loading && posts.length === 0;
  const username = user?.username || "";

  return (
    <aside className="feed-rail" aria-label="Conversation signals">
      <section className="rail-panel rail-viewer-panel">
        <h2 className="rail-eyebrow">Viewer</h2>

        {initializing ? (
          <div className="rail-viewer-loading" aria-hidden="true">
            <span className="rail-viewer-skeleton" />
            <span className="rail-viewer-skeleton rail-viewer-skeleton--short" />
          </div>
        ) : user ? (
          <div className="rail-viewer-summary">
            <Avatar
              src={getUserAvatar(user)}
              name={username}
              className="avatar--viewer"
            />
            <p className="rail-viewer-name">@{username}</p>
            <p className="rail-viewer-bio">
              {user.bio?.trim() || "No bio yet. Add one on your portfolio."}
            </p>
            <div className="rail-viewer-links">
              <Link to={`/u/${encodeURIComponent(username)}`}>
                Your portfolio
              </Link>
              <Link to="/settings">Settings</Link>
            </div>
          </div>
        ) : (
          <div className="rail-viewer-summary">
            <p className="rail-guest-title">Browsing as a guest.</p>
            <p className="rail-viewer-bio">
              Sign in to reply, follow creators, and build your own portfolio.
            </p>
            <div className="rail-guest-actions">
              <Link to="/login" className="button primary-button button--small">
                Sign in
              </Link>
              <Link
                to="/register"
                className="button ghost-button button--small"
              >
                Join Mosaic
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="rail-panel">
        <div className="rail-panel-head">
          <h2>Most replies</h2>
          <span>{countsPending ? "..." : `${ranked.length} shown`}</span>
        </div>

        {countsPending ? (
          <div className="signal-loading" role="status">
            <span className="sr-only">Loading conversation signals...</span>
            <span className="signal-skeleton" />
            <span className="signal-skeleton" />
          </div>
        ) : ranked.length > 0 ? (
          <ol className="signal-list">
            {ranked.map((post, index) => {
              const author = post.user?.username || "unknown";
              const take =
                typeof post.caption === "string" && post.caption.trim()
                  ? post.caption.trim()
                  : "A frame without a written take.";
              const count = Number(post.commentsCount) || 0;

              return (
                <li key={post._id}>
                  <button
                    type="button"
                    className="signal-item"
                    onClick={() => openThread(post._id)}
                    aria-label={`Open the thread on @${author}'s frame, ${count} ${
                      count === 1 ? "reply" : "replies"
                    }`}
                  >
                    <span className="signal-rank" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="signal-copy">
                      <span className="signal-author">@{author}</span>
                      <span className="signal-take">{take}</span>
                      <span className="signal-count">
                        {formatCount(count)} {count === 1 ? "reply" : "replies"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="rail-empty">
            No replies on the frames loaded here yet. Open a thread and start
            one.
          </p>
        )}
      </section>

      <section className="rail-panel rail-numbers">
        <div className="rail-panel-head">
          <h2>On this page</h2>
          <span>{countsPending ? "..." : `${formatCount(posts.length)} frames`}</span>
        </div>
        <dl>
          <div>
            <dt>Frames</dt>
            <dd>{countsPending ? "..." : formatCount(totals.frames)}</dd>
          </div>
          <div>
            <dt>Replies</dt>
            <dd>{countsPending ? "..." : formatCount(totals.replies)}</dd>
          </div>
          <div>
            <dt>Likes</dt>
            <dd>{countsPending ? "..." : formatCount(totals.likes)}</dd>
          </div>
        </dl>
        <p className="rail-note">
          Counts come from the frames loaded on this page, not sitewide
          estimates.
        </p>
      </section>

      <nav className="rail-legal" aria-label="Legal and about">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
      </nav>
      <p className="rail-colophon">Mosaic. Image-first conversations.</p>
    </aside>
  );
};

export default FeedRail;
