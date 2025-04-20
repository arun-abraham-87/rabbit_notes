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

export const formatAndAgeDate = (text) => {
  const dateRegex = /\b(\d{2})\/(\d{2})\/(\d{4})\b|\b(\d{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})\b/g;
  return text.replace(dateRegex, (match, d1, m1, y1, d2, monthStr, y2) => {
    let date;
    if (d1 && m1 && y1) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      date = new Date(`${y1}-${m1}-${d1}`);
      const formatted = `${d1} ${months[parseInt(m1) - 1]} ${y1}`;
      const now = new Date();
      let diff = now - date;
      let inFuture = diff < 0;
      diff = Math.abs(diff);
      const diffDate = new Date(diff);
      const years = diffDate.getUTCFullYear() - 1970;
      const monthsDiff = diffDate.getUTCMonth();
      const days = diffDate.getUTCDate() - 1;
      let parts = [];
      if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
      if (monthsDiff > 0) parts.push(`${monthsDiff} month${monthsDiff > 1 ? 's' : ''}`);
      if (days > 0 || parts.length === 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
      const ageStr = inFuture ? `(in ${parts.join(' ')})` : `(${parts.join(' ')} ago)`;
      return `${formatted} ${ageStr}`;
    } else if (d2 && monthStr && y2) {
      date = new Date(`${monthStr} ${d2}, ${y2}`);
      const formatted = `${d2} ${monthStr} ${y2}`;
      const now = new Date();
      let diff = now - date;
      let inFuture = diff < 0;
      diff = Math.abs(diff);
      const diffDate = new Date(diff);
      const years = diffDate.getUTCFullYear() - 1970;
      const monthsDiff = diffDate.getUTCMonth();
      const days = diffDate.getUTCDate() - 1;
      let parts = [];
      if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
      if (monthsDiff > 0) parts.push(`${monthsDiff} month${monthsDiff > 1 ? 's' : ''}`);
      if (days > 0 || parts.length === 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
      const ageStr = inFuture ? `(in ${parts.join(' ')})` : `(${parts.join(' ')} ago)`;
      return `${formatted} ${ageStr}`;
    }
    return match;
  });
};