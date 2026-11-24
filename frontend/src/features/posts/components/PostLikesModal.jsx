import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppModal from "../../shared/components/AppModal";
import Avatar from "../../shared/components/Avatar";
import { useAuth } from "../../auth/hooks/useAuth";
import { getErrorMessage } from "../../shared/utils/error";
import { getUserAvatar } from "../../shared/utils/format";
import { followUser, unfollowUser } from "../../users/services/user.api";
import { getPostLikes } from "../services/post.api";
import "../style/post-likes.scss";

const ErrorNote = ({ message }) =>
  message ? (
    <p className="form-error" role="alert">
      {message}
    </p>
  ) : null;

const PostLikesModal = ({ postId, onClose }) => {
  const { user } = useAuth();
  const [people, setPeople] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let active = true;

    getPostLikes(postId, { limit: 30 })
      .then((data) => {
        if (!active) return;
        setPeople(Array.isArray(data?.users) ? data.users : []);
        setNextCursor(data?.nextCursor ?? null);
      })
      .catch((err) => {
        if (active) {
          setError(getErrorMessage(err, "Likes could not be loaded."));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [postId]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);

    try {
      const data = await getPostLikes(postId, {
        cursor: nextCursor,
        limit: 30,
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
      setError(getErrorMessage(err, "More likes could not be loaded."));
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
      setError(getErrorMessage(err, "That follow could not be saved."));
    } finally {
      setBusy("");
    }
  };

  return (
    <AppModal title="Likes" onClose={onClose} size="sm">
      <div className="post-likes-list">
        <ErrorNote message={error} />

        {loading ? (
          <p className="post-likes-status" role="status">
            Loading likes...
          </p>
        ) : people.length === 0 ? (
          <p className="post-likes-status">No likes yet.</p>
        ) : (
          <ul>
            {people.map((person) => {
              const isSelf = person.username === user?.username;
              const name = person.name || person.username;

              return (
                <li key={person.username}>
                  <Link
                    to={`/u/${encodeURIComponent(person.username)}`}
                    className="post-likes-person"
                    onClick={onClose}
                  >
                    <Avatar
                      src={getUserAvatar(person)}
                      name={name}
                      className="avatar--likes"
                    />
                    <span>
                      <strong>{name}</strong>
                      <small>@{person.username}</small>
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
                </li>
              );
            })}
          </ul>
        )}

        {nextCursor && (
          <button
            type="button"
            className="button secondary-button button--small post-likes-more"
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

export default PostLikesModal;
