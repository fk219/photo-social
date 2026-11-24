const DAY_MS = 24 * 60 * 60 * 1000;

const toDate = (value) => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dayKey = (date) =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const utcDay = (date) =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

const dayLabel = (date) => {
  const today = new Date();
  const difference = Math.round(
    (utcDay(today) - utcDay(date)) / DAY_MS
  );

  if (difference === 0) return "Today";
  if (difference === 1) return "Yesterday";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== today.getFullYear()
      ? { year: "numeric" }
      : {}),
  }).format(date);
};

export const sortMessages = (messages = []) =>
  [...messages].sort((a, b) => {
    const first = toDate(a?.createdAt)?.getTime() ?? 0;
    const second = toDate(b?.createdAt)?.getTime() ?? 0;
    return first - second;
  });

export const mergeMessages = (current = [], incoming = []) => {
  const byId = new Map(
    current.filter((message) => message?._id).map((message) => [message._id, message])
  );
  let changed = false;

  incoming.forEach((message) => {
    if (!message?._id) return;

    const existing = byId.get(message._id);

    if (!existing) {
      byId.set(message._id, message);
      changed = true;
      return;
    }

    // Read receipts change after a message is delivered, so merge fields
    // instead of ignoring an id that is already on screen.
    byId.set(message._id, { ...existing, ...message });
    changed = true;
  });

  if (!changed) return current;

  return sortMessages([...byId.values()]);
};

export const groupMessagesByDay = (messages = []) => {
  const groups = [];

  messages.forEach((message) => {
    const date = toDate(message?.createdAt);
    const key = date ? dayKey(date) : "unknown";
    const lastGroup = groups[groups.length - 1];

    if (!lastGroup || lastGroup.key !== key) {
      groups.push({
        key,
        label: date ? dayLabel(date) : "Earlier",
        messages: [],
      });
    }

    groups[groups.length - 1].messages.push(message);
  });

  return groups;
};
