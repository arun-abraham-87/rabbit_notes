// src/components/LeftPanel.js
import React, { useMemo, useState, useEffect } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronDoubleUpIcon,
  ChevronDoubleDownIcon,
  Cog6ToothIcon,
  XMarkIcon,
  PencilSquareIcon
} from '@heroicons/react/24/solid';
import NoteEditor from './NoteEditor';
import EditMeetingModal from './EditMeetingModal';
import EditEventModal from './EditEventModal';
import { updateNoteById, getSettings, updateSettings } from '../utils/ApiUtils';
import { toast } from 'react-toastify';
import { formatAndAgeDate } from '../utils/DateUtils';

// Common timezones with their offsets and locations
const timeZones = [
  { label: 'AEST (Sydney, +10:00)', value: 'Australia/Sydney' },
  { label: 'AEDT (Sydney, +11:00)', value: 'Australia/Sydney' },
  { label: 'IST (Mumbai, +5:30)', value: 'Asia/Kolkata' },
  { label: 'EST (New York, -5:00)', value: 'America/New_York' },
  { label: 'EDT (New York, -4:00)', value: 'America/New_York' },
  { label: 'PST (Los Angeles, -8:00)', value: 'America/Los_Angeles' },
  { label: 'PDT (Los Angeles, -7:00)', value: 'America/Los_Angeles' },
  { label: 'GMT (London, +0:00)', value: 'Europe/London' },
  { label: 'BST (London, +1:00)', value: 'Europe/London' },
  { label: 'CET (Paris, +1:00)', value: 'Europe/Paris' },
  { label: 'CEST (Paris, +2:00)', value: 'Europe/Paris' },
  { label: 'JST (Tokyo, +9:00)', value: 'Asia/Tokyo' },
  { label: 'SGT (Singapore, +8:00)', value: 'Asia/Singapore' },
  { label: 'HKT (Hong Kong, +8:00)', value: 'Asia/Hong_Kong' },
  { label: 'CST (Beijing, +8:00)', value: 'Asia/Shanghai' },
  { label: 'MSK (Moscow, +3:00)', value: 'Europe/Moscow' },
  { label: 'SAST (Johannesburg, +2:00)', value: 'Africa/Johannesburg' },
  { label: 'BRT (São Paulo, -3:00)', value: 'America/Sao_Paulo' },
  { label: 'BRST (São Paulo, -2:00)', value: 'America/Sao_Paulo' },
  { label: 'NZST (Auckland, +12:00)', value: 'Pacific/Auckland' },
  { label: 'NZDT (Auckland, +13:00)', value: 'Pacific/Auckland' },
];

const removeBookmarkFromNotes = (url, notes, setNotes) => {
  if (!window.confirm('Remove this bookmark from Quick links?')) return;
  const newNotes = notes.map(note => {
    if (
      note.content.includes(url) &&
      note.content.split('\n').some(line => line.trim().startsWith('meta::bookmark'))
    ) {
      const updatedContent = note.content
        .split('\n')
        .filter(line => !line.trim().startsWith('meta::bookmark'))
        .join('\n')
        .trim();
      updateNoteById(note.id, updatedContent);
      return { ...note, content: updatedContent };
    }
    return note;
  });
  if (typeof setNotes === 'function') {
    setNotes(newNotes);
  }
};

const updateNote = (id, updatedContent) => {
  updateNoteById(id, updatedContent);
};

const defaultSettings = {
  theme: 'light',
  sortBy: 'date',
  autoCollapse: false,
  showDates: true,
  showCreatedDate: false,
  searchQuery: '',
  totals: {
    total: 0,
    todos: 0,
    meetings: 0,
    events: 0
  }
};

const formatDateString = (date) => {
  // If date is already a string in YYYY-MM-DD format, return it
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  // Convert to Date object if it's a string
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Ensure we have a valid Date object
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    console.error('Invalid date:', date);
    return '';
  }
  
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
};

const calculateNextOccurrence = (meetingTime, recurrenceType, selectedDays = [], content = '') => {
  console.log('finding occurence');
  console.log(recurrenceType);
  // Ensure meetingTime is a Date object
  const meetingDateObj = meetingTime instanceof Date ? meetingTime : new Date(meetingTime);
  const now = new Date();
  const meetingDate = formatDateString(meetingDateObj);
  const todayStr = formatDateString(now);

  // Extract all acknowledgment dates from meta tags and normalize to YYYY-MM-DD format
  const ackDates = content
    .split('\n')
    .filter(line => line.trim().startsWith('meta::meeting_acknowledge::'))
    .map(line => {
      const dateStr = line.split('::')[2].trim();
      return formatDateString(dateStr);
    });

  // For daily recurrence
  if (recurrenceType.trim() === 'daily') {
    // If today's meeting hasn't been acknowledged, return it
    if (meetingDate === todayStr && !ackDates.includes(todayStr)) {
      return meetingDateObj;
    }

    // Start from tomorrow's date
    let currentDate = new Date(now);
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(meetingDateObj.getHours());
    currentDate.setMinutes(meetingDateObj.getMinutes());
    currentDate.setSeconds(meetingDateObj.getSeconds());

    // Find the next unacknowledged date
    while (true) {
      const currentDateStr = formatDateString(currentDate);
      if (!ackDates.includes(currentDateStr)) {
        return currentDate;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // For other recurrence types
  const nextDate = new Date(meetingDateObj);

  switch (recurrenceType) {
    case 'weekly':
      while (formatDateString(nextDate) <= todayStr || ackDates.includes(formatDateString(nextDate))) {
        nextDate.setDate(nextDate.getDate() + 7);
      }
      break;
    case 'monthly':
      while (formatDateString(nextDate) <= todayStr || ackDates.includes(formatDateString(nextDate))) {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      break;
    case 'yearly':
      while (formatDateString(nextDate) <= todayStr || ackDates.includes(formatDateString(nextDate))) {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
      break;
    case 'custom':
      if (selectedDays.length === 0) return null;

      const currentDay = now.getDay();
      const meetingDay = meetingDateObj.getDay();

      let nextDay = null;
      let minDiff = Infinity;

      selectedDays.forEach(day => {
        const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day);
        if (dayIndex === -1) return;

        let diff = dayIndex - currentDay;
        if (diff <= 0) diff += 7;

        if (diff < minDiff) {
          minDiff = diff;
          nextDay = dayIndex;
        }
      });
      console.log(recurrenceType);
      console.log('Next day:', nextDay);
      if (nextDay === null) return null;

      nextDate.setDate(now.getDate() + minDiff);
      nextDate.setHours(meetingDateObj.getHours());
      nextDate.setMinutes(meetingDateObj.getMinutes());

      while (ackDates.includes(formatDateString(nextDate))) {
        nextDate.setDate(nextDate.getDate() + 7);
      }
      break;
    default:
      return null;
  }

  return nextDate;
};

const LeftPanel = ({ notes, setNotes, selectedNote, setSelectedNote, searchQuery, settings, setSettings }) => {
  const [now, setNow] = useState(Date.now());
  const [activeSection, setActiveSection] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [unsavedSettings, setUnsavedSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTimezones, setSelectedTimezones] = useState([]);
  const [lockedSections, setLockedSections] = useState(() => {
    const saved = localStorage.getItem('lockedSections');
    return saved ? JSON.parse(saved) : {
      quickLinks: false,
      bookmarks: false,
      watchList: false,
      meetings: false,
      events: false
    };
  });

  useEffect(() => {
    localStorage.setItem('lockedSections', JSON.stringify(lockedSections));
  }, [lockedSections]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load saved timezones on component mount
  useEffect(() => {
    const savedTimezones = localStorage.getItem('selectedTimezones');
    if (savedTimezones) {
      setSelectedTimezones(JSON.parse(savedTimezones));
    }
  }, []);

  // Update unsavedSettings when settings prop changes
  useEffect(() => {
    setUnsavedSettings(settings);
  }, [settings]);

  const handleTimezoneChange = (index, value) => {
    const newTimezones = [...selectedTimezones];
    newTimezones[index] = value;
    setSelectedTimezones(newTimezones);
  };

  const addTimezone = () => {
    if (selectedTimezones.length < 6) {
      setSelectedTimezones([...selectedTimezones, '']);
    }
  };

  const removeTimezone = (index) => {
    const newTimezones = selectedTimezones.filter((_, i) => i !== index);
    setSelectedTimezones(newTimezones);
  };

  const handleSettingChange = (key, value) => {
    setUnsavedSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Save timezones to localStorage
      localStorage.setItem('selectedTimezones', JSON.stringify(selectedTimezones));

      // Save other settings
      await updateSettings(unsavedSettings);
      setSettings(unsavedSettings);
      setShowSettings(false);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Context-menu & modal for Quick Links
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [linkMenuPos, setLinkMenuPos] = useState({ x: 0, y: 0 });
  const [linkMenuUrl, setLinkMenuUrl] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuNote, setContextMenuNote] = useState(null);

  const handleLinkContextMenu = (e, url) => {
    e.preventDefault();
    setLinkMenuPos({ x: e.clientX, y: e.clientY });
    setLinkMenuUrl(url);
    setShowLinkMenu(true);
  };
  useEffect(() => {
    const hideMenu = () => setShowLinkMenu(false);
    window.addEventListener('click', hideMenu);
    return () => window.removeEventListener('click', hideMenu);
  }, []);

  const uniqueUrls = useMemo(() => {
    const seen = new Set();
    const list = [];
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;
    notes.forEach(note => {
      if (note.content.split('\n').some(line => line.trim().startsWith('meta::quick_links'))) {
        linkRegex.lastIndex = 0;
        let match;
        while ((match = linkRegex.exec(note.content)) !== null) {
          const url = match[2] || match[3];
          const label = match[1] || null;
          const key = `${url}|${label}`;
          if (!seen.has(key)) {
            seen.add(key);
            list.push({ url, label });
          }
        }
      }
    });
    return list;
  }, [notes]);

  const watchList = useMemo(() => {
    return notes.filter(note => 
      note.content.split('\n').some(line => line.trim().startsWith('meta::watch'))
    );
  }, [notes]);

  const bookmarkedUrls = useMemo(() => {
    const seen = new Set();
    const list = [];
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;
    notes.forEach(note => {
      if (note.content.split('\n').some(line => line.trim().startsWith('meta::bookmark'))) {
        linkRegex.lastIndex = 0;
        let match;
        while ((match = linkRegex.exec(note.content)) !== null) {
          const url = match[2] || match[3];
          const label = match[1] || null;
          const key = `${url}|${label}`;
          if (!seen.has(key)) {
            seen.add(key);
            list.push({ url, label });
          }
        }
      }
    });
    return list;
  }, [notes]);

  const meetings = useMemo(() => {
    //console.log('Calculating meetings...');
    const result = notes.flatMap(note => {
      if (note.content.split('\n').some(line => line.trim().startsWith('meta::meeting'))) {
        //console.log('Processing meeting note:', note.id);
        const lines = note.content.split('\n');
        const description = lines[0].trim();
        const time = lines[1].trim();

        console.log(description);

        const durationMatch = note.content.match(/meta::meeting_duration::(\d+)/);
        const duration = durationMatch ? durationMatch[1] : null;



        let recurrenceType = null;
        let selectedDays = [];

        for (const line of lines) {
          if (line.trim().startsWith('meta::meeting_recurrence::')) {
            const recurrenceMatch = line.split("::")[2].trim();

            if (recurrenceMatch && recurrenceMatch.startsWith('custom')) {
              const [type, days] = recurrenceMatch.split(':');
              recurrenceType = type;
              selectedDays = days.split(',');
            } else {
              recurrenceType = recurrenceMatch ? recurrenceMatch : null;
            }
            break;
          }
        }


        console.log('Recurrence type:', recurrenceType);

        const meetingTime = new Date(time).getTime();
        const now = Date.now();
        let nextTime = time;

        if (meetingTime < now && recurrenceType) {
          //console.log('Calculating next occurrence for past meeting');
          const nextOccurrence = calculateNextOccurrence(time, recurrenceType, selectedDays, note.content);
          if (nextOccurrence) {
            nextTime = nextOccurrence.toISOString();
            //console.log('Next occurrence:', nextTime);
          } else {
            //console.log('No next occurrence found');
            return [];
          }
        }

        return [{
          id: note.id,
          description,
          time: nextTime,
          duration,
          recurrenceType,
          selectedDays,
          originalTime: time
        }];
      }
      return [];
    });

    //console.log('Sorted meetings:', result.map(m => ({ time: m.time, description: m.description })));
    return result.sort((a, b) => new Date(a.time) - new Date(b.time));
  }, [notes]);

  const visibleMeetings = useMemo(() => {
    return meetings.filter(m => {
      const note = notes.find(n => n.id === m.id);
      const eventTime = new Date(m.time).getTime();
      if (eventTime < now && note?.content.includes('meta::meeting_acknowledge')) {
        return false;
      }
      return true;
    });
  }, [meetings, notes, now]);

  const events = useMemo(() => {
    const result = notes.flatMap(note => {
      // Skip if no content
      if (!note?.content) return [];

      // Ensure content is a string
      const content = typeof note.content === 'object' ? note.content.content : note.content;
      const lines = content.split('\n');

      if (lines.some(line => line.trim().startsWith('meta::event'))) {
        // Extract description
        const descriptionLine = lines.find(line => line.startsWith('event_description:'));
        const description = descriptionLine ? descriptionLine.replace('event_description:', '').trim() : '';

        // Extract event date
        const eventDateLine = lines.find(line => line.startsWith('event_date:'));
        const baseEventDate = eventDateLine ? eventDateLine.replace('event_date:', '').trim() : null;
        if (!baseEventDate) return [];

        // Extract location
        const locationLine = lines.find(line => line.startsWith('event_location:'));
        const location = locationLine ? locationLine.replace('event_location:', '').trim() : null;

        // Extract recurring information
        const recurringLine = lines.find(line => line.startsWith('event_recurring_type:'));
        const recurrenceType = recurringLine ? recurringLine.replace('event_recurring_type:', '').trim() : null;

        const recurringEndLine = lines.find(line => line.startsWith('event_recurring_end:'));
        const recurrenceEndDate = recurringEndLine ? recurringEndLine.replace('event_recurring_end:', '').trim() : null;

        try {
          // Calculate next occurrence if it's a recurring event
          const nextOccurrence = recurrenceType
            ? calculateNextOccurrence(baseEventDate, recurrenceType, [], content)
            : new Date(baseEventDate);

          // If there's no next occurrence (past end date) or invalid date, don't include the event
          if (!nextOccurrence || !(nextOccurrence instanceof Date)) return [];

          return [{
            id: note.id,
            context: description,
            time: nextOccurrence.toISOString(),
            location: location,
            isRecurring: !!recurrenceType,
            recurrenceType: recurrenceType,
            baseEventDate: baseEventDate
          }];
        } catch (error) {
          console.error('Error processing event:', error);
          return [];
        }
      }
      return [];
    });
    return result.sort((a, b) => new Date(a.time) - new Date(b.time));
  }, [notes]);

  const visibleEvents = useMemo(() => {
    return events.filter(e => {
      try {
        const eventTime = new Date(e.time).getTime();
        return eventTime >= now;
      } catch (error) {
        console.error('Error filtering event:', error);
        return false;
      }
    });
  }, [events, now]);

  const [alertMeetingId, setAlertMeetingId] = useState(null);
  useEffect(() => {
    const soon = meetings.find(m => {
      const note = notes.find(n => n.id === m.id);
      if (note?.content.includes('meta::meeting_acknowledge')) return false;
      const diff = new Date(m.time).getTime() - now;
      return diff > 0 && diff < 120000;
    });
    if (soon) setAlertMeetingId(soon.id);
  }, [meetings, now, notes]);

  const [editingMeetingId, setEditingMeetingId] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const [showingNormalEventEditor, setShowingNormalEventEditor] = useState(false);

  // Add these state variables after other useState declarations
  const [expandedMeetings, setExpandedMeetings] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState(false);

  const handleMeetingAcknowledge = (meetingId) => {
    const note = notes.find(n => n.id === meetingId);
    if (!note) return;

    // Extract the meeting date from the time line
    const lines = note.content.split('\n');
    const meetingTime = lines[1].trim();
    // Get only the date part (YYYY-MM-DD) from the datetime string
    const meetingDate = meetingTime.split('T')[0];

    // Add new acknowledgment tag
    const updatedContent = note.content + `\nmeta::meeting_acknowledge::${meetingDate}`;

    // Update the note
    updateNoteById(note.id, updatedContent);
    setNotes(notes.map(n => n.id === note.id ? { ...n, content: updatedContent } : n));
  };

  return (
    <>
      {alertMeetingId && (() => {
        const m = meetings.find(x => x.id === alertMeetingId);
        return (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="p-8 rounded-lg shadow-xl bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-pulse max-w-sm text-center">
              <h3 className="text-xl font-bold mb-2 text-white">Meeting Soon!</h3>
              <p className="mb-4 text-white text-lg break-words">{m.description}</p>
              <p className="mb-6 text-white text-base">{m.time}</p>
              <button
                onClick={() => {
                  const note = notes.find(n => n.id === alertMeetingId);
                  if (note) {
                    const lines = note.content.split('\n');
                    const meetingTime = lines[1].trim();
                    const meetingDate = meetingTime.split('T')[0];
                    const ackLine = `meta::meeting_acknowledge::${meetingDate}`;
                    const updated = (note.content + '\n' + ackLine).trim();
                    updateNoteById(note.id, updated);
                    setNotes(notes.map(n => n.id === note.id ? { ...n, content: updated } : n));
                  }
                  setAlertMeetingId(null);
                }}
                className="px-6 py-2.5 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        );
      })()}

      <div className="w-full h-full bg-slate-50 p-3 flex flex-col overflow-hidden">
        <div className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden">
 

          {/* custom right‑click menu */}
          {showLinkMenu && (
            <ul
              className="absolute bg-white border rounded shadow"
              style={{ top: linkMenuPos.y, left: linkMenuPos.x, zIndex: 1000 }}
            >
              <li
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  setShowNoteModal(true);
                  setShowLinkMenu(false);
                }}
              >
                View Original Note
              </li>
            </ul>
          )}

          {/* Quick Links Section */}
          <div 
            className="bg-white p-3 rounded-lg shadow-sm mb-3 max-w-full"
            onMouseEnter={() => setActiveSection('quickLinks')}
            onMouseLeave={() => !lockedSections.quickLinks && setActiveSection(null)}
          >
            <h2 className="font-semibold text-gray-800 mb-2 flex justify-between items-center cursor-pointer p-1.5 hover:bg-indigo-50 rounded-lg text-base">
              <span className="truncate flex-1">Quick Links</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLockedSections(prev => ({ ...prev, quickLinks: !prev.quickLinks }));
                  }}
                  className="p-1 rounded hover:bg-indigo-100"
                  title={lockedSections.quickLinks ? "Unlock section" : "Lock section open"}
                >
                  {lockedSections.quickLinks ? (
                    <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
                {activeSection === 'quickLinks' || lockedSections.quickLinks ?
                  <ChevronDoubleUpIcon className="h-4 w-4 text-indigo-600 flex-shrink-0" /> :
                  <ChevronDoubleDownIcon className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                }
              </div>
            </h2>
            {(activeSection === 'quickLinks' || lockedSections.quickLinks) && (
              <div className="space-y-1.5 w-full">
                {uniqueUrls.length === 0 ? (
                  <p className="text-gray-500 text-sm">No Quick Links</p>
                ) : (
                  uniqueUrls.map(({ url, label }, idx) => {
                    let displayText = label || (() => {
                      try { return new URL(url).hostname.replace(/^www\./, ''); }
                      catch { return url; }
                    })();
                    return (
                      <div
                        key={url}
                        onContextMenu={e => handleLinkContextMenu(e, url)}
                        className={`flex items-center pl-3 p-2 rounded-lg ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-indigo-50 transition-colors w-full`}
                      >
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-gray-700 hover:text-indigo-600 truncate text-sm min-w-0"
                        >
                          {displayText}
                        </a>
                        <button
                          onClick={() => removeBookmarkFromNotes(url, notes, setNotes)}
                          className="ml-2 text-gray-400 hover:text-red-500 focus:outline-none flex-shrink-0"
                        >
                          &times;
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Bookmarks Section */}
          <div 
            className="bg-white p-3 rounded-lg shadow-sm mb-3"
            onMouseEnter={() => setActiveSection('bookmarks')}
            onMouseLeave={() => !lockedSections.bookmarks && setActiveSection(null)}
          >
            <h2 className="font-semibold text-gray-800 mb-2 flex justify-between items-center cursor-pointer p-1.5 hover:bg-indigo-50 rounded-lg text-base">
              <span>Bookmarks</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLockedSections(prev => ({ ...prev, bookmarks: !prev.bookmarks }));
                  }}
                  className="p-1 rounded hover:bg-indigo-100"
                  title={lockedSections.bookmarks ? "Unlock section" : "Lock section open"}
                >
                  {lockedSections.bookmarks ? (
                    <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
                {activeSection === 'bookmarks' || lockedSections.bookmarks ?
                  <ChevronDoubleUpIcon className="h-4 w-4 text-indigo-600" /> :
                  <ChevronDoubleDownIcon className="h-4 w-4 text-indigo-600" />
                }
              </div>
            </h2>
            {(activeSection === 'bookmarks' || lockedSections.bookmarks) && (
              bookmarkedUrls.length === 0 ? (
                <p className="text-gray-500 text-sm">No Bookmarks</p>
              ) : (
                bookmarkedUrls.map(({ url, label }, idx) => {
                  let displayText = label || (() => {
                    try { return new URL(url).hostname.replace(/^www\./, ''); }
                    catch { return url; }
                  })();
                  return (
                    <div
                      key={url}
                      onContextMenu={e => handleLinkContextMenu(e, url)}
                      className={`flex items-center mb-1.5 pl-3 p-2 rounded-lg ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-indigo-50 transition-colors`}
                    >
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-gray-700 hover:text-indigo-600 truncate text-sm"
                      >
                        {displayText}
                      </a>
                    </div>
                  );
                })
              )
            )}
          </div>

          {/* Watch List Section */}
          {watchList.length > 0 && (
            <div 
              className="bg-indigo-50 pb-3 px-3 rounded-lg shadow-sm mb-3 max-w-full"
              onMouseEnter={() => setActiveSection('watchList')}
              onMouseLeave={() => !lockedSections.watchList && setActiveSection(null)}
            >
              <h2 className="font-semibold text-gray-800 mb-2 flex justify-between items-center cursor-pointer p-1.5 hover:bg-indigo-100 rounded-lg text-base">
                <span className="truncate flex-1">
                  Watch List
                  <span className="text-indigo-600 ml-2 text-sm">({watchList.length})</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLockedSections(prev => ({ ...prev, watchList: !prev.watchList }));
                    }}
                    className="p-1 rounded hover:bg-indigo-100"
                    title={lockedSections.watchList ? "Unlock section" : "Lock section open"}
                  >
                    {lockedSections.watchList ? (
                      <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  {activeSection === 'watchList' || lockedSections.watchList ?
                    <ChevronDoubleUpIcon className="h-4 w-4 text-indigo-600 flex-shrink-0" /> :
                    <ChevronDoubleDownIcon className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                  }
                </div>
              </h2>
              {(activeSection === 'watchList' || lockedSections.watchList) && (
                <div className="space-y-2 w-full">
                  {watchList.map((note, idx) => {
                    const firstLine = note.content.split('\n')[0];
                    return (
                      <div
                        key={note.id}
                        onClick={() => setSelectedNote(note)}
                        className={`p-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-indigo-100'} rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer`}
                      >
                        <div className="text-base font-medium text-gray-800 break-words">
                          {firstLine}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Meetings Section */}
          {visibleMeetings.length > 0 && (
            <div 
              className="bg-indigo-50 pb-3 px-3 rounded-lg shadow-sm mb-3 max-w-full"
              onMouseEnter={() => setActiveSection('meetings')}
              onMouseLeave={() => !lockedSections.meetings && setActiveSection(null)}
            >
              <h2 className="font-semibold text-gray-800 mb-2 flex justify-between items-center cursor-pointer p-1.5 hover:bg-indigo-100 rounded-lg text-base">
                <span className="truncate flex-1">
                  Meetings
                  <span className="text-indigo-600 ml-2 text-sm">({visibleMeetings.length})</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLockedSections(prev => ({ ...prev, meetings: !prev.meetings }));
                    }}
                    className="p-1 rounded hover:bg-indigo-100"
                    title={lockedSections.meetings ? "Unlock section" : "Lock section open"}
                  >
                    {lockedSections.meetings ? (
                      <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  {activeSection === 'meetings' || lockedSections.meetings ?
                    <ChevronDoubleUpIcon className="h-4 w-4 text-indigo-600 flex-shrink-0" /> :
                    <ChevronDoubleDownIcon className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                  }
                </div>
              </h2>
              {(activeSection === 'meetings' || lockedSections.meetings) && (
                <div className="space-y-2 w-full">
                  {(expandedMeetings ? visibleMeetings : visibleMeetings.slice(0, 3)).map((m, idx) => {
                    const eventTime = new Date(m.time).getTime();
                    const diff = eventTime - now;
                    const isFlashing = diff > 0 && diff <= 10 * 60 * 1000;
                    return (
                      <div
                        key={m.id}
                        className="group relative mb-2 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <div className={`p-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-indigo-100'} ${isFlashing ? 'animate-pulse bg-purple-100' : ''} rounded-lg`}>
                          <div className="text-base font-medium text-gray-800 break-words">{m.description}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {(() => {
                              const d = new Date(m.time);
                              const today = new Date(now);
                              return d.toDateString() === today.toDateString() ? 'Today' :
                                d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                            })()}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-2 flex-wrap">
                            <span>
                              {(() => {
                                const d = new Date(m.time);
                                let h = d.getHours(), mnt = d.getMinutes();
                                const ampm = h >= 12 ? 'PM' : 'AM';
                                h = h % 12 || 12;
                                return `${h}:${mnt.toString().padStart(2, '0')} ${ampm}`;
                              })()}
                            </span>
                            {m.duration && (
                              <span className="text-indigo-500">
                                • {m.duration} mins
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-medium text-indigo-600 mt-1">
                            {(() => {
                              const delta = new Date(m.time).getTime() - now;
                              if (delta < 0) {
                                const note = notes.find(n => n.id === m.id);
                                const isAcknowledged = note?.content.includes('meta::meeting_acknowledge');
                                return (
                                  <div className="flex items-center gap-2">
                                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">
                                      Passed
                                    </span>
                                    {!isAcknowledged && (
                                      <button
                                        onClick={() => handleMeetingAcknowledge(m.id)}
                                        className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full hover:bg-indigo-200 transition-colors"
                                      >
                                        Acknowledge
                                      </button>
                                    )}
                                  </div>
                                );
                              }
                              const days = Math.floor(delta / 86400000);
                              const hrs = Math.floor((delta % 86400000) / 3600000);
                              const mins = Math.floor((delta % 3600000) / 60000);
                              const secs = Math.floor((delta % 60000) / 1000);
                              const parts = [];
                              if (days) parts.push(`${days}d`);
                              if (hrs) parts.push(`${hrs}h`);
                              if (mins) parts.push(`${mins}m`);
                              if (!parts.length) parts.push(`${secs}s`);
                              return `in ${parts.join(' ')}`;
                            })()}
                          </div>
                          {m.recurrenceType && (
                            <div className="text-xs text-gray-500 mt-1">
                              Recurring: {m.recurrenceType === 'custom'
                                ? m.selectedDays.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ')
                                : m.recurrenceType.charAt(0).toUpperCase() + m.recurrenceType.slice(1)}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setEditingMeetingId(m.id)}
                          className="absolute top-3 right-3 p-1.5 rounded-md bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-50"
                        >
                          <PencilSquareIcon className="h-4 w-4 text-indigo-600" />
                        </button>
                      </div>
                    );
                  })}
                  {visibleMeetings.length > 3 && (
                    <button
                      onClick={() => setExpandedMeetings(prev => !prev)}
                      className="w-full mt-2 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors flex items-center justify-center"
                    >
                      {expandedMeetings ? (
                        <>Show Less <ChevronDoubleUpIcon className="h-4 w-4 ml-1" /></>
                      ) : (
                        <>Show {visibleMeetings.length - 3} More <ChevronDoubleDownIcon className="h-4 w-4 ml-1" /></>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Events Section */}
          {visibleEvents.length > 0 && (
            <div 
              className="bg-purple-50 pb-3 px-3 rounded-lg shadow-sm mb-3 max-w-full"
              onMouseEnter={() => setActiveSection('events')}
              onMouseLeave={() => !lockedSections.events && setActiveSection(null)}
            >
              <h2 className="font-semibold text-gray-800 mb-2 flex justify-between items-center cursor-pointer p-1.5 hover:bg-purple-100 rounded-lg text-base">
                <span className="truncate flex-1">
                  Events
                  <span className="text-purple-600 ml-2 text-sm">({visibleEvents.length})</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLockedSections(prev => ({ ...prev, events: !prev.events }));
                    }}
                    className="p-1 rounded hover:bg-purple-100"
                    title={lockedSections.events ? "Unlock section" : "Lock section open"}
                  >
                    {lockedSections.events ? (
                      <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  {activeSection === 'events' || lockedSections.events ?
                    <ChevronDoubleUpIcon className="h-4 w-4 text-purple-600 flex-shrink-0" /> :
                    <ChevronDoubleDownIcon className="h-4 w-4 text-purple-600 flex-shrink-0" />
                  }
                </div>
              </h2>
              {(activeSection === 'events' || lockedSections.events) && (
                <div className="space-y-2 w-full">
                  {(expandedEvents ? visibleEvents : visibleEvents.slice(0, 3)).map((e, idx) => {
                    const eventTime = new Date(e.time).getTime();
                    const diff = eventTime - now;
                    const isFlashing = diff > 0 && diff <= 10 * 60 * 1000;
                    const isToday = new Date(e.time).toDateString() === new Date(now).toDateString();
                    return (
                      <div
                        key={e.id}
                        className="group relative mb-2 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        <div className={`p-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-purple-100'} ${isFlashing ? 'animate-pulse bg-purple-200' : ''} rounded-lg`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-base font-medium text-gray-800 break-words flex items-center gap-2">
                                <span className="truncate">{e.context}</span>
                                {e.isRecurring && (
                                  <span className="ml-2 text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                                    {e.recurrenceType}
                                  </span>
                                )}
                                {isToday && (
                                  <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                                    Today
                                  </span>
                                )}
                              </div>
                              {e.location && (
                                <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                                    <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                  </svg>
                                  <span className="truncate">{e.location}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium text-purple-600">
                                  {formatAndAgeDate(new Date(e.time))}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => setEditingEventId(e.id)}
                              className="p-1.5 rounded-md bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-50"
                            >
                              <PencilSquareIcon className="h-4 w-4 text-purple-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {visibleEvents.length > 3 && (
                    <button
                      onClick={() => setExpandedEvents(prev => !prev)}
                      className="w-full mt-2 px-3 py-1.5 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-100 rounded-lg transition-colors flex items-center justify-center"
                    >
                      {expandedEvents ? (
                        <>Show Less <ChevronDoubleUpIcon className="h-4 w-4 ml-1" /></>
                      ) : (
                        <>Show {visibleEvents.length - 3} More <ChevronDoubleDownIcon className="h-4 w-4 ml-1" /></>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings button at bottom */}
        <div className="mt-3 pt-3 border-t border-gray-200 w-full">
          <button
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center justify-center p-2.5 bg-white hover:bg-indigo-50 rounded-lg text-gray-700 hover:text-indigo-600 transition-colors duration-150 shadow-sm"
            title="Settings"
          >
            <Cog6ToothIcon className="h-5 w-5 mr-2 flex-shrink-0" />
            <span className="text-sm font-medium truncate">Settings</span>
          </button>
        </div>
      </div>

      {/* NoteEditor modal */}
      {showNoteModal && linkMenuUrl && (() => {
        const note = notes.find(n => n.content.includes(linkMenuUrl));
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-4 overflow-auto w-auto h-auto max-w-[90vw] max-h-[90vh]">
              <button
                onClick={() => setShowNoteModal(false)}
                className="mb-4 text-sm text-gray-600 hover:text-gray-900"
              >
                Close
              </button>
              {note ? <NoteEditor note={note} onSave={(updatedNote) => {
                updateNote(updatedNote.id, updatedNote.content);
                // setPopupNoteText(null);
              }} /> : <p className="text-red-500">Original note not found.</p>}
            </div>
          </div>
        );
      })()}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1.5 hover:bg-indigo-50 rounded-full text-gray-500 hover:text-indigo-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              {/* Show Dates Setting */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showDates"
                  checked={unsavedSettings.showDates}
                  onChange={(e) => handleSettingChange('showDates', e.target.checked)}
                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-lg"
                />
                <label htmlFor="showDates" className="ml-3 block text-base text-gray-700">
                  Show dates in note list
                </label>
              </div>

              {/* Show Created Date Setting */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showCreatedDate"
                  checked={unsavedSettings.showCreatedDate}
                  onChange={(e) => handleSettingChange('showCreatedDate', e.target.checked)}
                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-lg"
                />
                <label htmlFor="showCreatedDate" className="ml-3 block text-base text-gray-700">
                  Show created date in notes
                </label>
              </div>

              {/* Exclude Events by Default Setting */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="excludeEventsByDefault"
                  checked={unsavedSettings.excludeEventsByDefault}
                  onChange={(e) => handleSettingChange('excludeEventsByDefault', e.target.checked)}
                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-lg"
                />
                <label htmlFor="excludeEventsByDefault" className="ml-3 block text-base text-gray-700">
                  Exclude events by default in new notes
                </label>
              </div>

              {/* Exclude Meetings by Default Setting */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="excludeMeetingsByDefault"
                  checked={unsavedSettings.excludeMeetingsByDefault}
                  onChange={(e) => handleSettingChange('excludeMeetingsByDefault', e.target.checked)}
                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-lg"
                />
                <label htmlFor="excludeMeetingsByDefault" className="ml-3 block text-base text-gray-700">
                  Exclude meetings by default in new notes
                </label>
              </div>

              {/* Page Visibility Settings */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Page Visibility</h3>

                {/* Show Todos Page Setting */}
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="showTodosPage"
                    checked={unsavedSettings.showTodosPage !== false}
                    onChange={(e) => handleSettingChange('showTodosPage', e.target.checked)}
                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-lg"
                  />
                  <label htmlFor="showTodosPage" className="ml-3 block text-base text-gray-700">
                    Show Todos page
                  </label>
                </div>

                {/* Show Tags Page Setting */}
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="showTagsPage"
                    checked={unsavedSettings.showTagsPage !== false}
                    onChange={(e) => handleSettingChange('showTagsPage', e.target.checked)}
                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-lg"
                  />
                  <label htmlFor="showTagsPage" className="ml-3 block text-base text-gray-700">
                    Show Tags page
                  </label>
                </div>

                {/* Show Journals Page Setting */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showJournalsPage"
                    checked={unsavedSettings.showJournalsPage !== false}
                    onChange={(e) => handleSettingChange('showJournalsPage', e.target.checked)}
                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-lg"
                  />
                  <label htmlFor="showJournalsPage" className="ml-3 block text-base text-gray-700">
                    Show Journals page
                  </label>
                </div>
              </div>

              {/* Timezone Settings */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Timezones</h3>
                <div className="space-y-3">
                  {selectedTimezones.map((timezone, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={timezone}
                        onChange={(e) => handleTimezoneChange(index, e.target.value)}
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Select a timezone</option>
                        {timeZones.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeTimezone(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {selectedTimezones.length < 6 && (
                    <button
                      onClick={addTimezone}
                      className="w-full text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add Timezone
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Save and Cancel buttons */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setUnsavedSettings(settings);
                  setShowSettings(false);
                }}
                className="px-4 py-2 text-base font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-base font-medium transition-colors"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isContextMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 overflow-auto w-auto h-auto max-w-[90vw] max-h-[90vh]">
            <button
              onClick={() => setIsContextMenuOpen(false)}
              className="mb-4 text-sm text-gray-600 hover:text-gray-900"
            >
              Close
            </button>
            {contextMenuNote && <NoteEditor note={contextMenuNote} onSave={(updatedNote) => {
              updateNote(updatedNote.id, updatedNote.content);
            }} />}
          </div>
        </div>
      )}

      {/* Edit Meeting Modal */}
      {editingMeetingId && (() => {
        const meeting = notes.find(n => n.id === editingMeetingId);
        return (
          <EditMeetingModal
            note={meeting}
            onSave={(updatedNote) => {
              updateNoteById(updatedNote.id, updatedNote.content);
              // Update the notes state immediately
              setNotes(prevNotes =>
                prevNotes.map(n =>
                  n.id === updatedNote.id ? { ...n, content: updatedNote.content } : n
                )
              );
              setEditingMeetingId(null);
            }}
            onCancel={() => setEditingMeetingId(null)}
          />
        );
      })()}

      {/* Edit Event Modal */}
      {editingEventId && (() => {
        const event = notes.find(n => n.id === editingEventId);
        return showingNormalEventEditor ? (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Edit Note</h2>
              </div>
              <NoteEditor
                note={event}
                onSave={(updatedNote) => {
                  updateNoteById(updatedNote.id, updatedNote.content);
                  // Update the notes state immediately
                  setNotes(prevNotes =>
                    prevNotes.map(n =>
                      n.id === updatedNote.id ? { ...n, content: updatedNote.content } : n
                    )
                  );
                  setEditingEventId(null);
                  setShowingNormalEventEditor(false);
                }}
                onCancel={() => {
                  setEditingEventId(null);
                  setShowingNormalEventEditor(false);
                }}
              />
            </div>
          </div>
        ) : (
          <EditEventModal
            note={event}
            onSave={(updatedNote) => {
              updateNoteById(updatedNote.id, updatedNote.content);
              // Update the notes state immediately
              setNotes(prevNotes =>
                prevNotes.map(n =>
                  n.id === updatedNote.id ? { ...n, content: updatedNote.content } : n
                )
              );
              setEditingEventId(null);
            }}
            onCancel={() => setEditingEventId(null)}
            onSwitchToNormalEdit={() => setShowingNormalEventEditor(true)}
          />
        );
      })()}
    </>
  );
};

export default LeftPanel;