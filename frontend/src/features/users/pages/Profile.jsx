import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import Avatar from "../../shared/components/Avatar";
import PostGrid, {
  PostGridSkeleton,
} from "../../posts/components/PostGrid";
import PostModal from "../../posts/components/PostModal";
import FollowListModal from "../components/FollowListModal";
import EditProfileModal from "../components/EditProfileModal";
import ProfileActionsMenu from "../components/ProfileActionsMenu";
import { useStartConversation } from "../../messages/hooks/useStartConversation";
import { getErrorMessage } from "../../shared/utils/error";
import { formatCount, getUserAvatar } from "../../shared/utils/format";
import { followUser, getProfile, unfollowUser } from "../services/user.api";
import "../style/profile.scss";

const ProfileSkeleton = () => (
  <div className="profile-skeleton" role="status">
    <span className="sr-only">Loading this profile...</span>
    <div className="profile-skeleton-head">
      <span className="profile-skeleton-avatar" />
      <div className="profile-skeleton-info">
        <span className="profile-skeleton-line profile-skeleton-line--short" />
        <span className="profile-skeleton-line profile-skeleton-line--wide" />
        <span className="profile-skeleton-line" />
      </div>
    </div>
    <PostGridSkeleton count={6} />
  </div>
);

const Profile = () => {
  const { username } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const { startingWith, error: messageError, openConversation } =
    useStartConversation();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [followList, setFollowList] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);

  const isOwner = Boolean(user?.username) && user.username === username;
  const blocked = Boolean(profile?.isBlocked);
  const displayName = profile?.name?.trim() || profile?.username || username;

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setProfile(null);
    setPosts([]);
    setNextCursor(null);
    setActionError("");

    getProfile(username)
      .then((data) => {
        if (!active) return;
        setProfile(data?.profile ?? null);
        setPosts(Array.isArray(data?.posts) ? data.posts : []);
        setNextCursor(data?.nextCursor ?? null);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err?.response?.status === 404
            ? "No account goes by that name. The profile may have moved."
            : getErrorMessage(
                err,
                "This profile could not be loaded. Try again."
              )
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [username, reloadKey, user?.username]);

  useEffect(() => {
    if (!copied) return undefined;

    const timeout = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const handlePostUpdate = useCallback((postId, patch) => {
    setPosts((current) =>
      current.map((post) =>
        post._id === postId ? { ...post, ...patch } : post
      )
    );
  }, []);

  const handlePostDeleted = useCallback((postId) => {
    setPosts((current) => current.filter((post) => post._id !== postId));
    setProfile((current) =>
      current
        ? {
            ...current,
            postsCount: Math.max(
              0,
              (Number(current.postsCount) || 0) - 1
            ),
          }
        : current
    );
    setSelectedPost(null);
  }, []);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    setLoadMoreError("");

    try {
      const data = await getProfile(username, { cursor: nextCursor });
      const incoming = Array.isArray(data?.posts) ? data.posts : [];

      setPosts((current) => {
        const seen = new Set(current.map((post) => post._id));
        return [
          ...current,
          ...incoming.filter((post) => !seen.has(post._id)),
        ];
      });
      setNextCursor(data?.nextCursor ?? null);
    } catch (err) {
      setLoadMoreError(
        getErrorMessage(err, "More posts could not be loaded.")
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleFollow = async () => {
    if (!profile || followBusy) return;

    setFollowBusy(true);
    setActionError("");

    try {
      const data = profile.isFollowing
        ? await unfollowUser(username)
        : await followUser(username);

      setProfile((current) => {
        if (!current) return current;

        return {
          ...current,
          isFollowing:
            typeof data?.isFollowing === "boolean"
              ? data.isFollowing
              : !current.isFollowing,
          followersCount:
            typeof data?.followersCount === "number"
              ? data.followersCount
              : Math.max(
                  0,
                  current.followersCount + (current.isFollowing ? -1 : 1)
                ),
        };
      });
    } catch (err) {
      setActionError(
        getErrorMessage(err, "That follow could not be saved.")
      );
    } finally {
      setFollowBusy(false);
    }
  };

  const copyProfileLink = async () => {
    setActionError("");

    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setActionError("Copy the profile link from your browser address bar.");
    }
  };

  const handleSavedProfile = (patch) => {
    setProfile((current) =>
      current
        ? {
            ...current,
            ...patch,
          }
        : current
    );
  };

  const handleBlockChange = (isBlocked) => {
    setProfile((current) =>
      current ? { ...current, isBlocked } : current
    );

    if (isBlocked) {
      setPosts([]);
      setNextCursor(null);
    } else {
      setReloadKey((key) => key + 1);
    }
  };

  if (loading) {
    return (
      <main className="profile-page" id="main-content">
        <div className="page-shell page-shell--profile">
          <ProfileSkeleton />
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="profile-page" id="main-content">
        <div className="page-shell page-shell--profile">
          <section className="state-card" role="alert">
            <h1>Profile unavailable</h1>
            <p>{error || "This profile could not be found."}</p>
            <div className="state-card-actions">
              <button
                type="button"
                className="button primary-button"
                onClick={() => setReloadKey((key) => key + 1)}
              >
                Try again
              </button>
              <Link to="/explore" className="button secondary-button">
                Go to Explore
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="profile-page" id="main-content">
      <div className="page-shell page-shell--profile">
        <header className="profile-head">
          <div className="profile-avatar">
            <Avatar
              src={getUserAvatar(profile)}
              name={displayName}
              className="avatar--profile"
            />
          </div>

          <div className="profile-info">
            <div className="profile-title-row">
              <div className="profile-identity">
                <h1 className="profile-username">{displayName}</h1>
                {profile.name && (
                  <p className="profile-handle">@{profile.username}</p>
                )}
              </div>

              <div className="profile-actions">
                {isOwner ? (
                  <button
                    type="button"
                    className="button secondary-button"
                    onClick={() => setEditing(true)}
                  >
                    Edit profile
                  </button>
                ) : user ? (
                  <>
                    <button
                      type="button"
                      className={`button ${
                        profile.isFollowing
                          ? "secondary-button"
                          : "primary-button"
                      }`}
                      onClick={toggleFollow}
                      disabled={followBusy || blocked}
                      aria-pressed={profile.isFollowing}
                      aria-label={
                        profile.isFollowing
                          ? `Unfollow @${profile.username}`
                          : `Follow @${profile.username}`
                      }
                    >
                      {followBusy
                        ? "Saving..."
                        : profile.isFollowing
                          ? "Following"
                          : "Follow"}
                    </button>
                    <button
                      type="button"
                      className="button secondary-button"
                      onClick={() => openConversation(profile.username)}
                      disabled={Boolean(startingWith) || blocked}
                    >
                      {startingWith === profile.username
                        ? "Opening..."
                        : "Message"}
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    state={{ from: location }}
                    className="button primary-button"
                  >
                    Sign in to follow
                  </Link>
                )}

                <button
                  type="button"
                  className="button secondary-button"
                  onClick={copyProfileLink}
                >
                  {copied ? "Link copied" : "Share profile"}
                </button>

                {!isOwner && user && (
                  <ProfileActionsMenu
                    username={profile.username}
                    isBlocked={blocked}
                    onBlockChange={handleBlockChange}
                  />
                )}
                <span className="sr-only" role="status">
                  {copied ? "Profile link copied to the clipboard." : ""}
                </span>
              </div>
            </div>

            <dl className="profile-stats" aria-label="Profile stats">
              <div>
                <dt>Posts</dt>
                <dd>{formatCount(profile.postsCount)}</dd>
              </div>
              <div>
                <dt>Followers</dt>
                <dd>
                  <button
                    type="button"
                    className="profile-stat-button"
                    onClick={() => setFollowList("followers")}
                  >
                    {formatCount(profile.followersCount)}
                  </button>
                </dd>
              </div>
              <div>
                <dt>Following</dt>
                <dd>
                  <button
                    type="button"
                    className="profile-stat-button"
                    onClick={() => setFollowList("following")}
                  >
                    {formatCount(profile.followingCount)}
                  </button>
                </dd>
              </div>
            </dl>

            <div className="profile-bio">
              {profile.bio ? (
                <p>{profile.bio}</p>
              ) : (
                <p className="profile-bio-empty">
                  {isOwner
                    ? "Add a short bio from Edit profile."
                    : "No bio yet."}
                </p>
              )}
            </div>

            {(actionError || messageError) && (
              <p className="form-error profile-action-error" role="alert">
                {actionError || messageError}
              </p>
            )}
          </div>
        </header>

        <div className="profile-tabs">
          <span className="profile-tab is-active">Posts</span>
        </div>

        {blocked ? (
          <section className="profile-empty" aria-labelledby="profile-blocked-title">
            <h2 id="profile-blocked-title">This account is blocked</h2>
            <p>Unblock @{profile.username} to see their posts again.</p>
            <button
              type="button"
              className="button secondary-button"
              onClick={() => handleBlockChange(false)}
            >
              Unblock
            </button>
          </section>
        ) : posts.length === 0 ? (
          <section className="profile-empty" aria-labelledby="profile-empty-title">
            <h2 id="profile-empty-title">No posts yet</h2>
            <p>
              {isOwner
                ? "Share your first photo and it will appear here."
                : "When this account shares a photo, it will appear here."}
            </p>
            {isOwner && (
              <Link to="/create-post" className="button primary-button">
                Create a post
              </Link>
            )}
          </section>
        ) : (
          <PostGrid posts={posts} onSelect={setSelectedPost} />
        )}

        <div className="profile-more">
          {loadMoreError && (
            <p className="profile-more-error" role="alert">
              {loadMoreError}
            </p>
          )}

          {!blocked && nextCursor ? (
            <button
              type="button"
              className={`button secondary-button${
                loadingMore ? " is-loading" : ""
              }`}
              onClick={loadMore}
              disabled={loadingMore}
              aria-busy={loadingMore}
            >
              {loadingMore ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Loading...
                </>
              ) : (
                "Load more posts"
              )}
            </button>
          ) : !blocked && posts.length > 0 ? (
            <p className="profile-end">
              {formatCount(posts.length)}{" "}
              {posts.length === 1 ? "post" : "posts"}
            </p>
          ) : null}
        </div>

        <footer className="profile-footer">
          <p>Mosaic</p>
          <nav aria-label="Mosaic">
            <Link to="/explore">Explore</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </nav>
        </footer>
      </div>

      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onPostUpdate={handlePostUpdate}
          onDeleted={handlePostDeleted}
        />
      )}

      {editing && isOwner && (
        <EditProfileModal
          profile={profile}
          onClose={() => setEditing(false)}
          onSaved={handleSavedProfile}
        />
      )}

      {followList && (
        <FollowListModal
          username={profile.username}
          mode={followList}
          onClose={() => setFollowList(null)}
        />
      )}
    </main>
  );
};

export default Profile;
