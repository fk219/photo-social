import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Post from "./Post";
import "../style/post-modal.scss";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const PostModal = ({ post, onClose, onPostUpdate, onDeleted }) => {
  const [activePost, setActivePost] = useState(post);
  const frameRef = useRef(null);
  const closeRef = useRef(null);
  const triggerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    triggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    closeRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab" || !frameRef.current) return;

      const nodes = Array.from(
        frameRef.current.querySelectorAll(FOCUSABLE)
      ).filter((node) => node.getClientRects().length > 0);

      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !frameRef.current.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !frameRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      triggerRef.current?.focus?.();
    };
  }, []);

  const handlePostUpdate = useCallback(
    (patch) => {
      setActivePost((current) => (current ? { ...current, ...patch } : current));
      onPostUpdate?.(post._id, patch);
    },
    [onPostUpdate, post._id]
  );

  const handleDeleted = useCallback(() => {
    onDeleted?.(post._id);
    onCloseRef.current?.();
  }, [onDeleted, post._id]);

  const username = activePost?.user?.username || "unknown";

  return createPortal(
    <div className="post-modal">
      <div className="post-modal-scrim" onClick={() => onCloseRef.current?.()} />

      <div
        className="post-modal-frame"
        ref={frameRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Post by @${username}`}
      >
        <button
          type="button"
          ref={closeRef}
          className="post-modal-close"
          onClick={() => onCloseRef.current?.()}
          aria-label="Close post"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>

        <div className="post-modal-panel">
          <Post
            post={activePost}
            variant="modal"
            initialCommentsOpen
            onPostUpdate={handlePostUpdate}
            onDeleted={handleDeleted}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PostModal;
