import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import Avatar from "../../shared/components/Avatar";
import { getErrorMessage } from "../../shared/utils/error";
import { formatCount, getUserAvatar } from "../../shared/utils/format";
import { followUser, unfollowUser } from "../../users/services/user.api";

const PersonRow = ({ person }) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(Boolean(person?.isFollowing));
  const [followersCount, setFollowersCount] = useState(
    Math.max(0, Number(person?.followersCount) || 0)
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const username = person?.username || "";
  const displayName = person?.name || username || "Unknown";
  const bio = typeof person?.bio === "string" ? person.bio.trim() : "";
  const isSelf = Boolean(username) && user?.username === username;

  useEffect(() => {
    setIsFollowing(Boolean(person?.isFollowing));
    setFollowersCount(Math.max(0, Number(person?.followersCount) || 0));
  }, [person?.username, person?.isFollowing, person?.followersCount]);

  const toggleFollow = async () => {
    if (!username || busy) return;

    const previousFollowing = isFollowing;
    const previousCount = followersCount;
    const nextFollowing = !previousFollowing;

    setBusy(true);
    setError("");
    setIsFollowing(nextFollowing);
    setFollowersCount(
      Math.max(0, previousCount + (nextFollowing ? 1 : -1))
    );

    try {
      const data = previousFollowing
        ? await unfollowUser(username)
        : await followUser(username);

      if (typeof data?.isFollowing === "boolean") {
        setIsFollowing(data.isFollowing);
      }

      if (typeof data?.followersCount === "number") {
        setFollowersCount(Math.max(0, data.followersCount));
      }
    } catch (err) {
      setIsFollowing(previousFollowing);
      setFollowersCount(previousCount);
      setError(
        getErrorMessage(err, "That follow could not be saved. Try again.")
      );
    } finally {
      setBusy(false);
    }
  };

  if (!username) return null;

  return (
    <li className="people-row">
      <Link
        to={`/u/${encodeURIComponent(username)}`}
        className="people-link"
      >
        <Avatar
          src={getUserAvatar(person)}
          name={displayName}
          className="avatar--people"
        />

        <span className="people-copy">
          <span className="people-title">
            <span className="people-name">{displayName}</span>
            <span className="people-handle">@{username}</span>
          </span>

          {bio && <span className="people-bio">{bio}</span>}

          <span className="people-meta">
            {formatCount(followersCount)}{" "}
            {followersCount === 1 ? "follower" : "followers"}
          </span>
        </span>
      </Link>

      {!isSelf && (
        <span className="people-action">
          <button
            type="button"
            className={`button ${
              isFollowing ? "secondary-button" : "primary-button"
            } button--small people-follow`}
            onClick={toggleFollow}
            disabled={busy}
            aria-pressed={isFollowing}
            aria-label={
              isFollowing
                ? `Unfollow @${username}`
                : `Follow @${username}`
            }
          >
            {busy ? "Saving..." : isFollowing ? "Following" : "Follow"}
          </button>
        </span>
      )}

      {error && (
        <p className="people-error" role="alert">
          {error}
        </p>
      )}
    </li>
  );
};

export default PersonRow;
