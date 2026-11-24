import { Link } from "react-router-dom";
import Avatar from "../../shared/components/Avatar";
import {
  formatCount,
  formatFullDate,
  formatRelativeTime,
  getUserAvatar,
} from "../../shared/utils/format";

const lastMessageText = (conversation, viewerName) => {
  const last = conversation?.lastMessage;

  let text = "";

  if (typeof last === "string") {
    text = last;
  } else if (last && typeof last === "object") {
    if (typeof last.text === "string") {
      text = last.text;
    } else if (last.post) {
      text = "Shared a post";
    }
  }

  if (!text) return "";

  const sender =
    typeof conversation?.lastSender === "string"
      ? conversation.lastSender
      : conversation?.lastSender?.username;

  if (viewerName && sender === viewerName) {
    return `You: ${text}`;
  }

  return text;
};

const ConversationRow = ({ conversation, selected, viewerName }) => {
  const otherUser = conversation?.otherUser ?? {};
  const username = otherUser.username || "unknown";
  const displayName = otherUser.name || username;
  const unreadCount = Math.max(0, Number(conversation?.unreadCount) || 0);
  const postedAt = formatRelativeTime(conversation?.lastMessageAt);
  const messageText = lastMessageText(conversation, viewerName);

  return (
    <li>
      <Link
        to={`/messages/${conversation._id}`}
        className={`messages-convo${selected ? " is-active" : ""}`}
        aria-current={selected ? "page" : undefined}
        aria-label={`Conversation with ${displayName} (@${username})${
          unreadCount > 0
            ? `, ${unreadCount} unread ${
                unreadCount === 1 ? "message" : "messages"
              }`
            : ""
        }`}
      >
        <Avatar
          src={getUserAvatar(otherUser)}
          name={displayName}
          className="avatar--conversation"
        />

        <span className="messages-convo-main">
          <span className="messages-convo-head">
            <span className="messages-convo-name">{displayName}</span>
            <span className="messages-convo-handle">@{username}</span>
          </span>

          <span
            className={`messages-convo-preview${
              messageText ? "" : " is-empty"
            }`}
          >
            {messageText || "No messages yet"}
          </span>
        </span>

        <span className="messages-convo-meta">
          {postedAt && (
            <time
              className="messages-convo-time"
              dateTime={conversation.lastMessageAt}
              title={formatFullDate(conversation.lastMessageAt) || undefined}
            >
              {postedAt}
            </time>
          )}

          {unreadCount > 0 && (
            <span className="messages-unread" aria-hidden="true">
              {formatCount(unreadCount)}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
};

export default ConversationRow;
