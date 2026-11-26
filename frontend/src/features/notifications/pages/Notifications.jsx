import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getErrorMessage } from "../../shared/utils/error";
import { requestUnreadRefresh } from "../../social/social.context";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications.api";
import NotificationRow from "../components/NotificationRow";
import NotificationsSkeleton from "../components/NotificationsSkeleton";
import { groupNotifications } from "../components/notificationGroups";
import "../style/notifications.scss";

const PAGE_SIZE = 20;

const timeOf = (value) => {
  if (!value) return 0;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const sortNewest = (notifications) =>
  [...notifications].sort(
    (a, b) => timeOf(b?.createdAt) - timeOf(a?.createdAt)
  );

const Notifications = () => {
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const [actionError, setActionError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const mountedRef = useRef(true);
  const markingRef = useRef(new Set());

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    setStatus("loading");
    setError("");
    setLoadMoreError("");

    getNotifications({ limit: PAGE_SIZE })
      .then((data) => {
        if (!active) return;

        setItems(
          sortNewest(
            Array.isArray(data?.notifications) ? data.notifications : []
          )
        );
        setNextCursor(data?.nextCursor ?? null);
        setUnreadCount(Math.max(0, Number(data?.unreadCount) || 0));
        setStatus("ready");
      })
      .catch((err) => {
        if (!active) return;

        setError(
          getErrorMessage(
            err,
            "Your notifications could not be loaded. Try again."
          )
        );
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const markAllRead = async () => {
    if (markingAll || unreadCount <= 0) return;

    setMarkingAll(true);
    setActionError("");

    try {
      await markAllNotificationsRead();

      if (!mountedRef.current) return;

      setItems((current) =>
        current.map((notification) => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
      requestUnreadRefresh();
    } catch (err) {
      if (mountedRef.current) {
        setActionError(
          getErrorMessage(
            err,
            "Notifications could not all be marked as read."
          )
        );
      }
    } finally {
      if (mountedRef.current) setMarkingAll(false);
    }
  };

  const handleOpen = (notification) => {
    const id = notification?._id;

    if (!id || notification.read || markingRef.current.has(id)) return;

    markingRef.current.add(id);
    setItems((current) =>
      current.map((item) =>
        item._id === id ? { ...item, read: true } : item
      )
    );
    setUnreadCount((current) => Math.max(0, current - 1));

    markNotificationRead(id)
      .then(() => {
        if (mountedRef.current) requestUnreadRefresh();
      })
      .catch((err) => {
        if (!mountedRef.current) return;

        setItems((current) =>
          current.map((item) =>
            item._id === id ? { ...item, read: false } : item
          )
        );
        setUnreadCount((current) => current + 1);
        setActionError(
          getErrorMessage(
            err,
            "That notification could not be marked as read."
          )
        );
      })
      .finally(() => {
        markingRef.current.delete(id);
      });
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    setLoadMoreError("");

    try {
      const data = await getNotifications({
        cursor: nextCursor,
        limit: PAGE_SIZE,
      });

      if (!mountedRef.current) return;

      const incoming = Array.isArray(data?.notifications)
        ? data.notifications
        : [];

      setItems((current) => {
        const seen = new Set(current.map((item) => item._id));
        return sortNewest([
          ...current,
          ...incoming.filter((item) => !seen.has(item._id)),
        ]);
      });
      setNextCursor(data?.nextCursor ?? null);

      if (typeof data?.unreadCount === "number") {
        setUnreadCount(Math.max(0, data.unreadCount));
      }
    } catch (err) {
      if (mountedRef.current) {
        setLoadMoreError(
          getErrorMessage(err, "More notifications could not be loaded.")
        );
      }
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  };

  const groups = groupNotifications(items);
  const isInitialLoading = status === "loading" && items.length === 0;
  const isInitialError = status === "error" && items.length === 0;

  return (
    <main className="notifications-page" id="main-content">
      <div className="page-shell page-shell--notifications">
        <header className="notifications-head">
          <div className="notifications-heading">
            <h1>Notifications</h1>
            {unreadCount > 0 && (
              <span className="notifications-count" aria-live="polite">
                {unreadCount} unread
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              className="quiet-button notifications-mark-all"
              onClick={markAllRead}
              disabled={markingAll}
              aria-busy={markingAll}
            >
              {markingAll ? "Marking..." : "Mark all as read"}
            </button>
          )}
        </header>

        {actionError && (
          <div className="notifications-action-error" role="alert">
            <p>{actionError}</p>
            <button
              type="button"
              className="quiet-button"
              onClick={() => setActionError("")}
            >
              Dismiss
            </button>
          </div>
        )}

        {error && items.length > 0 && (
          <div className="notifications-action-error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="quiet-button"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Try again
            </button>
          </div>
        )}

        {isInitialLoading ? (
          <NotificationsSkeleton />
        ) : isInitialError ? (
          <section className="notifications-state" role="alert">
            <h2>Notifications unavailable</h2>
            <p>{error}</p>
            <button
              type="button"
              className="button primary-button"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Try again
            </button>
          </section>
        ) : items.length === 0 ? (
          <section className="notifications-state" aria-labelledby="notifications-empty-title">
            <span className="notifications-empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-2 7-2 8.5h16C20 15 18 15 18 8Z" />
                <path d="M10 20a2.2 2.2 0 0 0 4 0" />
              </svg>
            </span>
            <h2 id="notifications-empty-title">No notifications yet</h2>
            <p>
              Likes, comments, replies, mentions and new followers will appear
              here as they happen.
            </p>
            <Link to="/explore" className="button secondary-button">
              Explore PhotoSocial
            </Link>
          </section>
        ) : (
          <div className="notifications-groups">
            {groups.map((group) => (
              <section
                className="notifications-group"
                key={group.key}
                aria-labelledby={`notifications-${group.key}`}
              >
                <h2
                  className="notifications-group-title"
                  id={`notifications-${group.key}`}
                >
                  {group.label}
                </h2>

                <ul className="notifications-list">
                  {group.items.map((notification) => (
                    <NotificationRow
                      key={notification._id}
                      notification={notification}
                      onOpen={handleOpen}
                    />
                  ))}
                </ul>
              </section>
            ))}

            <div className="notifications-more">
              {loadMoreError && (
                <p className="notifications-inline-error" role="alert">
                  {loadMoreError}
                </p>
              )}

              {nextCursor && (
                <button
                  type="button"
                  className="button secondary-button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  aria-busy={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      Loading...
                    </>
                  ) : (
                    "Load more notifications"
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default Notifications;
