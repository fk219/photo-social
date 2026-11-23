import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import Avatar from "../../shared/components/Avatar";
import { getErrorMessage } from "../../shared/utils/error";
import { formatNoteDate, getUserAvatar } from "../../shared/utils/format";
import {
  addComment,
  deleteComment,
  getComments,
} from "../services/post.api";
import "../style/comments.scss";

const COMMENT_LIMIT = 500;

const CommentThread = ({ postId, commentsCount = 0, onCountChange }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [composerError, setComposerError] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setLoadError("");

    getComments(postId)
      .then((data) => {
        if (!active) return;
        setComments(Array.isArray(data?.comments) ? data.comments : []);
        setNextCursor(data?.nextCursor ?? null);

        if (typeof data?.commentsCount === "number") {
          onCountChange(data.commentsCount);
        }
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(
          getErrorMessage(err, "The notes on this frame could not be loaded.")
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [onCountChange, postId]);

  const loadEarlier = async () => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    setLoadError("");

    try {
      const data = await getComments(postId, { cursor: nextCursor });
      const incoming = Array.isArray(data?.comments) ? data.comments : [];
      setComments((current) => {
        const seen = new Set(current.map((comment) => comment._id));
        return [
          ...current,
          ...incoming.filter((comment) => !seen.has(comment._id)),
        ];
      });
      setNextCursor(data?.nextCursor ?? null);

      if (typeof data?.commentsCount === "number") {
        onCountChange(data.commentsCount);
      }
    } catch (err) {
      setLoadError(
        getErrorMessage(err, "Earlier notes could not be loaded.")
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
      setComposerError("Write a note before posting.");
      return;
    }

    if (text.length > COMMENT_LIMIT) {
      setComposerError(
        `Notes are limited to ${COMMENT_LIMIT} characters.`
      );
      return;
    }

    const previousCount = Number(commentsCount) || 0;
    const temporaryId = `temp-${Date.now()}`;
    const optimistic = {
      _id: temporaryId,
      user: user?.username || "you",
      text,
      profile_image: getUserAvatar(user),
      createdAt: new Date().toISOString(),
      pending: true,
    };

    setComposerError("");
    setDraft("");
    setSubmitting(true);
    setComments((current) => [optimistic, ...current]);
    setLoadError("");
    onCountChange(previousCount + 1);

    try {
      const data = await addComment(postId, text);
      const saved = data?.comment;

      setComments((current) =>
        current.map((comment) =>
          comment._id === temporaryId
            ? { ...optimistic, ...saved, pending: false }
            : comment
        )
      );

      if (typeof data?.commentsCount === "number") {
        onCountChange(data.commentsCount);
      }
    } catch (err) {
      setComments((current) =>
        current.filter((comment) => comment._id !== temporaryId)
      );
      setDraft(text);
      onCountChange(previousCount);
      setComposerError(
        getErrorMessage(err, "Your note could not be saved. Try again.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    setDeletingId(commentId);
    setDeleteError("");

    try {
      const data = await deleteComment(postId, commentId);
      setComments((current) =>
        current.filter((comment) => comment._id !== commentId)
      );
      setConfirmId(null);

      if (typeof data?.commentsCount === "number") {
        onCountChange(data.commentsCount);
      } else {
        onCountChange(Math.max(0, (Number(commentsCount) || 0) - 1));
      }
    } catch (err) {
      setDeleteError(
        getErrorMessage(err, "That note could not be deleted.")
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="post-comments" aria-label="Comments">
      {user ? (
        <form className="comment-composer" onSubmit={handleSubmit} noValidate>
          <label htmlFor={`comment-${postId}`} className="sr-only">
            Add a note to this frame
          </label>
          <textarea
            id={`comment-${postId}`}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setComposerError("");
            }}
            maxLength={COMMENT_LIMIT}
            placeholder="Leave a note in the margin…"
            rows={2}
            aria-invalid={Boolean(composerError)}
            aria-describedby={
              composerError ? `comment-error-${postId}` : undefined
            }
            disabled={submitting || loading}
          />

          <div className="comment-composer-row">
            <span className="comment-count">
              {draft.length} / {COMMENT_LIMIT}
            </span>
            <button
              type="submit"
              className="button primary-button comment-submit"
              disabled={submitting || loading || !draft.trim()}
              aria-busy={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Posting…
                </>
              ) : (
                "Add note"
              )}
            </button>
          </div>

          {composerError && (
            <p className="field-error" id={`comment-error-${postId}`} role="alert">
              {composerError}
            </p>
          )}
        </form>
      ) : (
        <p className="comment-signin">
          <Link to="/login">Sign in</Link> to leave a note.
        </p>
      )}

      {loading ? (
        <div className="comment-loading" role="status">
          <span className="sr-only">Loading comments…</span>
          <span className="comment-skeleton" />
          <span className="comment-skeleton" />
        </div>
      ) : loadError && comments.length === 0 ? (
        <p className="comment-error" role="alert">
          {loadError}
        </p>
      ) : comments.length === 0 ? (
        <p className="comment-empty">
          No notes yet. Be the first to leave one.
        </p>
      ) : (
        <ul className="comment-list">
          {comments.map((comment) => {
            const isOwn = comment.user === user?.username;
            const isPending = Boolean(comment.pending);
            const isConfirming = confirmId === comment._id;
            const isDeleting = deletingId === comment._id;

            return (
              <li
                key={comment._id}
                className={`comment${isPending ? " is-pending" : ""}`}
              >
                <Avatar
                  src={comment.profile_image}
                  name={comment.user}
                  className="avatar--comment"
                />
                <div className="comment-body">
                  <div className="comment-meta">
                    <Link
                      to={`/u/${encodeURIComponent(comment.user)}`}
                      className="comment-author"
                    >
                      @{comment.user}
                    </Link>
                    {comment.createdAt && (
                      <time
                        className="comment-time"
                        dateTime={comment.createdAt}
                      >
                        {formatNoteDate(comment.createdAt)}
                      </time>
                    )}
                  </div>

                  <p className="comment-text">{comment.text}</p>

                  {isPending && (
                    <span className="comment-pending">Posting…</span>
                  )}

                  {isOwn && !isPending && (
                    <div className="comment-controls">
                      {isConfirming ? (
                        <>
                          <span className="comment-confirm">
                            Delete this note?
                          </span>
                          <button
                            type="button"
                            className="comment-action comment-action--danger"
                            onClick={() => handleDelete(comment._id)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? "Deleting…" : "Delete"}
                          </button>
                          <button
                            type="button"
                            className="comment-action"
                            onClick={() => {
                              setConfirmId(null);
                              setDeleteError("");
                            }}
                            disabled={isDeleting}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="comment-action"
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
        <p className="comment-error" role="alert">
          {deleteError}
        </p>
      )}

      {loadError && comments.length > 0 && (
        <p className="comment-error" role="alert">
          {loadError}
        </p>
      )}

      {nextCursor && !loading && (
        <button
          type="button"
          className="comment-more"
          onClick={loadEarlier}
          disabled={loadingMore}
        >
          {loadingMore ? "Loading earlier notes…" : "Load earlier notes"}
        </button>
      )}
    </section>
  );
};

export default CommentThread;
