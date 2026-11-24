import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Avatar from "../../shared/components/Avatar";
import { getErrorMessage } from "../../shared/utils/error";
import {
  formatFullDate,
  formatRelativeTime,
  getUserAvatar,
} from "../../shared/utils/format";
import { deleteStory, markStorySeen } from "../services/stories.api";
import "../style/stories.scss";

const STORY_DURATION_MS = 5000;
const TICK_MS = 100;
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const cleanGroups = (groups = []) =>
  groups
    .filter((group) => Array.isArray(group?.stories) && group.stories.length > 0)
    .map((group) => ({
      ...group,
      stories: [...group.stories],
    }));

const StoryViewer = ({
  groups = [],
  initialGroupIndex = 0,
  onClose,
  onSeen,
  onDeleted,
}) => {
  const [viewGroups, setViewGroups] = useState(() => cleanGroups(groups));
  const [groupIndex, setGroupIndex] = useState(() => {
    const lastIndex = Math.max(0, cleanGroups(groups).length - 1);
    return Math.min(Math.max(0, initialGroupIndex), lastIndex);
  });
  const [storyIndex, setStoryIndex] = useState(0);
  const [restartKey, setRestartKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const [pointerDown, setPointerDown] = useState(false);
  const [hidden, setHidden] = useState(
    () => document.visibilityState === "hidden"
  );
  const [imageFailed, setImageFailed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const frameRef = useRef(null);
  const closeRef = useRef(null);
  const triggerRef = useRef(null);
  const elapsedRef = useRef(0);
  const lastTickRef = useRef(Date.now());
  const mountedRef = useRef(true);
  const onCloseRef = useRef(onClose);
  const onSeenRef = useRef(onSeen);
  const onDeletedRef = useRef(onDeleted);
  const goNextRef = useRef(null);
  const goPrevRef = useRef(null);

  onCloseRef.current = onClose;
  onSeenRef.current = onSeen;
  onDeletedRef.current = onDeleted;

  const group = viewGroups[groupIndex] ?? null;
  const story = group?.stories[storyIndex] ?? null;
  const storyKey = `${story?._id ?? "story"}-${groupIndex}-${storyIndex}-${restartKey}`;

  const username = group?.user?.username || "unknown";
  const displayName = group?.user?.name || username;
  const caption =
    typeof story?.caption === "string" ? story.caption.trim() : "";
  const postedAt = formatRelativeTime(story?.createdAt);
  const fullDate = formatFullDate(story?.createdAt);
  const isOwn = Boolean(story?.isMine || group?.isMine);
  const image = story?.image_url || story?.thumbnail_url || "";
  const paused = pointerDown || hidden || confirmDelete || deleting;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const goNext = useCallback(() => {
    const currentGroup = viewGroups[groupIndex];

    if (!currentGroup) {
      onCloseRef.current?.();
      return;
    }

    if (storyIndex + 1 < currentGroup.stories.length) {
      setStoryIndex(storyIndex + 1);
      return;
    }

    if (groupIndex + 1 < viewGroups.length) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
      return;
    }

    onCloseRef.current?.();
  }, [groupIndex, storyIndex, viewGroups]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
      return;
    }

    if (groupIndex > 0) {
      const previousGroup = viewGroups[groupIndex - 1];
      setGroupIndex(groupIndex - 1);
      setStoryIndex(Math.max(0, (previousGroup?.stories.length ?? 1) - 1));
      return;
    }

    setRestartKey((key) => key + 1);
  }, [groupIndex, storyIndex, viewGroups]);

  goNextRef.current = goNext;
  goPrevRef.current = goPrev;

  useEffect(() => {
    if (viewGroups.length === 0) onCloseRef.current?.();
  }, [viewGroups.length]);

  useEffect(() => {
    elapsedRef.current = 0;
    lastTickRef.current = Date.now();
    setProgress(0);
    setImageFailed(false);
    setConfirmDelete(false);
    setDeleteError("");
  }, [storyKey]);

  useEffect(() => {
    const onVisibilityChange = () => {
      setHidden(document.visibilityState === "hidden");
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!story?._id) return;

    setViewGroups((current) =>
      current.map((item, index) => {
        if (index !== groupIndex) return item;

        const stories = item.stories.map((entry) =>
          entry._id === story._id ? { ...entry, seen: true } : entry
        );

        return {
          ...item,
          stories,
          allSeen: stories.every((entry) => entry.seen),
        };
      })
    );

    onSeenRef.current?.(story._id);
    markStorySeen(story._id).catch(() => {
      // The story stays readable even when the seen receipt cannot save.
    });
  }, [story?._id, groupIndex]);

  useEffect(() => {
    if (!story || paused) return undefined;

    lastTickRef.current = Date.now();

    const timer = window.setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;

      lastTickRef.current = now;
      elapsedRef.current += delta;

      const nextProgress = Math.min(
        100,
        (elapsedRef.current / STORY_DURATION_MS) * 100
      );

      setProgress(nextProgress);

      if (nextProgress >= 100) {
        window.clearInterval(timer);
        goNextRef.current?.();
      }
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [storyKey, paused, story]);

  useEffect(() => {
    triggerRef.current =
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

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNextRef.current?.();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevRef.current?.();
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

  const removeStory = async () => {
    if (!story?._id || deleting) return;

    setDeleting(true);
    setDeleteError("");

    try {
      await deleteStory(story._id);

      if (!mountedRef.current) return;

      onDeletedRef.current?.(story._id);
      window.dispatchEvent(new Event("mosaic:stories-changed"));

      const nextGroups = viewGroups
        .map((item, index) =>
          index === groupIndex
            ? {
                ...item,
                stories: item.stories.filter(
                  (entry) => entry._id !== story._id
                ),
              }
            : item
        )
        .filter((item) => item.stories.length > 0);

      if (nextGroups.length === 0) {
        onCloseRef.current?.();
        return;
      }

      const currentGroup = nextGroups[groupIndex];

      setViewGroups(nextGroups);

      if (currentGroup) {
        setStoryIndex(Math.min(storyIndex, currentGroup.stories.length - 1));
      } else {
        setGroupIndex(Math.min(groupIndex, nextGroups.length - 1));
        setStoryIndex(0);
      }

      setConfirmDelete(false);
    } catch (err) {
      if (mountedRef.current) {
        setDeleteError(
          getErrorMessage(err, "This story could not be deleted. Try again.")
        );
      }
    } finally {
      if (mountedRef.current) setDeleting(false);
    }
  };

  if (!story || !group) return null;

  return createPortal(
    <div
      className="story-viewer"
      onPointerDown={() => setPointerDown(true)}
      onPointerUp={() => setPointerDown(false)}
      onPointerCancel={() => setPointerDown(false)}
      onPointerLeave={() => setPointerDown(false)}
    >
      <div
        className="story-viewer-frame"
        ref={frameRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Stories from ${displayName}`}
      >
        <div className="story-viewer-top">
          <div className="story-progress" aria-hidden="true">
            {group.stories.map((entry, index) => (
              <span className="story-progress-track" key={entry._id}>
                <span
                  className="story-progress-fill"
                  style={{
                    width:
                      index < storyIndex
                        ? "100%"
                        : index === storyIndex
                          ? `${progress}%`
                          : "0%",
                  }}
                />
              </span>
            ))}
          </div>

          <header className="story-viewer-head">
            <Avatar
              src={getUserAvatar(group.user)}
              name={displayName}
              className="avatar--story"
            />

            <div className="story-viewer-person">
              <h2 className="story-viewer-name">{displayName}</h2>
              {postedAt && (
                <time
                  className="story-viewer-time"
                  dateTime={story.createdAt}
                  title={fullDate || undefined}
                >
                  {postedAt}
                </time>
              )}
            </div>

            {isOwn && (
              <button
                type="button"
                className="story-delete-trigger"
                onClick={() => {
                  setConfirmDelete(true);
                  setDeleteError("");
                }}
                aria-label="Delete this story"
              >
                Delete
              </button>
            )}

            <button
              type="button"
              ref={closeRef}
              className="story-viewer-close"
              onClick={() => onCloseRef.current?.()}
              aria-label="Close stories"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </header>

          {confirmDelete && (
            <div className="story-delete-confirm" role="group" aria-label="Confirm delete">
              <p>Delete this story?</p>
              <div className="story-delete-actions">
                <button
                  type="button"
                  className="story-confirm-delete"
                  onClick={removeStory}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete story"}
                </button>
                <button
                  type="button"
                  className="story-confirm-cancel"
                  onClick={() => {
                    setConfirmDelete(false);
                    setDeleteError("");
                  }}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
              {deleteError && (
                <p className="story-delete-error" role="alert">
                  {deleteError}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="story-viewer-stage">
          {image && !imageFailed && (
            <span
              className="story-viewer-backdrop"
              style={{ backgroundImage: `url("${image}")` }}
              aria-hidden="true"
            />
          )}

          {image && !imageFailed ? (
            <img
              className="story-viewer-image"
              src={image}
              alt={
                caption
                  ? `Story photo: ${caption.slice(0, 120)}`
                  : `Story photo from ${displayName}`
              }
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="story-viewer-fallback" role="img" aria-label="Story photo unavailable">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="6" width="18" height="14" rx="2" />
                <circle cx="12" cy="13" r="3.2" />
                <path d="m8 6 1.4-2h5.2L16 6" />
              </svg>
              <span>Story photo unavailable</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="story-zone story-zone--prev"
          onClick={goPrev}
          disabled={deleting}
          aria-label="Previous story"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>

        <button
          type="button"
          className="story-zone story-zone--next"
          onClick={goNext}
          disabled={deleting}
          aria-label="Next story"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 5 7 7-7 7" />
          </svg>
        </button>

        {caption && (
          <div className="story-viewer-caption">
            <p>{caption}</p>
          </div>
        )}

        <p className="sr-only" aria-live="polite">
          Story {storyIndex + 1} of {group.stories.length} from {displayName}
        </p>
      </div>
    </div>,
    document.body
  );
};

export default StoryViewer;
