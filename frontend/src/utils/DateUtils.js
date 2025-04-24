import moment from 'moment';

export const getAge = (dateString) => {
    const noteDate = moment(dateString, "DD/MM/YYYY, h:mm:ss a");
    return  `${noteDate.fromNow()}`
}

export const getDayOfWeek = (datePart) => {
    const date = moment(datePart, "DD/MM/YYYY");
    const dayOfWeek = date.format('dddd');  // Get the full name of the day (e.g., Monday)
    return dayOfWeek;
};


// Function to format the date with relative time
export const formatDate = (dateString) => {
    return `${dateString} (${getAge(dateString)})`;
};


// Get today's date in the Australian timezone and format as YYYY-MM-DD
export const getAustralianDate = () => {
    const ausDate = new Date().toLocaleDateString("en-AU", {
        timeZone: "Australia/Sydney",
    });
    const [day, month, year] = ausDate.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};


export const getNextOrPrevDate = (dateString, next) => {
    const [year, month, day] = dateString.split("-");
    const date = new Date(year, month - 1, day); // Month is 0-based

    date.setDate(date.getDate() + (next ? 1 : -1)); // Increment the day by 1

    const nextDay = date.getDate().toString().padStart(2, "0");
    const nextMonth = (date.getMonth() + 1).toString().padStart(2, "0"); // Month is 0-based
    const nextYear = date.getFullYear();

    return `${nextYear}-${nextMonth.padStart(2, "0")}-${nextDay.padStart(2, "0")}`;
};

export const addNumbers = (a, b) => {
    return a + b;
};



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
 * @returns {string} Formatted age string
 */
const calculateAgeString = (diff, inFuture) => {
  const diffDate = new Date(Math.abs(diff));
  const years = diffDate.getUTCFullYear() - 1970;
  const months = diffDate.getUTCMonth();
  const days = diffDate.getUTCDate() - 1;

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
 * @returns {string} Formatted date with age
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
 * Finds dates in text and replaces them with formatted dates including their age
 * Supports two formats:
 * 1. DD/MM/YYYY (e.g., 25/12/2023)
 * 2. DD MMM YYYY (e.g., 25 Dec 2023)
 * @param {string} text - Input text containing dates
 * @returns {string} Text with formatted dates and ages
 */
export const formatAndAgeDate = (text) => {
  return text.replace(DATE_REGEX, (match, d1, m1, y1, d2, monthStr, y2) => {
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
 * @returns {Object} Object containing arrays of different types of meta tags
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
      default:
        metaTags.other.push(trimmedLine);
    }
  });

  return metaTags;
};