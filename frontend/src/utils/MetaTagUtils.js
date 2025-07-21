/**
 * Delete a specific meta tag from note content
 * @param {string} content - The note content
 * @param {string} metaTag - The meta tag to delete (e.g., 'watch', 'priority', 'todo')
 * @returns {string} The note content with the specified meta tag removed
 */
export const deleteMetaTag = (content, metaTag) => {
  const lines = content.split('\n')
    .filter(line => {
      const trimmedLine = line.trim();
      // Keep the line if it's not a meta line or if it's a meta line but not the one we want to delete
      return !trimmedLine.startsWith('meta::') || 
             (trimmedLine.startsWith('meta::') && !trimmedLine.includes(`meta::${metaTag}`));
    });
  return lines.join('\n').trim();
};

/**
 * Add or replace a meta tag in note content
 * @param {string} content - The note content
 * @param {string} metaTag - The meta tag to add/replace (e.g., 'watch', 'priority', 'todo')
 * @param {string} value - The value to set for the meta tag
 * @returns {string} The note content with the meta tag added or replaced
 */
export const addOrReplaceMetaTag = (content, metaTag, value) => {
  // First delete the existing meta tag if it exists
  const contentWithoutTag = deleteMetaTag(content, metaTag);
  
  // Add the new meta tag at the end
  const newMetaLine = `meta::${metaTag}::${value}`;
  return `${contentWithoutTag}\n${newMetaLine}`.trim();
};

/**
 * Check if a meta tag exists in the note content
 * @param {string} content - The note content
 * @param {string} metaTag - The meta tag to check for (e.g., 'watch', 'priority', 'todo')
 * @returns {boolean} True if the meta tag exists, false otherwise
 */
export const hasMetaTag = (content, metaTag) => {
  const lines = content.split('\n');
  return lines.some(line => {
    const trimmedLine = line.trim();
    return trimmedLine.startsWith('meta::') && trimmedLine.includes(`meta::${metaTag}`);
  });
};

/**
 * Add a meta tag at the end of a specific line in the note content
 * @param {string} content - The note content
 * @param {number} lineIndex - The line index where to append the meta tag (0-based)
 * @param {string} metaTag - The meta tag to add (e.g., 'watch', 'priority', 'todo')
 * @param {string} value - The value to set for the meta tag
 * @returns {string} The note content with the meta tag appended to the specified line
 */
export const addMetaTagAtLine = (content, lineIndex, metaTag, value) => {
  const lines = content.split('\n');
  
  // Ensure lineIndex is within bounds
  const safeIndex = Math.max(0, Math.min(lineIndex, lines.length - 1));
  
  // Append the meta tag to the specified line
  const line = lines[safeIndex].trim();
  const newMetaTag = `meta_line::${metaTag}::${value}`;
  lines[safeIndex] = line ? `${line} ${newMetaTag}` : newMetaTag;
  
  return lines.join('\n').trim();
};

/**
 * Add or replace a meta line tag at the end of a given line
 * @param {string} line - The line to modify
 * @param {string} metaTag - The meta tag type to add/replace (e.g., 'watch', 'priority', 'todo')
 * @param {string} value - The value to set for the meta tag
 * @returns {string} The line with the meta line tag added or replaced
 */
export const addOrReplaceMetaLineTag = (line, metaTag, value) => {
  // Split the line into parts by meta_line:: to separate content and meta tags
  const parts = line.split('meta_line::');
  const content = parts[0].trim();
  
  // Process existing meta tags
  const otherMetaTags = [];
  for (let i = 1; i < parts.length; i++) {
    const metaPart = parts[i];
    // Find the first occurrence of '::' to separate type from value
    const typeEndIndex = metaPart.indexOf('::');
    if (typeEndIndex === -1) continue; // Skip invalid meta tags
    
    const type = metaPart.substring(0, typeEndIndex);
    // The value is everything after the second '::' until the next meta_line:: or end
    const value = metaPart.substring(typeEndIndex + 2);
    
    // Only keep meta tags that aren't the one we're replacing
    if (type !== metaTag) {
      otherMetaTags.push(`meta_line::${type}::${value}`);
    }
  }
  
  // Add the new meta tag
  const newMetaTag = `meta_line::${metaTag}::${value}`;
  
  // Combine everything back together
  return [content, ...otherMetaTags, newMetaTag].join(' ').trim();
};

/**
 * Extracts and categorizes meta tags from note content.
 * Meta tags are special markers in the note content that start with 'meta::' and provide
 * additional metadata about the note.
 * 
 * @param {string} content - The note content to extract tags from
 * @returns {Object} Object containing arrays of different types of meta tags:
 * {
 *   priority: string[],    // meta::high, meta::medium, meta::low - Priority levels for todos
 *   todo: string[],        // meta::todo - Todo items with optional dates
 *   links: string[],       // meta::link::ID - Links to other notes
 *   dates: string[],       // meta::end_date::DATE - Due dates for todos
 *   events: string[],      // meta::event::DATE - Calendar events
 *   meetings: string[],    // meta::meeting::DATE - Scheduled meetings
 *   pins: string[],        // meta::pin::INDICES - Pinned sections in the note
 *   abbreviations: boolean[], // meta::abbreviation - Notes that are abbreviations
 *   bookmarks: boolean[],    // meta::bookmark - Bookmarked notes
 *   webBookmarks: boolean[], // meta::web_bookmark - Web bookmarks
 *   expenses: boolean[],     // meta::expense - Expense notes
 *   recurring: string[],    // meta::recurring::TYPE - Recurring events/todos
 *   recurringEnd: string[], // meta::recurring_end::DATE - End date for recurring items
 *   other: string[]        // Any other meta:: tags not explicitly handled
 * }
 * 
 * @example
 * // Input note content:
 * // "Meeting notes\nmeta::meeting::2024-03-20\nmeta::high\nmeta::todo::2024-03-21"
 * // Returns:
 * // {
 * //   priority: ['high'],
 * //   todo: ['2024-03-21'],
 * //   meetings: ['2024-03-20'],
 * //   // ... other arrays empty
 * // }
 */
export const extractMetaTags = (content) => {
  const lines = content.split('\n');
  const metaTags = {
    priority: [],    // meta::high, meta::medium, meta::low
    todo: [],        // meta::todo
    links: [],       // meta::link::ID
    dates: [],       // meta::end_date::DATE
    events: [],      // meta::event::DATE
    meetings: [],    // meta::meeting::DATE
    pins: [],        // meta::pin::INDICES
    abbreviations: [], // meta::abbreviation
    bookmarks: [],    // meta::bookmark
    webBookmarks: [], // meta::web_bookmark
    expenses: [],     // meta::expense
    recurring: [],    // meta::recurring::TYPE
    recurringEnd: [], // meta::recurring_end::DATE
    other: []        // Any other meta:: tags
  };

  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith('meta::')) return;

    const parts = trimmedLine.split('::');
    const tagType = parts[1];

    switch (tagType) {
      case 'high':
      case 'medium':
      case 'low':
        metaTags.priority.push(tagType);
        break;
      case 'todo':
        metaTags.todo.push(parts.slice(2).join('::'));
        break;
      case 'link':
        metaTags.links.push(parts[2]);
        break;
      case 'end_date':
        metaTags.dates.push(parts[2]);
        break;
      case 'event':
        metaTags.events.push(parts[2]);
        break;
      case 'meeting':
        metaTags.meetings.push(parts[2]);
        break;
      case 'pin':
        metaTags.pins.push(parts[2]);
        break;
      case 'abbreviation':
        metaTags.abbreviations.push(true);
        break;
      case 'bookmark':
        metaTags.bookmarks.push(true);
        break;
      case 'web_bookmark':
        metaTags.webBookmarks.push(true);
        break;
      case 'expense':
        metaTags.expenses.push(true);
        break;
      case 'recurring':
        metaTags.recurring.push(parts[2]);
        break;
      case 'recurring_end':
        metaTags.recurringEnd.push(parts[2]);
        break;
      default:
        metaTags.other.push(trimmedLine);
    }
  });

  return metaTags;
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
    'meta::web_bookmark',
    'meta::expense',
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
  if (nonMetaLines.length > 0 && metaLines.length > 0) {
    return [...nonMetaLines, ...metaLines].join('\n').trim();
  } else if (metaLines.length > 0) {
    return metaLines.join('\n').trim();
  } else {
    return nonMetaLines.join('\n').trim();
  }
}; 