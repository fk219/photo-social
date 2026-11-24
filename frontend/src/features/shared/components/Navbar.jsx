import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { useSocial } from "../../social/hooks/useSocial";
import Avatar from "./Avatar";
import { getUserAvatar } from "../utils/format";
import "../nav.scss";

const paths = {
  home: <path d="M4 11.2 12 4l8 7.2v8.1a1 1 0 0 1-1 1h-4.2v-5.6H9.2v5.6H5a1 1 0 0 1-1-1v-8.1Z" />,
  explore: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="m14.9 9.1-1.8 4-4 1.8 1.8-4 4-1.8Z" />
    </>
  ),
  create: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8.2v7.6M8.2 12h7.6" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8.4" r="3.6" />
      <path d="M4.8 20c.5-3.6 3.4-5.6 7.2-5.6s6.7 2 7.2 5.6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 3.8v2.1M12 18.1v2.1M4.7 12h2.1M17.2 12h2.1M6.8 6.8 8.3 8.3M15.7 15.7l1.5 1.5M17.2 6.8l-1.5 1.5M8.3 15.7l-1.5 1.5" />
    </>
  ),
  logout: (
    <>
      <path d="M14.2 8.2V5.6H5.4v12.8h8.8v-2.6" />
      <path d="M10.4 12h9.2M16.8 9l2.8 3-2.8 3" />
    </>
  ),
  messages: (
    <>
      <path d="M4 5.5h16v11H9l-5 4v-15Z" />
      <path d="M8 9h8M8 12.5h5.5" />
    </>
  ),
  notifications: (
    <>
      <path d="M6 17.5h12l-1.4-2.3V10a4.6 4.6 0 0 0-9.2 0v5.2L6 17.5Z" />
      <path d="M10 20.2a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.4" />
      <path d="m16 16 4.2 4.2" />
    </>
  ),
  bookmark: (
    <path d="M6.5 4h11v17l-5.5-3.8L6.5 21V4Z" />
  ),
};

const NavIcon = ({ name }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {paths[name]}
  </svg>
);

const Badge = ({ count }) => {
  if (!count) return null;

  return (
    <span className="nav-badge" aria-hidden="true">
      {count > 99 ? "99+" : count}
    </span>
  );
};

const AvatarMenu = ({ user, onLogout }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const username = user?.username || "";
  const displayName = user?.name?.trim() || username;

  useEffect(() => {
    if (!open) return undefined;

    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="topbar-avatar" ref={rootRef}>
      <button
        type="button"
        className="topbar-avatar-button"
        aria-label="Open your account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Avatar
          src={getUserAvatar(user)}
          name={displayName}
          className="avatar--nav"
        />
      </button>

      {open && (
        <div className="topbar-avatar-menu" role="menu">
          <div className="topbar-avatar-user">
            <strong>{displayName}</strong>
            <span>@{username}</span>
          </div>
          <Link
            to={`/u/${encodeURIComponent(username)}`}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
          <Link to="/saved" role="menuitem" onClick={() => setOpen(false)}>
            Saved
          </Link>
          <Link to="/settings" role="menuitem" onClick={() => setOpen(false)}>
            Settings
          </Link>
          <button type="button" role="menuitem" onClick={onLogout}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};

const SearchForm = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const submit = (event) => {
    event.preventDefault();
    const clean = query.trim();

    navigate(clean ? `/search?q=${encodeURIComponent(clean)}` : "/search");
    setQuery("");
  };

  return (
    <form className="topbar-search" role="search" onSubmit={submit}>
      <label htmlFor="topbar-search-input" className="sr-only">
        Search Mosaic
      </label>
      <NavIcon name="search" />
      <input
        id="topbar-search-input"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search"
        autoComplete="off"
      />
    </form>
  );
};

const Navbar = () => {
  const { user, initializing, handleLogout } = useAuth();
  const { unreadMessages, unreadNotifications } = useSocial();
  const navigate = useNavigate();
  const username = user?.username || "";

  const onLogout = () => {
    handleLogout();
    navigate("/login", { replace: true });
  };

  const memberLinks = [
    { to: "/", label: "Home", icon: "home", end: true },
    { to: "/explore", label: "Explore", icon: "explore" },
    {
      to: "/messages",
      label: "Messages",
      icon: "messages",
      badge: unreadMessages,
    },
    {
      to: "/notifications",
      label: "Notifications",
      icon: "notifications",
      badge: unreadNotifications,
    },
    { to: "/create-post", label: "Create", icon: "create" },
  ];

  const guestLinks = [
    { to: "/", label: "Home", icon: "home", end: true },
    { to: "/explore", label: "Explore", icon: "explore" },
    { to: "/search", label: "Search", icon: "search" },
  ];

  const dockLinks = user
    ? [
        { to: "/", label: "Home", icon: "home", end: true },
        { to: "/explore", label: "Explore", icon: "explore" },
        { to: "/create-post", label: "Create", icon: "create" },
        {
          to: "/messages",
          label: "Messages",
          icon: "messages",
          badge: unreadMessages,
        },
        {
          to: `/u/${encodeURIComponent(username)}`,
          label: "Profile",
          icon: "profile",
        },
      ]
    : initializing
      ? guestLinks
      : [
          { to: "/", label: "Home", icon: "home", end: true },
          { to: "/explore", label: "Explore", icon: "explore" },
          { to: "/search", label: "Search", icon: "search" },
          { to: "/login", label: "Sign in", icon: "profile" },
        ];

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand-wordmark" aria-label="Mosaic home">
            Mosaic
          </Link>

          <nav className="topbar-nav" aria-label="Primary">
            {(user ? memberLinks : guestLinks).map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `topbar-link${isActive ? " is-active" : ""}`
                }
              >
                <span className="topbar-icon-wrap">
                  <NavIcon name={link.icon} />
                  {link.badge ? <Badge count={link.badge} /> : null}
                </span>
                <span className="topbar-link-label">{link.label}</span>
                {link.badge ? (
                  <span className="sr-only">{link.badge} unread</span>
                ) : null}
              </NavLink>
            ))}
          </nav>

          <div className="topbar-right">
            {user ? (
              <>
                <SearchForm />
                <AvatarMenu user={user} onLogout={onLogout} />
              </>
            ) : initializing ? (
              <span className="topbar-loading" aria-hidden="true" />
            ) : (
              <div className="topbar-auth">
                <NavLink to="/login" className="topbar-auth-link">
                  Sign in
                </NavLink>
                <NavLink
                  to="/register"
                  className="topbar-auth-link topbar-auth-link--join"
                >
                  Create account
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </header>

      <header className="mobile-bar">
        <Link to="/" className="brand-wordmark" aria-label="Mosaic home">
          Mosaic
        </Link>

        <div className="mobile-bar-actions">
          <Link
            to="/search"
            className="mobile-icon-button"
            aria-label="Search"
          >
            <NavIcon name="search" />
          </Link>

          {user && (
            <Link
              to="/notifications"
              className="mobile-icon-button"
              aria-label="Notifications"
            >
              <NavIcon name="notifications" />
              <Badge count={unreadNotifications} />
            </Link>
          )}

          {initializing ? (
            <span className="mobile-bar-skeleton" aria-hidden="true" />
          ) : user ? (
            <>
              <Link
                to="/settings"
                className="mobile-icon-button"
                aria-label="Settings"
              >
                <NavIcon name="settings" />
              </Link>
              <button
                type="button"
                className="mobile-icon-button"
                onClick={onLogout}
                aria-label="Sign out"
              >
                <NavIcon name="logout" />
              </button>
            </>
          ) : (
            <Link to="/login" className="mobile-signin">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <nav className="mobile-dock" aria-label="Primary">
        {dockLinks.map((link) => (
          <NavLink
            key={link.label}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `dock-link${isActive ? " is-active" : ""}`
            }
          >
            <span className="dock-icon-wrap">
              <NavIcon name={link.icon} />
              {link.badge ? <Badge count={link.badge} /> : null}
            </span>
            <span>{link.label}</span>
          </NavLink>
        ))}
        {initializing && (
          <span className="dock-link dock-link--placeholder" aria-hidden="true">
            <span className="dock-skeleton-icon" />
            <span className="dock-skeleton-text" />
          </span>
        )}
      </nav>
    </>
  );
};

export default Navbar;
