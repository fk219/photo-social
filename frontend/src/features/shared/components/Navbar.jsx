import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { getUserAvatar } from "../utils/format";
import Avatar from "./Avatar";
import "../nav.scss";

const navLinkClass = ({ isActive }) => `nav-icon${isActive ? " is-active" : ""}`;

const Navbar = () => {
  const { user, handleLogout } = useAuth();
  const navigate = useNavigate();
  const username = user?.username || "member";

  const onLogout = () => {
    handleLogout();
    navigate("/login", { replace: true });
  };

  return (
    <nav className="navbar" aria-label="Primary">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" aria-label="Insta Journal home">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Insta</span>
          <span className="brand-tag" aria-hidden="true">
            Photo journal
          </span>
        </Link>

        <div className="navbar-actions">
          <NavLink to="/" end className={navLinkClass} aria-label="Feed">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 10.8 12 3l9 7.8" />
              <path d="M5.4 9.4V20a1 1 0 0 0 1 1h3.4v-5.4h4.4V21h3.4a1 1 0 0 0 1-1V9.4" />
            </svg>
          </NavLink>

          <NavLink
            to="/create-post"
            className={navLinkClass}
            aria-label="Add a frame"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </NavLink>

          {user ? (
            <div className="nav-user">
              <Avatar
                src={getUserAvatar(user)}
                name={username}
                className="avatar--nav"
              />
              <span className="nav-user-name">@{username}</span>
              <button
                type="button"
                className="logout-button"
                onClick={onLogout}
                aria-label="Log out"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M14 8V5H5v14h9v-3" />
                  <path d="M10 12h10" />
                  <path d="m17 9 3 3-3 3" />
                </svg>
                <span>Log out</span>
              </button>
            </div>
          ) : (
            <Link to="/login" className="navbar-signin">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
