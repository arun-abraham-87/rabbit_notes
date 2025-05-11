import moment from 'moment';

// Constants for date formatting
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DATE_REGEX = /\b(\d{2})\/(\d{2})\/(\d{4})\b|\b(\d{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})\b/g;

/**
 * Checks if a date string matches today's date
 * Supports multiple date formats:
 * 1. "YYYY-MM-DD"
 * 2. "DD/MM/YYYY"
 * 3. "DD-MM-YYYY"
 * @param {string} dateString - The date string to check
 * @returns {boolean} True if the date matches today, false otherwise
 */
export const isSameAsTodaysDate = (dateString) => {
  if (!dateString) return false;
  
  const today = moment().format('YYYY-MM-DD');
  const momentObj = parseToMoment(dateString);
  
  if (!momentObj) return false;
  
  return momentObj.format('YYYY-MM-DD') === today;
};

/**
 * Calculates the relative time from a given date string to now
 * Supports two formats:
 * 1. "DD/MM/YYYY, h:mm:ss a"
 * 2. "YYYY-MM-DDThh:mm:ss"
 * @param {string} dateStr - Date string in format "DD/MM/YYYY, h:mm:ss a" or "YYYY-MM-DDThh:mm:ss"
 * @returns {string} Relative time string (e.g., "2 hours ago", "in 3 days")
 */
export const getAge = (dateStrOrDateObj) => {
  const momentObj = parseToMoment(dateStrOrDateObj);
  return momentObj ? momentObj.fromNow() : 'Invalid date';
}

/**
 * Gets the day of the week from a date string
 * @param {string} dateStr - Date string in format "DD/MM/YYYY" (e.g., "25/12/2023")
 * @returns {string} Full name of the day (e.g., "Monday", "Tuesday")
 */
export const getDayOfWeek = (dateStrOrDateObj) => {
  const momentObj = parseToMoment(dateStrOrDateObj);
  return momentObj ? momentObj.format('dddd') : 'Invalid date';
};

/**
 * Formats a date with relative time
 * @param {Date} date - JavaScript Date object
 * @param {string} [stringval] - Optional string value (unused parameter)
 * @returns {string} Formatted date string in "DD-MM-YYYY" format
 */
export const getDateInDDMMYYYYFormat = (dateStrOrDateObj) => {
    const momentObj = parseToMoment(dateStrOrDateObj);
    return momentObj ? momentObj.format('DD-MM-YYYY') : 'Invalid date';
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
export const getDateInDDMMYYYYFormatWithAgeInParentheses = (dateString) => {
    const momentObj = parseToMoment(dateString);
    if (!momentObj) return 'Invalid date';
    const formattedDate = momentObj.format('DD-MM-YYYY');
    return `${formattedDate} (${momentObj.fromNow()})`;
};

/**
 * Gets today's date in the Australian timezone
 * @returns {string} Date string in format "YYYY-MM-DD" (e.g., "2023-12-25")
 */
export const getTodaysDateInYYYYMMDDFormat = () => {
  return moment().format('YYYY-MM-DD');
};

export const getCurrentISOTime = () => {
  return moment().format('YYYY-MM-DDTHH:mm:ss');
};

/**with timestamp in time seperated by t
 * 
 * Gets the next or previous date from a given date
 * @param {string} dateString - Date string in format "YYYY-MM-DD" (e.g., "2023-12-25")
 * @param {boolean} next - If true, get next day; if false, get previous day
 * @returns {string} Date string in format "YYYY-MM-DD" (e.g., "2023-12-26")
 */
export const getNextOrPrevDateStr = (dateString, next) => {
  const momentObj = parseToMoment(dateString);
  return momentObj ? momentObj.add(next ? 1 : -1, 'days').format('YYYY-MM-DD') : 'Invalid date';
};

//function to get diff in positive numbers passed two dates
export const getDiffInDays = (date1, date2) => {
  date1=parseToMoment(date1);
  date2=parseToMoment(date2);
  return Math.abs(date1.diff(date2, 'days'));
}

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