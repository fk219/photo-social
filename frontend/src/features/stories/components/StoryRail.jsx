import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import Avatar from "../../shared/components/Avatar";
import { getUserAvatar } from "../../shared/utils/format";
import { getStoryFeed } from "../services/stories.api";
import StoryComposer from "./StoryComposer";
import StoryViewer from "./StoryViewer";
import "../style/stories.scss";

const normalizeGroups = (data, viewerName) => {
  const rows = Array.isArray(data?.groups) ? data.groups : [];

  return rows
    .filter(
      (group) => Array.isArray(group?.stories) && group.stories.length > 0
    )
    .map((group) => {
      const stories = group.stories.map((story) => ({
        ...story,
        seen: Boolean(story.seen),
      }));

      return {
        ...group,
        stories,
        allSeen:
          Boolean(group.allSeen) ||
          stories.every((story) => story.seen),
        isMine:
          Boolean(group.isMine) ||
          group.user?.username === viewerName,
      };
    });
};

const RailSkeleton = () => (
  <div className="story-rail story-rail--skeleton" role="status">
    <span className="sr-only">Loading stories...</span>
    <div className="story-rail-list" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <span className="story-skeleton-tile" key={index}>
          <span className="story-skeleton-ring" />
          <span className="story-skeleton-name" />
        </span>
      ))}
    </div>
  </div>
);

const StoryRail = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewer, setViewer] = useState(null);
  const groupsRef = useRef([]);
  const viewerName = user?.username ?? "";

  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  useEffect(() => {
    if (!viewerName) return undefined;

    let active = true;

    const load = async (initial) => {
      if (initial) setLoading(true);

      try {
        const data = await getStoryFeed();

        if (!active) return;

        const next = normalizeGroups(data, viewerName);

        groupsRef.current = next;
        setGroups(next);
        setFailed(false);
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active && initial) setLoading(false);
      }
    };

    load(true);

    const onChanged = () => load(false);

    window.addEventListener("mosaic:stories-changed", onChanged);

    return () => {
      active = false;
      window.removeEventListener("mosaic:stories-changed", onChanged);
    };
  }, [viewerName]);

  const handleSeen = (storyId) => {
    setGroups((current) =>
      current.map((group) => {
        if (!group.stories.some((story) => story._id === storyId)) {
          return group;
        }

        const stories = group.stories.map((story) =>
          story._id === storyId ? { ...story, seen: true } : story
        );

        return {
          ...group,
          stories,
          allSeen: stories.every((story) => story.seen),
        };
      })
    );
  };

  const handleDeleted = (storyId) => {
    setGroups((current) =>
      current
        .map((group) => ({
          ...group,
          stories: group.stories.filter(
            (story) => story._id !== storyId
          ),
        }))
        .filter((group) => group.stories.length > 0)
    );
  };

  const handleCreated = (story) => {
    if (
      !story?._id ||
      !(story?.image_url || story?.thumbnail_url) ||
      !user
    ) {
      return;
    }

    const viewerUser = {
      username: user.username,
      name: user.name,
      profile_image: getUserAvatar(user),
    };
    const storyEntry = {
      ...story,
      seen: false,
      isMine: true,
      createdAt: story.createdAt ?? new Date().toISOString(),
    };
    const current = groupsRef.current;
    const ownIndex = current.findIndex(
      (group) =>
        group.isMine || group.user?.username === user.username
    );

    let nextGroups;
    let openIndex;

    if (ownIndex >= 0) {
      nextGroups = current.map((group, index) => {
        if (index !== ownIndex) return group;

        const stories = [storyEntry, ...group.stories];

        return {
          ...group,
          stories,
          allSeen: false,
        };
      });
      openIndex = ownIndex;
    } else {
      const ownGroup = {
        user: viewerUser,
        stories: [storyEntry],
        allSeen: false,
        isMine: true,
      };

      nextGroups = [ownGroup, ...current];
      openIndex = 0;
    }

    groupsRef.current = nextGroups;
    setGroups(nextGroups);
    setViewer({ groups: nextGroups, index: openIndex });
  };

  if (!user) return null;

  if (loading && groups.length === 0) return <RailSkeleton />;

  if (failed && groups.length === 0) return null;

  const ownGroupIndex = groups.findIndex(
    (group) => group.isMine || group.user?.username === user.username
  );
  const ownGroup = ownGroupIndex >= 0 ? groups[ownGroupIndex] : null;
  const otherGroups = groups.filter(
    (_, index) => index !== ownGroupIndex
  );

  return (
    <>
      <section className="story-rail" aria-label="Stories">
        <h2 className="sr-only">Stories</h2>

        <ul className="story-rail-list">
          {ownGroup ? (
            <li className="story-group-item">
              <div className="story-group-wrap">
                <button
                  type="button"
                  className="story-group-button"
                  onClick={() =>
                    setViewer({
                      groups: groupsRef.current,
                      index: ownGroupIndex,
                    })
                  }
                  aria-label={`Open your story${
                    ownGroup.allSeen ? ", all seen" : ", unseen"
                  }`}
                >
                  <span
                    className={`story-ring${
                      ownGroup.allSeen ? " is-seen" : ""
                    }`}
                  >
                    <span className="story-ring-inner">
                      <Avatar
                        src={getUserAvatar(user)}
                        name={user.username}
                        className="avatar--story-tile"
                      />
                    </span>
                  </span>
                  <span className="story-group-name">Your story</span>
                </button>

                <button
                  type="button"
                  className="story-group-add"
                  onClick={() => setComposerOpen(true)}
                  aria-label="Add to your story"
                >
                  <span aria-hidden="true">+</span>
                </button>
              </div>
            </li>
          ) : (
            <li className="story-group-item">
              <button
                type="button"
                className="story-group-button story-group-button--self"
                onClick={() => setComposerOpen(true)}
                aria-label="Create a story"
              >
                <span className="story-ring story-ring--self">
                  <span className="story-ring-inner">
                    <Avatar
                      src={getUserAvatar(user)}
                      name={user.username}
                      className="avatar--story-tile"
                    />
                  </span>
                  <span className="story-self-plus" aria-hidden="true">
                    +
                  </span>
                </span>
                <span className="story-group-name">Your story</span>
              </button>
            </li>
          )}

          {otherGroups.map((group) => {
            const username = group.user?.username || "unknown";
            const displayName = group.user?.name || username;
            const index = groups.indexOf(group);

            return (
              <li className="story-group-item" key={username}>
                <button
                  type="button"
                  className="story-group-button"
                  onClick={() =>
                    setViewer({
                      groups: groupsRef.current,
                      index,
                    })
                  }
                  aria-label={`Open stories from ${displayName}${
                    group.allSeen ? ", all seen" : ", unseen"
                  }`}
                >
                  <span
                    className={`story-ring${
                      group.allSeen ? " is-seen" : ""
                    }`}
                  >
                    <span className="story-ring-inner">
                      <Avatar
                        src={getUserAvatar(group.user)}
                        name={displayName}
                        className="avatar--story-tile"
                      />
                    </span>
                  </span>

                  <span className="story-group-name">{displayName}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {composerOpen && (
        <StoryComposer
          onClose={() => setComposerOpen(false)}
          onCreated={handleCreated}
        />
      )}

      {viewer && (
        <StoryViewer
          groups={viewer.groups}
          initialGroupIndex={viewer.index}
          onClose={() => setViewer(null)}
          onSeen={handleSeen}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
};

export default StoryRail;
