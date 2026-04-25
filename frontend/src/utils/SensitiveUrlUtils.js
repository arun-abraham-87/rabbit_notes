export const URL_REVERSED_META = 'meta::url_reversed';
export const ENCODED_META = 'meta::encoded';

export const reverseString = (value = '') => String(value).split('').reverse().join('');

export const WWW_PROTOCOL_STORAGE_MARKER = 'sptth';
export const LEGACY_WWW_PROTOCOL_STORAGE_MARKER = '$%@$';
export const SLASH_STORAGE_MARKER = '#qhterstytesdfkjglimlekrn#';
export const HTTPS_STORAGE_MARKER = '$@%&';
export const REVERSED_HTTPS_STORAGE_MARKER = reverseString(HTTPS_STORAGE_MARKER);

const shiftLetter = (char, offset) => {
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(((code - 65 + offset + 26) % 26) + 65);
  }
  if (code >= 97 && code <= 122) {
    return String.fromCharCode(((code - 97 + offset + 26) % 26) + 97);
  }
  return char;
};

const shiftAlphabet = (value = '', offset = 1) => String(value).replace(/[A-Za-z]/g, (char) => shiftLetter(char, offset));

export const SHIFTED_SLASH_STORAGE_MARKER = shiftAlphabet(SLASH_STORAGE_MARKER, 1);

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const hasReversedUrls = (content = '') => content.includes(URL_REVERSED_META);
export const hasEncodedContent = (content = '') => content.includes(ENCODED_META);
export const SENSITIVE_META_PREFIX = 'meta::sensitive';

export const LEGACY_REVERSED_URL_PATTERN = /[^\s()[\]"']+\/\/[^\s()[\]"']*ptth/;
export const MARKED_REVERSED_URL_PATTERN = /[^\s()[\]"']+\/\/:&%@\$/;
export const SHIFTED_MARKED_REVERSED_URL_PATTERN = /[^\s()[\]"']*\$%@\$/;
export const SHIFTED_SLASH_REVERSED_URL_PATTERN = new RegExp(`[^\\s()[\\]"']*${escapeRegExp(SHIFTED_SLASH_STORAGE_MARKER)}[^\\s()[\\]"']*`);
export const REVERSED_URL_PATTERN = new RegExp(`(?:${LEGACY_REVERSED_URL_PATTERN.source})|(?:${MARKED_REVERSED_URL_PATTERN.source})|(?:${SHIFTED_MARKED_REVERSED_URL_PATTERN.source})|(?:${SHIFTED_SLASH_REVERSED_URL_PATTERN.source})`);
export const REVERSED_URL_GLOBAL_PATTERN = new RegExp(REVERSED_URL_PATTERN.source, 'g');

export const isReversedUrl = (url = '') => REVERSED_URL_PATTERN.test(String(url).trim());

const restoreHttpsAfterDecoding = (url = '') => String(url).replace(
  new RegExp(`^${escapeRegExp(HTTPS_STORAGE_MARKER)}(?=:\\/\\/)`),
  'https'
);

const encodeWithWwwProtocolMarker = (url = '') => {
  const reversedUrl = reverseString(url);
  const markedUrl = reversedUrl
    .replace(/www\/\/:sptth$/, WWW_PROTOCOL_STORAGE_MARKER)
    .replace(/\//g, SLASH_STORAGE_MARKER);
  return shiftAlphabet(markedUrl, 1);
};

const ensureLegacyWwwProtocolTail = (reversedUrl = '') => {
  const value = String(reversedUrl);
  if (/\/\/:s?ptth$/.test(value)) return value;
  if (!value.endsWith(WWW_PROTOCOL_STORAGE_MARKER)) return value;

  const withoutProtocolMarker = value.slice(0, -WWW_PROTOCOL_STORAGE_MARKER.length);
  if (withoutProtocolMarker.includes('www')) return value;

  return `${withoutProtocolMarker}www//:${WWW_PROTOCOL_STORAGE_MARKER}`;
};

const decodeShiftedWwwProtocolMarker = (url = '') => {
  const unshiftedUrl = shiftAlphabet(url, -1);
  const withSlashesRestored = unshiftedUrl.replaceAll(SLASH_STORAGE_MARKER, '/');
  const restoredMarkers = withSlashesRestored.includes(LEGACY_WWW_PROTOCOL_STORAGE_MARKER)
    ? ensureLegacyWwwProtocolTail(withSlashesRestored.replaceAll(LEGACY_WWW_PROTOCOL_STORAGE_MARKER, WWW_PROTOCOL_STORAGE_MARKER))
    : withSlashesRestored.replace(/sptth$/, 'www//:sptth');
  return reverseString(restoredMarkers);
};

export const decodeSensitiveUrl = (url = '') => {
  if (!isReversedUrl(url)) return url;
  if (
    String(url).includes(LEGACY_WWW_PROTOCOL_STORAGE_MARKER) ||
    String(url).includes(SHIFTED_SLASH_STORAGE_MARKER) ||
    shiftAlphabet(url, -1).endsWith(WWW_PROTOCOL_STORAGE_MARKER)
  ) {
    return decodeShiftedWwwProtocolMarker(url);
  }
  return restoreHttpsAfterDecoding(reverseString(url));
};

export const encodeSensitiveUrl = (url = '') => (
  isReversedUrl(url) ? url : encodeWithWwwProtocolMarker(url)
);

export const getStoredUrlForContent = (url, content = '') => (
  hasReversedUrls(content) ? encodeSensitiveUrl(url) : url
);

export const getDisplayUrlForContent = (url, content = '') => (
  hasReversedUrls(content) ? decodeSensitiveUrl(url) : url
);

export const reverseUrlsInText = (text = '') => {
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const urlRegex = /(https?:\/\/[^\s)]+)/g;

  return text
    .replace(markdownLinkRegex, (match, label, url) => `[${label}](${encodeSensitiveUrl(url)})`)
    .replace(urlRegex, (url) => encodeSensitiveUrl(url));
};

export const restoreUrlsInText = (text = '') => {
  const reversedMarkdownLinkRegex = new RegExp(`\\[([^\\]]+)\\]\\((${REVERSED_URL_PATTERN.source})\\)`, 'g');

  return text
    .replace(reversedMarkdownLinkRegex, (match, label, url) => `[${label}](${decodeSensitiveUrl(url)})`)
    .replace(REVERSED_URL_GLOBAL_PATTERN, (url) => decodeSensitiveUrl(url));
};

export const encodeSensitiveLine = (line = '') => {
  const reversedLine = reverseString(line);
  const markedLine = reversedLine
    .replace(/www\/\/:sptth$/, WWW_PROTOCOL_STORAGE_MARKER)
    .replace(/\//g, SLASH_STORAGE_MARKER);
  return shiftAlphabet(markedLine, 1);
};

export const decodeSensitiveLine = (line = '') => {
  const unshiftedLine = shiftAlphabet(line, -1);
  const restoredLine = unshiftedLine
    .replaceAll(SLASH_STORAGE_MARKER, '/')
    .replace(/sptth$/, 'www//:sptth');
  return restoreHttpsAfterDecoding(reverseString(restoredLine));
};

export const encodeSensitiveContent = (content = '') => {
  const lines = String(content).split('\n');
  const encodedLines = lines
    .filter(line => line.trim() !== ENCODED_META && line.trim() !== URL_REVERSED_META)
    .map(line => line.trim().startsWith('meta::') ? line : encodeSensitiveLine(line));

  if (!encodedLines.some(line => line.trim() === ENCODED_META)) {
    encodedLines.push(ENCODED_META);
  }
  if (!encodedLines.some(line => line.trim() === URL_REVERSED_META)) {
    encodedLines.push(URL_REVERSED_META);
  }

  return encodedLines.join('\n');
};

export const decodeSensitiveContent = (content = '') => {
  const shouldDecodeFullLines = hasEncodedContent(content);
  const shouldDecodeUrlsOnly = hasReversedUrls(content);

  return String(content)
    .split('\n')
    .map(line => {
      if (line.trim().startsWith('meta::')) return line;
      if (shouldDecodeFullLines) return decodeSensitiveLine(line);
      if (shouldDecodeUrlsOnly) return restoreUrlsInText(line);
      return line;
    })
    .join('\n');
};

export const isSensitiveContent = (content = '') => (
  String(content).includes(SENSITIVE_META_PREFIX) ||
  hasEncodedContent(content) ||
  hasReversedUrls(content)
);

export const removeSensitiveMetadata = (content = '') => (
  decodeSensitiveContent(content)
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return !trimmed.startsWith(SENSITIVE_META_PREFIX) &&
        trimmed !== URL_REVERSED_META &&
        trimmed !== ENCODED_META;
    })
    .join('\n')
    .trim()
);

export const normalizeLegacySensitiveMarkdownLinks = (text = '') => (
  String(text).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) => {
    if (!isReversedUrl(url)) return match;
    return `[${label}](${decodeSensitiveUrl(url)})`;
  })
);

export const hasUnreversedUrls = (text = '') => /https?:\/\/[^\s)]+/.test(text);

export const withUrlReversedMeta = (content = '') => (
  hasReversedUrls(content) ? content : `${content}\n${URL_REVERSED_META}`
);
