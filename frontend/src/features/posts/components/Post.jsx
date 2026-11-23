import { useCallback, useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { usePost } from "../hooks/usePost";
import { useAuth } from "../../auth/hooks/useAuth";
import Avatar from "../../shared/components/Avatar";
import CommentThread from "./CommentThread";
import {
  formatCount,
  formatFrameNumber,
  formatJournalDate,
  getUserAvatar,
} from "../../shared/utils/format";

const CAPTION_LIMIT = 160;

const Post = ({ user: author, post, index = 0 }) => {
  const { user: viewer } = useAuth();
  const {
    handleLike,
    handleUnlike,
    handleDeletePost,
    patchPost,
  } = usePost();

  const [imageFailed, setImageFailed] = useState(false);
  const [imageSrc, setImageSrc] = useState(
    post?.thumbnail_url || post?.image_url || ""
  );
  const [expanded, setExpanded] = useState(false);
  const [liking, setLiking] = useState(false);
  const [likeError, setLikeError] = useState("");
  const [pulse, setPulse] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const captionId = useId();
  const commentsId = useId();

  const frameNumber = formatFrameNumber(index);
  const postedAt = formatJournalDate(post?.createdAt);
  const username = author?.username || "unknown";
  const caption = typeof post?.caption === "string" ? post.caption.trim() : "";
  const isLongCaption = caption.length > CAPTION_LIMIT;
  const liked = Boolean(post?.isLiked);
  const likesCount = Number(post?.likesCount) || 0;
  const commentsCount = Number(post?.commentsCount) || 0;
  const isOwner =
    Boolean(viewer?.username) &&
    Boolean(author?.username) &&
    viewer.username === username;

  const originalImage = post?.image_url || "";
  const thumbnailImage = post?.thumbnail_url || originalImage;

  useEffect(() => {
    setImageSrc(thumbnailImage);
    setImageFailed(false);
  }, [thumbnailImage]);

  const updateCommentsCount = useCallback(
    (count) => {
      if (!post?._id) return;
      patchPost(post._id, {
        commentsCount: Math.max(0, Number(count) || 0),
      });
    },
    [patchPost, post?._id]
  );

  const photoAlt = caption
    ? `Photograph by @${username}: ${caption.slice(0, 120)}`
    : `Photograph by @${username}`;

  const handleImageError = () => {
    if (originalImage && imageSrc !== originalImage) {
      setImageSrc(originalImage);
      return;
    }

    setImageFailed(true);
  };

  const toggleLike = async () => {
    if (liking || !post?._id) return;

    setLiking(true);
    setLikeError("");
    setPulse(false);

    try {
      if (liked) {
        await handleUnlike(post._id);
      } else {
        await handleLike(post._id);
        setPulse(true);
      }
    } catch {
      setLikeError("Like could not be saved.");
    } finally {
      setLiking(false);
    }
  };

  const removePost = async () => {
    if (!post?._id || deleting) return;

    setDeleting(true);
    setDeleteError("");

    try {
      await handleDeletePost(post._id);
    } catch {
      setDeleteError("This frame could not be deleted. Try again.");
      setDeleting(false);
    }
  };

  const authorName = (
    <span className="post-author-name">@{username}</span>
  );

  return (
    <article
      className="post"
      style={{ "--frame-delay": `${Math.min(index, 5) * 70}ms` }}
    >
      <div className="post-frame-row">
        <span className="post-frame">Frame {frameNumber}</span>
        <span className="frame-rule" aria-hidden="true" />
        {isOwner && (
          <span className="post-owner-tag">Your frame</span>
        )}
      </div>

      <div className="post-media">
        {imageSrc && !imageFailed ? (
          <img
            src={imageSrc}
            alt={photoAlt}
            loading="lazy"
            decoding="async"
            onError={handleImageError}
          />
        ) : (
          <div
            className="photo-fallback"
            role="img"
            aria-label={`Frame ${frameNumber} is unavailable`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="6" width="18" height="14" rx="1.5" />
              <circle cx="12" cy="13" r="3.2" />
              <path d="m8 6 1.4-2h5.2L16 6" />
            </svg>
            <span>Image unavailable</span>
            <span className="photo-fallback-frame">Frame {frameNumber}</span>
          </div>
        )}
      </div>

      <div className="post-body">
        <div className="post-author">
          {author?.username ? (
            <Link
              to={`/u/${encodeURIComponent(username)}`}
              className="post-author-link"
            >
              <Avatar
                src={getUserAvatar(author)}
                name={username}
                className="avatar--post"
              />
              {authorName}
            </Link>
          ) : (
            <span className="post-author-link">
              <Avatar
                src={getUserAvatar(author)}
                name={username}
                className="avatar--post"
              />
              {authorName}
            </span>
          )}
        </div>

        {caption && (
          <div className="post-copy">
            <p
              id={captionId}
              className={`post-caption${
                isLongCaption && !expanded ? " is-clamped" : ""
              }`}
            >
              {caption}
            </p>
            {isLongCaption && (
              <button
                type="button"
                className="caption-toggle"
                onClick={() => setExpanded((current) => !current)}
                aria-expanded={expanded}
                aria-controls={captionId}
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        )}

        <footer className="post-footer">
          <div className="post-actions">
            <button
              type="button"
              className="post-like"
              aria-pressed={liked}
              aria-label={
                liked
                  ? `Unlike this frame, ${likesCount} likes`
                  : `Like this frame, ${likesCount} likes`
              }
              aria-busy={liking}
              onClick={toggleLike}
            >
              <span
                className={`like-glyph${liked ? " is-liked" : ""}${
                  pulse ? " is-pulsing" : ""
                }`}
                onAnimationEnd={() => setPulse(false)}
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 8.81056L13.6352 6.48845C14.2721 5.58412 15.3179 5 16.5 5C18.433 5 20 6.567 20 8.5C20 11.3788 18.0407 14.1215 15.643 16.3358C14.4877 17.4027 13.3237 18.2603 12.4451 18.8521C12.2861 18.9592 12.1371 19.0571 11.9999 19.1456C11.8627 19.0571 11.7137 18.9592 11.5547 18.8521C10.6761 18.2604 9.51216 17.4028 8.35685 16.3358C5.95926 14.1216 4 11.3788 4 8.5C4 6.567 5.567 5 7.5 5C8.68209 5 9.72794 5.58412 10.3648 6.48845L12 8.81056ZM10.5557 3.92626C9.68172 3.3412 8.63071 3 7.5 3C4.46243 3 2 5.46243 2 8.5C2 16 11.9999 21.4852 11.9999 21.4852C11.9999 21.4852 22 16 22 8.5C22 5.46243 19.5376 3 16.5 3C15.3693 3 14.3183 3.3412 13.4443 3.92626C12.8805 4.3037 12.3903 4.78263 12 5.33692C11.6097 4.78263 11.1195 4.3037 10.5557 3.92626Z" />
                </svg>
              </span>
              <span className="like-label">{liked ? "Liked" : "Like"}</span>
              {likesCount > 0 && (
                <span className="post-count">{formatCount(likesCount)}</span>
              )}
            </button>

            <button
              type="button"
              className="post-comments-toggle"
              aria-expanded={commentsOpen}
              aria-controls={commentsId}
              aria-label={
                commentsOpen
                  ? `Hide comments, ${commentsCount} comments`
                  : `Show comments, ${commentsCount} comments`
              }
              onClick={() => setCommentsOpen((current) => !current)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 12a8 8 0 0 1-8 8H6l-3 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" />
              </svg>
              <span className="like-label">
                {commentsOpen ? "Hide notes" : "Notes"}
              </span>
              <span className="post-count">{formatCount(commentsCount)}</span>
            </button>

            {likeError && (
              <span className="post-like-error" role="alert">
                {likeError}
              </span>
            )}
          </div>

          {postedAt && (
            <time className="post-date" dateTime={post.createdAt}>
              {postedAt}
            </time>
          )}
        </footer>

        {commentsOpen && (
          <div id={commentsId} className="post-comments-shell">
            <CommentThread
              postId={post._id}
              commentsCount={commentsCount}
              onCountChange={updateCommentsCount}
            />
          </div>
        )}

        {isOwner && (
          <div className="post-owner-row">
            {confirmingDelete ? (
              <>
                <span className="post-owner-confirm">
                  Delete this frame and its notes?
                </span>
                <button
                  type="button"
                  className="post-owner-action post-owner-action--danger"
                  onClick={removePost}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
                <button
                  type="button"
                  className="post-owner-action"
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
                className="post-owner-action"
                onClick={() => setConfirmingDelete(true)}
              >
                Remove frame
              </button>
            )}

            {deleteError && (
              <span className="post-like-error" role="alert">
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
