import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon, DocumentTextIcon, PlusIcon, CalendarIcon, PencilIcon, InformationCircleIcon, ChevronDownIcon, ChevronRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import EditEventModal from '../components/EditEventModal';
import { createNote, updateNoteById, deleteNoteById } from '../utils/ApiUtils';
import { addNoteToIndex } from '../utils/SearchUtils';

// Function to extract event details from note content
const getEventDetails = (content) => {
  const lines = content.split('\n');
  
  // Find the description
  const descriptionLine = lines.find(line => line.startsWith('event_description:'));
  const description = descriptionLine ? descriptionLine.replace('event_description:', '').trim() : '';
  
  // Find the event date
  const eventDateLine = lines.find(line => line.startsWith('event_date:'));
  const dateTime = eventDateLine ? eventDateLine.replace('event_date:', '').trim() : '';
  
  // Find recurring info
  const recurringLine = lines.find(line => line.startsWith('event_recurring_type:'));
  const recurrence = recurringLine ? recurringLine.replace('event_recurring_type:', '').trim() : 'none';
  
  // Find tags
  const tagsLine = lines.find(line => line.startsWith('event_tags:'));
  const tags = tagsLine ? tagsLine.replace('event_tags:', '').trim().split(',').map(tag => tag.trim()) : [];
  
  // Find event notes
  const notesLine = lines.find(line => line.startsWith('event_notes:'));
  const notes = notesLine ? notesLine.replace('event_notes:', '').trim() : '';
  
  // Find custom fields (like event_$:5.4)
  const customFields = {};
  lines.forEach(line => {
    if (line.startsWith('event_') && line.includes(':')) {
      const [key, value] = line.split(':');
      if (key !== 'event_description' && key !== 'event_date' && key !== 'event_notes' && key !== 'event_recurring_type' && key !== 'event_tags') {
        const fieldName = key.replace('event_', '');
        customFields[fieldName] = value.trim();
      }
    }
  });
  
  // Find weekly field from event_notes (like event_notes:weekly:tuesday or event_notes:weekly:monday,wednesday,friday)
  let weeklyDays = [];
  if (notes && notes.toLowerCase().startsWith('weekly:')) {
    const weeklyValue = notes.split(':')[1]?.trim();
    if (weeklyValue) {
      // Handle comma-separated days like "monday,wednesday,friday"
      weeklyDays = weeklyValue.split(',').map(day => day.trim().toLowerCase());
    }
  }
  
  // Find bi-weekly field from event_notes (like event_notes:biweekly:tuesday or event_notes:biweekly:monday)
  let biweeklyDay = null;
  if (notes && notes.toLowerCase().startsWith('biweekly:')) {
    const biweeklyValue = notes.split(':')[1]?.trim();
    if (biweeklyValue) {
      biweeklyDay = biweeklyValue.trim().toLowerCase();
    }
  }
  
  // Find every X days field from event_notes (like event_notes:every:28 or event_notes:every28days)
  let everyDays = null;
  if (notes) {
    const lowerNotes = notes.toLowerCase();
    // Support both formats: every:28 and every28days
    if (lowerNotes.startsWith('every:')) {
      const daysValue = notes.split(':')[1]?.trim();
      if (daysValue) {
        const days = parseInt(daysValue, 10);
        if (!isNaN(days) && days > 0) {
          everyDays = days;
        }
      }
    } else if (lowerNotes.startsWith('every')) {
      // Extract number from "every28days" format
      const match = lowerNotes.match(/every(\d+)days?/);
      if (match && match[1]) {
        const days = parseInt(match[1], 10);
        if (!isNaN(days) && days > 0) {
          everyDays = days;
        }
      }
    }
  }
  
  return { description, dateTime, tags, customFields, recurrence, weeklyDays, biweeklyDay, everyDays, notes };
};

// Helper function to extract dollar amount from event data
const extractDollarAmount = (description, customFields = {}) => {
  // First check for event_$ custom field
  if (customFields['$']) {
    const value = parseFloat(customFields['$']);
    if (!isNaN(value)) {
      return value;
    }
  }
  
  // Fall back to parsing dollar amounts from description text
  if (!description) return 0;
  const matches = description.match(/\$[\d,]+(?:\.\d{2})?/g);
  if (!matches) return 0;
  
  return matches.reduce((total, match) => {
    const value = parseFloat(match.replace(/[$,]/g, ''));
    return total + (isNaN(value) ? 0 : value);
  }, 0);
};

// Helper function to extract day from date
const extractDay = (dateTime) => {
  if (!dateTime) return null;
  const date = new Date(dateTime);
  return date.getDate(); // Returns day of month (1-31)
};

// Helper function to get day of week name from number (0=Sunday, 1=Monday, ..., 6=Saturday)
const getDayName = (dayNumber) => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[dayNumber];
};

// Helper function to parse day name to day number
const parseDayName = (dayName) => {
  const dayMap = {
    'sunday': 0, 'sun': 0,
    'monday': 1, 'mon': 1,
    'tuesday': 2, 'tue': 2, 'tues': 2,
    'wednesday': 3, 'wed': 3,
    'thursday': 4, 'thu': 4, 'thur': 4, 'thurs': 4,
    'friday': 5, 'fri': 5,
    'saturday': 6, 'sat': 6
  };
  return dayMap[dayName.toLowerCase()];
};

// Helper function to get all dates in current month for given days of week
const getDatesForDaysOfWeek = (dayNumbers, month, year) => {
  const dates = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Start from the first day of the month
  const currentDate = new Date(firstDay);
  
  while (currentDate <= lastDay) {
    const dayOfWeek = currentDate.getDay();
    if (dayNumbers.includes(dayOfWeek)) {
      dates.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

// Helper function to get bi-weekly dates based on start date and day of week
const getBiweeklyDates = (startDate, dayOfWeekNumber, currentMonth, currentYear) => {
  const dates = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  
  // Parse start date
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  // Find the first occurrence of the day of week on or after the start date
  // We use a simple loop to find the first occurrence
  let firstOccurrence = new Date(start);
  while (firstOccurrence.getDay() !== dayOfWeekNumber) {
    firstOccurrence.setDate(firstOccurrence.getDate() + 1);
  }
  // Now firstOccurrence is on the target day on or after start date
  
  // Now calculate bi-weekly occurrences (every 14 days) starting from firstOccurrence
  let currentDate = new Date(firstOccurrence);
  
  // Extend search to end of next month if we're in the current month
  // This ensures we capture all relevant dates
  const searchEndDate = new Date(lastDay);
  searchEndDate.setDate(searchEndDate.getDate() + 31); // Look ahead a bit more
  
  while (currentDate <= searchEndDate) {
    // Only include dates in the current month and on or after today
    if (currentDate >= firstDay && currentDate <= lastDay && currentDate >= now) {
      dates.push(new Date(currentDate));
    }
    // Move to next bi-weekly occurrence (14 days)
    currentDate.setDate(currentDate.getDate() + 14);
  }
  
  return dates;
};

// Helper function to get dates every X days from start date
const getEveryDaysDates = (startDate, daysInterval, currentMonth, currentYear) => {
  const dates = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  
  // Parse start date
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  // If start date is in the future beyond this month, return empty
  if (start > lastDay) {
    return dates;
  }
  
  // Start from the start date
  let currentDate = new Date(start);
  
  // Find the first occurrence on or after today that's in this month
  // If start date is before today, calculate forward to find next occurrence
  if (currentDate < now) {
    // Calculate how many intervals we need to move forward
    const daysDiff = Math.floor((now.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    const intervalsToSkip = Math.floor(daysDiff / daysInterval);
    currentDate.setDate(currentDate.getDate() + (intervalsToSkip * daysInterval));
    
    // If we're still before now, move forward one more interval
    if (currentDate < now) {
      currentDate.setDate(currentDate.getDate() + daysInterval);
    }
  }
  
  // Now calculate occurrences every X days starting from currentDate
  // Extend search to end of next month if we're in the current month
  const searchEndDate = new Date(lastDay);
  searchEndDate.setDate(searchEndDate.getDate() + 31); // Look ahead a bit more
  
  while (currentDate <= searchEndDate) {
    // Only include dates in the current month and on or after today
    if (currentDate >= firstDay && currentDate <= lastDay && currentDate >= now) {
      dates.push(new Date(currentDate));
    }
    // Move to next occurrence (every X days)
    currentDate.setDate(currentDate.getDate() + daysInterval);
  }
  
  return dates;
};

// Helper function to calculate next occurrence for payment events
// For payments, we use the day of the month from the original date
const getNextOccurrence = (dateTime, recurrence) => {
  if (!dateTime) return null;
  
  const eventDate = new Date(dateTime);
  const dayOfMonth = eventDate.getDate(); // Extract day (1-31)
  const now = new Date();
  
  // For payment tags, we always treat them as monthly recurring based on the day
  // If recurrence is set to 'none' or not specified, default to monthly for payments
  const effectiveRecurrence = recurrence === 'none' || !recurrence ? 'monthly' : recurrence;
  
  if (effectiveRecurrence === 'monthly') {
    // Use the day of month from the original date
    // Calculate the next occurrence for this month or next month
    const todayDay = now.getDate();
    const currentMonthTry = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
    const nextMonthTry = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
    
    // Check if the date rolled over to next month (indicates day doesn't exist in target month)
    // If month changed, use last day of target month instead
    let currentMonth;
    if (currentMonthTry.getMonth() !== now.getMonth()) {
      // Day doesn't exist in current month, use last day of current month
      currentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
    } else {
      currentMonth = currentMonthTry;
    }
    
    let nextMonth;
    const targetNextMonth = now.getMonth() + 1;
    if (nextMonthTry.getMonth() !== targetNextMonth % 12) {
      // Day doesn't exist in next month, use last day of next month
      nextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0); // Last day of next month
    } else {
      nextMonth = nextMonthTry;
    }
    
    // If payment day matches today's day, show it for today
    if (dayOfMonth === todayDay) {
      // Return today's date at the start of day
      const today = new Date(now.getFullYear(), now.getMonth(), todayDay);
      today.setHours(0, 0, 0, 0);
      return today;
    }
    
    // Return the next occurrence (this month if day hasn't passed, else next month)
    if (currentMonth >= now) {
      return currentMonth;
    } else {
      return nextMonth;
    }
  } else if (effectiveRecurrence === 'yearly') {
    // For yearly, use the same day and month each year
    const thisYear = new Date(now.getFullYear(), eventDate.getMonth(), dayOfMonth);
    const nextYear = new Date(now.getFullYear() + 1, eventDate.getMonth(), dayOfMonth);
    
    // Adjust for invalid dates (e.g., Feb 29 in non-leap year)
    if (thisYear.getDate() !== dayOfMonth) {
      thisYear.setDate(0);
    }
    if (nextYear.getDate() !== dayOfMonth) {
      nextYear.setDate(0);
    }
    
    if (thisYear >= now) {
      return thisYear;
    } else {
      return nextYear;
    }
  } else if (effectiveRecurrence === 'weekly') {
    // For weekly, calculate days until next occurrence
    const daysSinceEvent = Math.floor((now - eventDate) / (1000 * 60 * 60 * 24));
    const weeksSince = Math.floor(daysSinceEvent / 7);
    const nextOccurrence = new Date(eventDate);
    nextOccurrence.setDate(eventDate.getDate() + (weeksSince + 1) * 7);
    return nextOccurrence >= now ? nextOccurrence : new Date(nextOccurrence.getTime() + 7 * 24 * 60 * 60 * 1000);
  } else if (effectiveRecurrence === 'daily') {
    // For daily, next occurrence is tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return tomorrow;
  }
  
  // Fallback: treat as monthly
  const currentMonthTry = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  const nextMonthTry = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
  
  let currentMonth;
  if (currentMonthTry.getMonth() !== now.getMonth()) {
    currentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else {
    currentMonth = currentMonthTry;
  }
  
  let nextMonth;
  const targetNextMonth = now.getMonth() + 1;
  if (nextMonthTry.getMonth() !== targetNextMonth % 12) {
    nextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  } else {
    nextMonth = nextMonthTry;
  }
  
  return currentMonth >= now ? currentMonth : nextMonth;
};

// Helper function to format date
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
};

// Helper function to calculate days until payment
const getDaysUntil = (date) => {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const paymentDate = new Date(date);
  paymentDate.setHours(0, 0, 0, 0);
  const diff = Math.floor((paymentDate - today) / (1000 * 60 * 60 * 24));
  return diff;
};

const PaymentsPage = ({ allNotes, onCreateNote, setAllNotes }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showPastPayments, setShowPastPayments] = useState(false);
  const [showHelpSection, setShowHelpSection] = useState(false);
  const [showErrorsSection, setShowErrorsSection] = useState(true);

  const handleViewNote = (eventId) => {
    navigate(`/notes?note=${eventId}`);
  };

  const handleEditEvent = (event) => {
    // Find the original note by ID
    const originalNote = allNotes.find(n => n.id === event.note.id);
    if (originalNote) {
      setEditingEvent(originalNote);
      setShowEditEventModal(true);
    }
  };

  // Handle adding a new payment via EditEventModal
  const handleAddPayment = async (content) => {
    try {
      const response = await createNote(content);
      console.log('[PaymentsPage] handleAddPayment response:', response);
      
      if (setAllNotes) {
        setAllNotes(prevNotes => [...prevNotes, response]);
      }
      
      if (response && response.content) {
        addNoteToIndex(response);
      }
      
      return response;
    } catch (error) {
      console.error('Error adding payment:', error);
      throw error;
    }
  };

  // Helper function to check if a payment has errors
  const hasPaymentErrors = useCallback((eventDetails) => {
    const amount = extractDollarAmount(eventDetails.description, eventDetails.customFields);
    const { dateTime, weeklyDays, biweeklyDay, everyDays } = eventDetails;
    const hasValidCadence = (weeklyDays && weeklyDays.length > 0) || biweeklyDay || everyDays || dateTime;
    
    // Check for missing or invalid cadence
    if (!hasValidCadence) {
      return true;
    }
    
    if (everyDays) {
      // For every X days, need both dateTime and valid days interval
      if (!dateTime) {
        return true;
      }
      const date = new Date(dateTime);
      if (isNaN(date.getTime())) {
        return true;
      }
      if (!everyDays || everyDays <= 0 || isNaN(everyDays)) {
        return true;
      }
    } else if (biweeklyDay) {
      // For bi-weekly, need both dateTime and valid day
      if (!dateTime) {
        return true;
      }
      const date = new Date(dateTime);
      if (isNaN(date.getTime())) {
        return true;
      }
      const dayNumber = parseDayName(biweeklyDay);
      if (dayNumber === undefined) {
        return true;
      }
    } else if (weeklyDays && weeklyDays.length > 0) {
      // Check if weekly days are valid
      const dayNumbers = weeklyDays
        .map(dayName => parseDayName(dayName))
        .filter(dayNum => dayNum !== undefined);
      if (dayNumbers.length === 0) {
        return true;
      }
    } else if (dateTime) {
      // Check if date is valid
      const date = new Date(dateTime);
      if (isNaN(date.getTime())) {
        return true;
      }
    }
    
    // Check for invalid amount
    if (amount === 0 || isNaN(amount) || amount === null || amount < 0) {
      return true;
    }
    
    return false;
  }, []);

  // Get all payment events with their next occurrence
  const paymentEvents = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const events = [];
    
    allNotes
      .filter(note => note?.content && note.content.includes('meta::event'))
      .forEach(note => {
        const eventDetails = getEventDetails(note.content);
        const { dateTime, recurrence, weeklyDays, biweeklyDay, everyDays } = eventDetails;
        
        // Check if this is a recurring payment
        if (!eventDetails.tags.some(tag => tag.toLowerCase() === 'recurring_payment')) {
          return;
        }
        
        // Handle every X days format (e.g., event_notes:every:28 or event_notes:every28days)
        if (everyDays && dateTime) {
          // Get dates every X days for current month based on start date
          const datesThisMonth = getEveryDaysDates(dateTime, everyDays, currentMonth, currentYear);
          
          // Also get dates for next month if we're past the 15th
          const datesNextMonth = now.getDate() > 15 
            ? getEveryDaysDates(dateTime, everyDays, currentMonth + 1, currentYear)
            : [];
          
          // Combine and filter to only show dates >= today
          const allDates = [...datesThisMonth, ...datesNextMonth]
            .filter(date => date >= now)
            .sort((a, b) => a - b);
          
          // Skip if this payment has errors (will be shown in errors section only)
          if (hasPaymentErrors(eventDetails)) {
            return;
          }
          
          // Create an event for each date occurrence
          allDates.forEach(date => {
            events.push({
              note,
              ...eventDetails,
              nextOccurrence: date,
              daysUntil: getDaysUntil(date),
              isEveryDaysOccurrence: true,
              daysInterval: everyDays
            });
          });
          
          return; // Skip regular handling for every X days
        }
        
        // Handle bi-weekly:day format (e.g., event_notes:biweekly:tuesday)
        if (biweeklyDay && dateTime) {
          const dayNumber = parseDayName(biweeklyDay);
          
          if (dayNumber !== undefined) {
            // Get bi-weekly dates for current month based on start date
            const datesThisMonth = getBiweeklyDates(dateTime, dayNumber, currentMonth, currentYear);
            
            // Also get dates for next month if we're past the 15th
            const datesNextMonth = now.getDate() > 15 
              ? getBiweeklyDates(dateTime, dayNumber, currentMonth + 1, currentYear)
              : [];
            
            // Combine and filter to only show dates >= today
            const allDates = [...datesThisMonth, ...datesNextMonth]
              .filter(date => date >= now)
              .sort((a, b) => a - b);
            
            // Skip if this payment has errors (will be shown in errors section only)
            if (hasPaymentErrors(eventDetails)) {
              return;
            }
            
            // Create an event for each date occurrence
            allDates.forEach(date => {
              events.push({
                note,
                ...eventDetails,
                nextOccurrence: date,
                daysUntil: getDaysUntil(date),
                isBiweeklyOccurrence: true
              });
            });
            
            return; // Skip regular handling for bi-weekly
          }
        }
        
        // Handle weekly:day format (e.g., weekly:tuesday or weekly:monday,wednesday,friday)
        if (weeklyDays && weeklyDays.length > 0) {
          const dayNumbers = weeklyDays
            .map(dayName => parseDayName(dayName))
            .filter(dayNum => dayNum !== undefined);
          
          if (dayNumbers.length > 0) {
            // Get all dates for these days in the current month
            const datesThisMonth = getDatesForDaysOfWeek(dayNumbers, currentMonth, currentYear);
            
            // Also get dates for next month if we're past the 15th (to show upcoming payments)
            const datesNextMonth = now.getDate() > 15 
              ? getDatesForDaysOfWeek(dayNumbers, currentMonth + 1, currentYear)
              : [];
            
            // Combine and filter to only show dates >= today
            const allDates = [...datesThisMonth, ...datesNextMonth]
              .filter(date => date >= now)
              .sort((a, b) => a - b);
            
            // Create an event for each date occurrence
            // Skip if this payment has errors (will be shown in errors section only)
            if (hasPaymentErrors(eventDetails)) {
              return;
            }
            
            allDates.forEach(date => {
              events.push({
                note,
                ...eventDetails,
                nextOccurrence: date,
                daysUntil: getDaysUntil(date),
                isWeeklyOccurrence: true
              });
            });
            
            return; // Skip regular handling for weekly
          }
        }
        
        // Regular monthly payment handling
        {
          // Regular payment handling (monthly based on day, etc.)
          // Skip if this payment has errors (will be shown in errors section only)
          if (hasPaymentErrors(eventDetails)) {
            return;
          }
          
          const nextOccurrence = getNextOccurrence(dateTime, recurrence || 'none');
          
          events.push({
            note,
            ...eventDetails,
            nextOccurrence,
            daysUntil: nextOccurrence ? getDaysUntil(nextOccurrence) : null,
            isWeeklyOccurrence: false
          });
        }
      });

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return events.filter(event => {
        const description = event.description.toLowerCase();
        const amount = extractDollarAmount(event.description, event.customFields).toString();
        const dateStr = event.nextOccurrence ? formatDate(event.nextOccurrence).toLowerCase() : '';
        
        return description.includes(query) || 
               amount.includes(query) || 
               dateStr.includes(query);
      });
    }
    
    return events;
  }, [allNotes, searchQuery, hasPaymentErrors]);

  // Filter upcoming payments for this month
  const upcomingThisMonth = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    return paymentEvents
      .filter(event => {
        if (!event.nextOccurrence) return false;
        const occurrenceDate = new Date(event.nextOccurrence);
        const occurrenceYear = occurrenceDate.getFullYear();
        const occurrenceMonth = occurrenceDate.getMonth();
        
        // Include payments happening this month (on or after today)
        return occurrenceYear === currentYear && 
               occurrenceMonth === currentMonth && 
               occurrenceDate.getDate() >= now.getDate();
      })
      .sort((a, b) => {
        // Sort by next occurrence date (earliest first)
        if (!a.nextOccurrence && !b.nextOccurrence) return 0;
        if (!a.nextOccurrence) return 1;
        if (!b.nextOccurrence) return -1;
        return new Date(a.nextOccurrence) - new Date(b.nextOccurrence);
      });
  }, [paymentEvents]);

  // Get upcoming payments for next month
  const upcomingNextMonth = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    
    return paymentEvents
      .filter(event => {
        if (!event.nextOccurrence) return false;
        const occurrenceDate = new Date(event.nextOccurrence);
        const occurrenceYear = occurrenceDate.getFullYear();
        const occurrenceMonth = occurrenceDate.getMonth();
        
        // Include payments happening next month
        return occurrenceYear === nextMonthYear && occurrenceMonth === nextMonth;
      })
      .sort((a, b) => {
        // Sort by next occurrence date (earliest first)
        if (!a.nextOccurrence && !b.nextOccurrence) return 0;
        if (!a.nextOccurrence) return 1;
        if (!b.nextOccurrence) return -1;
        return new Date(a.nextOccurrence) - new Date(b.nextOccurrence);
      });
  }, [paymentEvents]);

  // Get month name for next month
  const nextMonthName = useMemo(() => {
    const now = new Date();
    const nextMonth = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
    const nextMonthYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const date = new Date(nextMonthYear, nextMonth, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  // Filter past payments
  const pastPayments = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    return paymentEvents
      .filter(event => {
        if (!event.nextOccurrence) return false;
        const occurrenceDate = new Date(event.nextOccurrence);
        occurrenceDate.setHours(0, 0, 0, 0);
        return occurrenceDate < now;
      })
      .sort((a, b) => {
        // Sort by date (most recent first)
        if (!a.nextOccurrence && !b.nextOccurrence) return 0;
        if (!a.nextOccurrence) return 1;
        if (!b.nextOccurrence) return -1;
        return new Date(b.nextOccurrence) - new Date(a.nextOccurrence);
      });
  }, [paymentEvents]);

  // Get completed payments for the current month
  const completedThisMonth = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    now.setHours(0, 0, 0, 0);
    
    return paymentEvents
      .filter(event => {
        if (!event.nextOccurrence) return false;
        const occurrenceDate = new Date(event.nextOccurrence);
        occurrenceDate.setHours(0, 0, 0, 0);
        
        // Must be in the past (completed)
        if (occurrenceDate >= now) return false;
        
        // Must be in the current month
        return occurrenceDate.getFullYear() === currentYear && 
               occurrenceDate.getMonth() === currentMonth;
      })
      .sort((a, b) => {
        // Sort by date (most recent first)
        if (!a.nextOccurrence && !b.nextOccurrence) return 0;
        if (!a.nextOccurrence) return 1;
        if (!b.nextOccurrence) return -1;
        return new Date(b.nextOccurrence) - new Date(a.nextOccurrence);
      });
  }, [paymentEvents]);

  // Calculate total for completed payments this month
  const completedMonthlyTotal = useMemo(() => {
    return completedThisMonth.reduce((total, event) => {
      return total + extractDollarAmount(event.description, event.customFields);
    }, 0);
  }, [completedThisMonth]);

  // Calculate estimated total for this month
  const estimatedMonthlyTotal = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    return upcomingThisMonth
      .filter(event => {
        if (!event.nextOccurrence) return false;
        const occurrenceDate = new Date(event.nextOccurrence);
        return occurrenceDate.getFullYear() === currentYear && occurrenceDate.getMonth() === currentMonth;
      })
      .reduce((total, event) => {
        return total + extractDollarAmount(event.description, event.customFields);
      }, 0);
  }, [upcomingThisMonth]);

  // Calculate total for all upcoming payments
  const totalUpcoming = useMemo(() => {
    return upcomingThisMonth.reduce((total, event) => {
      return total + extractDollarAmount(event.description, event.customFields);
    }, 0);
  }, [upcomingThisMonth]);

  // Find payment errors
  const paymentErrors = useMemo(() => {
    const errors = [];
    
    allNotes
      .filter(note => note?.content && note.content.includes('meta::event'))
      .forEach(note => {
        const eventDetails = getEventDetails(note.content);
        
        // Check if this is a recurring payment
        if (!eventDetails.tags.some(tag => tag.toLowerCase() === 'recurring_payment')) {
          return;
        }
        
        if (!hasPaymentErrors(eventDetails)) {
          return; // No errors, skip
        }
        
        const amount = extractDollarAmount(eventDetails.description, eventDetails.customFields);
        const { dateTime, weeklyDays, biweeklyDay, everyDays } = eventDetails;
        const hasValidCadence = (weeklyDays && weeklyDays.length > 0) || biweeklyDay || everyDays || dateTime;
        
        // Check for errors
        const errorReasons = [];
        
        // Check for missing or invalid cadence
        if (!hasValidCadence) {
          errorReasons.push('Missing cadence (no date or weekly/bi-weekly/every X days specified)');
        } else if (everyDays) {
          // For every X days, need both dateTime and valid days interval
          if (!dateTime) {
            errorReasons.push('Every X days payment requires a start date');
          } else {
            const date = new Date(dateTime);
            if (isNaN(date.getTime())) {
              errorReasons.push('Invalid start date format');
            }
            if (!everyDays || everyDays <= 0 || isNaN(everyDays)) {
              errorReasons.push(`Invalid days interval (${everyDays})`);
            }
          }
        } else if (biweeklyDay) {
          // For bi-weekly, need both dateTime and valid day
          if (!dateTime) {
            errorReasons.push('Bi-weekly payment requires a start date');
          } else {
            const date = new Date(dateTime);
            if (isNaN(date.getTime())) {
              errorReasons.push('Invalid start date format');
            }
            const dayNumber = parseDayName(biweeklyDay);
            if (dayNumber === undefined) {
              errorReasons.push('Invalid bi-weekly day name');
            }
          }
        } else if (weeklyDays && weeklyDays.length > 0) {
          // Check if weekly days are valid
          const dayNumbers = weeklyDays
            .map(dayName => parseDayName(dayName))
            .filter(dayNum => dayNum !== undefined);
          if (dayNumbers.length === 0) {
            errorReasons.push('Invalid weekly day names');
          }
        } else if (dateTime) {
          // Check if date is valid
          const date = new Date(dateTime);
          if (isNaN(date.getTime())) {
            errorReasons.push('Invalid date format');
          }
        }
        
        // Check for invalid amount
        if (amount === 0 || isNaN(amount) || amount === null || amount < 0) {
          errorReasons.push(`Invalid amount (${amount === 0 ? 'zero' : 'not set or invalid'})`);
        }
        
        if (errorReasons.length > 0) {
          errors.push({
            note,
            eventDetails,
            errorReasons,
            amount
          });
        }
      });
    
    return errors;
  }, [allNotes]);

  // Get set of note IDs with errors
  const errorNoteIds = useMemo(() => {
    return new Set(paymentErrors.map(error => error.note.id));
  }, [paymentErrors]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-1">Track your upcoming monthly payments</p>
        </div>
        <button
          onClick={() => {
            setEditingEvent(null);
            setShowEditEventModal(true);
          }}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
        >
          <PlusIcon className="h-5 w-5" />
          Add Payment
        </button>
      </div>

      {/* Help/Info Section */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <button
          onClick={() => setShowHelpSection(!showHelpSection)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <InformationCircleIcon className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-900">How to Configure Payment Entries</span>
          </div>
          {showHelpSection ? (
            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronRightIcon className="h-5 w-5 text-gray-500" />
          )}
        </button>
        
        {showHelpSection && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="prose prose-sm max-w-none">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Entry Format</h3>
              
              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Monthly Payments (Based on Day of Month)</h4>
                  <p className="mb-2">For payments that occur on a specific day of each month:</p>
                  <pre className="bg-gray-800 text-green-400 p-3 rounded-md overflow-x-auto mb-2">
{`event_description:Rent Payment
event_date:2025-01-15
event_tags:recurring_payment
event_$:1200`}
                  </pre>
                  <p className="text-xs text-gray-600">
                    This will show the payment on the <strong>15th</strong> of every month. The day from the event_date is used for all future months.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Weekly Payments (Specific Days of Week)</h4>
                  <p className="mb-2">For payments that occur on specific days of the week:</p>
                  
                  <div className="mb-3">
                    <p className="mb-1"><strong>Single day:</strong></p>
                    <pre className="bg-gray-800 text-green-400 p-3 rounded-md overflow-x-auto">
{`event_description:Gas Station Payment
event_date:2025-01-01
event_tags:recurring_payment
event_notes:weekly:thursday
event_$:50`}
                    </pre>
                    <p className="text-xs text-gray-600 mt-1">
                      Shows all <strong>Thursdays</strong> of the current month.
                    </p>
                  </div>

                  <div className="mb-3">
                    <p className="mb-1"><strong>Multiple days:</strong></p>
                    <pre className="bg-gray-800 text-green-400 p-3 rounded-md overflow-x-auto">
{`event_description:Grocery Payment
event_date:2025-01-01
event_tags:recurring_payment
event_notes:weekly:monday,wednesday,friday
event_$:75`}
                    </pre>
                    <p className="text-xs text-gray-600 mt-1">
                      Shows all <strong>Mondays, Wednesdays, and Fridays</strong> of the current month.
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Bi-weekly Payments</h4>
                  <p className="mb-2">For payments that occur every two weeks on a specific day of the week:</p>
                  
                  <div className="mb-3">
                    <pre className="bg-gray-800 text-green-400 p-3 rounded-md overflow-x-auto">
{`event_description:Paycheck
event_date:2025-01-07
event_tags:recurring_payment
event_notes:biweekly:tuesday
event_$:1500`}
                    </pre>
                    <p className="text-xs text-gray-600 mt-1">
                      Shows <strong>every other Tuesday</strong> starting from the event_date. Calculations for the current month are based on the start date and day of week.
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Every X Days Payments</h4>
                  <p className="mb-2">For payments that occur every X days starting from a specific date:</p>
                  
                  <div className="mb-3">
                    <p className="mb-1"><strong>Format 1 (colon):</strong></p>
                    <pre className="bg-gray-800 text-green-400 p-3 rounded-md overflow-x-auto">
{`event_description:Prescription Refill
event_date:2025-01-15
event_tags:recurring_payment
event_notes:every:28
event_$:25`}
                    </pre>
                  </div>

                  <div className="mb-3">
                    <p className="mb-1"><strong>Format 2 (everyXdays):</strong></p>
                    <pre className="bg-gray-800 text-green-400 p-3 rounded-md overflow-x-auto">
{`event_description:Prescription Refill
event_date:2025-01-15
event_tags:recurring_payment
event_notes:every28days
event_$:25`}
                    </pre>
                    <p className="text-xs text-gray-600 mt-1">
                      Shows payments <strong>every 28 days</strong> starting from the event_date. Calculations for the current month are based on the start date and the specified interval.
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <h4 className="font-semibold text-blue-900 mb-2">Day Name Formats Supported:</h4>
                  <ul className="list-disc list-inside text-xs text-blue-800 space-y-1">
                    <li>Full names: <code className="bg-blue-100 px-1 rounded">monday</code>, <code className="bg-blue-100 px-1 rounded">tuesday</code>, <code className="bg-blue-100 px-1 rounded">wednesday</code>, etc.</li>
                    <li>Abbreviations: <code className="bg-blue-100 px-1 rounded">mon</code>, <code className="bg-blue-100 px-1 rounded">tue</code>, <code className="bg-blue-100 px-1 rounded">wed</code>, etc.</li>
                    <li>Case-insensitive: <code className="bg-blue-100 px-1 rounded">Tuesday</code> or <code className="bg-blue-100 px-1 rounded">TUESDAY</code> both work</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <h4 className="font-semibold text-yellow-900 mb-2">Field Descriptions:</h4>
                  <ul className="list-disc list-inside text-xs text-yellow-800 space-y-1">
                    <li><code className="bg-yellow-100 px-1 rounded">event_description:</code> Name/description of the payment</li>
                    <li><code className="bg-yellow-100 px-1 rounded">event_date:</code> Any date (day is extracted for monthly payments)</li>
                    <li><code className="bg-yellow-100 px-1 rounded">event_tags:recurring_payment</code> Required: marks this as a recurring payment</li>
                    <li><code className="bg-yellow-100 px-1 rounded">event_notes:weekly:day</code> Optional: for weekly payments (comma-separated days)</li>
                    <li><code className="bg-yellow-100 px-1 rounded">event_notes:biweekly:day</code> Optional: for bi-weekly payments (single day of week, requires event_date as start date)</li>
                    <li><code className="bg-yellow-100 px-1 rounded">event_notes:every:X</code> or <code className="bg-yellow-100 px-1 rounded">event_notes:everyXdays</code> Optional: for payments every X days (requires event_date as start date)</li>
                    <li><code className="bg-yellow-100 px-1 rounded">event_$:</code> Optional: amount in dollars</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="text-sm text-gray-600 font-medium mb-2">This Month</div>
          <div className="text-3xl font-bold text-green-600">
            ${estimatedMonthlyTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {upcomingThisMonth.filter(e => {
              if (!e.nextOccurrence) return false;
              const d = new Date(e.nextOccurrence);
              return d.getFullYear() === new Date().getFullYear() && d.getMonth() === new Date().getMonth();
            }).length} payment{upcomingThisMonth.filter(e => {
              if (!e.nextOccurrence) return false;
              const d = new Date(e.nextOccurrence);
              return d.getFullYear() === new Date().getFullYear() && d.getMonth() === new Date().getMonth();
            }).length !== 1 ? 's' : ''} due
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="text-sm text-gray-600 font-medium mb-2">Total Upcoming</div>
          <div className="text-3xl font-bold text-blue-600">
            ${totalUpcoming.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {upcomingThisMonth.length} payment{upcomingThisMonth.length !== 1 ? 's' : ''} scheduled
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="text-sm text-gray-600 font-medium mb-2">Next Payment</div>
          {upcomingThisMonth.length > 0 && upcomingThisMonth[0].nextOccurrence ? (
            <>
              <div className="text-2xl font-bold text-purple-600">
                {formatDate(upcomingThisMonth[0].nextOccurrence)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {upcomingThisMonth[0].daysUntil === 0 ? 'Today' : 
                 upcomingThisMonth[0].daysUntil === 1 ? 'Tomorrow' :
                 upcomingThisMonth[0].daysUntil > 0 ? `in ${upcomingThisMonth[0].daysUntil} days` : ''}
              </div>
            </>
          ) : (
            <div className="text-2xl font-bold text-gray-400">No payments</div>
          )}
        </div>
      </div>

      {/* Search Box */}
      <div className="mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Errors Section */}
      {paymentErrors.length > 0 && (
        <div className="mb-8">
          <button
            onClick={() => setShowErrorsSection(!showErrorsSection)}
            className="flex items-center gap-2 text-lg font-semibold text-red-700 mb-4 hover:text-red-900 transition-colors"
          >
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            Errors ({paymentErrors.length})
          </button>
          
          {showErrorsSection && (
            <div className="space-y-3">
              {paymentErrors.map((error) => {
                const { note, eventDetails, errorReasons, amount } = error;
                
                return (
                  <div
                    key={note.id}
                    className="bg-red-50 border-2 border-red-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-red-900 mb-2">
                          {eventDetails.description || 'Untitled Payment'}
                        </h3>
                        
                        <div className="space-y-1 mb-3">
                          {errorReasons.map((reason, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm text-red-700">
                              <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="text-sm text-gray-600 mt-2">
                          <p><strong>Current amount:</strong> ${amount === 0 || isNaN(amount) || amount === null ? '0.00 (invalid)' : amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          {eventDetails.dateTime && (
                            <p><strong>Date:</strong> {eventDetails.dateTime}</p>
                          )}
                          {eventDetails.weeklyDays && eventDetails.weeklyDays.length > 0 && (
                            <p><strong>Weekly days:</strong> {eventDetails.weeklyDays.join(', ')}</p>
                          )}
                          {eventDetails.biweeklyDay && (
                            <p><strong>Bi-weekly day:</strong> {eventDetails.biweeklyDay}</p>
                          )}
                          {eventDetails.everyDays && (
                            <p><strong>Every X days:</strong> {eventDetails.everyDays}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditEvent({ note, ...eventDetails })}
                          className="flex-shrink-0 p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Payment to Fix Error"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleViewNote(note.id)}
                          className="flex-shrink-0 p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View in Notes"
                        >
                          <DocumentTextIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Upcoming Payments This Month */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <CalendarIcon className="h-6 w-6 text-blue-600" />
          Upcoming Payments This Month
        </h2>
        
        {upcomingThisMonth.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
            <p>No upcoming payments found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingThisMonth.map((event) => {
              const amount = extractDollarAmount(event.description, event.customFields);
              const daysUntil = event.daysUntil;
              
              // Determine if it's this month or future month
              const now = new Date();
              const occurrenceDate = event.nextOccurrence ? new Date(event.nextOccurrence) : null;
              const isThisMonth = occurrenceDate && 
                occurrenceDate.getFullYear() === now.getFullYear() && 
                occurrenceDate.getMonth() === now.getMonth();
              
              return (
                <div
                  key={event.note.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {occurrenceDate && (
                          <span className={`text-sm font-medium px-3 py-1 rounded ${
                            daysUntil === 0 ? 'bg-red-100 text-red-700' :
                            daysUntil !== null && daysUntil <= 3 ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {formatDate(occurrenceDate)}
                          </span>
                        )}
                        {daysUntil !== null && (
                          <span className="text-sm text-gray-600">
                            {daysUntil === 0 ? 'Due today' : 
                             daysUntil === 1 ? 'Due tomorrow' :
                             daysUntil > 0 ? `${daysUntil} days away` : ''}
                          </span>
                        )}
                        {!isThisMonth && occurrenceDate && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {occurrenceDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {event.description || 'Untitled Payment'}
                      </h3>
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`text-xl font-bold ${amount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {event.recurrence && event.recurrence !== 'none' && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {event.recurrence === 'monthly' ? 'Monthly' :
                             event.recurrence === 'weekly' ? 'Weekly' :
                             event.recurrence === 'daily' ? 'Daily' :
                             event.recurrence === 'yearly' ? 'Yearly' : event.recurrence}
                          </span>
                        )}
                        {event.isBiweeklyOccurrence && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            Bi-weekly
                          </span>
                        )}
                        {event.isEveryDaysOccurrence && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            Every {event.daysInterval} days
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditEvent(event)}
                        className="flex-shrink-0 p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Payment"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleViewNote(event.note.id)}
                        className="flex-shrink-0 p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View in Notes"
                      >
                        <DocumentTextIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Payments (Collapsible) */}
      {pastPayments.length > 0 && (
        <div className="mb-8">
          <button
            onClick={() => setShowPastPayments(!showPastPayments)}
            className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-4 hover:text-gray-900 transition-colors"
          >
            <span className={`transform transition-transform ${showPastPayments ? 'rotate-90' : ''}`}>▶</span>
            Past Payments ({pastPayments.length})
          </button>
          
          {showPastPayments && (
            <div className="space-y-3">
              {pastPayments.map((event) => {
                const amount = extractDollarAmount(event.description, event.customFields);
                
                return (
                  <div
                    key={event.note.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 opacity-75 hover:opacity-100 transition-opacity"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {event.nextOccurrence && (
                            <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded font-medium">
                              {formatDate(event.nextOccurrence)}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-1">
                          {event.description || 'Untitled Payment'}
                        </h3>
                        <div className="flex items-center gap-4 mt-2">
                          <span className={`text-xl font-bold ${amount > 0 ? 'text-gray-600' : 'text-gray-400'}`}>
                            ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          {event.recurrence && event.recurrence !== 'none' && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {event.recurrence === 'monthly' ? 'Monthly' :
                               event.recurrence === 'weekly' ? 'Weekly' :
                               event.recurrence === 'daily' ? 'Daily' :
                               event.recurrence === 'yearly' ? 'Yearly' : event.recurrence}
                            </span>
                          )}
                          {event.isBiweeklyOccurrence && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              Bi-weekly
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditEvent(event)}
                          className="flex-shrink-0 p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Payment"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleViewNote(event.note.id)}
                          className="flex-shrink-0 p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View in Notes"
                        >
                          <DocumentTextIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Completed Payments This Month */}
      {completedThisMonth.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-green-600" />
            Completed Payments This Month ({completedThisMonth.length})
          </h2>
          
          <div className="mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm text-green-700 font-medium mb-1">Total Completed This Month</div>
              <div className="text-2xl font-bold text-green-700">
                ${completedMonthlyTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {completedThisMonth.map((event) => {
              const amount = extractDollarAmount(event.description, event.customFields);
              
              return (
                <div
                  key={event.note.id}
                  className="bg-green-50 border border-green-200 rounded-lg p-4 opacity-90 hover:opacity-100 transition-opacity"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {event.nextOccurrence && (
                          <span className="text-sm text-green-700 bg-green-100 px-3 py-1 rounded font-medium">
                            {formatDate(event.nextOccurrence)}
                          </span>
                        )}
                        <span className="text-xs text-green-600 bg-green-200 px-2 py-1 rounded font-medium">
                          Completed
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-green-900 mb-1">
                        {event.description || 'Untitled Payment'}
                      </h3>
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`text-xl font-bold ${amount > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                          ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {event.recurrence && event.recurrence !== 'none' && (
                          <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                            {event.recurrence === 'monthly' ? 'Monthly' :
                             event.recurrence === 'weekly' ? 'Weekly' :
                             event.recurrence === 'daily' ? 'Daily' :
                             event.recurrence === 'yearly' ? 'Yearly' : event.recurrence}
                          </span>
                        )}
                        {event.isBiweeklyOccurrence && (
                          <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                            Bi-weekly
                          </span>
                        )}
                        {event.isEveryDaysOccurrence && (
                          <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                            Every {event.daysInterval} days
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditEvent(event)}
                        className="flex-shrink-0 p-2 text-green-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Payment"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleViewNote(event.note.id)}
                        className="flex-shrink-0 p-2 text-green-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View in Notes"
                      >
                        <DocumentTextIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EditEventModal for adding/editing payments */}
      <EditEventModal
        isOpen={showEditEventModal}
        note={editingEvent}
        onSave={async (content) => {
          if (editingEvent) {
            // Update existing event
            try {
              const updatedNote = await updateNoteById(editingEvent.id, content);
              if (setAllNotes) {
                setAllNotes(prevNotes => prevNotes.map(note => 
                  note.id === editingEvent.id ? updatedNote : note
                ));
              }
              setShowEditEventModal(false);
              setEditingEvent(null);
              return updatedNote;
            } catch (error) {
              console.error('Error updating payment:', error);
              throw error;
            }
          } else {
            // Create new payment
            const result = await handleAddPayment(content);
            setShowEditEventModal(false);
            setEditingEvent(null);
            return result;
          }
        }}
        onCancel={() => {
          setShowEditEventModal(false);
          setEditingEvent(null);
        }}
        onSwitchToNormalEdit={() => {
          if (editingEvent) {
            navigate(`/notes?note=${editingEvent.id}`);
          }
          setShowEditEventModal(false);
          setEditingEvent(null);
        }}
        onDelete={async (eventId) => {
          // Handle deletion if needed
          try {
            await deleteNoteById(eventId);
            if (setAllNotes) {
              setAllNotes(prevNotes => prevNotes.filter(note => note.id !== eventId));
            }
            setShowEditEventModal(false);
            setEditingEvent(null);
          } catch (error) {
            console.error('Error deleting payment:', error);
          }
        }}
        notes={allNotes}
        prePopulatedTags={editingEvent ? undefined : "recurring_payment"}
      />
    </div>
  );
};

export default PaymentsPage;
