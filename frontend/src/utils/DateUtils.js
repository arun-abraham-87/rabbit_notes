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