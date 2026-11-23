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

  const redirectTo = location.state?.from?.pathname || "/";

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
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="register-title">
        <div className="auth-meta">
          <span>Insta / Photo journal</span>
          <span>Join</span>
        </div>

        <h1 id="register-title">
          Start your <em>journal.</em>
        </h1>
        <p className="auth-lede">
          A username, an email, and a place for your first frame.
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
              placeholder="Choose a password"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password ? "register-password-error" : undefined
              }
              disabled={loading}
            />
            {fieldErrors.password && (
              <p className="field-error" id="register-password-error">
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
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="auth-switch">
          Already have a contact sheet?{" "}
          <Link to="/login" state={location.state}>
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
};

export default Register;
