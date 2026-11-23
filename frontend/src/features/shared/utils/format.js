export const getUserAvatar = (user) => {
  if (!user) return "";
  return user.profile_image || user.profileImage || user.avatar || "";
};

export const getInitials = (name = "") => {
  const clean = String(name).replace(/^@/, "").trim();

  if (!clean) return "I";

  const parts = clean.split(/\s+/);

  if (parts.length > 1) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return clean.slice(0, 2).toUpperCase();
};

export const formatFrameNumber = (index = 0) =>
  String(index + 1).padStart(3, "0");

export const formatJournalDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(date)
    .replace(/\./g, "")
    .toUpperCase();
};

export const formatNoteDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .replace(/\./g, "")
    .toUpperCase();
};

export const formatCount = (value) => {
  const count = Number(value);

  if (!Number.isFinite(count) || count < 0) return "0";
  if (count < 1000) return String(count);
  if (count < 1000000) return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;

  return `${(count / 1000000).toFixed(1).replace(/\.0$/, "")}m`;
};
