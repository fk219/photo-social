import { Link } from "react-router-dom";

const LockIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <rect x="5" y="10" width="14" height="10" rx="2" />
    <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
  </svg>
);

const FeedTabs = ({ scope, signedIn }) => {
  const followingActive = scope === "following";
  const exploreActive = scope === "explore";

  return (
    <nav className="feed-tabs" aria-label="Feed view">
      <Link
        to={signedIn ? "/" : "/login"}
        state={signedIn ? undefined : { from: { pathname: "/" } }}
        className={`feed-tab${followingActive ? " is-active" : ""}`}
        aria-current={followingActive ? "page" : undefined}
      >
        {!signedIn && <LockIcon />}
        <span>Following</span>
        {!signedIn && <span className="sr-only"> (sign in required)</span>}
      </Link>

      <Link
        to="/explore"
        className={`feed-tab${exploreActive ? " is-active" : ""}`}
        aria-current={exploreActive ? "page" : undefined}
      >
        <span>Explore</span>
      </Link>
    </nav>
  );
};

export default FeedTabs;
