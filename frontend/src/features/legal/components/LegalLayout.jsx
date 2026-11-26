import { useEffect } from "react";
import { Link } from "react-router-dom";
import "../style/legal.scss";

const LegalLayout = ({ eyebrow, title, intro, children }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="legal-page" id="main-content">
      <div className="page-shell page-shell--legal">
        <Link to="/" className="legal-back">
          Back to PhotoSocial
        </Link>

        <article className="legal-card">
          <p className="legal-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="legal-lede">{intro}</p>
          <p className="legal-updated">Last updated 24 November 2026</p>

          <div className="legal-body">{children}</div>

          <footer className="legal-footer">
            <span>PhotoSocial</span>
            <nav aria-label="PhotoSocial">
              <Link to="/explore">Explore</Link>
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
            </nav>
          </footer>
        </article>
      </div>
    </main>
  );
};

export default LegalLayout;
