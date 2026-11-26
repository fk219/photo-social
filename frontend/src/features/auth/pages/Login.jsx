import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../style/form.scss";
import { useAuth } from "../hooks/useAuth";
import { getErrorMessage } from "../../shared/utils/error";

const DEMO = {
  username: "demo_photo",
  password: "DemoPhotoSocial2026!",
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, handleLogin } = useAuth();

  const [form, setForm] = useState({ username: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [demoFilled, setDemoFilled] = useState(false);

  const redirectTo = location.state?.from?.pathname || "/";
  const notice = location.state?.notice;

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError("");
    setDemoFilled(false);
  };

  const validate = () => {
    const next = {};

    if (!form.username.trim()) next.username = "Enter your username.";
    if (!form.password) next.password = "Enter your password.";

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const fillDemo = () => {
    setForm(DEMO);
    setFieldErrors({});
    setError("");
    setDemoFilled(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!validate()) return;

    try {
      await handleLogin(form.username.trim(), form.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Could not sign in. Check your details and try again."
        )
      );
    }
  };

  return (
    <main className="auth-page" id="main-content">
      <div className="auth-shell">
        <Link to="/" className="auth-brand" aria-label="PhotoSocial home">
          PhotoSocial
        </Link>

        <section className="auth-card" aria-labelledby="login-title">
          <h1 id="login-title">Sign in</h1>
          <p className="auth-lede">
            Sign in to see posts and comments from the people you follow.
          </p>

          {notice && (
            <p className="form-notice" role="status">
              {notice}
            </p>
          )}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="login-username">Username</label>
              <input
                id="login-username"
                name="username"
                type="text"
                autoComplete="username"
                value={form.username}
                onChange={updateField("username")}
                placeholder="yourname"
                aria-invalid={Boolean(fieldErrors.username)}
                aria-describedby={
                  fieldErrors.username ? "login-username-error" : undefined
                }
                disabled={loading}
              />
              {fieldErrors.username && (
                <p className="field-error" id="login-username-error">
                  {fieldErrors.username}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={updateField("password")}
                placeholder="Your password"
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={
                  fieldErrors.password ? "login-password-error" : undefined
                }
                disabled={loading}
              />
              {fieldErrors.password && (
                <p className="field-error" id="login-password-error">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              className={`button primary-button auth-submit${
                loading ? " is-loading" : ""
              }`}
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="auth-demo">
            <div className="auth-demo-head">
              <p className="auth-demo-label">Demo account</p>
              <button
                type="button"
                className="quiet-button"
                onClick={fillDemo}
              >
                Use demo account
              </button>
            </div>
            <p className="auth-demo-creds">
              <code>{DEMO.username}</code>
              <span aria-hidden="true">/</span>
              <code>{DEMO.password}</code>
            </p>
            <p className="auth-demo-note">
              This account is shared by every visitor. Do not post private
              information with it.
            </p>
            <span className="sr-only" role="status">
              {demoFilled ? "Demo credentials filled into the form." : ""}
            </span>
          </div>
        </section>

        <p className="auth-switch">
          New to PhotoSocial?{" "}
          <Link to="/register" state={location.state}>
            Create an account
          </Link>
        </p>

        <nav className="auth-legal" aria-label="Legal">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </nav>
      </div>
    </main>
  );
};

export default Login;
