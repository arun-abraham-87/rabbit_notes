import React from 'react';

/**
 * Comprehensive function to parse and format note content
 * @param {Object} params
 * @param {string} params.content - The note content
 * @param {string} params.searchTerm - Search term for highlighting
 * @returns {Array<React.ReactElement>} Array of formatted React elements
 */
export const parseNoteContent = ({ content, searchTerm }) => {
  if (!content) return [];

  // Split into lines and process each line
  const lines = content.split('\n')
    .filter(line => !line.trim().startsWith('meta::'))
    .map(line => {
      // First extract any color value wrapped in @$%^ markers
      const colorMatch = line.match(/@\$%\^([^@]+)@\$%\^/);
      const color = colorMatch ? colorMatch[1] : null;
      
      // Remove the color markers and get clean text
      const cleanLine = line.replace(/@\$%\^[^@]+@\$%\^/, '');
      
      return { line: cleanLine, color };
    });

  return lines.map(({ line, color }, lineIndex) => {
    // Step 1: Parse inline formatting first
    const formattedContent = parseInlineFormatting({
      content: line,
      searchTerm,
      lineIndex
    });

    // Step 2: Check if this is a heading by looking at the original line
    const trimmed = line.trim();
    let type = 'normal';
    if (trimmed.startsWith('##') && !trimmed.startsWith('###') && trimmed.endsWith('##')) {
      type = 'heading1';
    } else if (trimmed.startsWith('###') && trimmed.endsWith('###')) {
      type = 'heading2';
    } else if (trimmed.startsWith('- ')) {
      type = 'bullet';
    }

    // Step 3: Wrap in appropriate container based on line type
    let element = wrapInContainer({
      content: formattedContent,
      type,
      lineIndex
    });

    // Step 4: If we have a color value, wrap the final element in a colored span
    if (color) {
      element = React.cloneElement(element, {
        style: { color }
      });
    }

    return element;
  });
};

/**
 * Parse inline formatting (bold, links, colors)
 */
const parseInlineFormatting = ({ content, searchTerm, lineIndex }) => {
  // First handle any heading markers by temporarily replacing them
  let processedContent = content;
  const trimmed = content.trim();
  const isH1 = trimmed.startsWith('##') && !trimmed.startsWith('###') && trimmed.endsWith('##');
  const isH2 = trimmed.startsWith('###') && trimmed.endsWith('###');
  
  if (isH1) {
    processedContent = content.slice(2, -2);
  } else if (isH2) {
    processedContent = content.slice(3, -3);
  }

  const elements = [];
  const regex = /(\*\*([^*]+)\*\*)|(\*(?!\*)([^*]+)(?<!\*)\*)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s)]+)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(processedContent)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      elements.push(...highlightSearchTerm(
        processedContent.slice(lastIndex, match.index),
        searchTerm,
        `text-${lineIndex}-${lastIndex}`
      ));
    }

    // Process the match based on type
    if (match[1]) { // Bold
      elements.push(
        <strong key={`bold-${lineIndex}-${match.index}`}>
          {match[2]}
        </strong>
      );
    } else if (match[3]) { // Italics
      elements.push(
        <em key={`italic-${lineIndex}-${match.index}`}>
          {match[4]}
        </em>
      );
    } else if (match[5]) { // Markdown link
      elements.push(
        <a
          key={`link-${lineIndex}-${match.index}`}
          href={match[6]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          {match[6]}
        </a>
      );
    } else if (match[7]) { // Raw URL
      const url = match[7];
      const display = (() => {
        try {
          return new URL(url).hostname.replace(/^www\./, '');
        } catch {
          return url;
        }
      })();
      elements.push(
        <a
          key={`url-${lineIndex}-${match.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          {display}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < processedContent.length) {
    elements.push(...highlightSearchTerm(
      processedContent.slice(lastIndex),
      searchTerm,
      `text-${lineIndex}-${lastIndex}`
    ));
  }

  return elements;
};

/**
 * Highlight search terms in text
 */
const highlightSearchTerm = (text, searchTerm, keyPrefix) => {
  if (!searchTerm || !text) return [text];

  // Split search term into individual words and escape special regex characters
  const searchWords = searchTerm.split(/\s+/)
    .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(word => word.length > 0);

  if (searchWords.length === 0) return [text];

  // Create a regex that matches any of the search words
  const regex = new RegExp(`(${searchWords.join('|')})`, 'gi');
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Add the highlighted match
    parts.push(
      <span key={`${keyPrefix}-${match.index}`} className="bg-yellow-200">
        {match[0]}
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
};

/**
 * Wrap content in appropriate container based on line type
 */
const wrapInContainer = ({ content, type, lineIndex }) => {
  switch (type) {
    case 'heading1':
      return (
        <h1 key={`h1-${lineIndex}`} className="text-2xl font-bold">
          {content}
        </h1>
      );
    case 'heading2':
      return (
        <h2 key={`h2-${lineIndex}`} className="text-lg font-semibold text-purple-700">
          {content}
        </h2>
      );
    case 'bullet':
      return (
        <div key={`bullet-${lineIndex}`} className="flex">
          <span className="mr-2">•</span>
          <div>{content}</div>
        </div>
      );
    default:
      return <div key={`line-${lineIndex}`}>{content}</div>;
  }
};

/**
 * Reorders meta tags in note content to ensure they appear at the bottom in a consistent order.
 * @param {string} content - The note content to process
 * @returns {string} - The content with meta tags reordered to the bottom
 */
export const reorderMetaTags = (content) => {
  if (!content) return content;
  
  const lines = content.split('\n');
  const metaLines = [];
  const nonMetaLines = [];
  
  // Separate meta tags from regular content
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('meta::') || trimmedLine.startsWith('meta_detail::')) {
      metaLines.push(line);
    } else {
      nonMetaLines.push(line);
    }
  });
  
  // Sort meta tags in a consistent order
  const metaOrder = [
    'meta::abbreviation',
    'meta::bookmark',
    'meta::quick_links',
    'meta::pin',
    'meta::event',
    'meta::meeting',
    'meta::todo',
    'meta::end_date',
    'meta_detail::dismissed'
  ];
  
  metaLines.sort((a, b) => {
    const aPrefix = metaOrder.find(prefix => a.trim().startsWith(prefix)) || a;
    const bPrefix = metaOrder.find(prefix => b.trim().startsWith(prefix)) || b;
    return metaOrder.indexOf(aPrefix) - metaOrder.indexOf(bPrefix);
  });
  
  // Remove empty lines at the end of non-meta content
  while (nonMetaLines.length > 0 && !nonMetaLines[nonMetaLines.length - 1].trim()) {
    nonMetaLines.pop();
  }
  
  // Combine content with meta tags at the bottom
  return [...nonMetaLines, '', ...metaLines].join('\n').trim();
};

// Export for use in tests
export const __testing__ = {
  parseInlineFormatting,
  highlightSearchTerm,
  wrapInContainer
};

