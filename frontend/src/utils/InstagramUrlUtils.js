export const getInstagramReelsUrl = (url) => {
  if (!url || typeof url !== 'string') return url;

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.toLowerCase().includes('instagram.com')) return url;

    const normalizedPath = parsed.pathname.replace(/\/+$/, '').toLowerCase();
    if (normalizedPath.endsWith('/reels')) return url;

    parsed.pathname = `${parsed.pathname.replace(/\/+$/, '')}/reels`;
    return parsed.toString();
  } catch {
    return url;
  }
};
