import React from 'react';
import { buildLineElements } from './genUtils';

// Function to process the content with links, capitalization, and search query highlighting
export const processContent = (content, searchTerm) => {
  if (!content) return [];

  // Convert HTML color spans to our marker format
  content = content.replace(/<span style="color: (#[0-9a-fA-F]{6})">[^<]+<\/span>/g, (match, color) => {
    const text = match.match(/<span[^>]*>([^<]+)<\/span>/)[1];
    return `[color:${color}:${text}]`;
  });

  // Split content into lines and process each line
  const lines = content.split('\n');
  return lines.map((line, idx) => {
    // Check for headings
    if (line.startsWith('### ')) {
      return <h1 key={idx}>{line.slice(4)}</h1>;
    }
    if (line.startsWith('## ')) {
      return <h2 key={idx}>{line.slice(3)}</h2>;
    }
    
    // Process regular lines
    return <div key={idx}>{buildLineElements(line, idx, line.startsWith('- '), searchTerm)}</div>;
  });
};

// Helper function to process text segments (handles links and search highlighting)
const processTextSegment = (text, shouldCapitalize, searchTerms) => {
  const elements = [];
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;
  let lastIndex = 0;
  let match;

  // Capitalize if needed
  if (shouldCapitalize && text.trim()) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  while ((match = linkRegex.exec(text)) !== null) {
    // Text before link
    if (match.index > lastIndex) {
      let textSegment = text.slice(lastIndex, match.index);
      if (searchTerms.length) {
        const regex = new RegExp(`(${searchTerms.join('|')})`, 'gi');
        textSegment = textSegment.replace(regex, '<span class="bg-yellow-300">$1</span>');
      }
      elements.push(
        <span
          key={`text-${lastIndex}`}
          dangerouslySetInnerHTML={{ __html: textSegment }}
        />
      );
    }

    // Handle link
    const url = match[2] || match[3];
    const display = match[1] || (() => {
      try { return new URL(url).hostname.replace(/^www\./, ''); }
      catch { return url; }
    })();
    elements.push(
      <a
        key={`link-${match.index}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline hover:text-blue-800"
      >
        {display}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last link
  if (lastIndex < text.length) {
    let textSegment = text.slice(lastIndex);
    if (searchTerms.length) {
      const regex = new RegExp(`(${searchTerms.join('|')})`, 'gi');
      textSegment = textSegment.replace(regex, '<span class="bg-yellow-300">$1</span>');
    }
    elements.push(
      <span
        key={`text-end-${lastIndex}`}
        dangerouslySetInnerHTML={{ __html: textSegment }}
      />
    );
  }

  return elements;
};

export const parseFormattedContent = (formatted_lines) => {
  // If no lines array or it's empty, return an empty string (or array, if that makes more sense)
  if (!Array.isArray(formatted_lines) || formatted_lines.length === 0) {
    console.log(typeof formatted_lines)
    console.log(" --Not array", formatted_lines)
    return '';
  }

  console.log("=================================");
  console.log(formatted_lines);
  console.log("=================================");
  console.log(
    'DEBUG – lines:',
    formatted_lines,
    'typeof lines =', typeof formatted_lines,
    'Array.isArray =', Array.isArray(formatted_lines)
  );

  return formatted_lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('###') && trimmed.endsWith('###')) {
      return `<h1>${trimmed.slice(3, -3)}</h1>`;
    } else if (trimmed.startsWith('##') && trimmed.endsWith('##')) {
      return `<h2>${trimmed.slice(2, -2)}</h2>`;
    } else {
      return line;
    }
  });
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

