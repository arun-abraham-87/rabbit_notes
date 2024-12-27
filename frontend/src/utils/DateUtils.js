
import moment from 'moment';

export  const getAge = (datePart) => {
    const daysAgo = moment().diff(moment(datePart, "DD/MM/YYYY"), 'days');
    if(daysAgo==0){
      return 'Today'
    }else if (daysAgo==1){
      return '(' + daysAgo + ' Day Ago) ' 
    }
    return '(' + daysAgo + ' Days Ago) '
  }

  export const getDayOfWeek = (datePart) => {
    const date = moment(datePart, "DD/MM/YYYY");
    const dayOfWeek = date.format('dddd');  // Get the full name of the day (e.g., Monday)
    return dayOfWeek;
};