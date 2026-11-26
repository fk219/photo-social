import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import AppModal from "../../shared/components/AppModal";
import Avatar from "../../shared/components/Avatar";
import { getErrorMessage } from "../../shared/utils/error";
import { getUserAvatar } from "../../shared/utils/format";
import { search } from "../../search/services/search.api";
import { startConversation } from "../services/messages.api";

const NewMessageDialog = ({ onClose, onStarted }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("idle");
  const [people, setPeople] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [startError, setStartError] = useState("");
  const [startingUsername, setStartingUsername] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const inputId = useId();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setStatus("idle");
      setPeople([]);
      setSearchError("");
      return undefined;
    }

    let active = true;

    setStatus("loading");
    setSearchError("");

    const timer = window.setTimeout(() => {
      search(trimmed, { type: "users", limit: 10 })
        .then((data) => {
          if (!active) return;

          const rows = Array.isArray(data?.users) ? data.users : [];

          setPeople(
            rows.filter((person) => person.username !== user?.username)
          );
          setStatus("ready");
        })
        .catch((err) => {
          if (!active) return;

          setSearchError(
            getErrorMessage(err, "PhotoSocial could not search for people.")
          );
          setStatus("error");
        });
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, retryKey, user?.username]);

  const handleStart = async (username) => {
    if (!username || startingUsername) return;

    setStartingUsername(username);
    setStartError("");

    try {
      const data = await startConversation(username);
      const conversation = data?.conversation;

      if (!conversation?._id) {
        throw new Error("That conversation could not be opened.");
      }

      if (!mountedRef.current) return;

      onStarted?.(conversation);
      onClose?.();
    } catch (err) {
      if (!mountedRef.current) return;

      setStartError(
        getErrorMessage(
          err,
          "That conversation could not be started. Try again."
        )
      );
    } finally {
      if (mountedRef.current) setStartingUsername("");
    }
  };

  return (
    <AppModal
      title="New message"
      description="Search for a username to start a conversation."
      onClose={onClose}
      size="sm"
      closeLabel="Close new message"
    >
      <div className="new-message-search">
        <label htmlFor={inputId} className="sr-only">
          Search for a username
        </label>
        <div className="new-message-field">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4.1-4.1" />
          </svg>
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setStartError("");
            }}
            placeholder="Search by username"
            autoComplete="off"
            autoFocus
          />
        </div>
      </div>

      <div className="new-message-results" aria-live="polite">
        {status === "idle" && (
          <p className="new-message-note">
            Type a name or username to find someone on PhotoSocial.
          </p>
        )}

        {status === "loading" && (
          <div className="new-message-status" role="status">
            <span className="spinner" aria-hidden="true" />
            <span>Searching...</span>
          </div>
        )}

        {status === "error" && (
          <div className="new-message-error" role="alert">
            <p>{searchError}</p>
            <button
              type="button"
              className="quiet-button"
              onClick={() => setRetryKey((key) => key + 1)}
            >
              Try again
            </button>
          </div>
        )}

        {status === "ready" && people.length === 0 && (
          <p className="new-message-note">
            No people found for "{query.trim()}". Try a different username.
          </p>
        )}

        {status === "ready" && people.length > 0 && (
          <ul className="new-message-list" aria-label="People">
            {people.map((person) => {
              const displayName = person.name || person.username;
              const starting = startingUsername === person.username;

              return (
                <li key={person.username}>
                  <button
                    type="button"
                    className="new-message-person"
                    onClick={() => handleStart(person.username)}
                    disabled={Boolean(startingUsername)}
                    aria-label={`Start a conversation with @${person.username}`}
                  >
                    <Avatar
                      src={getUserAvatar(person)}
                      name={displayName}
                      className="avatar--conversation"
                    />
                    <span className="new-message-person-copy">
                      <span className="new-message-person-name">
                        {displayName}
                      </span>
                      <span className="new-message-person-handle">
                        @{person.username}
                      </span>
                    </span>
                    <span className="new-message-person-action">
                      {starting ? "Opening..." : "Message"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {startError && (
        <p className="messages-inline-error" role="alert">
          {startError}
        </p>
      )}
    </AppModal>
  );
};

export default NewMessageDialog;
