import { Fragment } from "react";
import { Link } from "react-router-dom";
import "../rich-text.scss";

const TOKEN =
  /(@[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*|#[a-zA-Z0-9_]+)/g;

/**
 * Turns @mentions and #hashtags into real links without allowing arbitrary
 * HTML from user text.
 */
const RichText = ({ text = "", className = "" }) => {
  const value = String(text);
  const parts = [];
  let lastIndex = 0;
  let match;

  TOKEN.lastIndex = 0;

  while ((match = TOKEN.exec(value)) !== null) {
    if (match.index > lastIndex) {
      parts.push(value.slice(lastIndex, match.index));
    }

    const token = match[0];
    const isMention = token.startsWith("@");
    const clean = token.slice(1);

    parts.push(
      <Link
        key={`${match.index}-${token}`}
        to={
          isMention
            ? `/u/${encodeURIComponent(clean)}`
            : `/search?q=${encodeURIComponent(`#${clean}`)}`
        }
        className={isMention ? "rich-mention" : "rich-tag"}
      >
        {token}
      </Link>
    );

    lastIndex = match.index + token.length;
  }

  if (lastIndex < value.length) {
    parts.push(value.slice(lastIndex));
  }

  return (
    <span className={`rich-text ${className}`.trim()}>
      {parts.map((part, index) => (
        <Fragment key={index}>{part}</Fragment>
      ))}
    </span>
  );
};

export default RichText;
