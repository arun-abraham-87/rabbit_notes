import React from 'react';
import { clickableDateRegex } from '../components/NotesList';
import { formatAndAgeDate } from './DateUtils';


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


export const buildLineElements = (line, idx, isListItem, searchTerm) => {
  const raw = isListItem ? line.slice(2) : line; // strip "- " bullet
  const elements = [];
  const regex =
    /(\*\*([^*]+)\*\*)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s)]+)|\[color:(#[0-9a-fA-F]{6}):([^\]]+)\]/g;
  let lastIndex = 0;
  let match;

  // Walk through every markdown / URL / color match
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
    } else if (match[7] && match[8]) {
      // [color:#HEXCODE:text]
      const color = match[7];
      const text = match[8];
      elements.push(
        <span key={`color-${idx}-${match.index}`} style={{ color }}>
          {buildLineElements(text, `${idx}-color-${match.index}`, false, searchTerm)}
        </span>
      );
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

// Helpers for clickable dates in lines
export const renderLineWithClickableDates = (
  line,
  note,
  idx,
  isListItem,
  searchTerm,
  parseFormattedContent,
  setEditingInlineDate,
  handleInlineDateSelect
) => {
  //////console.log("reached inner")
  //////console.log(line)
  const textWithAges = line;
  const segments = textWithAges.split(clickableDateRegex);
  return segments.map((seg, i) => {
    if (clickableDateRegex.test(seg)) {
      // figure out the original raw date
      const rawLines = note.content.split('\n');
      const rawLine = rawLines[idx] || '';
      const rawMatch = rawLine.match(
        /(\d{2}\/\d{2}\/\d{4})|\b\d{2} [A-Za-z]+ \d{4}\b/
      );
      const rawDate = rawMatch ? rawMatch[0] : seg;
      return (
        <span
          key={i}
          className="underline cursor-pointer"
          onClick={() => setEditingInlineDate({
            noteId: note.id,
            lineIndex: idx,
            originalDate: rawDate
          })}
        >
          {seg}
        </span>
      );
    }
    // Non-date segments
    return buildLineElements(seg, idx, isListItem, searchTerm);
  });
};// ─── end line‑rendering helper ──────────────────────────────────────
/**
 * Returns an array of booleans indicating whether each line should be
 * indented. Indentation starts on the line *after* an <h2> and continues
 * until the next <h2> or a blank line.
 */
export const getIndentFlags = (contentLines) => {
  if (!Array.isArray(contentLines) || contentLines.length === 0) {
    return [];
  }
  let flag = false;
  return contentLines.map((line) => {
    // Handle both string and React element inputs
    const lineContent = typeof line === 'string' ? line : (line?.props?.children || '');
    
    // Check for h2 tag in string content
    if (typeof lineContent === 'string' && (lineContent.startsWith('<h2>') || lineContent.startsWith('##'))) {
      flag = true;
      return false;
    }
    
    // Check for empty line
    if (typeof lineContent === 'string' && lineContent.trim() === '') {
      flag = false;
      return false;
    }
    
    return flag;
  });
};


export const getRawLines = (content) => {
  //////console.log("Line")
  //////console.log(content)
  //////console.log("Line END")
  let split_vals = content.split('\n').filter((line) => !line.trim().startsWith('meta::'))
  //////console.log('Split vals')
  //////console.log(split_vals)
  //////console.log('Split vals End')
  return split_vals
};

