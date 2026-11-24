import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import Avatar from "../../shared/components/Avatar";
import { getErrorMessage } from "../../shared/utils/error";
import {
  formatCount,
  formatMonthDate,
  getUserAvatar,
} from "../../shared/utils/format";
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
    <span className="sr-only">Loading this portfolio...</span>
    <div className="profile-skeleton-header">
      <span className="profile-skeleton-avatar" />
      <div className="profile-skeleton-lines">
        <span className="profile-skeleton-line profile-skeleton-line--short" />
        <span className="profile-skeleton-line" />
        <span className="profile-skeleton-line profile-skeleton-line--medium" />
      </div>
    </div>
    <div className="profile-skeleton-grid">
      {Array.from({ length: 6 }).map((_, index) => (
        <span className="profile-skeleton-tile" key={index} />
      ))}
    </div>
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
            ? "No creator goes by that name. The page may have moved."
            : getErrorMessage(
                err,
                "This portfolio could not be loaded. Try again."
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
        getErrorMessage(err, "More frames could not be loaded.")
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
        <div className="profile-shell">
          <ProfileSkeleton />
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="profile-page" id="main-content">
        <div className="profile-shell">
          <Link to="/explore" className="back-link">
            Back to Explore
          </Link>
          <section className="profile-message" role="alert">
            <p className="eyebrow">Portfolio unavailable</p>
            <h1>This body of work did not load.</h1>
            <p>{error || "This profile could not be found."}</p>
            <div className="profile-message-actions">
              <button
                type="button"
                className="button primary-button"
                onClick={() => setReloadKey((key) => key + 1)}
              >
                Try again
              </button>
              <Link to="/explore" className="button ghost-button">
                Browse Explore
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="profile-page" id="main-content">
      <div className="profile-shell">
        <Link to="/explore" className="back-link">
          Back to Explore
        </Link>

        <header className="profile-header">
          <div className="profile-identity">
            <Avatar
              src={getUserAvatar(profile)}
              name={profile.username}
              className="avatar--profile"
            />

            <div className="profile-copy">
              <p className="eyebrow">Portfolio</p>
              <h1>@{profile.username}</h1>
              {profile.bio ? (
                <p className="profile-bio">{profile.bio}</p>
              ) : (
                <p className="profile-bio profile-bio--empty">
                  {isOwner
                    ? "Add a few words about your work."
                    : "No bio yet."}
                </p>
              )}
            </div>
          </div>

          <dl className="profile-stats" aria-label="Profile stats">
            <div>
              <dt>Frames</dt>
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

          <div className="profile-actions">
            {isOwner ? (
              <>
                <button
                  type="button"
                  className="button ghost-button profile-action"
                  onClick={editing ? () => setEditing(false) : startEditing}
                >
                  {editing ? "Close editor" : "Edit bio"}
                </button>
                <Link
                  to="/create-post"
                  className="button primary-button profile-action"
                >
                  New frame
                </Link>
              </>
            ) : user ? (
              <button
                type="button"
                className={`button profile-action ${
                  profile.isFollowing ? "ghost-button" : "primary-button"
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
                className="button primary-button profile-action"
              >
                Sign in to follow
              </Link>
            )}

            <button
              type="button"
              className="button ghost-button profile-action"
              onClick={copyProfileLink}
            >
              {copied ? "Link copied" : "Copy profile link"}
            </button>
            <span className="sr-only" role="status">
              {copied ? "Profile link copied to the clipboard." : ""}
            </span>
          </div>

          {actionError && (
            <p className="form-error profile-action-error" role="alert">
              {actionError}
            </p>
          )}

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
                  placeholder="Photographer, designer, illustrator. Say what you make."
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
                  className="button ghost-button"
                  onClick={() => setEditing(false)}
                  disabled={savingBio}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </header>

        <section className="portfolio" aria-labelledby="portfolio-title">
          <div className="portfolio-head">
            <div>
              <p className="eyebrow">Work and threads</p>
              <h2 id="portfolio-title">The portfolio</h2>
            </div>
            <span className="portfolio-count">
              {formatCount(profile.postsCount)}{" "}
              {profile.postsCount === 1 ? "frame" : "frames"}
            </span>
          </div>

          {posts.length === 0 ? (
            <div className="profile-empty">
              <p className="eyebrow">Empty wall</p>
              <h3>No frames on this wall yet.</h3>
              <p>
                {isOwner
                  ? "Post the first frame to open this public portfolio."
                  : "Check back when this creator posts their next frame."}
              </p>
              {isOwner && (
                <Link to="/create-post" className="button primary-button">
                  Post a frame
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="profile-grid">
                {posts.map((post) => {
                  const caption =
                    typeof post.caption === "string"
                      ? post.caption.trim()
                      : "";
                  const postedAt = formatMonthDate(post.createdAt);
                  const replies = Number(post.commentsCount) || 0;
                  const likes = Number(post.likesCount) || 0;

                  return (
                    <figure className="profile-frame" key={post._id}>
                      <a
                        href={post.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="profile-frame-link"
                        aria-label={`Open the full photograph by @${
                          profile.username
                        } in a new tab${caption ? `: ${caption.slice(0, 80)}` : ""}`}
                      >
                        <span className="profile-frame-media">
                          <img
                            src={post.thumbnail_url || post.image_url}
                            alt={
                              caption
                                ? `Photograph by @${profile.username}: ${caption.slice(
                                    0,
                                    120
                                  )}`
                                : `Photograph by @${profile.username}`
                            }
                            loading="lazy"
                            decoding="async"
                          />
                          {replies > 0 && (
                            <span className="profile-frame-thread">
                              {formatCount(replies)}{" "}
                              {replies === 1 ? "reply" : "replies"}
                            </span>
                          )}
                        </span>
                        <span className="profile-frame-meta">
                          <span className="profile-frame-take">
                            {caption || "Frame without a written take"}
                          </span>
                          <span className="profile-frame-sub">
                            {postedAt && <span>{postedAt}</span>}
                            <span>
                              {formatCount(likes)}{" "}
                              {likes === 1 ? "like" : "likes"}
                            </span>
                          </span>
                        </span>
                      </a>
                    </figure>
                  );
                })}
              </div>

              <div className="profile-more">
                {loadMoreError && (
                  <p className="profile-more-error" role="alert">
                    {loadMoreError}
                  </p>
                )}

                {nextCursor ? (
                  <button
                    type="button"
                    className={`button ghost-button${
                      loadingMore ? " is-loading" : ""
                    }`}
                    onClick={loadMore}
                    disabled={loadingMore}
                    aria-busy={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <span className="spinner" aria-hidden="true" />
                        Loading frames...
                      </>
                    ) : (
                      "Load more frames"
                    )}
                  </button>
                ) : (
                  <p className="profile-end">
                    {posts.length} {posts.length === 1 ? "frame" : "frames"}.
                    End of this portfolio.
                  </p>
                )}
              </div>
            </>
          )}
        </section>

        <footer className="profile-legal">
          <p>Mosaic. Image-first conversations.</p>
          <nav aria-label="Mosaic">
            <Link to="/explore">Explore</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </nav>
        </footer>
      </div>
    </main>
  );
};

export default Profile;
