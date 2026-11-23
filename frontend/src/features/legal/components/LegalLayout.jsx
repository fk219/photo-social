import { useEffect } from "react";
import { Link } from "react-router-dom";
import "../style/legal.scss";

const LegalLayout = ({ eyebrow, title, accent, intro, children }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="legal-page">
      <div className="legal-shell">
        <Link to="/" className="legal-back">
          <span aria-hidden="true">←</span> Back to the journal
        </Link>

        <article className="legal-card">
          <div className="legal-meta">
            <span>{eyebrow}</span>
            <span>Public document</span>
          </div>

          <h1>
            {title} <em>{accent}</em>
          </h1>
          <p className="legal-lede">{intro}</p>
          <p className="legal-updated">Last updated 23 November 2026</p>

          <div className="legal-body">{children}</div>

          <footer className="legal-footer">
            <span>Journal, a photo journal</span>
            <nav aria-label="Legal">
              <Link to="/privacy">Privacy</Link>
              <span aria-hidden="true">·</span>
              <Link to="/terms">Terms</Link>
            </nav>
          </footer>
        </article>
      </div>
    </main>
  );
};

export default LegalLayout;
