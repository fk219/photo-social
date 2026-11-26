import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import Avatar from "../../shared/components/Avatar";
import { getErrorMessage } from "../../shared/utils/error";
import { formatLongDate, getUserAvatar } from "../../shared/utils/format";
import {
  changePassword,
  deleteAccount,
  exportAccount,
} from "../services/settings.api";
import {
  getBlockedUsers,
  unblockUser,
} from "../../users/services/user.api";
import "../style/settings.scss";

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;
const DELETE_CONFIRMATION = "DELETE";
const DEMO_EMAIL = "demo@photosocial.local";

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const readExportError = async (error) => {
  const data = error?.response?.data;

  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      if (typeof parsed?.message === "string" && parsed.message.trim()) {
        return parsed.message;
      }
    } catch {
      // Fall back to the generic message below.
    }
  }

  return getErrorMessage(
    error,
    "Your export could not be prepared. Try again."
  );
};

const Settings = () => {
  const navigate = useNavigate();
  const { user, handleLogout } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let active = true;

    getBlockedUsers()
      .then((data) => {
        if (active) {
          setBlockedUsers(Array.isArray(data?.users) ? data.users : []);
        }
      })
      .catch((error) => {
        if (active) {
          setBlockedError(
            getErrorMessage(error, "Blocked accounts could not be loaded.")
          );
        }
      })
      .finally(() => {
        if (active) setBlockedLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleUnblock = async (blockedUsername) => {
    if (unblocking) return;

    setUnblocking(blockedUsername);
    setBlockedError("");

    try {
      await unblockUser(blockedUsername);
      setBlockedUsers((current) =>
        current.filter((entry) => entry.username !== blockedUsername)
      );
    } catch (error) {
      setBlockedError(
        getErrorMessage(error, "That account could not be unblocked.")
      );
    } finally {
      setUnblocking("");
    }
  };

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exported, setExported] = useState(false);

  const [deleteForm, setDeleteForm] = useState({
    password: "",
    confirmation: "",
  });
  const [deleteErrors, setDeleteErrors] = useState({});
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockedLoading, setBlockedLoading] = useState(true);
  const [blockedError, setBlockedError] = useState("");
  const [unblocking, setUnblocking] = useState("");

  const username = user?.username ?? "";
  const displayName = user?.name?.trim() || username;
  const joined = formatLongDate(user?.createdAt) || "Not recorded";
  const bio = user?.bio?.trim() || "No bio yet.";
  const isDemoAccount =
    String(user?.email ?? "").trim().toLowerCase() === DEMO_EMAIL;

  const updatePasswordField = (field) => (event) => {
    setPasswordForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
    setPasswordErrors((current) => ({ ...current, [field]: undefined }));
    setPasswordError("");
  };

  const validatePasswordForm = () => {
    const next = {};

    if (!passwordForm.currentPassword) {
      next.currentPassword = "Enter your current password.";
    }

    if (!passwordForm.newPassword) {
      next.newPassword = "Choose a new password.";
    } else if (passwordForm.newPassword.length < PASSWORD_MIN) {
      next.newPassword = `Use at least ${PASSWORD_MIN} characters.`;
    } else if (passwordForm.newPassword.length > PASSWORD_MAX) {
      next.newPassword = `Use ${PASSWORD_MAX} characters or fewer.`;
    }

    if (!passwordForm.confirmPassword) {
      next.confirmPassword = "Confirm the new password.";
    } else if (
      passwordForm.confirmPassword !== passwordForm.newPassword
    ) {
      next.confirmPassword = "The passwords do not match.";
    }

    setPasswordErrors(next);
    return Object.keys(next).length === 0;
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError("");

    if (!validatePasswordForm()) return;

    setChangingPassword(true);

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setChangingPassword(false);
      handleLogout();
      navigate("/login", {
        replace: true,
        state: {
          notice:
            "Password changed. All sessions were signed out. Sign in again with your new password.",
        },
      });
    } catch (error) {
      setChangingPassword(false);
      setPasswordError(
        getErrorMessage(
          error,
          "Your password could not be changed. Try again."
        )
      );
    }
  };

  const handleExport = async () => {
    if (exporting) return;

    setExporting(true);
    setExportError("");
    setExported(false);

    try {
      const response = await exportAccount();
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([JSON.stringify(response.data)], {
              type: "application/json",
            });

      downloadBlob(blob, `photosocial-export-${username || "account"}.json`);
      setExported(true);
    } catch (error) {
      setExportError(await readExportError(error));
    } finally {
      setExporting(false);
    }
  };

  const updateDeleteField = (field) => (event) => {
    setDeleteForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
    setDeleteErrors((current) => ({ ...current, [field]: undefined }));
    setDeleteError("");
  };

  const validateDeleteForm = () => {
    const next = {};

    if (!deleteForm.password) {
      next.password = "Enter your password.";
    }

    if (deleteForm.confirmation.trim() !== DELETE_CONFIRMATION) {
      next.confirmation = "Type DELETE to confirm.";
    }

    setDeleteErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleDeleteSubmit = async (event) => {
    event.preventDefault();
    setDeleteError("");

    if (!validateDeleteForm()) return;

    setDeleting(true);

    try {
      await deleteAccount(deleteForm.password);
      setDeleting(false);
      handleLogout();
      navigate("/login", {
        replace: true,
        state: {
          notice:
            "Your account and PhotoSocial records were deleted. ImageKit image files may remain. You have been signed out.",
        },
      });
    } catch (error) {
      setDeleting(false);
      setDeleteError(
        getErrorMessage(
          error,
          "Your account could not be deleted. Try again."
        )
      );
    }
  };

  return (
    <main className="settings-page" id="main-content">
      <div className="page-shell page-shell--settings">
        <header className="settings-header">
          <div>
            <h1>Settings</h1>
            <p>Manage your account, password and data.</p>
          </div>

          <Link
            to={`/u/${encodeURIComponent(username)}`}
            className="settings-profile"
          >
            <Avatar
              src={getUserAvatar(user)}
              name={displayName}
              className="avatar--settings"
            />
            <span>{displayName}</span>
          </Link>
        </header>

        <section
          id="account"
          className="settings-card"
          aria-labelledby="settings-account-title"
        >
          <h2 id="settings-account-title">Account</h2>

          <dl className="settings-facts">
            <div>
              <dt>Name</dt>
              <dd>{displayName}</dd>
            </div>
            <div>
              <dt>Username</dt>
              <dd>@{username}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user?.email || "Not set"}</dd>
            </div>
            <div>
              <dt>Bio</dt>
              <dd>{bio}</dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>{joined}</dd>
            </div>
          </dl>

          <p className="settings-note">
            Your bio and profile image are edited on your profile.
          </p>

          <Link
            to={`/u/${encodeURIComponent(username)}`}
            className="button secondary-button"
          >
            View profile
          </Link>
        </section>

        <section
          id="password"
          className="settings-card"
          aria-labelledby="settings-password-title"
        >
          <div className="settings-card-head">
            <h2 id="settings-password-title">Change password</h2>
            {isDemoAccount && (
              <span className="settings-badge">Demo account</span>
            )}
          </div>

          {isDemoAccount ? (
            <div className="settings-note-block">
              <p>
                The shared demo account uses a generated password to stay
                available to every visitor, so its password cannot be changed
                here. Sign in with the demo credentials to explore PhotoSocial.
              </p>
            </div>
          ) : (
            <>
              <p className="settings-note">
                Every current session is signed out after a password change.
              </p>

              {passwordError && (
                <p className="form-error" role="alert">
                  {passwordError}
                </p>
              )}

              <form
                className="settings-form"
                onSubmit={handlePasswordSubmit}
                noValidate
              >
                <div className="field">
                  <label htmlFor="settings-current-password">
                    Current password
                  </label>
                  <input
                    id="settings-current-password"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    value={passwordForm.currentPassword}
                    onChange={updatePasswordField("currentPassword")}
                    placeholder="Your current password"
                    aria-invalid={Boolean(passwordErrors.currentPassword)}
                    aria-describedby={
                      passwordErrors.currentPassword
                        ? "settings-current-password-error"
                        : undefined
                    }
                    disabled={changingPassword}
                  />
                  {passwordErrors.currentPassword && (
                    <p
                      className="field-error"
                      id="settings-current-password-error"
                    >
                      {passwordErrors.currentPassword}
                    </p>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="settings-new-password">New password</label>
                  <input
                    id="settings-new-password"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.newPassword}
                    onChange={updatePasswordField("newPassword")}
                    placeholder="At least 8 characters"
                    aria-invalid={Boolean(passwordErrors.newPassword)}
                    aria-describedby={
                      passwordErrors.newPassword
                        ? "settings-new-password-error"
                        : "settings-new-password-hint"
                    }
                    disabled={changingPassword}
                  />
                  {passwordErrors.newPassword ? (
                    <p
                      className="field-error"
                      id="settings-new-password-error"
                    >
                      {passwordErrors.newPassword}
                    </p>
                  ) : (
                    <p className="field-hint" id="settings-new-password-hint">
                      Use 8 to 72 characters.
                    </p>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="settings-confirm-password">
                    Confirm new password
                  </label>
                  <input
                    id="settings-confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.confirmPassword}
                    onChange={updatePasswordField("confirmPassword")}
                    placeholder="Repeat the new password"
                    aria-invalid={Boolean(passwordErrors.confirmPassword)}
                    aria-describedby={
                      passwordErrors.confirmPassword
                        ? "settings-confirm-password-error"
                        : undefined
                    }
                    disabled={changingPassword}
                  />
                  {passwordErrors.confirmPassword && (
                    <p
                      className="field-error"
                      id="settings-confirm-password-error"
                    >
                      {passwordErrors.confirmPassword}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className={`button primary-button settings-submit${
                    changingPassword ? " is-loading" : ""
                  }`}
                  disabled={changingPassword}
                  aria-busy={changingPassword}
                >
                  {changingPassword ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      Updating password...
                    </>
                  ) : (
                    "Update password"
                  )}
                </button>
              </form>
            </>
          )}
        </section>

        <section
          id="data"
          className="settings-card"
          aria-labelledby="settings-data-title"
        >
          <h2 id="settings-data-title">Your data</h2>

          <p className="settings-note">
            Download a JSON file with your account, posts, comments, likes,
            messages, notifications, saves, stories and follow relationships.
            Password hashes are never included.
          </p>

          <div className="settings-actions">
            <button
              type="button"
              className={`button secondary-button settings-export${
                exporting ? " is-loading" : ""
              }`}
              onClick={handleExport}
              disabled={exporting}
              aria-busy={exporting}
            >
              {exporting ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Preparing export...
                </>
              ) : (
                "Export account data"
              )}
            </button>
          </div>

          {exportError && (
            <p className="form-error" role="alert">
              {exportError}
            </p>
          )}

          <p className="settings-feedback" role="status" aria-live="polite">
            {exported ? "Your export downloaded." : ""}
          </p>

          <p className="settings-note">
            Read the <Link to="/privacy">Privacy policy</Link> and the{" "}
            <Link to="/terms">Terms of use</Link>.
          </p>
        </section>

        <section
          id="blocked"
          className="settings-card"
          aria-labelledby="settings-blocked-title"
        >
          <h2 id="settings-blocked-title">Blocked accounts</h2>

          <p className="settings-note">
            Blocked accounts cannot follow you, message you or see your posts
            while signed in.
          </p>

          {blockedError && (
            <p className="form-error" role="alert">
              {blockedError}
            </p>
          )}

          {blockedLoading ? (
            <p className="settings-feedback" role="status">
              Loading blocked accounts...
            </p>
          ) : blockedUsers.length === 0 ? (
            <p className="settings-feedback">You have not blocked anyone.</p>
          ) : (
            <ul className="settings-blocked-list">
              {blockedUsers.map((blocked) => (
                <li key={blocked.username}>
                  <Avatar
                    src={blocked.profile_image}
                    name={blocked.name || blocked.username}
                    className="avatar--settings-row"
                  />
                  <span className="settings-blocked-copy">
                    <strong>{blocked.name || blocked.username}</strong>
                    <small>@{blocked.username}</small>
                  </span>
                  <button
                    type="button"
                    className="button secondary-button button--small"
                    onClick={() => handleUnblock(blocked.username)}
                    disabled={unblocking === blocked.username}
                  >
                    {unblocking === blocked.username
                      ? "Unblocking..."
                      : "Unblock"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          id="danger"
          className="settings-card settings-card--danger"
          aria-labelledby="settings-danger-title"
        >
          <div className="settings-card-head">
            <h2 id="settings-danger-title">Delete account</h2>
            {isDemoAccount && (
              <span className="settings-badge settings-badge--danger">
                Protected
              </span>
            )}
          </div>

          {isDemoAccount ? (
            <div className="settings-note-block settings-note-block--danger">
              <p>
                The shared demo account cannot be deleted, so its records stay
                in place for other visitors. Create your own account to try
                account deletion.
              </p>
              <Link to="/register" className="text-link">
                Create your own account
              </Link>
            </div>
          ) : (
            <>
              <div
                className="settings-danger-intro"
                id="settings-danger-warning"
              >
                <p>
                  Deleting your account removes your profile, posts, comments,
                  likes and follow relationships from PhotoSocial. Your sessions end
                  immediately. This cannot be undone.
                </p>
                <p>
                  Image files stored in ImageKit are not deleted. They may
                  remain available at their URLs.
                </p>
              </div>

              {deleteError && (
                <p className="form-error" role="alert">
                  {deleteError}
                </p>
              )}

              <form
                className="settings-form settings-delete-form"
                onSubmit={handleDeleteSubmit}
                aria-describedby="settings-danger-warning"
                noValidate
              >
                <div className="settings-delete-fields">
                  <div className="field">
                    <label htmlFor="settings-delete-password">Password</label>
                    <input
                      id="settings-delete-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      value={deleteForm.password}
                      onChange={updateDeleteField("password")}
                      placeholder="Confirm with your password"
                      aria-invalid={Boolean(deleteErrors.password)}
                      aria-describedby={
                        deleteErrors.password
                          ? "settings-delete-password-error"
                          : undefined
                      }
                      disabled={deleting}
                    />
                    {deleteErrors.password && (
                      <p
                        className="field-error"
                        id="settings-delete-password-error"
                      >
                        {deleteErrors.password}
                      </p>
                    )}
                  </div>

                  <div className="field">
                    <label htmlFor="settings-delete-confirmation">
                      Type DELETE to confirm
                    </label>
                    <input
                      id="settings-delete-confirmation"
                      name="confirmation"
                      type="text"
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      value={deleteForm.confirmation}
                      onChange={updateDeleteField("confirmation")}
                      placeholder="DELETE"
                      aria-invalid={Boolean(deleteErrors.confirmation)}
                      aria-describedby={
                        deleteErrors.confirmation
                          ? "settings-delete-confirmation-error"
                          : "settings-delete-confirmation-hint"
                      }
                      disabled={deleting}
                    />
                    {deleteErrors.confirmation ? (
                      <p
                        className="field-error"
                        id="settings-delete-confirmation-error"
                      >
                        {deleteErrors.confirmation}
                      </p>
                    ) : (
                      <p
                        className="field-hint"
                        id="settings-delete-confirmation-hint"
                      >
                        This must be the word DELETE in capitals.
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className={`button danger-button settings-danger-button${
                    deleting ? " is-loading" : ""
                  }`}
                  disabled={deleting}
                  aria-busy={deleting}
                >
                  {deleting ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      Deleting account...
                    </>
                  ) : (
                    "Delete account"
                  )}
                </button>
              </form>
            </>
          )}
        </section>

        <footer className="settings-footer">
          <p>PhotoSocial</p>
          <nav aria-label="PhotoSocial">
            <Link to="/explore">Explore</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </nav>
        </footer>
      </div>
    </main>
  );
};

export default Settings;
