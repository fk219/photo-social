import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { getUserAvatar } from "../utils/format";
import Avatar from "./Avatar";
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
      <rect x="4" y="4" width="16" height="16" rx="2" />
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
};

const NavIcon = ({ name }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {paths[name]}
  </svg>
);

const Navbar = () => {
  const { user, initializing, handleLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const username = user?.username || "";
  const onLoginPage = location.pathname === "/login";
  const guestAction = onLoginPage
    ? { to: "/register", label: "Join" }
    : { to: "/login", label: "Sign in" };

  const onLogout = () => {
    handleLogout();
    navigate("/login", { replace: true });
  };

  const links = [
    { to: "/", label: "Home", icon: "home", end: true },
    { to: "/explore", label: "Explore", icon: "explore" },
    {
      to: "/create-post",
      label: "Create",
      icon: "create",
      emphasis: true,
    },
    ...(user
      ? [
          {
            to: `/u/${encodeURIComponent(username)}`,
            label: "Profile",
            icon: "profile",
          },
          {
            to: "/settings",
            label: "Settings",
            icon: "settings",
          },
        ]
      : []),
  ];

  return (
    <>
      <aside className="app-rail" aria-label="Mosaic">
        <Link to="/" className="rail-brand" aria-label="Mosaic home">
          <span className="rail-monogram" aria-hidden="true">
            M
          </span>
          <span className="rail-word">Mosaic</span>
        </Link>

        <nav className="rail-nav" aria-label="Primary">
          {links.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rail-link${isActive ? " is-active" : ""}${
                  link.emphasis ? " rail-link--create" : ""
                }`
              }
            >
              <NavIcon name={link.icon} />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="rail-foot">
          {initializing ? (
            <span className="rail-avatar-placeholder" aria-hidden="true" />
          ) : user ? (
            <>
              <Link
                to={`/u/${encodeURIComponent(username)}`}
                className="rail-viewer"
                aria-label={`Your portfolio, @${username}`}
              >
                <Avatar
                  src={getUserAvatar(user)}
                  name={username}
                  className="avatar--rail"
                />
                <span>@{username}</span>
              </Link>
              <button
                type="button"
                className="rail-logout"
                onClick={onLogout}
                aria-label="Log out"
              >
                <NavIcon name="logout" />
                <span>Log out</span>
              </button>
            </>
          ) : (
            <Link to={guestAction.to} className="rail-signin">
              {guestAction.label}
            </Link>
          )}
        </div>
      </aside>

      <header className="mobile-top">
        <Link to="/" className="mobile-brand" aria-label="Mosaic home">
          Mosaic
        </Link>
        <div className="mobile-top-actions">
          {initializing ? (
            <span className="rail-avatar-placeholder" aria-hidden="true" />
          ) : user ? (
            <>
              <Link
                to={`/u/${encodeURIComponent(username)}`}
                className="mobile-avatar-link"
                aria-label={`Your portfolio, @${username}`}
              >
                <Avatar
                  src={getUserAvatar(user)}
                  name={username}
                  className="avatar--rail"
                />
              </Link>
              <button
                type="button"
                className="mobile-logout"
                onClick={onLogout}
                aria-label="Log out"
              >
                <NavIcon name="logout" />
              </button>
            </>
          ) : (
            <Link to={guestAction.to} className="mobile-signin">
              {guestAction.label}
            </Link>
          )}
        </div>
      </header>

      <nav
        className={`mobile-dock${user ? "" : " mobile-dock--three"}`}
        aria-label="Primary"
      >
        {links.map((link) => (
          <NavLink
            key={link.label}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `dock-link${isActive ? " is-active" : ""}${
                link.emphasis ? " dock-link--create" : ""
              }`
            }
          >
            <NavIcon name={link.icon} />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
};

export default Navbar;
