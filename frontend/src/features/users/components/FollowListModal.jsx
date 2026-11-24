import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppModal from "../../shared/components/AppModal";
import Avatar from "../../shared/components/Avatar";
import { useAuth } from "../../auth/hooks/useAuth";
import { getErrorMessage } from "../../shared/utils/error";
import { formatCount } from "../../shared/utils/format";
import {
  followUser,
  getFollowers,
  getFollowing,
  unfollowUser,
} from "../services/user.api";
import "../style/follow-list.scss";

const FollowListModal = ({ username, mode = "followers", onClose }) => {
  const { user } = useAuth();
  const [people, setPeople] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);

  const isFollowers = mode === "followers";
  const title = isFollowers ? "Followers" : "Following";

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setPeople([]);
    setNextCursor(null);

    const load = isFollowers ? getFollowers : getFollowing;

    load(username, { limit: 20 })
      .then((data) => {
        if (!active) return;
        setPeople(Array.isArray(data?.users) ? data.users : []);
        setNextCursor(data?.nextCursor ?? null);
      })
      .catch((err) => {
        if (active) {
          setError(
            getErrorMessage(err, "This list could not be loaded.")
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isFollowers, username]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    setError("");

    try {
      const load = isFollowers ? getFollowers : getFollowing;
      const data = await load(username, {
        cursor: nextCursor,
        limit: 20,
      });
      const incoming = Array.isArray(data?.users) ? data.users : [];

      setPeople((current) => {
        const seen = new Set(current.map((person) => person.username));
        return [
          ...current,
          ...incoming.filter((person) => !seen.has(person.username)),
        ];
      });
      setNextCursor(data?.nextCursor ?? null);
    } catch (err) {
      setError(getErrorMessage(err, "More people could not be loaded."));
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleFollow = async (person) => {
    if (busy) return;

    setBusy(person.username);
    setError("");

    try {
      const data = person.isFollowing
        ? await unfollowUser(person.username)
        : await followUser(person.username);

      setPeople((current) =>
        current.map((entry) =>
          entry.username === person.username
            ? { ...entry, isFollowing: Boolean(data?.isFollowing) }
            : entry
        )
      );
    } catch (err) {
      setError(
        getErrorMessage(err, "That follow could not be saved.")
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppModal title={title} onClose={onClose} size="sm">
      <div className="follow-list">
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <div className="follow-list-loading" role="status">
            <span className="sr-only">Loading {title.toLowerCase()}...</span>
            {Array.from({ length: 5 }).map((_, index) => (
              <span className="follow-list-skeleton" key={index} />
            ))}
          </div>
        ) : people.length === 0 ? (
          <p className="follow-list-empty">
            {isFollowers
              ? "No followers yet."
              : "Not following anyone yet."}
          </p>
        ) : (
          <ul className="follow-list-people">
            {people.map((person) => {
              const isSelf = person.username === user?.username;
              const name = person.name || person.username;

              return (
                <li key={person.username}>
                  <Link
                    to={`/u/${encodeURIComponent(person.username)}`}
                    className="follow-list-person"
                    onClick={onClose}
                  >
                    <Avatar
                      src={person.profile_image}
                      name={name}
                      className="avatar--follow"
                    />
                    <span className="follow-list-copy">
                      <strong>{name}</strong>
                      <small>@{person.username}</small>
                      {person.bio && <span>{person.bio}</span>}
                    </span>
                  </Link>

                  {!isSelf && user && (
                    <button
                      type="button"
                      className={`button button--small ${
                        person.isFollowing
                          ? "secondary-button"
                          : "primary-button"
                      }`}
                      onClick={() => toggleFollow(person)}
                      disabled={busy === person.username}
                    >
                      {busy === person.username
                        ? "Saving..."
                        : person.isFollowing
                          ? "Following"
                          : "Follow"}
                    </button>
                  )}

                  {person.followersCount > 0 && (
                    <span className="follow-list-count">
                      {formatCount(person.followersCount)} followers
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {nextCursor && (
          <button
            type="button"
            className="button secondary-button follow-list-more"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        )}
      </div>
    </AppModal>
  );
};

export default FollowListModal;
