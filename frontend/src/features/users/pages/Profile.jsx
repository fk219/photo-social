import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import Avatar from "../../shared/components/Avatar";
import PostGrid, {
  PostGridSkeleton,
} from "../../posts/components/PostGrid";
import PostModal from "../../posts/components/PostModal";
import { getErrorMessage } from "../../shared/utils/error";
import { formatCount, getUserAvatar } from "../../shared/utils/format";
import {
  followUser,
  getProfile,
  unfollowUser,
  updateMe,
} from "../services/user.api";
import "../style/profile.scss";

const BIO_LIMIT = 160;

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
  const { user, updateUser } = useAuth();

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
  const [bioDraft, setBioDraft] = useState("");
  const [bioError, setBioError] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  const isOwner = Boolean(user?.username) && user.username === username;

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setProfile(null);
    setPosts([]);
    setNextCursor(null);
    setEditing(false);
    setActionError("");
    setBioError("");

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

  const startEditing = () => {
    setBioDraft(profile?.bio ?? "");
    setBioError("");
    setEditing(true);
  };

  const saveBio = async (event) => {
    event.preventDefault();

    if (savingBio) return;

    const bio = bioDraft.trim();

    if (bio.length > BIO_LIMIT) {
      setBioError(`Bios are limited to ${BIO_LIMIT} characters.`);
      return;
    }

    setSavingBio(true);
    setBioError("");

    try {
      const data = await updateMe({ bio });
      const updated = data?.user;
      const nextBio = typeof updated?.bio === "string" ? updated.bio : bio;
      const nextImage = updated?.profile_image;

      setProfile((current) =>
        current
          ? {
              ...current,
              bio: nextBio,
              profile_image: nextImage || current.profile_image,
            }
          : current
      );

      updateUser({
        bio: nextBio,
        ...(nextImage
          ? { profile_image: nextImage, profileImage: nextImage }
          : {}),
      });

      setEditing(false);
    } catch (err) {
      setBioError(
        getErrorMessage(err, "Your bio could not be saved. Try again.")
      );
    } finally {
      setSavingBio(false);
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
              name={profile.username}
              className="avatar--profile"
            />
          </div>

          <div className="profile-info">
            <div className="profile-title-row">
              <h1 className="profile-username">{profile.username}</h1>

              <div className="profile-actions">
                {isOwner ? (
                  <button
                    type="button"
                    className="button secondary-button"
                    onClick={editing ? () => setEditing(false) : startEditing}
                  >
                    {editing ? "Cancel edit" : "Edit profile"}
                  </button>
                ) : user ? (
                  <button
                    type="button"
                    className={`button ${
                      profile.isFollowing
                        ? "secondary-button"
                        : "primary-button"
                    }`}
                    onClick={toggleFollow}
                    disabled={followBusy}
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
                <dd>{formatCount(profile.followersCount)}</dd>
              </div>
              <div>
                <dt>Following</dt>
                <dd>{formatCount(profile.followingCount)}</dd>
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

            {actionError && (
              <p className="form-error profile-action-error" role="alert">
                {actionError}
              </p>
            )}
          </div>
        </header>

        {editing && isOwner && (
          <form className="profile-bio-form" onSubmit={saveBio} noValidate>
            <div className="field">
              <div className="field-label-row">
                <label htmlFor="profile-bio">Bio</label>
                <span className="field-hint">
                  {bioDraft.length} / {BIO_LIMIT}
                </span>
              </div>
              <textarea
                id="profile-bio"
                value={bioDraft}
                maxLength={BIO_LIMIT}
                rows={3}
                onChange={(event) => {
                  setBioDraft(event.target.value);
                  setBioError("");
                }}
                placeholder="A short description of you or the photos you share."
                aria-invalid={Boolean(bioError)}
                aria-describedby={
                  bioError ? "profile-bio-error" : undefined
                }
                disabled={savingBio}
              />
            </div>

            {bioError && (
              <p className="field-error" id="profile-bio-error" role="alert">
                {bioError}
              </p>
            )}

            <div className="profile-bio-actions">
              <button
                type="submit"
                className={`button primary-button${
                  savingBio ? " is-loading" : ""
                }`}
                disabled={savingBio}
                aria-busy={savingBio}
              >
                {savingBio ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Saving...
                  </>
                ) : (
                  "Save bio"
                )}
              </button>
              <button
                type="button"
                className="button secondary-button"
                onClick={() => setEditing(false)}
                disabled={savingBio}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="profile-tabs">
          <span className="profile-tab is-active">Posts</span>
        </div>

        {posts.length === 0 ? (
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

          {nextCursor ? (
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
          ) : posts.length > 0 ? (
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
    </main>
  );
};

export default Profile;
