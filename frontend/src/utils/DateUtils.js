import moment from 'moment';

/**
 * Calculates the relative time from a given date string to now
 * Supports two formats:
 * 1. "DD/MM/YYYY, h:mm:ss a"
 * 2. "YYYY-MM-DDThh:mm:ss"
 * @param {string} dateString - Date string in format "DD/MM/YYYY, h:mm:ss a" or "YYYY-MM-DDThh:mm:ss"
 * @returns {string} Relative time string (e.g., "2 hours ago", "in 3 days")
 */
export const getAge = (dateString) => {
   
    return `${parseToMoment(dateString).fromNow()}`;
}

/**
 * Gets the day of the week from a date string
 * @param {string} dateStr - Date string in format "DD/MM/YYYY" (e.g., "25/12/2023")
 * @returns {string} Full name of the day (e.g., "Monday", "Tuesday")
 */
export const getDayOfWeek = (dateStr) => {
    const date = parseToMoment(dateStr);
    return date.format('dddd');  // Get the full name of the day (e.g., Monday)
};

/**
 * Parses an Australian date string into a JavaScript Date object using moment
 * @param {string} dateStr - Date string in format "DD/MM/YYYY, h:mm:ss a" (e.g., "25/12/2023, 2:30:45 PM")
 * @returns {Date} JavaScript Date object
 */
export const parseAustralianDate = (dateStr) => {
  const m = moment(dateStr, "DD/MM/YYYY, h:mm:ss a", true);
  if (m.isValid()) {
    return m.toDate();
  } else {
    console.error('Error parsing Australian date:', dateStr);
    return new Date(); // fallback to current date
  }
};

/**
 * Formats a date with relative time
 * @param {Date} date - JavaScript Date object
 * @param {string} [stringval] - Optional string value (unused parameter)
 * @returns {string} Formatted date string in "DD-MM-YYYY" format
 */
export const getFormattedDateString = (date, stringval) => {
  if (!date) return '';

  try {
    return moment(date).format('DD-MM-YYYY');
  } catch (error) {
    console.error('Error formatting date with moment:', error);
    return '';
  }
};

/**
 * Formats a date string with relative time
 * Supports:
 * 1. "DD/MM/YYYY, h:mm:ss a"
 * 2. "YYYY-MM-DDThh:mm:ss"
 * 3. "DD/MM/YYYY"
 * @param {string} dateString - Date string in common formats
 * @returns {string} Formatted date string with relative time (e.g., "25-12-2023 (2 days ago)")
 */
export const getFormattedDateWithAge = (dateString) => {
  if (!dateString) return '';

  try {
      const m = parseToMoment(dateString);
      if (!m || !m.isValid()) {
          throw new Error('Invalid date string');
      }

      const formattedDate = m.format('DD-MM-YYYY');
      const age = m.fromNow();
      return `${formattedDate} (${age})`;
  } catch (error) {
      console.error('Error formatting date:', error);
      return '';
  }
};

/**
 * Gets today's date in the Australian timezone
 * @returns {string} Date string in format "YYYY-MM-DD" (e.g., "2023-12-25")
 */
export const getTodaysDateInAusDateYYYYMMDDStr = () => {
    const ausDate = new Date().toLocaleDateString("en-AU", {
        timeZone: "Australia/Sydney",
    });
    const [day, month, year] = ausDate.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

/**
 * Gets the next or previous date from a given date
 * @param {string} dateString - Date string in format "YYYY-MM-DD" (e.g., "2023-12-25")
 * @param {boolean} next - If true, get next day; if false, get previous day
 * @returns {string} Date string in format "YYYY-MM-DD" (e.g., "2023-12-26")
 */
export const getNextOrPrevDateStr = (dateString, next) => {
    const [year, month, day] = dateString.split("-");
    const date = new Date(year, month - 1, day); // Month is 0-based

    date.setDate(date.getDate() + (next ? 1 : -1)); // Increment the day by 1

    const nextDay = date.getDate().toString().padStart(2, "0");
    const nextMonth = (date.getMonth() + 1).toString().padStart(2, "0"); // Month is 0-based
    const nextYear = date.getFullYear();

    return `${nextYear}-${nextMonth.padStart(2, "0")}-${nextDay.padStart(2, "0")}`;
};

/**
 * Calculates the age in years, months, and days between two dates
 * @param {Date} dateToAge - The date to calculate age from
 * @param {boolean} since - If true, calculate from dateToAge to now; if false, calculate from now to dateToAge
 * @returns {string} Formatted age string (e.g., "2 yrs 3 months 5 days")
 */
export const getDateAgeInYearsMonthsDays = (dateToAge, since) => {
  const now = new Date();
  let diff = 0
  if (since) {
    diff = now - dateToAge;
  } else {
    diff = dateToAge - now;
  }

  if (diff > 0) {
    const diffDate = new Date(diff);
    const years = diffDate.getUTCFullYear() - 1970;
    const months = diffDate.getUTCMonth();
    const days = diffDate.getUTCDate() - 1;
    const parts = [];
    if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
    if (days > 0 || parts.length === 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    return parts.join(' ')
  }
}

// Constants for date formatting
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DATE_REGEX = /\b(\d{2})\/(\d{2})\/(\d{4})\b|\b(\d{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})\b/g;

/**
 * Calculates the age string (years, months, days) from a date difference
 * @param {number} diff - Time difference in milliseconds
 * @param {boolean} inFuture - Whether the date is in the future
 * @returns {string} Formatted age string (e.g., "2 yrs 3 months 5 days ago")
 */
const calculateAgeString = (diff, inFuture) => {
  const diffDate = new Date(Math.abs(diff));
  const years = diffDate.getUTCFullYear() - 1970;
  const months = diffDate.getUTCMonth();
  const days = diffDate.getUTCDate();

  const parts = [];
  if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
  if (days > 0 || parts.length === 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);

  return inFuture ? `(in ${parts.join(' ')})` : `(${parts.join(' ')} ago)`;
};

/**
 * Formats a date and adds its age relative to current time
 * @param {string} d - Day
 * @param {string} m - Month (number or string)
 * @param {string} y - Year
 * @param {boolean} isMonthStr - Whether the month is a string
 * @returns {string} Formatted date with age (e.g., "25 Dec 2023 (2 days ago)")
 */
const formatDateWithAge = (d, m, y, isMonthStr = false) => {
  const date = isMonthStr 
    ? new Date(`${m} ${d}, ${y}`)
    : new Date(`${y}-${m}-${d}`);

  const formatted = isMonthStr 
    ? `${d} ${m} ${y}`
    : `${d} ${MONTHS[parseInt(m) - 1]} ${y}`;

  const now = new Date();
  const diff = now - date;
  const inFuture = diff < 0;

  return `${formatted} ${calculateAgeString(diff, inFuture)}`;
};

/**
 * Formats a date and includes its age
 * Supports both Date objects and text containing dates
 * For text, supports two formats:
 * 1. DD/MM/YYYY (e.g., 25/12/2023)
 * 2. DD MMM YYYY (e.g., 25 Dec 2023)
 * @param {Date|string} input - Date object or text containing dates
 * @returns {string} Formatted date with age (e.g., "25 Dec 2023 (2 days ago)")
 */
export const formatAndAgeDate = (input) => {
  if (input instanceof Date) {
    const day = input.getDate();
    const month = input.getMonth() + 1;
    const year = input.getFullYear();
    return formatDateWithAge(day, month, year);
  }
  // If not a Date object, treat as text and use the regex implementation
  return input.replace(DATE_REGEX, (match, d1, m1, y1, d2, monthStr, y2) => {
    if (d1 && m1 && y1) {
      return formatDateWithAge(d1, m1, y1);
    } else if (d2 && monthStr && y2) {
      return formatDateWithAge(d2, monthStr, y2, true);
    }
    return match;
  });
};

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

    switch(tagType) {
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
/**
 * Attempts to parse a date string using common formats and returns a moment object
 * Supports:
 * 1. "DD/MM/YYYY, h:mm:ss a"
 * 2. "YYYY-MM-DDThh:mm:ss"
 * 3. "DD/MM/YYYY"
 * 4. Default Moment parsing as fallback
 * @param {string|Date} input - Date string or Date object
 * @returns {moment.Moment|null} Parsed moment object or null if invalid
 */
export const parseToMoment = (input) => {
  if (!input) return null;

  if (moment.isMoment(input)) {
      return input;
  }

  if (input instanceof Date) {
      return moment(input);
  }

  const str = input.toString();
  if (str.includes('T')) {
      const m = moment(str, moment.ISO_8601, true);
      return m.isValid() ? m : null;
  }

  let m = moment(str, "DD/MM/YYYY, h:mm:ss a", true);
  if (m.isValid()) return m;

  m = moment(str, "DD/MM/YYYY", true);
  if (m.isValid()) return m;

  m = moment(str);
  return m.isValid() ? m : null;
};