export const getUserAvatar = (user) => {
  if (!user) return "";
  return user.profile_image || user.profileImage || user.avatar || "";
};

export const getInitials = (name = "") => {
  const clean = String(name).replace(/^@/, "").trim();

  if (!clean) return "M";

  const parts = clean.split(/\s+/);

  if (parts.length > 1) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return clean.slice(0, 2).toUpperCase();
};

const toDate = (value) => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatLongDate = (value) => {
  const date = toDate(value);
  if (!date) return null;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(date)
    .replace(/\./g, "")
    .toUpperCase();
};

export const formatMonthDate = (value) => {
  const date = toDate(value);
  if (!date) return null;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  })
    .format(date)
    .replace(/\./g, "")
    .toUpperCase();
};

export const formatFullDate = (value) => {
  const date = toDate(value);
  if (!date) return null;

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const formatRelativeTime = (value) => {
  const date = toDate(value);
  if (!date) return null;

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);

  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;

  return formatMonthDate(date);
};

export const formatCount = (value) => {
  const count = Number(value);

  if (!Number.isFinite(count) || count < 0) return "0";
  if (count < 1000) return String(count);
  if (count < 1000000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  return `${(count / 1000000).toFixed(1).replace(/\.0$/, "")}m`;
};
