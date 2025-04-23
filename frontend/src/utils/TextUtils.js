import React from 'react';

// Function to process the content with links, capitalization, and search query highlighting
export const processContent = (content, searchQuery) => {
  if (typeof content !== 'string') return content;

  const searchTerms = searchQuery ? searchQuery.split(' ') : [];
  let isFirstTextSegment = true;

  // Regex to match [text](url) or bare URLs
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;
  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    // Text before link
    if (match.index > lastIndex) {
      let textSegment = content.slice(lastIndex, match.index);
      // Capitalize first text segment
      if (isFirstTextSegment) {
        textSegment = textSegment.charAt(0).toUpperCase() + textSegment.slice(1);
        isFirstTextSegment = false;
      }
      // Highlight search terms
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
    // Determine URL and display text
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

  // Remaining text after last match
  if (lastIndex < content.length) {
    let textSegment = content.slice(lastIndex);
    if (isFirstTextSegment) {
      textSegment = textSegment.charAt(0).toUpperCase() + textSegment.slice(1);
    }
    if (searchTerms.length) {
      const regex = new RegExp(`(${searchTerms.join('|')})`, 'gi');
      textSegment = textSegment.replace(regex, '<span class="bg-yellow-300">$1</span>');
    }
    elements.push(
      <span
        key={`text-end`}
        dangerouslySetInnerHTML={{ __html: textSegment }}
      />
    );
  }

  return elements;
};


export const parseFormattedContent = (formatted_lines) => {
  // If no lines array or it’s empty, return an empty string (or array, if that makes more sense)
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

