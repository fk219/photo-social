import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../style/form.scss";
import { useAuth } from "../hooks/useAuth";
import { getErrorMessage } from "../../shared/utils/error";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, handleLogin } = useAuth();

  const [form, setForm] = useState({ username: "", password: "" });
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

    if (!form.username.trim()) next.username = "Enter your username.";
    if (!form.password) next.password = "Enter your password.";

    setFieldErrors(next);
    return Object.keys(next).length === 0;
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
        getErrorMessage(err, "Could not sign in. Check your details and try again.")
      );
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-meta">
          <span>Insta / Photo journal</span>
          <span>Members</span>
        </div>

        <h1 id="login-title">
          Welcome <em>back.</em>
        </h1>
        <p className="auth-lede">Sign in to keep your contact sheet close.</p>

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
              placeholder="••••••••"
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
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="auth-switch">
          New to the journal?{" "}
          <Link to="/register" state={location.state}>
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
};

export default Login;
