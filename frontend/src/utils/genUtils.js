

export const highlightMatches = (text, searchTerm) => {
    if (!searchTerm || typeof text !== 'string') return text;
    try {
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape regex meta
      const re = new RegExp(`(${escaped})`, 'gi');
      return text.split(re).map((part, idx) =>
        re.test(part) ? (
          <mark key={idx} className="bg-yellow-200">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch {
      return text;
    }
  };


export const findDuplicatedUrls = (safeNotes) => {
    const urlPattern = /https?:\/\/[^\s]+/g;

    const urlToNotesMap = {};

    safeNotes.forEach((note) => {
        const urls = note.content.match(urlPattern) || [];
        urls.forEach((url) => {
            if (!urlToNotesMap[url]) {
                urlToNotesMap[url] = [];
            }
            urlToNotesMap[url].push(note.id);
        });
    });

    const duplicatedUrls = Object.entries(urlToNotesMap)
        .filter(([, ids]) => ids.length > 1)
        .map(([url]) => url);


    const duplicatedUrlColors = {};
    const highlightPalette = ['#fde68a', '#a7f3d0', '#fbcfe8', '#bfdbfe', '#ddd6fe', '#fecaca'];

    duplicatedUrls.forEach((url, idx) => {
        duplicatedUrlColors[url] = highlightPalette[idx % highlightPalette.length];
    });

    const duplicateUrlNoteIds = new Set();
    Object.values(urlToNotesMap).forEach((noteIds) => {
        if (noteIds.length > 1) {
            noteIds.forEach((id) => duplicateUrlNoteIds.add(id));
        }
    });

    const duplicateWithinNoteIds = new Set();
    safeNotes.forEach((note) => {
        const urls = note.content.match(urlPattern) || [];
        const seen = new Set();
        for (const url of urls) {
            if (seen.has(url)) {
                duplicateWithinNoteIds.add(note.id);
                break;
            }
            seen.add(url);
        }
    });

    return { duplicateUrlNoteIds, duplicateWithinNoteIds, urlToNotesMap, duplicatedUrlColors };
}


export  const buildLineElements = (line, idx, isListItem, searchTerm) => {
  const raw = isListItem ? line.slice(2) : line; // strip "- " bullet
  const elements = [];
  const regex =
    /(\*\*([^*]+)\*\*)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s)]+)/g;
  let lastIndex = 0;
  let match;

  // Walk through every markdown / URL match
  while ((match = regex.exec(raw)) !== null) {
    // Add text between previous match and current match (with highlights)
    if (match.index > lastIndex) {
      elements.push(
        ...[].concat(
          highlightMatches(raw.slice(lastIndex, match.index), searchTerm)
        )
      );
    }

    if (match[1]) {
      // **bold**
      elements.push(
        <strong key={`bold-${idx}-${match.index}`}>{match[2]}</strong>
      );
    } else if (match[3] && match[4]) {
      // [text](url)
      elements.push(
        <a
          key={`link-${idx}-${match.index}`}
          href={match[5]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          {match[4]}
        </a>
      );
    } else if (match[6]) {
      // bare URL
      try {
        const host = new URL(match[6]).hostname.replace(/^www\./, '');
        elements.push(
          <a
            key={`url-${idx}-${match.index}`}
            href={match[6]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            {host}
          </a>
        );
      } catch {
        elements.push(
          <a
            key={`url-fallback-${idx}-${match.index}`}
            href={match[6]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            {match[6]}
          </a>
        );
      }
    }

    lastIndex = match.index + match[0].length;
  }

  // Append any remaining text after the final match
  if (lastIndex < raw.length) {
    elements.push(
      ...[].concat(highlightMatches(raw.slice(lastIndex), searchTerm))
    );
  }

  return elements;
};