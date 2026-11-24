import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePost } from "../hooks/usePost";
import { useAuth } from "../../auth/hooks/useAuth";
import Avatar from "../../shared/components/Avatar";
import RichText from "../../shared/components/RichText";
import CommentThread from "./CommentThread";
import ShareSheet from "./ShareSheet";
import PostLikesModal from "./PostLikesModal";
import {
  formatCount,
  formatFullDate,
  formatRelativeTime,
  getUserAvatar,
} from "../../shared/utils/format";
import { savePost, unsavePost } from "../services/post.api";

const CAPTION_LIMIT = 200;

const Post = ({
  post,
  index = 0,
  variant = "feed",
  initialCommentsOpen = false,
  onPostUpdate,
  onDeleted,
}) => {
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
  const likesLabel =
    likesCount === 0
      ? "No likes yet"
      : likesCount === 1
        ? "1 like"
        : `${formatCount(likesCount)} likes`;
  const likesAria =
    likesCount === 1 ? "1 like" : `${formatCount(likesCount)} likes`;

  const [imageSrc, setImageSrc] = useState(
    post?.thumbnail_url || post?.image_url || ""
  );
  const [imageFailed, setImageFailed] = useState(false);
  const [takeExpanded, setTakeExpanded] = useState(false);
  const [threadOpen, setThreadOpen] = useState(initialCommentsOpen);
  const [threadPreview, setThreadPreview] = useState(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const [liking, setLiking] = useState(false);
  const [likeError, setLikeError] = useState("");
  const [pulse, setPulse] = useState(false);
  const [saved, setSaved] = useState(Boolean(post?.isSaved));
  const [savingSave, setSavingSave] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const captionId = useId();
  const threadId = useId();
  const repliesButtonRef = useRef(null);
  const viewAllButtonRef = useRef(null);
  const replyButtonRef = useRef(null);
  const threadCloseRef = useRef(null);
  const threadTriggerRef = useRef("comment");
  const focusThreadRef = useRef(false);
  const lastTapRef = useRef(0);

  const originalImage = post?.image_url || "";
  const thumbnailImage = post?.thumbnail_url || originalImage;
  const postedAt = formatRelativeTime(post?.createdAt);
  const fullDate = formatFullDate(post?.createdAt);
  const isLongTake = caption.length > CAPTION_LIMIT;
  const previewReplies =
    threadPreview ?? (Array.isArray(post?.recentComments)
      ? post.recentComments
      : []);

  useEffect(() => {
    setImageSrc(thumbnailImage);
    setImageFailed(false);
  }, [thumbnailImage]);

  useEffect(() => {
    setSaved(Boolean(post?.isSaved));
  }, [post?.isSaved, postId]);

  const handleCountChange = useCallback(
    (count) => {
      const nextCount = Math.max(0, Number(count) || 0);

      patchPost(postId, { commentsCount: nextCount });
      onPostUpdate?.({ commentsCount: nextCount });
    },
    [onPostUpdate, patchPost, postId]
  );

  const handleCommentsChange = useCallback(
    (rows) => {
      const preview = Array.isArray(rows) ? rows.slice(0, 2) : [];

      setThreadPreview(preview);
      onPostUpdate?.({ recentComments: preview });
    },
    [onPostUpdate]
  );

  const openThread = (trigger = "comment") => {
    threadTriggerRef.current = trigger;
    focusThreadRef.current =
      trigger === "view-all" || (trigger === "reply" && !viewer);
    setThreadOpen(true);
  };

  const openReply = () => {
    threadTriggerRef.current = "reply";
    focusThreadRef.current = !viewer;
    setThreadOpen(true);
    setFocusRequest((request) => request + 1);
  };

  const closeThread = () => {
    const trigger = threadTriggerRef.current;

    setThreadOpen(false);
    setFocusRequest(0);
    window.requestAnimationFrame(() => {
      let returnTarget = repliesButtonRef.current;

      if (trigger === "view-all") {
        returnTarget =
          viewAllButtonRef.current ??
          replyButtonRef.current ??
          repliesButtonRef.current;
      } else if (trigger === "reply") {
        returnTarget = replyButtonRef.current ?? repliesButtonRef.current;
      }

      returnTarget?.focus();
    });
  };

  const toggleThread = () => {
    if (threadOpen) {
      threadTriggerRef.current = "comment";
      closeThread();
    } else {
      openThread("comment");
    }
  };

  useEffect(() => {
    if (!threadOpen || !focusThreadRef.current) return undefined;

    const timer = window.setTimeout(() => {
      threadCloseRef.current?.focus();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [threadOpen]);

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
    onPostUpdate?.({ isLiked: nextLiked, likesCount: nextCount });

    try {
      if (nextLiked) {
        const data = await handleLike(postId);

        if (typeof data?.likesCount === "number") {
          onPostUpdate?.({
            isLiked: true,
            likesCount: data.likesCount,
          });
        }
        setPulse(true);
      } else {
        const data = await handleUnlike(postId);

        if (typeof data?.likesCount === "number") {
          onPostUpdate?.({
            isLiked: false,
            likesCount: data.likesCount,
          });
        }
      }
    } catch {
      patchPost(postId, previous);
      onPostUpdate?.(previous);
      setLikeError("That like could not be saved. Try again.");
    } finally {
      setLiking(false);
    }
  };

  const toggleSave = async () => {
    if (!viewer) {
      navigate("/login", { state: { from: location } });
      return;
    }

    if (!postId || savingSave) return;

    const next = !saved;
    setSavingSave(true);
    setSaveError("");
    setSaved(next);
    patchPost(postId, { isSaved: next });
    onPostUpdate?.({ isSaved: next });

    try {
      const data = next
        ? await savePost(postId)
        : await unsavePost(postId);

      if (typeof data?.isSaved === "boolean") {
        setSaved(data.isSaved);
        patchPost(postId, { isSaved: data.isSaved });
        onPostUpdate?.({ isSaved: data.isSaved });
      }
    } catch {
      setSaved(!next);
      patchPost(postId, { isSaved: !next });
      onPostUpdate?.({ isSaved: !next });
      setSaveError("That save could not be changed. Try again.");
    } finally {
      setSavingSave(false);
    }
  };

  const likeFromMedia = () => {
    if (!viewer) {
      navigate("/login", { state: { from: location } });
      return;
    }

    if (!liked) toggleLike();

    setHeartBurst(true);
    window.setTimeout(() => setHeartBurst(false), 700);
  };

  const handleMediaTap = () => {
    const now = Date.now();

    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      likeFromMedia();
      return;
    }

    lastTapRef.current = now;
  };

  const removePost = async () => {
    if (!postId || deleting) return;

    setDeleting(true);
    setDeleteError("");

    try {
      await handleDeletePost(postId);
      onDeleted?.();
    } catch {
      setDeleteError("This post could not be deleted. Try again.");
      setDeleting(false);
    }
  };

  const photoAlt = caption
    ? `Photo by @${username}: ${caption.slice(0, 120)}`
    : `Photo by @${username}`;

  return (
    <article
      id={`post-${postId}`}
      className={`post${variant === "modal" ? " post--modal" : ""}`}
      aria-label={`Post by @${username}`}
      style={{ "--post-delay": `${Math.min(index, 4) * 60}ms` }}
    >
      <div className="post-card">
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
                <time
                  className="post-time"
                  dateTime={post.createdAt}
                  title={fullDate || undefined}
                >
                  {postedAt}
                </time>
              )}
            </span>
          </Link>

          {isOwner && <span className="post-owner-tag">Your post</span>}
        </header>

        <div
          className="post-media"
          onTouchEnd={handleMediaTap}
          onDoubleClick={likeFromMedia}
        >
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
              aria-label={`The photo by @${username} is unavailable`}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="6" width="18" height="14" rx="1.5" />
                <circle cx="12" cy="13" r="3.2" />
                <path d="m8 6 1.4-2h5.2L16 6" />
              </svg>
              <span>Photo unavailable</span>
            </div>
          )}

          {heartBurst && (
            <span className="post-heart-burst" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
              </svg>
            </span>
          )}
        </div>

        <div className="post-body">
          <div className="post-actions" role="group" aria-label="Post actions">
            <button
              type="button"
              className={`post-action post-action--like${
                liked ? " is-liked" : ""
              }`}
              aria-pressed={viewer ? liked : undefined}
              aria-label={
                viewer
                  ? liked
                    ? `Unlike this post, ${likesAria}`
                    : `Like this post, ${likesAria}`
                  : "Sign in to like this post"
              }
              aria-busy={liking}
              onClick={toggleLike}
            >
              <span
                className={`like-glyph${pulse ? " is-pulsing" : ""}`}
                onAnimationEnd={() => setPulse(false)}
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
                </svg>
              </span>
            </button>

            <button
              type="button"
              ref={repliesButtonRef}
              className={`post-action post-action--replies${
                threadOpen ? " is-open" : ""
              }`}
              aria-expanded={threadOpen}
              aria-controls={threadOpen ? threadId : undefined}
              aria-label={
                threadOpen
                  ? "Hide comments"
                  : commentsCount > 0
                    ? `Open ${commentsCount} ${
                        commentsCount === 1 ? "comment" : "comments"
                      }`
                    : "Open comments"
              }
              onClick={toggleThread}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
              </svg>
            </button>

            <button
              type="button"
              className="post-action post-action--share"
              aria-label="Share this post"
              onClick={() => setShareOpen(true)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m22 2-7 20-4-9-9-4 20-7Z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>

            <button
              type="button"
              className={`post-action post-action--save${
                saved ? " is-saved" : ""
              }`}
              aria-label={saved ? "Remove from saved" : "Save this post"}
              aria-pressed={viewer ? saved : undefined}
              aria-busy={savingSave}
              onClick={toggleSave}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 4h12v17l-6-4.2L6 21V4Z" />
              </svg>
            </button>
          </div>

          <div className="post-meta">
            {likesCount > 0 ? (
              <button
                type="button"
                className="post-likes post-likes--button"
                onClick={() => setLikesOpen(true)}
                aria-haspopup="dialog"
              >
                {likesLabel}
              </button>
            ) : (
              <p className="post-likes" aria-live="polite">
                {likesLabel}
              </p>
            )}
          </div>

          {(likeError || saveError) && (
            <p className="post-inline-error" role="alert">
              {likeError || saveError}
            </p>
          )}

          {caption && (
            <div className="post-caption">
              <p
                id={captionId}
                className={`post-caption-text${
                  isLongTake && !takeExpanded ? " is-clamped" : ""
                }`}
              >
                <Link
                  to={`/u/${encodeURIComponent(username)}`}
                  className="post-caption-author"
                >
                  @{username}
                </Link>{" "}
                <RichText text={caption} />
              </p>
              {isLongTake && (
                <button
                  type="button"
                  className="post-caption-toggle"
                  onClick={() => setTakeExpanded((current) => !current)}
                  aria-expanded={takeExpanded}
                  aria-controls={captionId}
                >
                  {takeExpanded ? "less" : "more"}
                </button>
              )}
            </div>
          )}

          {!threadOpen && (
            <section
              className="post-reply-preview"
              aria-label="Comment preview"
            >
              {previewReplies.length > 0 ? (
                <ul className="post-reply-list">
                  {previewReplies.map((comment) => (
                    <li className="post-reply" key={comment._id}>
                      <Avatar
                        src={comment.profile_image}
                        name={comment.user}
                        className="avatar--preview"
                      />
                      <div className="post-reply-body">
                        <p className="post-reply-text">
                          <Link
                            to={`/u/${encodeURIComponent(comment.user)}`}
                            className="post-reply-author"
                          >
                            @{comment.user}
                          </Link>{" "}
                          <RichText text={comment.text} />
                        </p>
                        {comment.createdAt && (
                          <time
                            className="post-reply-time"
                            dateTime={comment.createdAt}
                            title={
                              formatFullDate(comment.createdAt) || undefined
                            }
                          >
                            {formatRelativeTime(comment.createdAt)}
                          </time>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="post-reply-empty">
                  No comments yet. Start the conversation.
                </p>
              )}

              <div className="post-reply-actions">
                {commentsCount > 0 && (
                  <button
                    type="button"
                    ref={viewAllButtonRef}
                    className="post-reply-open"
                    onClick={() => openThread("view-all")}
                  >
                    View all {formatCount(commentsCount)}{" "}
                    {commentsCount === 1 ? "comment" : "comments"}
                  </button>
                )}
                <button
                  type="button"
                  ref={replyButtonRef}
                  className="post-reply-write"
                  onClick={openReply}
                >
                  Comment
                </button>
              </div>
            </section>
          )}

          <div className="post-foot">
            <Link
              to={`/p/${postId}`}
              className="post-date-link"
              aria-label={`Open post by @${username}`}
            >
              <time
                className="post-date"
                dateTime={post.createdAt}
                title={fullDate || undefined}
              >
                {fullDate || postedAt}
              </time>
            </Link>

            {isOwner && !confirmingDelete && (
              <button
                type="button"
                className="quiet-button post-delete"
                onClick={() => setConfirmingDelete(true)}
              >
                Delete post
              </button>
            )}
          </div>

          {isOwner && confirmingDelete && (
            <div className="post-owner">
              <span className="post-owner-confirm">
                Delete this post and its comments?
              </span>
              <button
                type="button"
                className="quiet-button quiet-button--danger"
                onClick={removePost}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete post"}
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

              {deleteError && (
                <span className="post-inline-error" role="alert">
                  {deleteError}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {threadOpen && (
        <section
          id={threadId}
          className="post-thread is-open"
          aria-label={`Comments on @${username}'s post`}
        >
          <header className="post-thread-head">
            <p className="post-thread-label">
              Comments <span>{formatCount(commentsCount)}</span>
            </p>
            <button
              type="button"
              ref={threadCloseRef}
              className="quiet-button post-thread-close"
              onClick={closeThread}
            >
              Close
            </button>
          </header>

          <CommentThread
            postId={postId}
            commentsCount={commentsCount}
            onCountChange={handleCountChange}
            onCommentsChange={handleCommentsChange}
            focusRequest={focusRequest}
          />
        </section>
      )}

      {shareOpen && (
        <ShareSheet post={post} onClose={() => setShareOpen(false)} />
      )}

      {likesOpen && (
        <PostLikesModal
          postId={postId}
          onClose={() => setLikesOpen(false)}
        />
      )}
    </article>
  );
};

export default Post;
