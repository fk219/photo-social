import { useCallback, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import "../style/modal.scss";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const AppModal = ({
  title,
  description,
  onClose,
  children,
  className = "",
  size = "md",
  closeLabel = "Close dialog",
}) => {
  const frameRef = useRef(null);
  const closeRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar =
      window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    closeRef.current?.focus();

    const onKeyDown = (event) => {
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

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      trigger?.focus?.();
    };
  }, []);

  const stop = useCallback((event) => event.stopPropagation(), []);

  return createPortal(
    <div className={`app-modal app-modal--${size}`}>
      <div
        className="app-modal-scrim"
        onClick={() => onCloseRef.current?.()}
        aria-hidden="true"
      />
      <div
        className={`app-modal-frame ${className}`.trim()}
        ref={frameRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        aria-label={title ? undefined : closeLabel}
        onClick={stop}
      >
        <div className="app-modal-head">
          <div>
            {title && (
              <h2 className="app-modal-title" id={titleId}>
                {title}
              </h2>
            )}
            {description && (
              <p className="app-modal-description" id={descriptionId}>
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            ref={closeRef}
            className="app-modal-close"
            onClick={() => onCloseRef.current?.()}
            aria-label={closeLabel}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="app-modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default AppModal;
