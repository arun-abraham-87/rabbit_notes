import React, { useState } from 'react';
import LinkPreview from '../components/LinkPreview';
import LinkWithPreview from '../components/LinkWithPreview';

/**
 * Comprehensive function to parse and format note content
 * @param {Object} params
 * @param {string} params.content - The note content
 * @param {string} params.searchTerm - Search term for highlighting
 * @returns {Array<React.ReactElement>} Array of formatted React elements
 */
export const parseNoteContent = ({ content, searchTerm, onAddText }) => {
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

  // Process lines and add blank lines before h2 headers (except the first line)
  const processedElements = [];
  
  lines.forEach(({ line, color }, lineIndex) => {
    // Check if this is an h2 header (not the first line)
    const trimmed = line.trim();
    const isH2 = trimmed.startsWith('##') && !trimmed.startsWith('###') && trimmed.endsWith('##');
    
    // Add blank line before h2 headers (except the first line)
    if (isH2 && lineIndex > 0) {
      processedElements.push(
        <div key={`blank-before-h2-${lineIndex}`} className="h-4"></div>
      );
    }
    
    // Step 1: Parse inline formatting first
    const formattedContent = parseInlineFormatting({
      content: line,
      searchTerm,
      lineIndex,
      onAddText
    });

    // Step 2: Check if this is a heading by looking at the original line
    let type = 'normal';
    if (trimmed.startsWith('###') && trimmed.endsWith('###')) {
      type = 'heading1';
    } else if (isH2) {
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

    processedElements.push(element);
  });

  return processedElements;
};

/**
 * Parse and format a URL for display
 * @param {string} url - The URL to parse
 * @returns {string} - The formatted display text for the URL
 */
const parseUrl = (url) => {
  //('url', url);
  return url;

};

/**
 * Extract URL from markdown link format [text](url)
 * @param {string} text - The text containing the markdown link
 * @returns {string|null} - The extracted URL or null if not found
 */
const extractUrlFromMarkdown = (text) => {
  const match = text.match(/\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/);
  return match ? match[1] : null;
};

/**
 * Parse inline formatting (bold, links, colors)
 */
const parseInlineFormatting = ({ content, searchTerm, lineIndex, onAddText }) => {
  // First handle any heading markers by temporarily replacing them
  let processedContent = content;
  const trimmed = content.trim();
  const isH1 = trimmed.startsWith('###') && trimmed.endsWith('###');
  const isH2 = trimmed.startsWith('##') && !trimmed.startsWith('###') && trimmed.endsWith('##');

  if (isH1) {
    processedContent = content.slice(3, -3);
  } else if (isH2) {
    processedContent = content.slice(2, -2);
  }

  const elements = [];
  let currentText = '';
  let isBold = false;
  let isItalic = false;

  if (processedContent.trim().startsWith("http:") || processedContent.trim().startsWith("https:")) {
    const url = processedContent.trim();
    const hostname = new URL(url).hostname;
    
    let urlElement = (
      <span key={`url-${lineIndex}`} className="inline-flex items-center gap-1">
        <LinkWithPreview url={url}>
          {hostname}
        </LinkWithPreview>
        <button
          onClick={() => onAddText && onAddText(url)}
          className="px-1 py-0.5 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors duration-150"
          title="Add custom text for this link"
        >
          Add text
        </button>
      </span>
    );
    elements.push(urlElement);
  } else if ((processedContent.includes("http:") || processedContent.includes("https:")) && processedContent.startsWith("[")) {
    // Extract the custom text and URL
    const textMatch = processedContent.match(/\[([^\]]+)\]/);
    const urlMatch = processedContent.match(/\((https?:\/\/[^\s)]+)\)/);
    
    if (textMatch && urlMatch) {
      const customText = textMatch[1];
      const url = urlMatch[1];
      
      let urlElement = (
        <LinkWithPreview key={`url-${lineIndex}`} url={url}>
          {customText}
        </LinkWithPreview>
      );
      elements.push(urlElement);
    }
  } else {
    for (let i = 0; i < processedContent.length; i++) {
      const char = processedContent[i];
      const nextChar = processedContent[i + 1];

      // Handle bold markers
      if (char === '*' && nextChar === '*') {
        if (currentText) {
          elements.push(...highlightSearchTerm(currentText, searchTerm, `text-${lineIndex}-${i}`));
          currentText = '';
        }
        isBold = !isBold;
        i++; // Skip next asterisk
        continue;
      }

      // Handle italic markers
      if (char === '*' && !isBold) {
        if (currentText) {
          elements.push(...highlightSearchTerm(currentText, searchTerm, `text-${lineIndex}-${i}`));
          currentText = '';
        }
        isItalic = !isItalic;
        continue;
      }

      // Handle URLs
      if (char === 'h' && processedContent.slice(i, i + 7) === 'http://' ||
        char === 'h' && processedContent.slice(i, i + 8) === 'https://') {
        if (currentText) {
          elements.push(...highlightSearchTerm(currentText, searchTerm, `text-${lineIndex}-${i}`));
          currentText = '';
        }

        // Find the end of the URL (space or end of string)
        let urlEnd = i;
        while (urlEnd < processedContent.length && processedContent[urlEnd] !== ' ') {
          urlEnd++;
        }
        const url = processedContent.slice(i, urlEnd);
        const hostname = new URL(url).hostname;
        
        elements.push(
          <span key={`url-${lineIndex}-${i}`} className="inline-flex items-center gap-1">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              {hostname}
            </a>
            <button
              onClick={() => onAddText && onAddText(url)}
              className="px-1 py-0.5 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors duration-150"
              title="Add custom text for this link"
            >
              Add text
            </button>
          </span>
        );
        i = urlEnd - 1;
        continue;
      }

      currentText += char;
    }
  }

  // Add any remaining text
  if (currentText) {
    let textElement = highlightSearchTerm(currentText, searchTerm, `text-${lineIndex}-end`);
    if (isBold) {
      textElement = textElement.map((el, idx) =>
        <strong key={`bold-${lineIndex}-end-${idx}`}>{el}</strong>
      );
    }
    if (isItalic) {
      textElement = textElement.map((el, idx) =>
        <em key={`italic-${lineIndex}-end-${idx}`}>{el}</em>
      );
    }
    elements.push(...textElement);
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

