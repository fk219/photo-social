import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
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
};

const NavIcon = ({ name }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {paths[name]}
  </svg>
);

const Navbar = () => {
  const { user, initializing, handleLogout } = useAuth();
  const navigate = useNavigate();
  const username = user?.username || "";

  const onLogout = () => {
    handleLogout();
    navigate("/login", { replace: true });
  };

  const baseLinks = [
    { to: "/", label: "Home", icon: "home", end: true },
    { to: "/explore", label: "Explore", icon: "explore" },
    { to: "/create-post", label: "Create", icon: "create" },
  ];

  const navLinks = user
    ? [
        ...baseLinks,
        {
          to: `/u/${encodeURIComponent(username)}`,
          label: "Profile",
          icon: "profile",
        },
        { to: "/settings", label: "Settings", icon: "settings" },
      ]
    : baseLinks;

  const dockLinks = user
    ? [
        ...baseLinks,
        {
          to: `/u/${encodeURIComponent(username)}`,
          label: "Profile",
          icon: "profile",
        },
      ]
    : initializing
      ? baseLinks
      : [
          { to: "/", label: "Home", icon: "home", end: true },
          { to: "/explore", label: "Explore", icon: "explore" },
          { to: "/login", label: "Sign in", icon: "profile" },
          { to: "/register", label: "Join", icon: "create" },
        ];

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand-wordmark" aria-label="Mosaic home">
            Mosaic
          </Link>

          <nav className="topbar-nav" aria-label="Primary">
            {navLinks.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `topbar-link${isActive ? " is-active" : ""}`
                }
              >
                <NavIcon name={link.icon} />
                <span>{link.label}</span>
              </NavLink>
            ))}

            {initializing ? (
              <span className="topbar-loading" aria-hidden="true" />
            ) : user ? (
              <button
                type="button"
                className="topbar-link topbar-signout"
                onClick={onLogout}
              >
                <NavIcon name="logout" />
                <span>Sign out</span>
              </button>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    `topbar-link${isActive ? " is-active" : ""}`
                  }
                >
                  <span>Sign in</span>
                </NavLink>
                <NavLink
                  to="/register"
                  className={({ isActive }) =>
                    `topbar-link topbar-link--join${
                      isActive ? " is-active" : ""
                    }`
                  }
                >
                  <span>Create account</span>
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <header className="mobile-bar">
        <Link to="/" className="brand-wordmark" aria-label="Mosaic home">
          Mosaic
        </Link>

        <div className="mobile-bar-actions">
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
            <NavIcon name={link.icon} />
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
