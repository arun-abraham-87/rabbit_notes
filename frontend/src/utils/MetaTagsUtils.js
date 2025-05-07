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