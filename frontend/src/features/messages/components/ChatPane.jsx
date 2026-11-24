import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "../../shared/components/Avatar";
import {
  formatFullDate,
  formatRelativeTime,
  getUserAvatar,
} from "../../shared/utils/format";
import MessageComposer from "./MessageComposer";
import { groupMessagesByDay } from "./messageDate";

const PhotoGlyph = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="6" width="18" height="14" rx="2" />
    <circle cx="12" cy="13" r="3.2" />
    <path d="m8 6 1.4-2h5.2L16 6" />
  </svg>
);

const SharedPostCard = ({ post }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const image = post?.thumbnail_url || post?.image_url || "";
  const author =
    post?.user?.username || post?.username || post?.author?.username || "";
  const caption =
    typeof post?.caption === "string" ? post.caption.trim() : "";
  const label = author ? `Open post by @${author}` : "Open shared post";

  const content = (
    <>
      <span className="messages-post-thumb">
        {image && !imageFailed ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="messages-post-fallback" role="img" aria-label="Photo unavailable">
            <PhotoGlyph />
          </span>
        )}
      </span>

      <span className="messages-post-copy">
        <span className="messages-post-author">
          {author ? `@${author}` : "Shared post"}
        </span>
        {caption && <span className="messages-post-caption">{caption}</span>}
        <span className="messages-post-cta">View post</span>
      </span>
    </>
  );

  if (!post?._id) {
    return <div className="messages-post-card">{content}</div>;
  }

  return (
    <Link
      to={`/p/${post._id}`}
      className="messages-post-card"
      aria-label={label}
    >
      {content}
    </Link>
  );
};

const ChatSkeleton = () => (
  <div className="messages-chat-loading" role="status">
    <span className="sr-only">Loading conversation...</span>
    <span className="messages-bubble-skeleton messages-bubble-skeleton--left" />
    <span className="messages-bubble-skeleton messages-bubble-skeleton--right" />
    <span className="messages-bubble-skeleton messages-bubble-skeleton--left" />
  </div>
);

const ChatPane = ({
  conversationId,
  otherUser,
  messages = [],
  loading = false,
  error = "",
  notFound = false,
  onRetry,
  onSend,
}) => {
  const scrollRef = useRef(null);
  const nearBottomRef = useRef(true);
  const previousCountRef = useRef(0);

  const username = otherUser?.username || "";
  const displayName = otherUser?.name || username || "Conversation";
  const profilePath = username ? `/u/${encodeURIComponent(username)}` : "/";
  const groups = groupMessagesByDay(messages);
  const lastOwnMessage = [...messages]
    .reverse()
    .find((message) => message?.isMine);
  const otherUsername = otherUser?.username || "";

  useEffect(() => {
    nearBottomRef.current = true;
    previousCountRef.current = 0;
  }, [conversationId]);

  useEffect(() => {
    if (loading) return undefined;

    const count = messages.length;
    const previous = previousCountRef.current;
    const last = messages[count - 1];
    const shouldStick = nearBottomRef.current || Boolean(last?.isMine);

    previousCountRef.current = count;

    if (count === 0 || count <= previous) return undefined;
    if (!shouldStick) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const element = scrollRef.current;
      if (element) element.scrollTop = element.scrollHeight;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages, loading]);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;

    const distance =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    nearBottomRef.current = distance < 120;
  };

  const showConversation = Boolean(conversationId);
  const showComposer =
    showConversation && !loading && !error && !notFound;

  return (
    <section
      className="messages-chat"
      aria-label={showConversation ? `Conversation with ${displayName}` : "Messages"}
    >
      <header className="messages-chat-head">
        <Link
          to="/messages"
          className="messages-back"
          aria-label="Back to messages"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>

        {showConversation && otherUser ? (
          <>
            <Avatar
              src={getUserAvatar(otherUser)}
              name={displayName}
              className="avatar--chat"
            />

            <div className="messages-chat-person">
              <span className="messages-chat-name">{displayName}</span>
              {username ? (
                <Link to={profilePath} className="messages-chat-handle">
                  @{username}
                </Link>
              ) : (
                <span className="messages-chat-handle">Unknown account</span>
              )}
            </div>

            <Link
              to={profilePath}
              className="messages-profile-link"
              aria-label={username ? `Open @${username}'s profile` : "Open profile"}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8.4" r="3.6" />
                <path d="M4.8 20c.5-3.6 3.4-5.6 7.2-5.6s6.7 2 7.2 5.6" />
              </svg>
            </Link>
          </>
        ) : (
          <span className="messages-chat-heading">Messages</span>
        )}
      </header>

      {!showConversation ? (
        <div className="messages-chat-state messages-chat-state--empty">
          <span className="messages-state-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
            </svg>
          </span>
          <h2>Your messages</h2>
          <p>Choose a conversation from the inbox, or start a new one.</p>
        </div>
      ) : loading ? (
        <ChatSkeleton />
      ) : notFound ? (
        <div className="messages-chat-state">
          <h2>Conversation not found</h2>
          <p>
            This conversation may have been removed, or the link may be
            incomplete.
          </p>
          <Link to="/messages" className="button secondary-button">
            Browse messages
          </Link>
        </div>
      ) : error ? (
        <div className="messages-chat-state" role="alert">
          <h2>Conversation unavailable</h2>
          <p>{error}</p>
          <button
            type="button"
            className="button primary-button"
            onClick={onRetry}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="messages-scroll"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label={`Messages with ${displayName}`}
            tabIndex={0}
            onScroll={handleScroll}
          >
            {messages.length === 0 ? (
              <div className="messages-chat-state messages-chat-state--inline">
                <h2>No messages yet</h2>
                <p>
                  {username
                    ? `Start the conversation with @${username}.`
                    : "Send the first message to start the conversation."}
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <div className="messages-day-group" key={group.key}>
                  <div className="messages-day">
                    <span>{group.label}</span>
                  </div>

                  <ol className="messages-day-list">
                    {group.messages.map((message, index) => {
                      const text =
                        typeof message.text === "string"
                          ? message.text
                          : "";
                      const post = message.post ?? null;
                      const isMine = Boolean(message.isMine);
                      const next = group.messages[index + 1];
                      const isRunEnd =
                        !next || Boolean(next.isMine) !== isMine;
                      const postedAt = formatRelativeTime(message.createdAt);
                      const fullDate = formatFullDate(message.createdAt);
                      const isLastOwn =
                        isMine && message._id === lastOwnMessage?._id;
                      const seen =
                        isLastOwn &&
                        !message.pending &&
                        Boolean(otherUsername) &&
                        Array.isArray(message.readBy) &&
                        message.readBy.includes(otherUsername);

                      return (
                        <li
                          className={`messages-msg${
                            isMine ? " is-mine" : ""
                          }`}
                          key={message._id ?? `${group.key}-${index}`}
                        >
                          <div
                            className={`messages-bubble${
                              isMine ? " is-mine" : ""
                            }${post ? " has-post" : ""}${
                              message.pending ? " is-pending" : ""
                            }`}
                          >
                            {text && <p>{text}</p>}
                            {post && <SharedPostCard post={post} />}
                          </div>

                          {isRunEnd && (
                            <div
                              className={`messages-msg-meta${
                                isMine ? " is-mine" : ""
                              }`}
                            >
                              {message.pending ? (
                                <span>Sending...</span>
                              ) : (
                                postedAt && (
                                  <time
                                    dateTime={message.createdAt}
                                    title={fullDate || undefined}
                                  >
                                    {postedAt}
                                  </time>
                                )
                              )}
                              {seen && (
                                <span className="messages-seen">Seen</span>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))
            )}
          </div>

          {showComposer && <MessageComposer onSend={onSend} />}
        </>
      )}
    </section>
  );
};

export default ChatPane;
