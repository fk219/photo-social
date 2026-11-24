import { useEffect, useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { getErrorMessage } from "../../shared/utils/error";
import { getSuggestedUsers } from "../../users/services/user.api";
import { getTrendingTags } from "../services/search.api";
import PersonRow from "./PersonRow";
import {
  normalizeTags,
  normalizeUsers,
  tagCountLabel,
  tagLabel,
} from "./searchUtils";

const RowSkeleton = ({ count = 3 }) => (
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

const SearchDiscover = ({
  recentSearches,
  onSelectQuery,
  onClearRecent,
}) => {
  const { user } = useAuth();
  const [trending, setTrending] = useState([]);
  const [trendingStatus, setTrendingStatus] = useState("loading");
  const [trendingError, setTrendingError] = useState("");
  const [trendingRetry, setTrendingRetry] = useState(0);

  const [people, setPeople] = useState([]);
  const [peopleStatus, setPeopleStatus] = useState(
    user ? "loading" : "idle"
  );
  const [peopleError, setPeopleError] = useState("");
  const [peopleRetry, setPeopleRetry] = useState(0);

  useEffect(() => {
    let active = true;

    setTrendingStatus("loading");
    setTrendingError("");

    getTrendingTags()
      .then((data) => {
        if (!active) return;

        setTrending(normalizeTags(data));
        setTrendingStatus("ready");
      })
      .catch((err) => {
        if (!active) return;

        setTrendingError(
          getErrorMessage(err, "Trending tags could not be loaded.")
        );
        setTrendingStatus("error");
      });

    return () => {
      active = false;
    };
  }, [trendingRetry]);

  useEffect(() => {
    if (!user) {
      setPeople([]);
      setPeopleStatus("idle");
      setPeopleError("");
      return undefined;
    }

    let active = true;

    setPeopleStatus("loading");
    setPeopleError("");

    getSuggestedUsers(5)
      .then((data) => {
        if (!active) return;

        setPeople(normalizeUsers(data).slice(0, 5));
        setPeopleStatus("ready");
      })
      .catch((err) => {
        if (!active) return;

        setPeopleError(
          getErrorMessage(err, "Suggested people could not be loaded.")
        );
        setPeopleStatus("error");
      });

    return () => {
      active = false;
    };
  }, [user, peopleRetry]);

  return (
    <div className="search-discover">
      <p className="search-discover-lead">
        Find people to follow, posts to open and tags to browse.
      </p>

      {recentSearches.length > 0 && (
        <section className="search-section" aria-labelledby="search-recent-title">
          <div className="search-section-head">
            <h2 id="search-recent-title">Recent searches</h2>
            <button
              type="button"
              className="quiet-button"
              onClick={onClearRecent}
            >
              Clear
            </button>
          </div>

          <ul className="search-recent-list">
            {recentSearches.map((term) => (
              <li key={term}>
                <button
                  type="button"
                  className="search-recent-row"
                  onClick={() => onSelectQuery(term)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="8.2" />
                    <path d="M12 7.6V12l2.7 1.7" />
                  </svg>
                  <span>{term}</span>
                  <svg className="search-recent-arrow" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m9 5 7 7-7 7" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="search-section" aria-labelledby="search-trending-title">
        <div className="search-section-head">
          <h2 id="search-trending-title">Trending tags</h2>
        </div>

        {trendingStatus === "loading" ? (
          <RowSkeleton count={4} />
        ) : trendingStatus === "error" ? (
          <div className="search-section-error" role="alert">
            <p>{trendingError}</p>
            <button
              type="button"
              className="quiet-button"
              onClick={() => setTrendingRetry((key) => key + 1)}
            >
              Try again
            </button>
          </div>
        ) : trending.length === 0 ? (
          <p className="search-section-empty">No trending tags right now.</p>
        ) : (
          <ul className="search-tag-list">
            {trending.map((item) => (
              <li key={item.tag}>
                <button
                  type="button"
                  className="search-tag-row"
                  onClick={() => onSelectQuery(tagLabel(item.tag))}
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
        )}
      </section>

      {user && (peopleStatus !== "ready" || people.length > 0) ? (
        <section className="search-section" aria-labelledby="search-people-title">
          <div className="search-section-head">
            <h2 id="search-people-title">Suggested people</h2>
          </div>

          {peopleStatus === "loading" ? (
            <RowSkeleton count={3} />
          ) : peopleStatus === "error" ? (
            <div className="search-section-error" role="alert">
              <p>{peopleError}</p>
              <button
                type="button"
                className="quiet-button"
                onClick={() => setPeopleRetry((key) => key + 1)}
              >
                Try again
              </button>
            </div>
          ) : (
            <ul className="people-list">
              {people.map((person) => (
                <PersonRow key={person.username} person={person} />
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
};

export default SearchDiscover;
