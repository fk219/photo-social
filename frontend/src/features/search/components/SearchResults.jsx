import PostGrid, {
  PostGridSkeleton,
} from "../../posts/components/PostGrid";
import PersonRow from "./PersonRow";
import { tagCountLabel, tagLabel } from "./searchUtils";

const RowSkeleton = ({ count = 4 }) => (
  <div className="search-row-skeleton" aria-hidden="true">
    {Array.from({ length: count }).map((_, index) => (
      <div className="search-skeleton-row" key={index}>
        <span className="search-skeleton-avatar" />
        <span className="search-skeleton-copy">
          <span className="search-skeleton-line" />
          <span className="search-skeleton-line search-skeleton-line--short" />
        </span>
      </div>
    ))}
  </div>
);

const EmptyResult = ({ tab, query, onClearQuery }) => {
  const titles = {
    all: "No results found",
    people: "No people found",
    posts: "No posts found",
    tags: "No tags found",
  };
  const descriptions = {
    all: `Nothing on Mosaic matched "${query}". Try a different name, keyword or tag.`,
    people: `No accounts matched "${query}". Try a different name or username.`,
    posts: `No posts matched "${query}". Try a different keyword or tag.`,
    tags: `No tags matched "${query}". Try a shorter tag or a different topic.`,
  };

  return (
    <section className="search-state" aria-live="polite">
      <h2>{titles[tab] ?? titles.all}</h2>
      <p>{descriptions[tab] ?? descriptions.all}</p>
      <button
        type="button"
        className="button secondary-button"
        onClick={onClearQuery}
      >
        Clear search
      </button>
    </section>
  );
};

const TagResults = ({ tags, onSelectTag }) => (
  <ul className="search-tag-list">
    {tags.map((item) => (
      <li key={item.tag}>
        <button
          type="button"
          className="search-tag-row"
          onClick={() => onSelectTag(item.tag)}
        >
          <span className="search-tag-name">{tagLabel(item.tag)}</span>
          {tagCountLabel(item.count) && (
            <span className="search-tag-count">
              {tagCountLabel(item.count)}
            </span>
          )}
        </button>
      </li>
    ))}
  </ul>
);

const PeopleResults = ({ people }) => (
  <ul className="people-list">
    {people.map((person) => (
      <PersonRow key={person.username} person={person} />
    ))}
  </ul>
);

const SearchResults = ({
  tab,
  status,
  results,
  error,
  query,
  onRetry,
  onSelectPost,
  onSelectTag,
  onClearQuery,
}) => {
  const users = Array.isArray(results?.users) ? results.users : [];
  const posts = Array.isArray(results?.posts) ? results.posts : [];
  const tags = Array.isArray(results?.tags) ? results.tags : [];
  const loading = status === "loading" || status === "idle";

  if (loading) {
    if (tab === "posts") {
      return (
        <div className="search-loading" role="status">
          <span className="sr-only">Searching posts...</span>
          <PostGridSkeleton count={9} />
        </div>
      );
    }

    if (tab === "tags") {
      return (
        <div className="search-loading" role="status">
          <span className="sr-only">Searching tags...</span>
          <RowSkeleton count={5} />
        </div>
      );
    }

    return (
      <div className="search-loading" role="status">
        <span className="sr-only">
          {tab === "people" ? "Searching people..." : "Searching..."}
        </span>
        <RowSkeleton count={tab === "people" ? 5 : 4} />
      </div>
    );
  }

  if (status === "error") {
    return (
      <section className="search-state" role="alert">
        <h2>Search failed</h2>
        <p>{error}</p>
        <button
          type="button"
          className="button primary-button"
          onClick={onRetry}
        >
          Try again
        </button>
      </section>
    );
  }

  const nothing =
    tab === "people"
      ? users.length === 0
      : tab === "posts"
        ? posts.length === 0
        : tab === "tags"
          ? tags.length === 0
          : users.length === 0 && posts.length === 0 && tags.length === 0;

  if (nothing) {
    return (
      <EmptyResult
        tab={tab}
        query={query}
        onClearQuery={onClearQuery}
      />
    );
  }

  if (tab === "people") {
    return (
      <section className="search-section" aria-labelledby="search-result-people">
        <div className="search-section-head">
          <h2 id="search-result-people">People</h2>
        </div>
        <PeopleResults people={users} />
      </section>
    );
  }

  if (tab === "posts") {
    return (
      <section className="search-section search-section--posts" aria-labelledby="search-result-posts">
        <div className="search-section-head">
          <h2 id="search-result-posts">Posts</h2>
        </div>
        <PostGrid posts={posts} onSelect={onSelectPost} />
      </section>
    );
  }

  if (tab === "tags") {
    return (
      <section className="search-section" aria-labelledby="search-result-tags">
        <div className="search-section-head">
          <h2 id="search-result-tags">Tags</h2>
        </div>
        <TagResults tags={tags} onSelectTag={onSelectTag} />
      </section>
    );
  }

  return (
    <div className="search-results-all">
      {users.length > 0 && (
        <section className="search-section" aria-labelledby="search-result-people">
          <div className="search-section-head">
            <h2 id="search-result-people">People</h2>
          </div>
          <PeopleResults people={users.slice(0, 6)} />
        </section>
      )}

      {posts.length > 0 && (
        <section className="search-section search-section--posts" aria-labelledby="search-result-posts">
          <div className="search-section-head">
            <h2 id="search-result-posts">Posts</h2>
          </div>
          <PostGrid posts={posts} onSelect={onSelectPost} />
        </section>
      )}

      {tags.length > 0 && (
        <section className="search-section" aria-labelledby="search-result-tags">
          <div className="search-section-head">
            <h2 id="search-result-tags">Tags</h2>
          </div>
          <TagResults tags={tags} onSelectTag={onSelectTag} />
        </section>
      )}
    </div>
  );
};

export default SearchResults;
