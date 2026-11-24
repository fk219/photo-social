import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PostModal from "../../posts/components/PostModal";
import { getErrorMessage } from "../../shared/utils/error";
import { search } from "../services/search.api";
import SearchDiscover from "../components/SearchDiscover";
import SearchForm from "../components/SearchForm";
import SearchResults from "../components/SearchResults";
import SearchTabs from "../components/SearchTabs";
import {
  clearRecentSearches,
  readRecentSearches,
  rememberRecentSearch,
} from "../components/recentSearches";
import {
  EMPTY_RESULTS,
  normalizeSearchResults,
  normalizeSearchType,
  tagLabel,
} from "../components/searchUtils";
import "../style/search.scss";

const RESULTS_LIMIT = 30;

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawQuery = (searchParams.get("q") || "").trim();
  const rawType = normalizeSearchType(searchParams.get("type"));

  const [input, setInput] = useState(rawQuery);
  const [tab, setTab] = useState(rawType);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState(EMPTY_RESULTS);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [recentSearches, setRecentSearches] = useState(readRecentSearches);
  const [selectedPost, setSelectedPost] = useState(null);

  const inputRef = useRef(null);
  const requestRef = useRef(0);

  useEffect(() => {
    setInput(rawQuery);
  }, [rawQuery]);

  useEffect(() => {
    setTab(rawType);
  }, [rawType]);

  useEffect(() => {
    if (!window.matchMedia("(min-width: 761px)").matches) return;

    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setStatus(rawQuery ? "loading" : "idle");
    setResults(EMPTY_RESULTS);
    setError("");

    const timer = window.setTimeout(
      () => setDebouncedQuery(rawQuery),
      rawQuery ? 300 : 0
    );

    return () => window.clearTimeout(timer);
  }, [rawQuery]);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults(EMPTY_RESULTS);
      setStatus("idle");
      setError("");
      return undefined;
    }

    let active = true;
    const requestId = requestRef.current + 1;

    requestRef.current = requestId;
    setStatus("loading");
    setError("");
    setResults(EMPTY_RESULTS);

    search(debouncedQuery, { type: tab, limit: RESULTS_LIMIT })
      .then((data) => {
        if (!active || requestRef.current !== requestId) return;

        setResults(normalizeSearchResults(data));
        setStatus("ready");
      })
      .catch((err) => {
        if (!active || requestRef.current !== requestId) return;

        setError(
          getErrorMessage(err, "Search could not be completed. Try again.")
        );
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery, tab, retryKey]);

  const rememberQuery = useCallback((value) => {
    setRecentSearches(rememberRecentSearch(value));
  }, []);

  const applyQuery = (value, nextTab = "all") => {
    const query = value.trim();

    if (!query) return;

    setInput(query);
    setTab(nextTab);
    rememberQuery(query);

    const params = new URLSearchParams();
    params.set("q", query);

    if (nextTab !== "all") params.set("type", nextTab);

    setSearchParams(params);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextQuery = input.trim();

    if (!nextQuery) {
      setInput("");
      setSearchParams({});
      return;
    }

    if (nextQuery === rawQuery && tab === rawType) {
      setRetryKey((key) => key + 1);
      return;
    }

    rememberQuery(nextQuery);

    const params = new URLSearchParams();
    params.set("q", nextQuery);

    if (tab !== "all") params.set("type", tab);

    setSearchParams(params);
  };

  const handleTabChange = (nextTab) => {
    if (nextTab === tab || !rawQuery) return;

    setTab(nextTab);

    const params = new URLSearchParams(searchParams);

    if (nextTab === "all") {
      params.delete("type");
    } else {
      params.set("type", nextTab);
    }

    setSearchParams(params, { replace: true });
  };

  const handleClear = () => {
    setInput("");
    setSearchParams({});
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const handlePostUpdate = useCallback((postId, patch) => {
    setSelectedPost((current) =>
      current && current._id === postId ? { ...current, ...patch } : current
    );

    setResults((current) => {
      if (patch?.isSaved === false) {
        return {
          ...current,
          posts: current.posts.filter((post) => post._id !== postId),
        };
      }

      return {
        ...current,
        posts: current.posts.map((post) =>
          post._id === postId ? { ...post, ...patch } : post
        ),
      };
    });
  }, []);

  const handlePostDeleted = useCallback((postId) => {
    setResults((current) => ({
      ...current,
      posts: current.posts.filter((post) => post._id !== postId),
    }));
    setSelectedPost(null);
  }, []);

  return (
    <main className="search-page" id="main-content">
      <div className="page-shell page-shell--search">
        <header className="search-head">
          <h1>Search</h1>
          <SearchForm
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            onClear={handleClear}
            inputRef={inputRef}
          />
        </header>

        {rawQuery ? (
          <>
            <SearchTabs active={tab} onChange={handleTabChange} />

            <SearchResults
              tab={tab}
              status={status}
              results={results}
              error={error}
              query={rawQuery}
              onRetry={() => setRetryKey((key) => key + 1)}
              onSelectPost={setSelectedPost}
              onSelectTag={(tag) => applyQuery(tagLabel(tag), "all")}
              onClearQuery={handleClear}
            />
          </>
        ) : (
          <SearchDiscover
            recentSearches={recentSearches}
            onSelectQuery={(term) => applyQuery(term, "all")}
            onClearRecent={handleClearRecent}
          />
        )}
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

export default Search;
