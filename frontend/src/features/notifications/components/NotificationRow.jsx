import { useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "../../shared/components/Avatar";
import {
  formatFullDate,
  formatRelativeTime,
  getUserAvatar,
} from "../../shared/utils/format";
import NotificationIcon from "./NotificationIcon";
import {
  getNotificationAction,
  getNotificationTarget,
} from "./notificationCopy";

const ThumbnailGlyph = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="6" width="18" height="14" rx="2" />
    <circle cx="12" cy="13" r="3.2" />
    <path d="m8 6 1.4-2h5.2L16 6" />
  </svg>
);

const NotificationThumb = ({ post }) => {
  const [failed, setFailed] = useState(false);
  const image = post?.thumbnail_url || post?.image_url || "";

  return (
    <span className="notification-thumb" aria-hidden="true">
      {image && !failed ? (
        <img src={image} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="notification-thumb-fallback">
          <ThumbnailGlyph />
        </span>
      )}
    </span>
  );
};

const NotificationRow = ({ notification, onOpen }) => {
  const actor = notification?.actor ?? {};
  const username = actor.username || "unknown";
  const displayName = actor.name || username;
  const action = getNotificationAction(notification?.type);
  const commentText =
    typeof notification?.comment?.text === "string"
      ? notification.comment.text.trim()
      : "";
  const postedAt = formatRelativeTime(notification?.createdAt);
  const fullDate = formatFullDate(notification?.createdAt);

  return (
    <li>
      <Link
        to={getNotificationTarget(notification)}
        className={`notification-row${
          notification?.read ? "" : " is-unread"
        }`}
        onClick={() => onOpen?.(notification)}
      >
        <span className="notification-avatar">
          <Avatar
            src={getUserAvatar(actor)}
            name={displayName}
            className="avatar--notification"
          />
          <NotificationIcon type={notification?.type} />
        </span>

        <span className="notification-body">
          <span className="notification-line">
            <span className="notification-text">
              <strong>@{username}</strong> {action}
            </span>
            {postedAt && (
              <time
                className="notification-time"
                dateTime={notification.createdAt}
                title={fullDate || undefined}
              >
                {postedAt}
              </time>
            )}
          </span>

          {commentText && (
            <span className="notification-excerpt">"{commentText}"</span>
          )}
        </span>

        {notification?.post && (
          <NotificationThumb post={notification.post} />
        )}

        {!notification?.read && (
          <span className="sr-only">Unread notification</span>
        )}
      </Link>
    </li>
  );
};

export default NotificationRow;
