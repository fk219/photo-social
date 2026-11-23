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
