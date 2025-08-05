import { getAgeInStringFmt } from './DateUtils';
import { createNote } from './ApiUtils';

export const calculateDatesToAsk = (startDate, endDate, cadence, days) => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const dates = [];
  let currentDate = new Date(start);

  while (currentDate <= end) {
    if (shouldAskOnDate(currentDate, cadence, days)) {
      dates.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

export const shouldAskOnDate = (date, cadence, days) => {
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
  
  switch (cadence) {
    case 'Daily':
      return true;
    case 'Weekly':
      return days.includes(dayOfWeek);
    case 'Monthly':
      return date.getDate() === 1; // First day of month
    case 'Yearly':
      return date.getMonth() === 0 && date.getDate() === 1; // First day of year
    default:
      return false;
  }
};

export const generateTrackerQuestions = (notes) => {
  if (!notes || !Array.isArray(notes)) {
    return [];
  }

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Get all tracker answers
  const trackerAnswers = notes
    .filter(note => note.content.includes('meta::tracker_answer'))
    .map(note => {
      const lines = note.content.split('\n');
      const answer = lines.find(line => line.startsWith('Answer:'))?.replace('Answer:', '').trim();
      const date = lines.find(line => line.startsWith('Date:'))?.replace('Date:', '').trim();
      const link = lines.find(line => line.startsWith('meta::link:'))?.replace('meta::link:', '').trim();
      return { answer, date, link };
    });

  const questions = notes
    .filter(note => note.content.includes('meta::tracker'))
    .flatMap(note => {
      const lines = note.content.split('\n');
      const title = lines.find(line => line.startsWith('Title:'))?.replace('Title:', '').trim();
      const question = lines.find(line => line.startsWith('Question:'))?.replace('Question:', '').trim();
      const type = lines.find(line => line.startsWith('Type:'))?.replace('Type:', '').trim();
      const cadence = lines.find(line => line.startsWith('Cadence:'))?.replace('Cadence:', '').trim();
      const days = lines.find(line => line.startsWith('Days:'))?.replace('Days:', '').trim()?.split(',') || [];
      const startDate = lines.find(line => line.startsWith('Start Date:'))?.replace('Start Date:', '').trim();
      const endDate = lines.find(line => line.startsWith('End Date:'))?.replace('End Date:', '').trim();

      if (!startDate) return [];

      // Calculate all dates that need questions
      const datesToAsk = calculateDatesToAsk(startDate, endDate, cadence, days);
      
      // Filter dates that don't have answers
      const unansweredDates = datesToAsk.filter(date => {
        const dateStr = date.toISOString().split('T')[0];
        return !trackerAnswers.some(answer => 
          answer.link === note.id && answer.date === dateStr
        );
      });

      // Create questions for unanswered dates
      return unansweredDates.map(date => {
        // Format the date for display
        const formattedDate = date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        // Create the date (age) combo
        const dateAgeCombo = `${formattedDate} (${getAgeInStringFmt(date)})`;
        
        // Replace #date# in question with the combo
        const formattedQuestion = question.replace(/#date#/g, dateAgeCombo);
        
        return {
          id: note.id,
          title,
          question: formattedQuestion,
          type,
          date: date.toISOString().split('T')[0],
          formattedDate
        };
      });
    });

  // Sort all questions by date
  return questions.sort((a, b) => new Date(a.date) - new Date(b.date));
};

export const createTrackerAnswerNote = async (trackerId, answer, date) => {
  if (!answer) {
    throw new Error('Please enter a value before submitting');
  }

  const answerContent = `Answer: ${answer}\nDate: ${date}\nrecorded_on_date: ${date}\nmeta::link:${trackerId}\nmeta::tracker_answer`;
  
  
  
  const response = await createNote(answerContent);
  if (!response || !response.id) {
    throw new Error('Failed to create answer note');
  }

  return response;
}; 