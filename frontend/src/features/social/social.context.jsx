import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/hooks/useAuth";
import { getMessagesUnreadCount } from "../messages/services/messages.api";
import { getNotificationsUnreadCount } from "../notifications/services/notifications.api";

export const SocialContext = createContext(null);

const POLL_MS = 30000;

export const SocialProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const activeRef = useRef(true);

  const refreshUnread = useCallback(async () => {
    if (!user) {
      setUnreadMessages(0);
      setUnreadNotifications(0);
      return;
    }

    const [messages, notifications] = await Promise.allSettled([
      getMessagesUnreadCount(),
      getNotificationsUnreadCount(),
    ]);

    if (!activeRef.current) return;

    if (messages.status === "fulfilled") {
      setUnreadMessages(Number(messages.value?.unreadCount) || 0);
    }

    if (notifications.status === "fulfilled") {
      setUnreadNotifications(
        Number(notifications.value?.unreadCount) || 0
      );
    }
  }, [user]);

  useEffect(() => {
    activeRef.current = true;

    if (!user) {
      setUnreadMessages(0);
      setUnreadNotifications(0);
      return undefined;
    }

    refreshUnread();

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshUnread();
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") refreshUnread();
    };

    const onRefresh = () => refreshUnread();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("photosocial:refresh-unread", onRefresh);

    return () => {
      activeRef.current = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("photosocial:refresh-unread", onRefresh);
    };
  }, [refreshUnread, user]);

  return (
    <SocialContext.Provider
      value={{
        unreadMessages,
        unreadNotifications,
        refreshUnread,
        setUnreadMessages,
        setUnreadNotifications,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
};

export const requestUnreadRefresh = () => {
  window.dispatchEvent(new Event("photosocial:refresh-unread"));
};
