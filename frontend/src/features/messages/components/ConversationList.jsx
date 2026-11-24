import { useId, useState } from "react";
import ConversationRow from "./ConversationRow";

const ConversationRowSkeleton = () => (
  <li className="messages-convo-skeleton" aria-hidden="true">
    <span className="messages-skeleton-avatar" />
    <span className="messages-skeleton-copy">
      <span className="messages-skeleton-line messages-skeleton-line--short" />
      <span className="messages-skeleton-line" />
    </span>
  </li>
);

const matchesSearch = (conversation, query) => {
  if (!query) return true;

  const otherUser = conversation?.otherUser ?? {};
  const haystack = `${otherUser.username ?? ""} ${
    otherUser.name ?? ""
  }`.toLowerCase();

  return haystack.includes(query.toLowerCase());
};

const ConversationList = ({
  conversations = [],
  selectedId = null,
  viewerName = "",
  loading = false,
  error = "",
  onRetry,
  onNew,
  nextCursor = null,
  loadingMore = false,
  loadMoreError = "",
  onLoadMore,
}) => {
  const [search, setSearch] = useState("");
  const searchId = useId();
  const query = search.trim();
  const visible = conversations.filter((conversation) =>
    matchesSearch(conversation, query)
  );
  const isInitialLoading = loading && conversations.length === 0;
  const isInitialError = Boolean(error) && conversations.length === 0;

  return (
    <div className="messages-sidebar">
      <header className="messages-head">
        <h1>Messages</h1>
        <button
          type="button"
          className="messages-new"
          onClick={onNew}
          aria-label="New message"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4H5.8A1.8 1.8 0 0 0 4 5.8v12.4A1.8 1.8 0 0 0 5.8 20h12.4a1.8 1.8 0 0 0 1.8-1.8V12" />
            <path d="m16.5 3.9 3.6 3.6" />
            <path d="M20.1 7.5 11 16.6l-4.2.7.7-4.2 9.1-9.1a1.3 1.3 0 0 1 1.8 0l1.7 1.7a1.3 1.3 0 0 1 0 1.8Z" />
          </svg>
        </button>
      </header>

      <div className="messages-search">
        <label htmlFor={searchId} className="sr-only">
          Search conversations
        </label>
        <div className="messages-search-field">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4.1-4.1" />
          </svg>
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            autoComplete="off"
          />
          {search && (
            <button
              type="button"
              className="messages-search-clear"
              onClick={() => setSearch("")}
              aria-label="Clear conversation search"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="m9 9 6 6M15 9l-6 6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="messages-list">
        {error && conversations.length > 0 && (
          <div className="messages-list-alert" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="quiet-button"
              onClick={onRetry}
              disabled={loading}
            >
              Try again
            </button>
          </div>
        )}

        {isInitialLoading ? (
          <ul className="messages-convo-list" aria-hidden="true">
            <ConversationRowSkeleton />
            <ConversationRowSkeleton />
            <ConversationRowSkeleton />
            <ConversationRowSkeleton />
          </ul>
        ) : isInitialError ? (
          <div className="messages-list-state" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="button secondary-button button--small"
              onClick={onRetry}
            >
              Try again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="messages-list-state">
            <p className="messages-list-title">
              {conversations.length > 0
                ? "No conversations match"
                : "No messages yet"}
            </p>
            <p>
              {conversations.length > 0
                ? `Nothing matches "${query}". Try another name.`
                : "Start a conversation and it will show up here."}
            </p>
            {conversations.length === 0 && (
              <button
                type="button"
                className="button secondary-button button--small"
                onClick={onNew}
              >
                Start a conversation
              </button>
            )}
          </div>
        ) : (
          <ul
            className="messages-convo-list"
            aria-label="Conversations"
          >
            {visible.map((conversation) => (
              <ConversationRow
                key={conversation._id}
                conversation={conversation}
                selected={conversation._id === selectedId}
                viewerName={viewerName}
              />
            ))}
          </ul>
        )}

        {!isInitialLoading && !isInitialError && nextCursor && (
          <div className="messages-list-more">
            {loadMoreError && (
              <p className="messages-inline-error" role="alert">
                {loadMoreError}
              </p>
            )}
            <button
              type="button"
              className="quiet-button"
              onClick={onLoadMore}
              disabled={loadingMore}
              aria-busy={loadingMore}
            >
              {loadingMore ? "Loading..." : "Load more conversations"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
