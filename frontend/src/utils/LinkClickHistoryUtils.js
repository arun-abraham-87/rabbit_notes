const LINK_CLICK_HISTORY_KEY = 'noteLinkClickHistory';
const MAX_LINK_CLICK_HISTORY = 500;

export const getLinkClickHistory = () => {
  try {
    const rawHistory = localStorage.getItem(LINK_CLICK_HISTORY_KEY);
    const parsedHistory = rawHistory ? JSON.parse(rawHistory) : [];
    return Array.isArray(parsedHistory)
      ? parsedHistory
          .filter(item => item && typeof item.url === 'string')
          .sort((a, b) => (b.lastClickedAt || 0) - (a.lastClickedAt || 0))
      : [];
  } catch (error) {
    console.error('Error loading note link click history:', error);
    return [];
  }
};

export const recordLinkClick = (url, noteId = null, customText = '') => {
  if (!url) return;

  try {
    const now = Date.now();
    const trimmedCustomText = typeof customText === 'string' ? customText.trim() : '';
    const history = getLinkClickHistory();
    const existing = history.find(item => item.url === url);
    let updatedHistory;

    if (existing) {
      updatedHistory = history.map(item => (
        item.url === url
          ? {
              ...item,
              count: (Number(item.count) || 0) + 1,
              lastClickedAt: now,
              noteId: noteId ?? item.noteId ?? null,
              customText: trimmedCustomText || item.customText || ''
            }
          : item
      ));
    } else {
      updatedHistory = [
        { url, customText: trimmedCustomText, count: 1, firstClickedAt: now, lastClickedAt: now, noteId },
        ...history
      ];
    }

    localStorage.setItem(
      LINK_CLICK_HISTORY_KEY,
      JSON.stringify(updatedHistory.slice(0, MAX_LINK_CLICK_HISTORY))
    );
  } catch (error) {
    console.error('Error saving note link click history:', error);
  }
};

export const removeLinkClickHistoryItem = (url) => {
  if (!url) return;

  try {
    const history = getLinkClickHistory();
    const updatedHistory = history.filter(item => item.url !== url);
    localStorage.setItem(LINK_CLICK_HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error removing note link click history item:', error);
  }
};

export const clearLinkClickHistory = () => {
  try {
    localStorage.setItem(LINK_CLICK_HISTORY_KEY, JSON.stringify([]));
  } catch (error) {
    console.error('Error clearing note link click history:', error);
  }
};

export const createRecentLinksNote = () => {
  const history = getLinkClickHistory();
  const lines = ['Recent clicked links'];

  if (history.length === 0) {
    lines.push('No note links clicked yet.');
  } else {
    history.forEach(item => {
      const count = Number(item.count) || 0;
      const clickedText = count === 1 ? '1 click' : `${count} clicks`;
      const lastClickedDate = item.lastClickedAt
        ? new Date(item.lastClickedAt).toLocaleString()
        : 'unknown time';
      const linkText = item.customText || item.url;
      lines.push(`- [${linkText}](${item.url}) - ${clickedText}, last clicked ${lastClickedDate}`);
    });
  }

  lines.push('meta::generated_recent_links');

  return {
    id: 'generated-recent-links',
    content: lines.join('\n'),
    created_datetime: new Date().toISOString(),
    updated_datetime: new Date().toISOString(),
    isGeneratedRecentLinksNote: true
  };
};
