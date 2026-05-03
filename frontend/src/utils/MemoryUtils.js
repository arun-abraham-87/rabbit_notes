const JSON_CACHE_LIMITS = {
  bookmarkCounts: { maxEntries: 300 },
  costcoFuelPricesHistory: { maxEntries: 20 },
  dashboardQuickNotes: { maxEntries: 25 },
  noteLinkClickHistory: { maxEntries: 200 },
  noteReviews: { maxEntries: 2000 },
  noteReviewCadence: { maxEntries: 2000 },
  recentSearches: { maxEntries: 5 },
  savedNoteSearches: { maxEntries: 20 },
  stockPriceHistory: { maxEntries: 10 },
  user_vocabulary: { maxEntries: 1000 },
};

const MAX_NOTE_HISTORY_ITEMS = 5;
const MAX_NOTE_HISTORY_CONTENT_CHARS = 8000;

const trimArray = (value, maxEntries) => (
  Array.isArray(value) ? value.slice(0, maxEntries) : value
);

const trimObject = (value, maxEntries) => {
  if (!value || Array.isArray(value) || typeof value !== 'object') return value;
  const entries = Object.entries(value);
  if (entries.length <= maxEntries) return value;
  return Object.fromEntries(entries.slice(-maxEntries));
};

const trimNoteHistory = () => {
  const raw = localStorage.getItem('noteHistory');
  if (!raw) return;

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    localStorage.removeItem('noteHistory');
    return;
  }

  const compacted = parsed.slice(0, MAX_NOTE_HISTORY_ITEMS).map(note => ({
    ...note,
    content: typeof note?.content === 'string'
      ? note.content.slice(0, MAX_NOTE_HISTORY_CONTENT_CHARS)
      : note?.content
  }));
  localStorage.setItem('noteHistory', JSON.stringify(compacted));
};

const trimJsonCache = (key, { maxEntries }) => {
  const raw = localStorage.getItem(key);
  if (!raw) return;

  const parsed = JSON.parse(raw);
  const next = Array.isArray(parsed)
    ? trimArray(parsed, maxEntries)
    : trimObject(parsed, maxEntries);

  localStorage.setItem(key, JSON.stringify(next));
};

export const purgeRabbitNotesCaches = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { purged: false, reason: 'localStorage unavailable' };
  }

  const result = { purged: true, trimmed: [], removed: [] };

  try {
    trimNoteHistory();
    result.trimmed.push('noteHistory');
  } catch {
    localStorage.removeItem('noteHistory');
    result.removed.push('noteHistory');
  }

  Object.entries(JSON_CACHE_LIMITS).forEach(([key, limits]) => {
    try {
      trimJsonCache(key, limits);
      result.trimmed.push(key);
    } catch {
      localStorage.removeItem(key);
      result.removed.push(key);
    }
  });

  return result;
};

export const installMemoryPurgeHelpers = () => {
  if (typeof window === 'undefined') return;
  window.rabbitNotesPurgeMemoryCaches = purgeRabbitNotesCaches;
};
