/**
 * Extracts all meta tags from note content
 * @param {string} content - The note content to extract tags from
 * @returns {Object} Object containing arrays of different types of meta tags:
 * {
 *   priority: string[],    // meta::high, meta::medium, meta::low
 *   todo: string[],        // meta::todo
 *   links: string[],       // meta::link::ID
 *   dates: string[],       // meta::end_date::DATE
 *   events: string[],      // meta::event::DATE
 *   meetings: string[],    // meta::meeting::DATE
 *   pins: string[],        // meta::pin::INDICES
 *   abbreviations: boolean[], // meta::abbreviation
 *   bookmarks: boolean[],    // meta::bookmark
 *   recurring: string[],    // meta::recurring::TYPE
 *   recurringEnd: string[], // meta::recurring_end::DATE
 *   other: string[]        // Any other meta:: tags
 * }
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