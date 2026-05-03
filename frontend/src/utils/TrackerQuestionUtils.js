import { getAgeInStringFmt } from './DateUtils';
import { createNote } from './ApiUtils';

export const isCustomXDaysTrackerCadence = (cadence = '') => {
  const normalized = String(cadence).trim().toLowerCase();
  return normalized === 'custom_x_days' || normalized === 'custom x days';
};

export const getTrackerOverdueThreshold = (tracker = {}) => {
  const override = parseInt(tracker.overdueDays, 10);
  if (Number.isFinite(override) && override > 0) {
    return { days: override, isOverride: true };
  }

  if (isCustomXDaysTrackerCadence(tracker.cadence)) {
    return { days: 30, isOverride: false };
  }

  const cadence = tracker.cadence ? tracker.cadence.toLowerCase() : '';
  const cadenceThresholds = {
    daily: 1,
    weekly: 7,
    monthly: 31,
    yearly: 365,
    custom: 30,
    custom_x_days: 30,
    'custom x days': 30
  };

  return {
    days: cadenceThresholds[cadence] || 30,
    isOverride: false
  };
};

export const calculateDatesToAsk = (startDate, endDate, cadence, days, overdueDays) => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const dates = [];
  let currentDate = new Date(start);
  const customXDaysThreshold = parseInt(overdueDays, 10);

  while (currentDate <= end) {
    if (shouldAskOnDate(currentDate, cadence, days, start, customXDaysThreshold)) {
      dates.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

export const shouldAskOnDate = (date, cadence, days, startDate = null, customXDaysThreshold = 30) => {
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
    case 'Custom X Days':
    case 'custom_x_days':
      if (!startDate) return false;
      const threshold = Number.isFinite(customXDaysThreshold) && customXDaysThreshold > 0 ? customXDaysThreshold : 30;
      const start = new Date(startDate);
      const daysSinceStart = Math.floor((date - start) / (1000 * 60 * 60 * 24));
      return daysSinceStart >= 0 && daysSinceStart % threshold === 0;
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
      const overdueDays = lines.find(line => line.startsWith('overdue:'))?.replace('overdue:', '').trim();

      if (!startDate) return [];

      // Calculate all dates that need questions
      const datesToAsk = calculateDatesToAsk(startDate, endDate, cadence, days, overdueDays);
      
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

export const createTrackerAnswerNote = async (trackerId, answer, date, notes = '', trackerName = '') => {
  if (!answer && answer !== 0 && answer !== '0') {
    throw new Error('Please enter a value before submitting');
  }

  let answerContent = `Answer: ${answer}\nDate: ${date}\nrecorded_on_date: ${date}\nmeta::link:${trackerId}\nmeta::tracker_answer`;
  
  // Add "answer for <tracker name>" if tracker name is provided
  if (trackerName && trackerName.trim()) {
    answerContent += `\nanswer for ${trackerName.trim()}`;
  }
  
  // Add notes if provided
  if (notes && notes.trim()) {
    answerContent += `\nNotes: ${notes.trim()}`;
  }
  
  const response = await createNote(answerContent);
  if (!response || !response.id) {
    throw new Error('Failed to create answer note');
  }

  return response;
};
