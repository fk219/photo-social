import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppModal from "../../shared/components/AppModal";
import Avatar from "../../shared/components/Avatar";
import { getErrorMessage } from "../../shared/utils/error";
import { search } from "../../search/services/search.api";
import { getSuggestedUsers } from "../../users/services/user.api";
import {
  sendMessage,
  startConversation,
} from "../../messages/services/messages.api";
import { useAuth } from "../../auth/hooks/useAuth";
import "../style/share-sheet.scss";

const ShareSheet = ({ post, onClose }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState(null);
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");
  const [copyState, setCopyState] = useState("idle");

  const shareUrl = post?._id
    ? `${window.location.origin}/p/${post._id}`
    : window.location.href;

  useEffect(() => {
    if (!user) return undefined;

    let active = true;
    const clean = query.trim();
    setError("");

    if (!clean) {
      setLoading(true);
      getSuggestedUsers(6)
        .then((data) => {
          if (active) setPeople(Array.isArray(data?.users) ? data.users : []);
        })
        .catch(() => {
          if (active) setPeople([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      search(clean, { type: "users", limit: 8 })
        .then((data) => {
          if (active) setPeople(Array.isArray(data?.users) ? data.users : []);
        })
        .catch(() => {
          if (active) setPeople([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 280);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, user]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };

  const shareNative = async () => {
    if (!navigator.share) {
      copyLink();
      return;
    }

    try {
      await navigator.share({
        title: "PhotoSocial post",
        text: post?.caption || "A post on PhotoSocial",
        url: shareUrl,
      });
      setCopyState("shared");
    } catch {
      // A cancelled native share sheet is not an error.
    }
  };

  const sendTo = async (person) => {
    if (!user || sendingTo || !post?._id) return;

    setSendingTo(person.username);
    setError("");
    setSentTo("");

    try {
      const started = await startConversation(person.username);
      const conversation = started?.conversation;

      if (!conversation?._id) {
        throw new Error("Conversation unavailable");
      }

      await sendMessage(conversation._id, { postId: post._id });
      setSentTo(person.username);
      window.dispatchEvent(new Event("mosaic:refresh-unread"));
    } catch (err) {
      setError(
        getErrorMessage(err, "This post could not be sent. Try again.")
      );
    } finally {
      setSendingTo(null);
    }
  };

  return (
    <AppModal
      title="Share post"
      description={
        post?.user?.username
          ? `Send @${post.user.username}'s post to someone.`
          : "Send this post to someone."
      }
      onClose={onClose}
      size="sm"
    >
      <div className="share-sheet">
        <div className="share-sheet-actions">
          <button type="button" className="share-sheet-action" onClick={copyLink}>
            <span className="share-sheet-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2" />
                <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2" />
              </svg>
            </span>
            <span>
              <strong>Copy link</strong>
              <small>
                {copyState === "copied"
                  ? "Link copied"
                  : copyState === "error"
                    ? "Copy from the address bar"
                    : "Share this post anywhere"}
              </small>
            </span>
          </button>

          <button
            type="button"
            className="share-sheet-action"
            onClick={shareNative}
          >
            <span className="share-sheet-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 3v12" />
                <path d="m7 8 5-5 5 5" />
                <path d="M5 13v6h14v-6" />
              </svg>
            </span>
            <span>
              <strong>Share via</strong>
              <small>Use another app on this device</small>
            </span>
          </button>
        </div>

        <div className="share-sheet-send">
          <h3>Send to</h3>

          {!user ? (
            <p className="share-sheet-empty">
              <Link to="/login">Sign in</Link> to send posts in a message.
            </p>
          ) : (
            <>
              <label className="sr-only" htmlFor="share-search">
                Search people
              </label>
              <input
                id="share-search"
                className="share-sheet-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search people"
                autoComplete="off"
              />

              {error && (
                <p className="field-error" role="alert">
                  {error}
                </p>
              )}

              {sentTo && (
                <p className="share-sheet-sent" role="status">
                  Sent to @{sentTo}
                </p>
              )}

              {loading ? (
                <p className="share-sheet-status" role="status">
                  Looking for people...
                </p>
              ) : people.filter(
                  (person) => person.username !== user.username
                ).length === 0 ? (
                <p className="share-sheet-empty">
                  {query.trim()
                    ? "No people match that search."
                    : "No suggestions yet. Search for a username."}
                </p>
              ) : (
                <ul className="share-sheet-people">
                  {people
                    .filter((person) => person.username !== user.username)
                    .map((person) => (
                      <li key={person.username}>
                        <Link
                          to={`/u/${encodeURIComponent(person.username)}`}
                          className="share-sheet-person"
                          onClick={onClose}
                        >
                          <Avatar
                            src={person.profile_image}
                            name={person.name || person.username}
                            className="avatar--share"
                          />
                          <span className="share-sheet-person-copy">
                            <strong>{person.name || person.username}</strong>
                            <small>@{person.username}</small>
                          </span>
                        </Link>
                        <button
                          type="button"
                          className="button primary-button button--small"
                          onClick={() => sendTo(person)}
                          disabled={Boolean(sendingTo)}
                        >
                          {sendingTo === person.username
                            ? "Sending..."
                            : sentTo === person.username
                              ? "Sent"
                              : "Send"}
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </AppModal>
  );
};

export default ShareSheet;
