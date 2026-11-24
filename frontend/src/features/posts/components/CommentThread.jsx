import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import Avatar from "../../shared/components/Avatar";
import { getErrorMessage } from "../../shared/utils/error";
import {
  formatFullDate,
  formatRelativeTime,
  getUserAvatar,
} from "../../shared/utils/format";
import {
  addComment,
  deleteComment,
  getComments,
} from "../services/post.api";
import "../style/comments.scss";

const COMMENT_LIMIT = 500;
const PAGE_SIZE = 20;

const CommentThread = ({
  postId,
  commentsCount = 0,
  onCountChange,
  onCommentsChange,
  focusRequest = 0,
}) => {
  const { user } = useAuth();
  const location = useLocation();

  const [comments, setComments] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [composerError, setComposerError] = useState("");

  const [confirmId, setConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

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
      pending: true,
    };
    const next = [...comments, optimistic];

    setComposerError("");
    setDraft("");
    setSubmitting(true);
    setComments(next);
    onCommentsChange?.(next);
    onCountChange?.(previousCount + 1);

    try {
      const data = await addComment(postId, text);
      const saved = data?.comment;
      const savedComment = { ...optimistic, ...saved, pending: false };
      const replaced = next.map((comment) =>
        comment._id === temporaryId ? savedComment : comment
      );

      setComments(replaced);
      onCommentsChange?.(replaced);

      if (typeof data?.commentsCount === "number") {
        onCountChange?.(data.commentsCount);
      }
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

  const handleDelete = async (commentId) => {
    if (deletingId) return;

    const previous = comments;
    const previousCount = Number(commentsCount) || comments.length;
    const next = comments.filter((comment) => comment._id !== commentId);

    setDeletingId(commentId);
    setDeleteError("");
    setConfirmId(null);
    setComments(next);
    onCommentsChange?.(next);
    onCountChange?.(Math.max(0, previousCount - 1));

    try {
      const data = await deleteComment(postId, commentId);

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
            const isOwn = comment.user === user?.username;
            const isPending = Boolean(comment.pending);
            const isConfirming = confirmId === comment._id;
            const postedAt = formatRelativeTime(comment.createdAt);

            return (
              <li
                key={comment._id}
                className={`reply${isPending ? " is-pending" : ""}`}
              >
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
                        title={formatFullDate(comment.createdAt) || undefined}
                      >
                        {postedAt}
                      </time>
                    )}
                  </div>

                  <p className="reply-text">{comment.text}</p>

                  {isPending && (
                    <span className="reply-pending">Posting...</span>
                  )}

                  {isOwn && !isPending && (
                    <div className="reply-controls">
                      {isConfirming ? (
                        <>
                          <span className="reply-confirm">
                            Delete this comment?
                          </span>
                          <button
                            type="button"
                            className="quiet-button quiet-button--danger"
                            onClick={() => handleDelete(comment._id)}
                            disabled={Boolean(deletingId)}
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            className="quiet-button"
                            onClick={() => {
                              setConfirmId(null);
                              setDeleteError("");
                            }}
                            disabled={Boolean(deletingId)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="quiet-button"
                          onClick={() => {
                            setConfirmId(comment._id);
                            setDeleteError("");
                          }}
                          aria-label={`Delete your comment: ${comment.text.slice(
                            0,
                            50
                          )}`}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
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

      {user ? (
        <form className="reply-composer" onSubmit={handleSubmit} noValidate>
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
            placeholder="Add a comment..."
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
