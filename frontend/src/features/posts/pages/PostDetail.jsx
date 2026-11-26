import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getErrorMessage } from "../../shared/utils/error";
import Post from "../components/Post";
import { getPost } from "../services/post.api";
import "../style/feed.scss";
import "../style/post-detail.scss";

const PostDetailSkeleton = () => (
  <div className="post-detail-skeleton" role="status">
    <span className="sr-only">Loading this post...</span>
    <div className="post-detail-skeleton-head">
      <span className="post-detail-skeleton-avatar" />
      <span className="post-detail-skeleton-copy">
        <span className="post-detail-skeleton-line post-detail-skeleton-line--short" />
        <span className="post-detail-skeleton-line post-detail-skeleton-line--tiny" />
      </span>
    </div>
    <span className="post-detail-skeleton-photo" />
    <div className="post-detail-skeleton-body">
      <span className="post-detail-skeleton-line post-detail-skeleton-line--tiny" />
      <span className="post-detail-skeleton-line" />
      <span className="post-detail-skeleton-line post-detail-skeleton-line--medium" />
      <span className="post-detail-skeleton-block" />
    </div>
  </div>
);

const PostDetail = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [postId]);

  useEffect(() => {
    if (!postId) {
      setStatus("not-found");
      return undefined;
    }

    let active = true;

    setPost(null);
    setStatus("loading");
    setError("");

    getPost(postId)
      .then((data) => {
        if (!active) return;

        if (!data?.post) {
          setStatus("not-found");
          return;
        }

        setPost(data.post);
        setStatus("ready");
      })
      .catch((err) => {
        if (!active) return;

        if (err?.response?.status === 404) {
          setStatus("not-found");
          return;
        }

        setError(
          getErrorMessage(err, "This post could not be loaded. Try again.")
        );
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [postId, reloadKey]);

  const handlePostUpdate = useCallback((patch) => {
    setPost((current) =>
      current ? { ...current, ...patch } : current
    );
  }, []);

  const handleDeleted = useCallback(() => {
    navigate("/explore", { replace: true });
  }, [navigate]);

  return (
    <main className="post-detail-page" id="main-content">
      <div className="page-shell page-shell--post-detail">
        <header className="post-detail-head">
          <Link to="/explore" className="back-link">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
            Back to Explore
          </Link>
        </header>

        {status === "loading" ? (
          <PostDetailSkeleton />
        ) : status === "not-found" ? (
          <section className="post-detail-state">
            <h1>This post is not available</h1>
            <p>
              It may have been deleted, or the link may be incomplete. Explore
              PhotoSocial to find something else.
            </p>
            <div className="post-detail-state-actions">
              <Link to="/explore" className="button primary-button">
                Explore posts
              </Link>
              {postId && (
                <button
                  type="button"
                  className="button secondary-button"
                  onClick={() => setReloadKey((key) => key + 1)}
                >
                  Try again
                </button>
              )}
            </div>
          </section>
        ) : status === "error" ? (
          <section className="post-detail-state" role="alert">
            <h1>Post unavailable</h1>
            <p>{error}</p>
            <div className="post-detail-state-actions">
              <button
                type="button"
                className="button primary-button"
                onClick={() => setReloadKey((key) => key + 1)}
              >
                Try again
              </button>
              <Link to="/explore" className="button secondary-button">
                Explore posts
              </Link>
            </div>
          </section>
        ) : (
          post && (
            <Post
              key={post._id}
              post={post}
              variant="feed"
              initialCommentsOpen
              onPostUpdate={handlePostUpdate}
              onDeleted={handleDeleted}
            />
          )
        )}
      </div>
    </main>
  );
};

export default PostDetail;
