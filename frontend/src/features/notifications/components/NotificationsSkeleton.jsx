const NotificationsSkeleton = ({ count = 6 }) => (
  <div className="notifications-skeleton" role="status">
    <span className="sr-only">Loading notifications...</span>
    {Array.from({ length: count }).map((_, index) => (
      <div className="notification-skeleton-row" key={index} aria-hidden="true">
        <span className="notification-skeleton-avatar" />
        <span className="notification-skeleton-copy">
          <span className="notification-skeleton-line" />
          <span className="notification-skeleton-line notification-skeleton-line--short" />
        </span>
        <span className="notification-skeleton-thumb" />
      </div>
    ))}
  </div>
);

export default NotificationsSkeleton;
