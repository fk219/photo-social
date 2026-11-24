const glyphs = {
  like: (
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
  ),
  comment: (
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
  ),
  reply: (
    <>
      <path d="M9 8 4 12l5 4" />
      <path d="M4 12h9a6 6 0 0 1 6 6v1" />
    </>
  ),
  follow: (
    <>
      <circle cx="9.5" cy="8.5" r="3.2" />
      <path d="M3.5 19.5c.4-3.4 2.9-5.3 6-5.3 1.4 0 2.7.4 3.7 1.2" />
      <path d="M18 9v6M15 12h6" />
    </>
  ),
  mention: (
    <path d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm0 0v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-4 7.5" />
  ),
};

const NotificationIcon = ({ type }) => (
  <span className={`notification-badge notification-badge--${type}`} aria-hidden="true">
    <svg viewBox="0 0 24 24">{glyphs[type] ?? glyphs.like}</svg>
  </span>
);

export default NotificationIcon;
