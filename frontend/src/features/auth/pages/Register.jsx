import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../style/form.scss";
import { useAuth } from "../hooks/useAuth";
import { getErrorMessage } from "../../shared/utils/error";

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, handleRegister } = useAuth();

  const [form, setForm] = useState({ email: "", username: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");

  const redirectTo = location.state?.from?.pathname || "/explore";

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError("");
  };

  const validate = () => {
    const next = {};
    const email = form.email.trim();
    const username = form.username.trim();

    if (!email) {
      next.email = "Enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "Use a valid email address.";
    }

    if (!username) {
      next.username = "Choose a username.";
    }

    if (!form.password) {
      next.password = "Create a password.";
    } else if (form.password.length < 6) {
      next.password = "Use at least 6 characters.";
    }

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!validate()) return;

    try {
      await handleRegister(
        form.email.trim(),
        form.username.trim(),
        form.password
      );
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Could not create your account. Check your details and try again."
        )
      );
    }
  };

  return (
    <main className="auth-page" id="main-content">
      <div className="auth-shell">
        <Link to="/" className="auth-brand" aria-label="Mosaic home">
          Mosaic
        </Link>

        <section className="auth-card" aria-labelledby="register-title">
          <h1 id="register-title">Create account</h1>
          <p className="auth-lede">
            Choose a username and email to start sharing photos and joining
            conversations.
          </p>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="register-email">Email</label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={updateField("email")}
                placeholder="you@example.com"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={
                  fieldErrors.email ? "register-email-error" : undefined
                }
                disabled={loading}
              />
              {fieldErrors.email && (
                <p className="field-error" id="register-email-error">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="register-username">Username</label>
              <input
                id="register-username"
                name="username"
                type="text"
                autoComplete="username"
                value={form.username}
                onChange={updateField("username")}
                placeholder="yourname"
                aria-invalid={Boolean(fieldErrors.username)}
                aria-describedby={
                  fieldErrors.username ? "register-username-error" : undefined
                }
                disabled={loading}
              />
              {fieldErrors.username && (
                <p className="field-error" id="register-username-error">
                  {fieldErrors.username}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={updateField("password")}
                placeholder="At least 6 characters"
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={
                  fieldErrors.password
                    ? "register-password-error"
                    : "register-password-hint"
                }
                disabled={loading}
              />
              {fieldErrors.password ? (
                <p className="field-error" id="register-password-error">
                  {fieldErrors.password}
                </p>
              ) : (
                <p className="field-hint" id="register-password-hint">
                  Use 6 characters or more.
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
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <p className="auth-terms">
            By creating an account, you agree to the{" "}
            <Link to="/terms">Terms</Link> and the{" "}
            <Link to="/privacy">Privacy policy</Link>.
          </p>
        </section>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login" state={location.state}>
            Sign in
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

export default Register;
