export const RECENT_SEARCHES_KEY = "photosocial:recent-searches";
export const RECENT_SEARCH_LIMIT = 8;

const cleanValue = (value) =>
  typeof value === "string" ? value.trim() : "";

export const readRecentSearches = () => {
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    const seen = new Set();

    return parsed
      .map(cleanValue)
      .filter((value) => {
        if (!value) return false;

        const key = value.toLowerCase();

        if (seen.has(key)) return false;

        seen.add(key);
        return true;
      })
      .slice(0, RECENT_SEARCH_LIMIT);
  } catch {
    return [];
  }
};

export const writeRecentSearches = (searches) => {
  try {
    window.localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(searches.slice(0, RECENT_SEARCH_LIMIT))
    );
  } catch {
    // Private browsing can reject storage writes; search still works.
  }
};

export const rememberRecentSearch = (value) => {
  const query = cleanValue(value);

  if (!query) return readRecentSearches();

  const next = [
    query,
    ...readRecentSearches().filter(
      (item) => item.toLowerCase() !== query.toLowerCase()
    ),
  ].slice(0, RECENT_SEARCH_LIMIT);

  writeRecentSearches(next);
  return next;
};

export const clearRecentSearches = () => {
  try {
    window.localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Nothing else to clear when storage is unavailable.
  }
};
