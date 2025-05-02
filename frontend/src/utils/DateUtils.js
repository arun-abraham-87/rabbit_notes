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
    if (!dateString || (typeof dateString !== 'string' && typeof dateString.toString !== 'function')) {
        return '';
    }

    const str = dateString.toString();

    let noteDate;
    if (str.includes('T')) {
        noteDate = moment(str, moment.ISO_8601);
    } else {
        noteDate = moment(str, "DD/MM/YYYY, h:mm:ss a");
    }

    return `${noteDate.fromNow()}`;
}

/**
 * Gets the day of the week from a date string
 * @param {string} datePart - Date string in format "DD/MM/YYYY" (e.g., "25/12/2023")
 * @returns {string} Full name of the day (e.g., "Monday", "Tuesday")
 */
export const getDayOfWeek = (datePart) => {
    const date = moment(datePart, "DD/MM/YYYY");
    const dayOfWeek = date.format('dddd');  // Get the full name of the day (e.g., Monday)
    return dayOfWeek;
};

/**
 * Parses an Australian date string into a JavaScript Date object
 * @param {string} dateStr - Date string in format "DD/MM/YYYY, h:mm:ss a" (e.g., "25/12/2023, 2:30:45 PM")
 * @returns {Date} JavaScript Date object
 * @throws {Error} If date string is invalid or in wrong format
 */
export const parseAustralianDate = (dateStr) => {
  try {
    if (!dateStr) {
      throw new Error('Date string is empty');
    }

    const [datePart, timePartRaw] = dateStr.split(', ');
    if (!datePart || !timePartRaw) {
      throw new Error('Invalid date format');
    }

    const [day, month, year] = datePart.split('/').map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      throw new Error('Invalid date numbers');
    }

    const timePart = timePartRaw.toLowerCase().replace(' pm', 'PM').replace(' am', 'AM');
    const [time, period] = timePart.split(/(am|pm)/i);
    let [hours, minutes, seconds] = time.trim().split(':').map(Number);

    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
      throw new Error('Invalid time numbers');
    }

    if (period.toLowerCase() === 'pm' && hours < 12) hours += 12;
    if (period.toLowerCase() === 'am' && hours === 12) hours = 0;

    return new Date(year, month - 1, day, hours, minutes, seconds);
  } catch (error) {
    console.error('Error parsing date:', error.message);
    // Return current date in Australian format
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const period = now.getHours() >= 12 ? 'PM' : 'AM';
    
    return new Date(`${day}/${month}/${year}, ${hours}:${minutes}:${seconds} ${period}`);
  }
}

/**
 * Formats a date with relative time
 * @param {Date} date - JavaScript Date object
 * @param {string} [stringval] - Optional string value (unused parameter)
 * @returns {string} Formatted date string in "DD-MM-YYYY" format
 */
export const getFormattedDateString = (date,stringval) => {
  if (!date) return '';
  
  try {
      // Format the date parts
      const formattedDay = String(date.getDate()).padStart(2, '0');
      const formattedMonth = String(date.getMonth() + 1).padStart(2, '0');
      const formattedYear = date.getFullYear();
      const formattedDate = `${formattedDay}-${formattedMonth}-${formattedYear}`;
      return `${formattedDay}-${formattedMonth}-${formattedYear}`;
  } catch (error) {
      console.error('Error formatting date:', error);
      return '';
  }
};

/**
 * Formats a date string with relative time
 * Supports two formats:
 * 1. "DD/MM/YYYY, h:mm:ss a" (e.g., "25/12/2023, 2:30:45 PM")
 * 2. "YYYY-MM-DDThh:mm:ss" (e.g., "2023-12-25T14:30:45")
 * @param {string} dateString - Date string in either format
 * @returns {string} Formatted date string with relative time (e.g., "25-12-2023 (2 days ago)")
 */
export const getFormattedDateWithAge = (dateString) => {
    if (!dateString) return '';
    
    try {
        let date;
        // Check for ISO format (YYYY-MM-DDThh:mm:ss)
        if (dateString.includes('T')) {
            date = new Date(dateString);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid ISO date format');
            }
        } else {
            // Parse the date string in format "DD/MM/YYYY, h:mm:ss a"
            const [datePart, timePart] = dateString.split(", ");
            const [day, month, year] = datePart.split("/").map(Number);
            date = new Date(year, month - 1, day);
        }
        
        // Format the date parts
        const formattedDay = String(date.getDate()).padStart(2, '0');
        const formattedMonth = String(date.getMonth() + 1).padStart(2, '0');
        const formattedYear = date.getFullYear();
        
        const now = new Date();
        const diff = date - now;
        const inFuture = diff > 0;
        
        const age = calculateAgeString(Math.abs(diff), inFuture);
        
        return `${formattedDay}-${formattedMonth}-${formattedYear} ${age}`;
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