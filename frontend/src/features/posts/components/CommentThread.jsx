import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import Avatar from "../../shared/components/Avatar";
import RichText from "../../shared/components/RichText";
import { getErrorMessage } from "../../shared/utils/error";
import {
  formatCount,
  formatFullDate,
  formatRelativeTime,
  getUserAvatar,
} from "../../shared/utils/format";
import {
  addComment,
  deleteComment,
  getCommentReplies,
  getComments,
  likeComment,
  unlikeComment,
} from "../services/post.api";
import "../style/comments.scss";

const COMMENT_LIMIT = 500;
const PAGE_SIZE = 20;
const REPLY_PAGE_SIZE = 50;

const updateCommentTree = (comments, commentId, updater) =>
  comments.map((comment) => {
    if (comment._id === commentId) return updater(comment);

    if (Array.isArray(comment.replies)) {
      const index = comment.replies.findIndex(
        (reply) => reply._id === commentId
      );

      if (index !== -1) {
        const replies = comment.replies.map((reply, replyIndex) =>
          replyIndex === index ? updater(reply) : reply
        );
        return { ...comment, replies };
      }
    }

    return comment;
  });

const CommentRow = ({
  comment,
  isReply = false,
  viewer,
  onReply,
  onDelete,
  onLike,
  liking,
  confirming,
  onConfirmChange,
  deleting,
  replyToId,
}) => {
  const isOwn = Boolean(viewer?.username) && comment.user === viewer.username;
  const isPending = Boolean(comment.pending);
  const postedAt = formatRelativeTime(comment.createdAt);
  const likes = Number(comment.likesCount) || 0;
  const liked = Boolean(comment.isLiked);

  return (
    <li
      className={`reply${isReply ? " reply--nested" : ""}${
        isPending ? " is-pending" : ""
      }${replyToId === comment._id ? " is-replying" : ""}`}
    >
      <span className="reply-node" aria-hidden="true">
        <Avatar
          src={comment.profile_image}
          name={comment.user}
          className={isReply ? "avatar--reply avatar--reply-sm" : "avatar--reply"}
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
              title={formatFullDate(comment.createdAt) || undefined}
            >
              {postedAt}
            </time>
          )}
        </div>

        <p className="reply-text">
          <RichText text={comment.text} />
        </p>

        {isPending && <span className="reply-pending">Posting...</span>}

        {!isPending && (
          <div className="reply-actions">
            {viewer && (
              <button
                type="button"
                className={`reply-like${liked ? " is-liked" : ""}`}
                onClick={() => onLike(comment)}
                disabled={liking}
                aria-pressed={liked}
                aria-label={
                  liked
                    ? `Unlike comment by @${comment.user}`
                    : `Like comment by @${comment.user}`
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
                </svg>
                {likes > 0 && <span>{formatCount(likes)}</span>}
              </button>
            )}

            {!isReply && viewer && (
              <button
                type="button"
                className="reply-action reply-action--reply"
                onClick={() => onReply(comment)}
                aria-label={`Reply to @${comment.user}`}
              >
                Reply
              </button>
            )}

            {isOwn && (
              <>
                {confirming ? (
                  <>
                    <span className="reply-confirm">
                      Delete this comment?
                    </span>
                    <button
                      type="button"
                      className="quiet-button quiet-button--danger"
                      onClick={() => onDelete(comment)}
                      disabled={deleting}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="quiet-button"
                      onClick={() => onConfirmChange(null)}
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="reply-action reply-action--delete"
                    onClick={() => onConfirmChange(comment._id)}
                    aria-label={`Delete your comment: ${comment.text.slice(
                      0,
                      50
                    )}`}
                  >
                    Delete
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
};

const CommentThread = ({
  postId,
  commentsCount = 0,
  onCountChange,
  onCommentsChange,
  focusRequest = 0,
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [comments, setComments] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [replyCursors, setReplyCursors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingRepliesFor, setLoadingRepliesFor] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [composerError, setComposerError] = useState("");
  const [replyTo, setReplyTo] = useState(null);

  const [confirmId, setConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [likingId, setLikingId] = useState(null);
  const [likeError, setLikeError] = useState("");

  const composerRef = useRef(null);
  const textareaId = `comment-${postId}`;
  const errorId = `comment-error-${postId}`;

  useEffect(() => {
    let active = true;

    setLoading(true);
    setLoadError("");

    getComments(postId, { limit: PAGE_SIZE })
      .then((data) => {
        if (!active) return;

        const rows = Array.isArray(data?.comments)
          ? [...data.comments].reverse()
          : [];

        setComments(rows);
        setNextCursor(data?.nextCursor ?? null);
        onCommentsChange?.(rows);

        if (typeof data?.commentsCount === "number") {
          onCountChange?.(data.commentsCount);
        }
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(
          getErrorMessage(err, "The comments on this post could not be loaded.")
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [postId, onCommentsChange, onCountChange, reloadKey]);

  useEffect(() => {
    if (!focusRequest || loading) return undefined;

    const timer = window.setTimeout(() => {
      composerRef.current?.focus();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [focusRequest, loading]);

  const loadEarlier = async () => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    setLoadError("");

    try {
      const data = await getComments(postId, {
        cursor: nextCursor,
        limit: PAGE_SIZE,
      });
      const incoming = Array.isArray(data?.comments)
        ? [...data.comments].reverse()
        : [];
      const seen = new Set(comments.map((comment) => comment._id));
      const merged = [
        ...incoming.filter((comment) => !seen.has(comment._id)),
        ...comments,
      ];

      setComments(merged);
      setNextCursor(data?.nextCursor ?? null);
      onCommentsChange?.(merged);

      if (typeof data?.commentsCount === "number") {
        onCountChange?.(data.commentsCount);
      }
    } catch (err) {
      setLoadError(
        getErrorMessage(err, "Earlier comments could not be loaded.")
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const loadReplies = async (comment, cursor = null) => {
    if (loadingRepliesFor) return;

    setLoadingRepliesFor(comment._id);
    setLoadError("");

    try {
      const data = await getCommentReplies(postId, comment._id, {
        cursor,
        limit: REPLY_PAGE_SIZE,
      });
      const incoming = Array.isArray(data?.replies) ? data.replies : [];

      setComments((current) =>
        updateCommentTree(current, comment._id, (entry) => {
          const existing = cursor ? entry.replies ?? [] : [];
          const seen = new Set(existing.map((reply) => reply._id));
          return {
            ...entry,
            replies: [
              ...existing,
              ...incoming.filter((reply) => !seen.has(reply._id)),
            ],
            repliesCount:
              typeof data?.repliesCount === "number"
                ? data.repliesCount
                : entry.repliesCount,
          };
        })
      );

      setReplyCursors((current) => ({
        ...current,
        [comment._id]: data?.nextCursor ?? null,
      }));
    } catch (err) {
      setLoadError(
        getErrorMessage(err, "Replies could not be loaded. Try again.")
      );
    } finally {
      setLoadingRepliesFor(null);
    }
  };

  const handleReply = (comment) => {
    if (!user) {
      navigate("/login", { state: { from: location } });
      return;
    }

    setReplyTo({ id: comment._id, username: comment.user });
    setComposerError("");
    window.setTimeout(() => composerRef.current?.focus(), 60);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    const text = draft.trim();

    if (!text) {
      setComposerError("Write a comment before posting.");
      return;
    }

    if (text.length > COMMENT_LIMIT) {
      setComposerError(`Comments are limited to ${COMMENT_LIMIT} characters.`);
      return;
    }

    const previous = comments;
    const previousCount = Number(commentsCount) || comments.length;
    const temporaryId = `temp-${Date.now()}`;
    const optimistic = {
      _id: temporaryId,
      user: user?.username || "you",
      text,
      profile_image: getUserAvatar(user),
      createdAt: new Date().toISOString(),
      parent: replyTo?.id ?? null,
      likesCount: 0,
      isLiked: false,
      replies: [],
      repliesCount: 0,
      pending: true,
    };
    const next = replyTo
      ? updateCommentTree(previous, replyTo.id, (comment) => ({
          ...comment,
          replies: [...(comment.replies ?? []), optimistic],
          repliesCount: (Number(comment.repliesCount) || 0) + 1,
        }))
      : [...previous, optimistic];

    setComposerError("");
    setDraft("");
    setSubmitting(true);
    setComments(next);
    onCommentsChange?.(next);
    onCountChange?.(previousCount + 1);

    try {
      const data = await addComment(postId, text, replyTo?.id ?? null);
      const saved = data?.comment;
      const savedComment = { ...optimistic, ...saved, pending: false };

      setComments((current) =>
        updateCommentTree(current, temporaryId, () => savedComment)
      );

      if (typeof data?.commentsCount === "number") {
        onCountChange?.(data.commentsCount);
      }

      setReplyTo(null);
    } catch (err) {
      setComments(previous);
      onCommentsChange?.(previous);
      onCountChange?.(previousCount);
      setDraft(text);
      setComposerError(
        getErrorMessage(err, "Your comment could not be saved. Try again.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (comment) => {
    if (deletingId) return;

    const previous = comments;
    const previousCount = Number(commentsCount) || comments.length;
    const next = previous
      .filter((entry) => entry._id !== comment._id)
      .map((entry) => {
        if (!Array.isArray(entry.replies)) return entry;
        if (!entry.replies.some((reply) => reply._id === comment._id)) {
          return entry;
        }

        return {
          ...entry,
          replies: entry.replies.filter(
            (reply) => reply._id !== comment._id
          ),
          repliesCount: Math.max(
            0,
            (Number(entry.repliesCount) || entry.replies.length) - 1
          ),
        };
      });

    setDeletingId(comment._id);
    setDeleteError("");
    setConfirmId(null);
    setComments(next);
    onCommentsChange?.(next);
    onCountChange?.(Math.max(0, previousCount - 1));

    try {
      const data = await deleteComment(postId, comment._id);

      if (typeof data?.commentsCount === "number") {
        onCountChange?.(data.commentsCount);
      }
    } catch (err) {
      setComments(previous);
      onCommentsChange?.(previous);
      onCountChange?.(previousCount);
      setDeleteError(
        getErrorMessage(err, "That comment could not be deleted.")
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleLike = async (comment) => {
    if (!user) {
      navigate("/login", { state: { from: location } });
      return;
    }

    if (likingId || String(comment._id).startsWith("temp-")) return;

    const nextLiked = !comment.isLiked;
    const previous = {
      isLiked: Boolean(comment.isLiked),
      likesCount: Number(comment.likesCount) || 0,
    };
    const nextLikes = Math.max(
      0,
      previous.likesCount + (nextLiked ? 1 : -1)
    );

    setLikingId(comment._id);
    setLikeError("");

    setComments((current) =>
      updateCommentTree(current, comment._id, (entry) => ({
        ...entry,
        isLiked: nextLiked,
        likesCount: nextLikes,
      }))
    );

    try {
      const data = nextLiked
        ? await likeComment(postId, comment._id)
        : await unlikeComment(postId, comment._id);

      setComments((current) =>
        updateCommentTree(current, comment._id, (entry) => ({
          ...entry,
          isLiked:
            typeof data?.isLiked === "boolean"
              ? data.isLiked
              : nextLiked,
          likesCount:
            typeof data?.likesCount === "number"
              ? data.likesCount
              : nextLikes,
        }))
      );
    } catch (err) {
      setComments((current) =>
        updateCommentTree(current, comment._id, (entry) => ({
          ...entry,
          ...previous,
        }))
      );
      setLikeError(
        getErrorMessage(err, "That like could not be saved.")
      );
    } finally {
      setLikingId(null);
    }
  };

  return (
    <section className="thread" aria-label="Comments">
      {nextCursor && !loading && (
        <button
          type="button"
          className="thread-more"
          onClick={loadEarlier}
          disabled={loadingMore}
        >
          {loadingMore ? "Loading earlier comments..." : "Load earlier comments"}
        </button>
      )}

      {loadError && comments.length > 0 && (
        <p className="thread-error" role="alert">
          {loadError}
        </p>
      )}

      {loading ? (
        <div className="thread-loading" role="status">
          <span className="sr-only">Loading comments...</span>
          <span className="reply-skeleton" />
          <span className="reply-skeleton" />
        </div>
      ) : loadError && comments.length === 0 ? (
        <div className="thread-error-state" role="alert">
          <p>{loadError}</p>
          <button
            type="button"
            className="button ghost-button button--small"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Try again
          </button>
        </div>
      ) : comments.length === 0 ? (
        <p className="thread-empty">
          No comments yet. Start the conversation.
        </p>
      ) : (
        <ul className="reply-list">
          {comments.map((comment) => {
            const replies = Array.isArray(comment.replies)
              ? comment.replies
              : [];
            const repliesCount = Number(comment.repliesCount) || replies.length;
            const hasMoreReplies = repliesCount > replies.length;
            const replyCursor = replyCursors[comment._id];

            return (
              <li className="reply-thread" key={comment._id}>
                <ul className="reply-list reply-list--top">
                  <CommentRow
                    comment={comment}
                    viewer={user}
                    onReply={handleReply}
                    onDelete={handleDelete}
                    onLike={handleLike}
                    liking={likingId === comment._id}
                    confirming={confirmId === comment._id}
                    onConfirmChange={setConfirmId}
                    deleting={deletingId === comment._id}
                    replyToId={replyTo?.id}
                  />
                </ul>

                {replies.length > 0 && (
                  <ul className="reply-list reply-list--nested">
                    {replies.map((reply) => (
                      <CommentRow
                        key={reply._id}
                        comment={reply}
                        isReply
                        viewer={user}
                        onReply={handleReply}
                        onDelete={handleDelete}
                        onLike={handleLike}
                        liking={likingId === reply._id}
                        confirming={confirmId === reply._id}
                        onConfirmChange={setConfirmId}
                        deleting={deletingId === reply._id}
                        replyToId={replyTo?.id}
                      />
                    ))}
                  </ul>
                )}

                {hasMoreReplies && (
                  <button
                    type="button"
                    className="reply-view-all"
                    onClick={() => loadReplies(comment, replyCursor)}
                    disabled={loadingRepliesFor === comment._id}
                  >
                    {loadingRepliesFor === comment._id
                      ? "Loading replies..."
                      : `View ${hasMoreReplies ? "all " : ""}${formatCount(
                          repliesCount
                        )} ${repliesCount === 1 ? "reply" : "replies"}`}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {deleteError && (
        <p className="thread-error" role="alert">
          {deleteError}
        </p>
      )}

      {likeError && (
        <p className="thread-error" role="alert">
          {likeError}
        </p>
      )}

      {user ? (
        <form className="reply-composer" onSubmit={handleSubmit} noValidate>
          {replyTo && (
            <div className="reply-composer-context">
              <span>
                Replying to <strong>@{replyTo.username}</strong>
              </span>
              <button
                type="button"
                className="quiet-button"
                onClick={() => setReplyTo(null)}
              >
                Cancel
              </button>
            </div>
          )}

          <label htmlFor={textareaId} className="sr-only">
            Add a comment
          </label>
          <textarea
            ref={composerRef}
            id={textareaId}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setComposerError("");
            }}
            maxLength={COMMENT_LIMIT}
            placeholder={replyTo ? "Write a reply..." : "Add a comment..."}
            rows={2}
            aria-invalid={Boolean(composerError)}
            aria-describedby={composerError ? errorId : undefined}
            disabled={submitting || loading}
          />

          <div className="reply-composer-row">
            <span className="reply-count">
              {draft.length} / {COMMENT_LIMIT}
            </span>
            <button
              type="submit"
              className="button primary-button button--small"
              disabled={submitting || loading || !draft.trim()}
              aria-busy={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Posting...
                </>
              ) : replyTo ? (
                "Post reply"
              ) : (
                "Post comment"
              )}
            </button>
          </div>

          {composerError && (
            <p className="field-error" id={errorId} role="alert">
              {composerError}
            </p>
          )}
        </form>
      ) : (
        <p className="reply-signin">
          <Link to="/login" state={{ from: location }}>
            Sign in
          </Link>{" "}
          to add a comment.
        </p>
      )}
    </section>
  );
};

export default CommentThread;
