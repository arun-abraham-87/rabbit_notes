
import moment from 'moment';

export  const getAge = (dateString) => {
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