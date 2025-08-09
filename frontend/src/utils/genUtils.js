import React from 'react';
import { clickableDateRegex } from '../components/NotesList';
import { formatAndAgeDate } from './DateUtils';

// Import the link type indicator function from TextUtils
const getLinkTypeIndicator = (url) => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    
    // Instagram
    if (hostname.includes('instagram.com')) {
      return '[Instagram]';
    }
    
    // Google services
    if (hostname.includes('docs.google.com')) {
      if (pathname.includes('/document/')) {
        return '[Google Docs]';
      } else if (pathname.includes('/spreadsheets/')) {
        return '[Google Sheets]';
      } else if (pathname.includes('/presentation/')) {
        return '[Google Slides]';
      } else if (pathname.includes('/forms/')) {
        return '[Google Forms]';
      }
    }
    
    // Gmail
    if (hostname.includes('mail.google.com') || hostname.includes('gmail.com')) {
      return '[Gmail]';
    }
    
    // Slack
    if (hostname.includes('slack.com')) {
      return '[Slack]';
    }
    
    // Discord
    if (hostname.includes('discord.com') || hostname.includes('discord.gg')) {
      return '[Discord]';
    }
    
    // GitHub
    if (hostname.includes('github.com')) {
      return '[GitHub]';
    }
    
    // YouTube
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return '[YouTube]';
    }
    
    // Twitter/X
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return '[Twitter]';
    }
    
    // LinkedIn
    if (hostname.includes('linkedin.com')) {
      return '[LinkedIn]';
    }
    
    // Facebook
    if (hostname.includes('facebook.com')) {
      return '[Facebook]';
    }
    
    // Reddit
    if (hostname.includes('reddit.com')) {
      return '[Reddit]';
    }
    
    // Notion
    if (hostname.includes('notion.so')) {
      return '[Notion]';
    }
    
    // Figma
    if (hostname.includes('figma.com')) {
      return '[Figma]';
    }
    
    // Zoom
    if (hostname.includes('zoom.us')) {
      return '[Zoom]';
    }
    
    // Teams
    if (hostname.includes('teams.microsoft.com')) {
      return '[Teams]';
    }
    
    // Dropbox
    if (hostname.includes('dropbox.com')) {
      return '[Dropbox]';
    }
    
    // Google Drive
    if (hostname.includes('drive.google.com')) {
      return '[Google Drive]';
    }
    
    // OneDrive
    if (hostname.includes('onedrive.live.com') || hostname.includes('1drv.ms')) {
      return '[OneDrive]';
    }
    
    // iCloud
    if (hostname.includes('icloud.com')) {
      return '[iCloud]';
    }
    
    // Spotify
    if (hostname.includes('open.spotify.com')) {
      return '[Spotify]';
    }
    
    // Apple Music
    if (hostname.includes('music.apple.com')) {
      return '[Apple Music]';
    }
    
    // Netflix
    if (hostname.includes('netflix.com')) {
      return '[Netflix]';
    }
    
    // Amazon
    if (hostname.includes('amazon.com') || hostname.includes('amazon.co.uk') || hostname.includes('amazon.ca')) {
      return '[Amazon]';
    }
    
    // eBay
    if (hostname.includes('ebay.com')) {
      return '[eBay]';
    }
    
    // PayPal
    if (hostname.includes('paypal.com')) {
      return '[PayPal]';
    }
    
    // Stripe
    if (hostname.includes('stripe.com')) {
      return '[Stripe]';
    }
    
    // Shopify
    if (hostname.includes('shopify.com')) {
      return '[Shopify]';
    }
    
    // WordPress
    if (hostname.includes('wordpress.com')) {
      return '[WordPress]';
    }
    
    // Medium
    if (hostname.includes('medium.com')) {
      return '[Medium]';
    }
    
    // Substack
    if (hostname.includes('substack.com')) {
      return '[Substack]';
    }
    
    // Calendly
    if (hostname.includes('calendly.com')) {
      return '[Calendly]';
    }
    
    // Typeform
    if (hostname.includes('typeform.com')) {
      return '[Typeform]';
    }
    
    // Airtable
    if (hostname.includes('airtable.com')) {
      return '[Airtable]';
    }
    
    // Trello
    if (hostname.includes('trello.com')) {
      return '[Trello]';
    }
    
    // Asana
    if (hostname.includes('asana.com')) {
      return '[Asana]';
    }
    
    // Monday.com
    if (hostname.includes('monday.com')) {
      return '[Monday]';
    }
    
    // Jira
    if (hostname.includes('atlassian.net') || hostname.includes('jira.com')) {
      return '[Jira]';
    }
    
    // Confluence
    if (hostname.includes('atlassian.net') && pathname.includes('/wiki/')) {
      return '[Confluence]';
    }
    
    // Linear
    if (hostname.includes('linear.app')) {
      return '[Linear]';
    }
    
    // ClickUp
    if (hostname.includes('clickup.com')) {
      return '[ClickUp]';
    }
    
    // Notion
    if (hostname.includes('notion.so')) {
      return '[Notion]';
    }
    
    // Obsidian
    if (hostname.includes('obsidian.md')) {
      return '[Obsidian]';
    }
    
    // Roam Research
    if (hostname.includes('roamresearch.com')) {
      return '[Roam]';
    }
    
    // Logseq
    if (hostname.includes('logseq.com')) {
      return '[Logseq]';
    }
    
    // Default for unknown services
    return '';
    
  } catch (error) {
    // If URL parsing fails, return empty string
    return '';
  }
};


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
  const urlShareSpaceNoteIds = new Set();

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
    // Check for URL and text sharing the same line
    note.content.split('\n').forEach(line => {
      const urlMatches = line.match(urlPattern) || [];
      const textWithoutUrls = line.replace(urlPattern, '').trim();
      if (urlMatches.length > 0 && textWithoutUrls.length > 0 && !line.trim().startsWith('meta::')) {
        urlShareSpaceNoteIds.add(note.id);
      }
    });
  });

  return { 
    duplicateUrlNoteIds, 
    duplicateWithinNoteIds, 
    urlShareSpaceNoteIds,
    urlToNotesMap, 
    duplicatedUrlColors 
  };
}


export const buildLineElements = (line, idx, isListItem, searchTerm, onNavigateToNote = null) => {
  
  const raw = isListItem ? line.slice(2) : line; // strip "- " bullet
  const elements = [];
  const regex =
    /(\*\*([^*]+)\*\*)|(\[([^\]]+)\]\(([^)]+)\))|(https?:\/\/[^\s)]+)|([^\s]+\/\/[^\s]+ptth)|\[color:(#[0-9a-fA-F]{6}):([^\]]+)\]/g;
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
      
      // [text](url) - handle both regular and reversed URLs
      const url = match[5];
      const isReversedUrl = url.match(/[^\s]+\/\/[^\s]+ptth/);
      const originalUrl = isReversedUrl ? url.split('').reverse().join('') : url;
      
      // Check if this is a note navigation link
      const isNoteNavigationLink = originalUrl.startsWith('#/notes?note=');
      
      if (isNoteNavigationLink) {
        // Handle note navigation links with SPA navigation
        elements.push(
          <a
            key={`link-${idx}-${match.index}`}
            href={originalUrl}
            className="text-blue-600 underline cursor-pointer"
            title={originalUrl}
            onClick={(e) => {
              e.preventDefault();
              if (onNavigateToNote) {
                onNavigateToNote(originalUrl);
              } else {
                // Fallback to window.location.href
                window.location.href = originalUrl;
              }
            }}
          >
            {match[4]}
          </a>
        );
      } else {
        // Handle external links normally
        elements.push(
          <a
            key={`link-${idx}-${match.index}`}
            href={originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
            title={originalUrl}
          >
            {match[4]}
          </a>
        );
      }
      
    } else if (match[6]) {
      // bare URL
      try {
        const host = new URL(match[6]).hostname.replace(/^www\./, '');
        const linkIndicator = getLinkTypeIndicator(match[6]);
        elements.push(
          <a
            key={`url-${idx}-${match.index}`}
            href={match[6]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            {linkIndicator ? (
              <>
                {host} <span className="text-xs text-gray-500 font-normal">{linkIndicator}</span>
              </>
            ) : host}
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
    } else if (match[7]) {
      
      // reversed URL (ends with ptth)
      try {
        const reversedUrl = match[7];
        const originalUrl = reversedUrl.split('').reverse().join('');
        
        
        const host = new URL(originalUrl).hostname.replace(/^www\./, '');
        
        const linkIndicator = getLinkTypeIndicator(originalUrl);
        elements.push(
          <a
            key={`reversed-url-${idx}-${match.index}`}
            href={originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            {linkIndicator ? (
              <>
                {host} <span className="text-xs text-gray-500 font-normal">{linkIndicator}</span>
              </>
            ) : host}
          </a>
        );
        
      } catch (error) {
        console.error('❌ Error processing reversed URL:', error);
        elements.push(
          <a
            key={`reversed-url-fallback-${idx}-${match.index}`}
            href={match[7].split('').reverse().join('')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            {match[7].split('').reverse().join('')}
          </a>
        );
      }
    } else if (match[8] && match[9]) {
      // [color:#HEXCODE:text]
      const color = match[8];
      const text = match[9];
      elements.push(
        <span key={`color-${idx}-${match.index}`} style={{ color }}>
          {buildLineElements(text, `${idx}-color-${match.index}`, false, searchTerm, onNavigateToNote)}
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
  handleInlineDateSelect,
  onNavigateToNote = null
) => {
  ////
  ////
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
    return buildLineElements(seg, idx, isListItem, searchTerm, onNavigateToNote);
  });
};// ─── end line‑rendering helper ──────────────────────────────────────
/**
 * Returns an array of booleans indicating whether each line should be
 * indented. Indentation starts on the line *after* an <h2> and continues
 * until the next <h2> or a blank line.
 * 
 * For h1 headers (###text###), indentation starts on the line *after* the h1
 * and continues until the end, a blank line, another h1 header (###), or an h2 header (##).
 */
export const getIndentFlags = (contentLines) => {
  if (!Array.isArray(contentLines) || contentLines.length === 0) {
    return [];
  }
  let flag = false;
  let h1Flag = false; // New flag for h1 headers
  
  return contentLines.map((line, index) => {
    // Handle React elements (h1, h2, etc.)
    if (React.isValidElement(line)) {
      const elementType = line.type;
      if (elementType === 'h1') {
        h1Flag = true;
        flag = false; // Reset h2 flag when we encounter h1
        return false;
      }
      if (elementType === 'h2') {
        flag = true;
        h1Flag = false; // Reset h1 flag when we encounter h2
        return false;
      }
      // For other React elements, check if they're empty
      const children = line.props?.children;
      if (!children || (typeof children === 'string' && children.trim() === '')) {
        flag = false;
        h1Flag = false; // Reset both flags on empty line
        return false;
      }
    }
    
    // Handle string content
    const lineContent = typeof line === 'string' ? line : (line?.props?.children || '');
    
    // Check for h1 tag in string content (###text###)
    if (typeof lineContent === 'string' && lineContent.startsWith('<h1>') && lineContent.endsWith('</h1>')) {
      h1Flag = true;
      flag = false; // Reset h2 flag when we encounter h1
      return false;
    }
    
    // Check for h2 tag in string content (##text##)
    if (typeof lineContent === 'string' && (lineContent.startsWith('<h2>') || lineContent.startsWith('##'))) {
      flag = true;
      h1Flag = false; // Reset h1 flag when we encounter h2
      return false;
    }
    
    // Check for empty line
    if (typeof lineContent === 'string' && lineContent.trim() === '') {
      flag = false;
      h1Flag = false; // Reset both flags on empty line
      return false;
    }
    
    // Return true if either h1 or h2 flag is active
    return flag || h1Flag;
  });
};


export const getRawLines = (content) => {
  ////
  ////
  ////
  let split_vals = content.split('\n').filter((line) => !line.trim().startsWith('meta::'))
  
  // Remove trailing empty lines
  while (split_vals.length > 0 && split_vals[split_vals.length - 1].trim() === '') {
    split_vals.pop();
  }
  
  ////
  ////
  ////
  return split_vals
};

