import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePost } from "../hooks/usePost";
import { useAuth } from "../../auth/hooks/useAuth";
import Avatar from "../../shared/components/Avatar";
import CommentThread from "./CommentThread";
import { subscribeToThreads } from "../threadBus";
import {
  formatCount,
  formatFullDate,
  formatRelativeTime,
  getUserAvatar,
} from "../../shared/utils/format";

const TAKE_LIMIT = 200;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const Post = ({ post, index = 0 }) => {
  const { user: viewer } = useAuth();
  const { handleLike, handleUnlike, handleDeletePost, patchPost } = usePost();
  const navigate = useNavigate();
  const location = useLocation();

  const postId = post?._id;
  const author = post?.user;
  const username = author?.username || "unknown";
  const caption = typeof post?.caption === "string" ? post.caption.trim() : "";
  const commentsCount = Number(post?.commentsCount) || 0;
  const likesCount = Number(post?.likesCount) || 0;
  const liked = Boolean(post?.isLiked);
  const isOwner =
    Boolean(viewer?.username) && viewer.username === author?.username;

  const [imageSrc, setImageSrc] = useState(
    post?.thumbnail_url || post?.image_url || ""
  );
  const [imageFailed, setImageFailed] = useState(false);
  const [takeExpanded, setTakeExpanded] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [threadPreview, setThreadPreview] = useState(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const [liking, setLiking] = useState(false);
  const [likeError, setLikeError] = useState("");
  const [pulse, setPulse] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const captionId = useId();
  const threadId = useId();
  const repliesButtonRef = useRef(null);

  const originalImage = post?.image_url || "";
  const thumbnailImage = post?.thumbnail_url || originalImage;
  const postedAt = formatRelativeTime(post?.createdAt);
  const fullDate = formatFullDate(post?.createdAt);
  const isLongTake = caption.length > TAKE_LIMIT;
  const previewReplies =
    threadPreview ?? (Array.isArray(post?.recentComments)
      ? post.recentComments
      : []);

  useEffect(() => {
    setImageSrc(thumbnailImage);
    setImageFailed(false);
  }, [thumbnailImage]);

  const handleCountChange = useCallback(
    (count) => {
      patchPost(postId, {
        commentsCount: Math.max(0, Number(count) || 0),
      });
    },
    [patchPost, postId]
  );

  const handleCommentsChange = useCallback((rows) => {
    setThreadPreview(Array.isArray(rows) ? rows.slice(0, 2) : []);
  }, []);

  useEffect(() => {
    let timer;

    const unsubscribe = subscribeToThreads((requestedId) => {
      if (requestedId !== postId) return;

      setFocusRequest(0);
      setThreadOpen(true);
      timer = window.setTimeout(() => {
        document
          .getElementById(`post-${postId}`)
          ?.scrollIntoView({
            behavior: prefersReducedMotion() ? "auto" : "smooth",
            block: "center",
          });
      }, 90);
    });

    return () => {
      unsubscribe();
      if (timer) window.clearTimeout(timer);
    };
  }, [postId]);

  const openReply = () => {
    setThreadOpen(true);
    setFocusRequest((request) => request + 1);
  };

  const closeThread = () => {
    setThreadOpen(false);
    setFocusRequest(0);
    window.requestAnimationFrame(() => repliesButtonRef.current?.focus());
  };

  const toggleThread = () => {
    if (threadOpen) {
      closeThread();
    } else {
      setThreadOpen(true);
    }
  };

  const handleImageError = () => {
    if (originalImage && imageSrc !== originalImage) {
      setImageSrc(originalImage);
      return;
    }

    setImageFailed(true);
  };

  const toggleLike = async () => {
    if (!postId || liking) return;

    if (!viewer) {
      navigate("/login", { state: { from: location } });
      return;
    }

    const nextLiked = !liked;
    const previous = { isLiked: liked, likesCount };
    const nextCount = Math.max(0, likesCount + (nextLiked ? 1 : -1));

    setLiking(true);
    setLikeError("");
    setPulse(false);
    patchPost(postId, { isLiked: nextLiked, likesCount: nextCount });

    try {
      if (nextLiked) {
        await handleLike(postId);
        setPulse(true);
      } else {
        await handleUnlike(postId);
      }
    } catch {
      patchPost(postId, previous);
      setLikeError("That like could not be saved. Try again.");
    } finally {
      setLiking(false);
    }
  };

  const removePost = async () => {
    if (!postId || deleting) return;

    setDeleting(true);
    setDeleteError("");

    try {
      await handleDeletePost(postId);
    } catch {
      setDeleteError("This frame could not be deleted. Try again.");
      setDeleting(false);
    }
  };

  const photoAlt = caption
    ? `Photograph by @${username}: ${caption.slice(0, 120)}`
    : `Photograph by @${username}`;

  return (
    <article
      id={`post-${postId}`}
      className="post"
      aria-label={`Frame by @${username}`}
      style={{ "--post-delay": `${Math.min(index, 4) * 60}ms` }}
    >
      <header className="post-head">
        <Link
          to={`/u/${encodeURIComponent(username)}`}
          className="post-author"
        >
          <Avatar
            src={getUserAvatar(author)}
            name={username}
            className="avatar--post"
          />
          <span className="post-author-copy">
            <span className="post-author-name">@{username}</span>
            {postedAt && (
              <time className="post-time" dateTime={post.createdAt} title={fullDate || undefined}>
                {postedAt}
              </time>
            )}
          </span>
        </Link>

        {isOwner && <span className="post-owner-tag">Your frame</span>}
      </header>

      <div className="post-media">
        {imageSrc && !imageFailed ? (
          <img
            src={imageSrc}
            alt={photoAlt}
            loading={index < 2 ? "eager" : "lazy"}
            decoding="async"
            onError={handleImageError}
          />
        ) : (
          <div
            className="photo-fallback"
            role="img"
            aria-label={`The photograph by @${username} is unavailable`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="6" width="18" height="14" rx="1.5" />
              <circle cx="12" cy="13" r="3.2" />
              <path d="m8 6 1.4-2h5.2L16 6" />
            </svg>
            <span>Photograph unavailable</span>
          </div>
        )}
      </div>

      <div className="post-body">
        <div className="post-take">
          <p className="post-kicker">The take</p>
          {caption ? (
            <>
              <h2
                id={captionId}
                className={`post-take-text${
                  isLongTake && !takeExpanded ? " is-clamped" : ""
                }`}
              >
                {caption}
              </h2>
              {isLongTake && (
                <button
                  type="button"
                  className="take-toggle"
                  onClick={() => setTakeExpanded((current) => !current)}
                  aria-expanded={takeExpanded}
                  aria-controls={captionId}
                >
                  {takeExpanded ? "Show less" : "Read the full take"}
                </button>
              )}
            </>
          ) : (
            <p className="post-take-empty">
              This frame was posted without a written take.
            </p>
          )}
        </div>

        <div className="post-actions">
          <button
            type="button"
            className={`post-action post-like${liked ? " is-liked" : ""}`}
            aria-pressed={viewer ? liked : undefined}
            aria-label={
              viewer
                ? liked
                  ? `Unlike this frame, ${likesCount} likes`
                  : `Like this frame, ${likesCount} likes`
                : "Sign in to like this frame"
            }
            aria-busy={liking}
            onClick={toggleLike}
          >
            <span
              className={`like-glyph${pulse ? " is-pulsing" : ""}`}
              onAnimationEnd={() => setPulse(false)}
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 8.81 13.64 6.49A2.98 2.98 0 0 1 16.5 5a3.5 3.5 0 0 1 3.5 3.5c0 2.88-1.96 5.62-4.36 7.84A29.24 29.24 0 0 1 12 19.15a29.2 29.2 0 0 1-3.64-2.81C5.96 14.12 4 11.38 4 8.5A3.5 3.5 0 0 1 7.5 5c1.18 0 2.23.58 2.86 1.49L12 8.81Zm-1.44-4.88A4.98 4.98 0 0 0 7.5 3 5.5 5.5 0 0 0 2 8.5c0 7.5 10 12.99 10 12.99s10-5.49 10-12.99A5.5 5.5 0 0 0 16.5 3c-1.13 0-2.18.34-3.06.93-.56.38-1.05.86-1.44 1.41a5.5 5.5 0 0 0-1.44-1.41Z" />
              </svg>
            </span>
            <span>{liked ? "Liked" : "Like"}</span>
            <span className="post-count">{formatCount(likesCount)}</span>
          </button>

          <button
            type="button"
            ref={repliesButtonRef}
            className={`post-action post-replies${threadOpen ? " is-open" : ""}`}
            aria-expanded={threadOpen}
            aria-controls={threadId}
            onClick={toggleThread}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 2.2V11.5A7.5 7.5 0 0 1 10.5 4h2A7.5 7.5 0 0 1 20 11.5Z" />
            </svg>
            <span>Replies</span>
            <span className="post-count">{formatCount(commentsCount)}</span>
          </button>
        </div>

        {likeError && (
          <p className="post-inline-error" role="alert">
            {likeError}
          </p>
        )}

        <section
          id={threadId}
          className={`post-thread${threadOpen ? " is-open" : ""}`}
          aria-label={`Replies to @${username}`}
        >
          <header className="post-thread-head">
            <p className="post-thread-label">
              Thread <span>{formatCount(commentsCount)}</span>
            </p>
            {threadOpen && (
              <button
                type="button"
                className="quiet-button post-thread-close"
                onClick={closeThread}
              >
                Close
              </button>
            )}
          </header>

          {threadOpen ? (
            <CommentThread
              postId={postId}
              commentsCount={commentsCount}
              onCountChange={handleCountChange}
              onCommentsChange={handleCommentsChange}
              focusRequest={focusRequest}
            />
          ) : (
            <>
              {previewReplies.length > 0 ? (
                <ol className="thread-preview">
                  {previewReplies.map((comment) => (
                    <li className="reply reply--preview" key={comment._id}>
                      <span className="reply-node" aria-hidden="true">
                        <Avatar
                          src={comment.profile_image}
                          name={comment.user}
                          className="avatar--reply"
                        />
                      </span>
                      <div className="reply-body">
                        <div className="reply-meta">
                          <Link
                            to={`/u/${encodeURIComponent(comment.user)}`}
                            className="reply-author"
                          >
                            @{comment.user}
                          </Link>
                          {comment.createdAt && (
                            <time
                              className="reply-time"
                              dateTime={comment.createdAt}
                              title={
                                formatFullDate(comment.createdAt) || undefined
                              }
                            >
                              {formatRelativeTime(comment.createdAt)}
                            </time>
                          )}
                        </div>
                        <p className="reply-text">{comment.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="thread-empty thread-empty--compact">
                  {commentsCount > 0
                    ? "Open the thread to read the replies."
                    : "No replies yet. Start the thread with what you see."}
                </p>
              )}

              <div className="thread-preview-foot">
                {commentsCount > 0 ? (
                  <>
                    <button
                      type="button"
                      className="thread-open-button"
                      onClick={() => setThreadOpen(true)}
                    >
                      {commentsCount > previewReplies.length
                        ? `View all ${formatCount(commentsCount)} ${
                            commentsCount === 1 ? "reply" : "replies"
                          }`
                        : "Open the thread"}
                    </button>
                    <button
                      type="button"
                      className="thread-reply-button"
                      onClick={openReply}
                    >
                      Reply
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="thread-reply-button"
                    onClick={openReply}
                  >
                    Write the first reply
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        {isOwner && (
          <div className="post-owner">
            {confirmingDelete ? (
              <>
                <span className="post-owner-confirm">
                  Delete this frame and its replies?
                </span>
                <button
                  type="button"
                  className="quiet-button quiet-button--danger"
                  onClick={removePost}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete frame"}
                </button>
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => {
                    setConfirmingDelete(false);
                    setDeleteError("");
                  }}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="quiet-button"
                onClick={() => setConfirmingDelete(true)}
              >
                Delete frame
              </button>
            )}

            {deleteError && (
              <span className="post-inline-error" role="alert">
                {deleteError}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default Post;
