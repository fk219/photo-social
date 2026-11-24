import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { getErrorMessage } from "../../shared/utils/error";
import { requestUnreadRefresh } from "../../social/social.context";
import {
  getConversation,
  getConversations,
  markConversationRead,
  sendMessage,
  startConversation,
} from "../services/messages.api";
import ChatPane from "../components/ChatPane";
import ConversationList from "../components/ConversationList";
import NewMessageDialog from "../components/NewMessageDialog";
import { mergeMessages, sortMessages } from "../components/messageDate";
import "../style/messages.scss";

const LIST_LIMIT = 20;
const DETAIL_LIMIT = 30;
const LIST_POLL_MS = 20000;
const CHAT_POLL_MS = 5000;

const EMPTY_DETAIL = {
  conversation: null,
  otherUser: null,
  messages: [],
  loading: false,
  error: "",
  notFound: false,
  nextCursor: null,
};

const timeOf = (value) => {
  if (!value) return 0;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const sortConversations = (conversations) =>
  [...conversations].sort(
    (a, b) => timeOf(b?.lastMessageAt) - timeOf(a?.lastMessageAt)
  );

const mergeConversations = (current, incoming) => {
  const merged = new Map(current.map((conversation) => [conversation._id, conversation]));

  incoming.forEach((conversation) => {
    if (!conversation?._id) return;

    merged.set(conversation._id, {
      ...(merged.get(conversation._id) ?? {}),
      ...conversation,
    });
  });

  return sortConversations([...merged.values()]);
};

const Messages = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, initializing } = useAuth();
  const viewerName = user?.username ?? "";
  const toUsername = (searchParams.get("to") || "").trim();

  const [conversations, setConversations] = useState([]);
  const [listStatus, setListStatus] = useState("loading");
  const [listError, setListError] = useState("");
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const [listReloadKey, setListReloadKey] = useState(0);

  const [detail, setDetail] = useState(EMPTY_DETAIL);
  const [detailReloadKey, setDetailReloadKey] = useState(0);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [toError, setToError] = useState("");
  const [startingTo, setStartingTo] = useState(false);

  const messagesRef = useRef([]);
  const startedToRef = useRef("");
  const mountedRef = useRef(true);
  const pollTickRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    messagesRef.current = detail.messages;
  }, [detail.messages]);

  const markRead = useCallback(async (id) => {
    if (!id) return;

    try {
      await markConversationRead(id);

      if (!mountedRef.current) return;

      setConversations((current) =>
        current.map((conversation) =>
          conversation._id === id
            ? { ...conversation, unreadCount: 0 }
            : conversation
        )
      );
      requestUnreadRefresh();
    } catch {
      // A read receipt can be retried the next time the conversation opens.
    }
  }, []);

  const upsertConversation = useCallback((conversation) => {
    if (!conversation?._id) return;

    setConversations((current) => {
      const exists = current.some((item) => item._id === conversation._id);
      const next = exists
        ? current.map((item) =>
            item._id === conversation._id
              ? { ...item, ...conversation }
              : item
          )
        : [conversation, ...current];

      return sortConversations(next);
    });
  }, []);

  useEffect(() => {
    if (!viewerName) return undefined;

    let active = true;

    setListStatus("loading");
    setListError("");

    getConversations({ limit: LIST_LIMIT })
      .then((data) => {
        if (!active) return;

        setConversations(
          Array.isArray(data?.conversations) ? data.conversations : []
        );
        setNextCursor(data?.nextCursor ?? null);
        setListStatus("ready");
      })
      .catch((err) => {
        if (!active) return;

        setListError(
          getErrorMessage(err, "Your messages could not be loaded. Try again.")
        );
        setListStatus("error");
      });

    return () => {
      active = false;
    };
  }, [viewerName, listReloadKey]);

  useEffect(() => {
    if (!viewerName) return undefined;

    const poll = () => {
      if (document.visibilityState !== "visible") return;

      getConversations({ limit: LIST_LIMIT })
        .then((data) => {
          if (!mountedRef.current) return;

          const incoming = Array.isArray(data?.conversations)
            ? data.conversations
            : [];

          if (incoming.length === 0) return;

          setConversations((current) =>
            mergeConversations(current, incoming)
          );
        })
        .catch(() => {
          // The inbox keeps the conversations it already has.
        });
    };

    const timer = window.setInterval(poll, LIST_POLL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") poll();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [viewerName]);

  useEffect(() => {
    if (!conversationId || !viewerName) {
      setDetail(EMPTY_DETAIL);
      return undefined;
    }

    let active = true;

    setDetail({ ...EMPTY_DETAIL, loading: true });

    getConversation(conversationId, { limit: DETAIL_LIMIT })
      .then((data) => {
        if (!active) return;

        const conversation = data?.conversation ?? null;
        const otherUser =
          data?.otherUser ?? conversation?.otherUser ?? null;
        const messages = sortMessages(
          Array.isArray(data?.messages) ? data.messages : []
        );

        setDetail({
          conversation,
          otherUser,
          messages,
          loading: false,
          error: "",
          notFound: false,
          nextCursor: data?.nextCursor ?? null,
        });

        if (conversation?._id) {
          upsertConversation({ ...conversation, otherUser });
        }

        markRead(conversationId);
      })
      .catch((err) => {
        if (!active) return;

        const notFound = err?.response?.status === 404;

        setDetail({
          ...EMPTY_DETAIL,
          notFound,
          error: notFound
            ? ""
            : getErrorMessage(
                err,
                "This conversation could not be loaded. Try again."
              ),
        });
      });

    return () => {
      active = false;
    };
  }, [conversationId, viewerName, detailReloadKey, markRead, upsertConversation]);

  useEffect(() => {
    if (!conversationId || !viewerName) return undefined;

    let active = true;

    const poll = async () => {
      if (document.visibilityState !== "visible") return;

      const current = messagesRef.current;
      const lastId = current[current.length - 1]?._id;

      if (lastId && String(lastId).startsWith("temp-")) return;

      pollTickRef.current += 1;

      // A lightweight full sync every 30 seconds refreshes read receipts on
      // messages that were already on screen. The other polls stay incremental.
      const syncReads = pollTickRef.current % 6 === 0;

      try {
        const data = await getConversation(
          conversationId,
          lastId && !syncReads
            ? { after: lastId, limit: DETAIL_LIMIT }
            : { limit: DETAIL_LIMIT }
        );

        if (!active) return;

        const incoming = sortMessages(
          Array.isArray(data?.messages) ? data.messages : []
        );
        const known = new Set(current.map((message) => message?._id));
        const fresh = incoming.filter(
          (message) => message?._id && !known.has(message._id)
        );

        if (fresh.length === 0 && !syncReads) return;

        setDetail((previous) => ({
          ...previous,
          conversation: data?.conversation ?? previous.conversation,
          otherUser: data?.otherUser ?? previous.otherUser,
          messages: mergeMessages(previous.messages, incoming),
        }));

        if (fresh.some((message) => !message.isMine)) {
          markRead(conversationId);
        }
      } catch {
        // A visible conversation retries on the next poll.
      }
    };

    const timer = window.setInterval(poll, CHAT_POLL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") poll();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [conversationId, viewerName, markRead]);

  useEffect(() => {
    if (!toUsername || !viewerName) return undefined;
    if (startedToRef.current === toUsername) return undefined;

    startedToRef.current = toUsername;

    setStartingTo(true);
    setToError("");

    startConversation(toUsername)
      .then((data) => {
        if (!mountedRef.current) return;

        const conversation = data?.conversation;

        if (!conversation?._id) {
          throw new Error("That conversation could not be opened.");
        }

        upsertConversation(conversation);
        setStartingTo(false);
        navigate(`/messages/${conversation._id}`, { replace: true });
      })
      .catch((err) => {
        if (!mountedRef.current) return;

        startedToRef.current = "";
        setStartingTo(false);
        setToError(
          getErrorMessage(
            err,
            "That conversation could not be started. Try again."
          )
        );
      });

    return undefined;
  }, [toUsername, viewerName, upsertConversation, navigate]);

  const handleSend = useCallback(
    async (text) => {
      if (!conversationId) {
        throw new Error("Choose a conversation before sending a message.");
      }

      const temporaryId = `temp-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const optimistic = {
        _id: temporaryId,
        sender: viewerName,
        text,
        post: null,
        readBy: [],
        createdAt: new Date().toISOString(),
        isMine: true,
        pending: true,
      };

      setDetail((previous) => ({
        ...previous,
        messages: sortMessages([...previous.messages, optimistic]),
      }));

      try {
        const data = await sendMessage(conversationId, { text });
        const saved = data?.message
          ? {
              ...data.message,
              sender: data.message.sender ?? viewerName,
              isMine: true,
              pending: false,
            }
          : { ...optimistic, pending: false };

        if (!mountedRef.current) return;

        setDetail((previous) => ({
          ...previous,
          messages: sortMessages(
            previous.messages.map((message) =>
              message._id === temporaryId ? saved : message
            )
          ),
        }));

        setConversations((current) =>
          sortConversations(
            current.map((conversation) =>
              conversation._id === conversationId
                ? {
                    ...conversation,
                    lastMessage: saved.text ?? text,
                    lastMessageAt:
                      saved.createdAt ?? optimistic.createdAt,
                    lastSender: saved.sender ?? viewerName,
                    unreadCount: 0,
                  }
                : conversation
            )
          )
        );
      } catch (err) {
        if (mountedRef.current) {
          setDetail((previous) => ({
            ...previous,
            messages: previous.messages.filter(
              (message) => message._id !== temporaryId
            ),
          }));
        }

        throw new Error(
          getErrorMessage(err, "Your message could not be sent. Try again.")
        );
      }
    },
    [conversationId, viewerName]
  );

  const loadMoreConversations = async () => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    setLoadMoreError("");

    try {
      const data = await getConversations({
        cursor: nextCursor,
        limit: LIST_LIMIT,
      });

      if (!mountedRef.current) return;

      const incoming = Array.isArray(data?.conversations)
        ? data.conversations
        : [];

      setConversations((current) => mergeConversations(current, incoming));
      setNextCursor(data?.nextCursor ?? null);
    } catch (err) {
      if (mountedRef.current) {
        setLoadMoreError(
          getErrorMessage(err, "More conversations could not be loaded.")
        );
      }
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  };

  if (initializing) {
    return (
      <main className="route-loading" id="main-content" role="status">
        <span className="spinner" aria-hidden="true" />
        <span>Opening your messages...</span>
      </main>
    );
  }

  const selectedSummary = conversations.find(
    (conversation) => conversation._id === conversationId
  );
  const otherUser =
    detail.otherUser ?? selectedSummary?.otherUser ?? null;

  return (
    <main className="messages-page" id="main-content">
      <div className="page-shell page-shell--messages">
        {startingTo && (
          <div className="messages-alert messages-alert--info" role="status">
            <span className="spinner" aria-hidden="true" />
            <p>Opening the conversation...</p>
          </div>
        )}

        {toError && (
          <div className="messages-alert" role="alert">
            <p>{toError}</p>
            <div className="messages-alert-actions">
              <button
                type="button"
                className="quiet-button"
                onClick={() => setToError("")}
              >
                Dismiss
              </button>
              <button
                type="button"
                className="quiet-button"
                onClick={() => {
                  setToError("");
                  setNewMessageOpen(true);
                }}
              >
                Choose someone
              </button>
            </div>
          </div>
        )}

        <div
          className={`messages-app${
            conversationId ? " has-selection" : ""
          }`}
        >
          <ConversationList
            conversations={conversations}
            selectedId={conversationId ?? null}
            viewerName={viewerName}
            loading={listStatus === "loading"}
            error={listError}
            onRetry={() => setListReloadKey((key) => key + 1)}
            onNew={() => setNewMessageOpen(true)}
            nextCursor={nextCursor}
            loadingMore={loadingMore}
            loadMoreError={loadMoreError}
            onLoadMore={loadMoreConversations}
          />

          <ChatPane
            conversationId={conversationId}
            otherUser={otherUser}
            messages={detail.messages}
            loading={detail.loading}
            error={detail.error}
            notFound={detail.notFound}
            onRetry={() => setDetailReloadKey((key) => key + 1)}
            onSend={handleSend}
          />
        </div>
      </div>

      {newMessageOpen && (
        <NewMessageDialog
          onClose={() => setNewMessageOpen(false)}
          onStarted={(conversation) => {
            upsertConversation(conversation);
            navigate(`/messages/${conversation._id}`);
          }}
        />
      )}
    </main>
  );
};

export default Messages;
