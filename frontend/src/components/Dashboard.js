import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertsProvider, BackupAlert } from './Alerts.js';
import RemindersAlert from './RemindersAlert.js';
import ReviewOverdueAlert from './ReviewOverdueAlert.js';
import { loadAllNotes, createNote, updateNoteById, deleteNoteById } from '../utils/ApiUtils.js';
import { ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import TimeZoneDisplay from './TimeZoneDisplay.js';
import TimezonePopup from './TimezonePopup.js';
import EventManager from './EventManager.js';
import StockPrice from './Stocks.js';
import ExchangeRates from './ExchangeRates.js';
import Weather from './Weather.js';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

import EditEventModal from './EditEventModal.js';
import WatchedTrackers from './WatchedTrackers.js';
import ReminderWatchCard from './ReminderWatchCard.js';

import TrackedInfoCards from './TrackedInfoCards.js';
import Countdown from './Countdown.js';
import CustomCalendar from './CustomCalendar.js';
import { useLeftPanel } from '../contexts/LeftPanelContext.js';
import { useNoteEditor } from '../contexts/NoteEditorContext.js';
import { getTimerStatus, TIMER_CADENCE_PREFIX, withTimerMeta } from '../utils/TimerUtils';
import { addCurrentDateToLocalStorage, findDueRemindersAsNotes, getDummyCadenceLine } from '../utils/CadenceHelpUtils';
import {
  DASHBOARD_EVENT_FILTERS_SETTING_KEY,
  readNoteBackedSettingFromNotes,
  saveNoteBackedSetting,
} from '../utils/NoteBackedSettingsUtils';
import { CheckIcon, FireIcon, ExclamationTriangleIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

const loadDashboardStockPriceHistory = () => {
  try {
    const cached = localStorage.getItem('stockPriceHistory');
    const parsed = cached ? JSON.parse(cached) : [];
    return Array.isArray(parsed)
      ? parsed.filter(item => item && typeof item.price === 'number' && item.timestamp)
      : [];
  } catch {
    return [];
  }
};

const getDashboardStockPriceChange = (history) => {
  if (!history || history.length < 2) return null;
  const latest = history[history.length - 1];
  const previous = history[history.length - 2];
  if (!latest || !previous) return null;
  return {
    direction: latest.price === previous.price ? 'same' : latest.price > previous.price ? 'up' : 'down',
    amount: Math.abs(latest.price - previous.price),
    percent: previous.price ? Math.abs(((latest.price - previous.price) / previous.price) * 100) : null
  };
};

const AddOptionsPopup = ({ isOpen, onClose, onAddNote, onAddWatch, onAddSuperCritical, onAddTimer, onAddEvent, onAddDeadline, onAddHoliday }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onAddNote();
        onClose();
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        onAddWatch();
        onClose();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        onAddSuperCritical();
        onClose();
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        onAddEvent();
        onClose();
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        onAddDeadline();
        onClose();
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        onAddHoliday();
        onClose();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onAddNote, onAddWatch, onAddSuperCritical, onAddEvent, onAddDeadline, onAddHoliday, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Add New</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-3 max-h-[75vh] overflow-y-auto">
          <button
            onClick={() => {
              onAddNote();
              onClose();
            }}
            className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center text-white font-bold">
                N
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Add Note</h4>
                <p className="text-sm text-gray-600">Create a plain note</p>
              </div>
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">N</span>
          </button>

          <button
            onClick={() => {
              onAddWatch();
              onClose();
            }}
            className="w-full flex items-center justify-between p-4 text-left bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xl">
                ⏱
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Add Watch Review</h4>
                <p className="text-sm text-gray-600">Create a watched review note</p>
              </div>
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">W</span>
          </button>

          <button
            onClick={() => {
              onAddSuperCritical();
              onClose();
            }}
            className="w-full flex items-center justify-between p-4 text-left bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                !!!
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Add Super Critical Review</h4>
                <p className="text-sm text-gray-600">Watched note marked super critical</p>
              </div>
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">S</span>
          </button>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <h4 className="mb-2 text-sm font-semibold text-gray-900">Add Timer Review</h4>
            <div className="text-xs text-gray-500 mb-1 font-medium">Monthly on day</div>
            <div className="mb-2 flex flex-wrap gap-1">
              {Array.from({ length: 31 }, (_, index) => index + 1).map(day => (
                <button
                  key={`timer-monthly-${day}`}
                  type="button"
                  onClick={() => {
                    onAddTimer('monthly', day, false);
                    onClose();
                  }}
                  className="w-6 rounded bg-white py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  {day}
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-500 mb-1 font-medium">Weekly on</div>
            <div className="flex flex-wrap gap-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                <button
                  key={`timer-weekly-${day}`}
                  type="button"
                  onClick={() => {
                    onAddTimer('weekly', index + 1, false);
                    onClose();
                  }}
                  className="rounded bg-white px-1.5 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <h4 className="mb-2 text-sm font-semibold text-gray-900">Add Only Once Timer</h4>
            <div className="text-xs text-gray-500 mb-1 font-medium">Monthly on day</div>
            <div className="mb-2 flex flex-wrap gap-1">
              {Array.from({ length: 31 }, (_, index) => index + 1).map(day => (
                <button
                  key={`once-timer-monthly-${day}`}
                  type="button"
                  onClick={() => {
                    onAddTimer('monthly', day, true);
                    onClose();
                  }}
                  className="w-6 rounded bg-white py-0.5 text-xs font-medium text-red-700 hover:bg-red-100"
                >
                  {day}
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-500 mb-1 font-medium">Weekly on</div>
            <div className="flex flex-wrap gap-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                <button
                  key={`once-timer-weekly-${day}`}
                  type="button"
                  onClick={() => {
                    onAddTimer('weekly', index + 1, true);
                    onClose();
                  }}
                  className="rounded bg-white px-1.5 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100"
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              onAddEvent();
              onClose();
            }}
            className="w-full flex items-center justify-between p-4 text-left bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Add Event</h4>
                <p className="text-sm text-gray-600">Create a new event</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">E</span>
            </div>
          </button>

          <button
            onClick={() => {
              onAddDeadline();
              onClose();
            }}
            className="w-full flex items-center justify-between p-4 text-left bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Add Deadline</h4>
                <p className="text-sm text-gray-600">Set a new deadline</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">D</span>
            </div>
          </button>

          <button
            onClick={() => {
              onAddHoliday();
              onClose();
            }}
            className="w-full flex items-center justify-between p-4 text-left bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Add Holiday</h4>
                <p className="text-sm text-gray-600">Create a holiday entry</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">H</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

const AlertsHelpPopup = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Alerts & Reminders Wiki</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h4 className="font-bold text-gray-900 mb-2">Quick Access</h4>
            <ul className="list-disc pl-5 text-gray-700 space-y-1 text-sm">
              <li>Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">r</kbd> to open the Reminders Only view.</li>
              <li>Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">w</kbd> to open the Reviews Overdue Only view.</li>
              <li>Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">Escape</kbd> to return to the normal dashboard view.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-2">Navigation</h4>
            <ul className="list-disc pl-5 text-gray-700 space-y-1 text-sm">
              <li>Use <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">&uarr;</kbd> and <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">&darr;</kbd> arrows to navigate through the reminders list.</li>
              <li>Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">Enter</kbd> or <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">l</kbd> to open links within the currently focused reminder.</li>
              <li>Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">s</kbd> to snooze or dismiss the focused reminder.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-2">Advanced (Vim-style) Navigation</h4>
            <ul className="list-disc pl-5 text-gray-700 space-y-1 text-sm">
              <li>Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">gg</kbd> to jump to the first reminder.</li>
              <li>Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">G</kbd> to jump to the last reminder.</li>
              <li>Type a number followed by <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">j</kbd> or <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">k</kbd> to jump forward or backward (e.g., <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">4j</kbd> jumps down 4 items).</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-2">Cadence & Grouping</h4>
            <ul className="list-disc pl-5 text-gray-700 space-y-1 text-sm">
              <li>Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">&rarr;</kbd> (Right Arrow) to open the cadence selector for the focused reminder.</li>
              <li>Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">&larr;</kbd> (Left Arrow) to close the cadence selector.</li>
              <li>Use the buttons at the top of the Reminders list to group them by Color, Title, or Cadence.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Tiny Habits Dashboard Widget ─────────────────────────────────────────────
function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const API_HABITS = 'http://localhost:5001/api/habits';
const API_QUICK_LISTS = `${API_HABITS}/quick-lists`;
const API_COSTCO_FUEL_PRICES = 'http://localhost:5001/api/realestate/costco-fuel-prices';
const COSTCO_FUEL_CACHE_KEY = 'costcoFuelPricesData';
const COSTCO_FUEL_HISTORY_KEY = 'costcoFuelPricesHistory';
const TINY_HABIT_TAG_FALLBACK = 'Untagged';
const clampTinyHabitsPanelWidth = (width) => {
  const maxWidth = typeof window === 'undefined' ? 720 : Math.min(720, Math.floor(window.innerWidth * 0.55));
  return Math.min(maxWidth, Math.max(320, width));
};

const normalizeTinyHabitTag = (tag) => (typeof tag === 'string' ? tag.trim() : '');
const getTinyHabitTagLabel = (habit) => normalizeTinyHabitTag(habit?.tag) || TINY_HABIT_TAG_FALLBACK;
const normalizeTinyHabit = (habit) => ({
  ...habit,
  tag: normalizeTinyHabitTag(habit?.tag),
  emoji: habit?.emoji || '✅',
  color: habit?.color || 'blue',
});

const TinyHabitsDashboardWidget = ({ setActivePage, onHide }) => {
  const [habits, setHabits] = React.useState([]);
  const [completions, setCompletions] = React.useState({});
  const [adding, setAdding] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newTag, setNewTag] = React.useState('');
  const [quickLists, setQuickLists] = React.useState([]);
  const [newQuickListTitle, setNewQuickListTitle] = React.useState('');
  const [newQuickListItems, setNewQuickListItems] = React.useState({});
  const [quickNotes, setQuickNotes] = React.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('dashboardQuickNotes') || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [newQuickNoteText, setNewQuickNoteText] = React.useState('');
  const [editingQuickListId, setEditingQuickListId] = React.useState(null);
  const [editingQuickListTitle, setEditingQuickListTitle] = React.useState('');
  const [editingQuickItem, setEditingQuickItem] = React.useState(null);
  const [editingQuickItemText, setEditingQuickItemText] = React.useState('');
  const [editingQuickNoteId, setEditingQuickNoteId] = React.useState(null);
  const [editingQuickNoteText, setEditingQuickNoteText] = React.useState('');
  const [editingId, setEditingId] = React.useState(null);
  const [editName, setEditName] = React.useState('');
  const [editTag, setEditTag] = React.useState('');
  const [hideDone, setHideDone] = React.useState(false);
  const [groupByTag, setGroupByTag] = React.useState(true);
  const [selectedDate, setSelectedDate] = React.useState(toYMD(new Date()));
  const [collapseMode, setCollapseMode] = React.useState(() => {
    try {
      const saved = localStorage.getItem('tinyHabitsDashboardCollapseMode');
      return ['open', 'half', 'full'].includes(saved) ? saved : 'open';
    } catch {
      return 'open';
    }
  });
  const today = toYMD(new Date());
  const isToday = selectedDate === today;

  const shiftDate = (n) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + n);
    setSelectedDate(toYMD(d));
  };

  const fmtDate = (ymd) => {
    const d = new Date(ymd + 'T00:00:00');
    return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const load = React.useCallback(() => {
    Promise.all([
      fetch(API_HABITS).then(r => r.json()).catch(() => []),
      fetch(`${API_HABITS}/completions`).then(r => r.json()).catch(() => ({})),
      fetch(API_QUICK_LISTS).then(r => r.json()).catch(() => []),
    ]).then(([h, c, lists]) => {
      setHabits(Array.isArray(h) ? h.filter(x => x.active && x.frequency === 'daily').map(normalizeTinyHabit) : []);
      setCompletions(typeof c === 'object' ? c : {});
      setQuickLists(Array.isArray(lists) ? lists : []);
    });
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const saveQuickNotes = (updater) => {
    setQuickNotes(current => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      try {
        localStorage.setItem('dashboardQuickNotes', JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  };

  const toggle = async (habitId) => {
    const prev = !!(completions[selectedDate]?.[habitId]);
    setCompletions(c => {
      const next = { ...c };
      if (!next[selectedDate]) next[selectedDate] = {};
      if (prev) { const d = { ...next[selectedDate] }; delete d[habitId]; next[selectedDate] = d; }
      else next[selectedDate] = { ...next[selectedDate], [habitId]: { completedAt: new Date().toISOString() } };
      return next;
    });
    await fetch(`${API_HABITS}/completions/${selectedDate}/${habitId}`, { method: 'POST' }).catch(() => {});
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await fetch(API_HABITS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, tag: normalizeTinyHabitTag(newTag), frequency: 'daily', emoji: '✅', color: 'blue' }),
      });
      setNewName('');
      setNewTag('');
      setAdding(false);
      load();
    } catch { /* ignore */ }
  };

  const handleEditSave = async (id) => {
    const name = editName.trim();
    if (!name) return;
    try {
      await fetch(`${API_HABITS}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, tag: normalizeTinyHabitTag(editTag) }),
      });
      setEditingId(null);
      setEditTag('');
      load();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this habit?')) return;
    try {
      await fetch(`${API_HABITS}/${id}`, { method: 'DELETE' });
      load();
    } catch { /* ignore */ }
  };

  const handleAddQuickList = async () => {
    const title = newQuickListTitle.trim();
    if (!title) return;
    try {
      const res = await fetch(API_QUICK_LISTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const created = await res.json();
      setQuickLists(lists => [...lists, created]);
      setNewQuickListTitle('');
    } catch { /* ignore */ }
  };

  const handleRenameQuickList = async (listId) => {
    const title = editingQuickListTitle.trim();
    if (!title) return;
    try {
      const res = await fetch(`${API_QUICK_LISTS}/${listId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const updated = await res.json();
      setQuickLists(lists => lists.map(list => list.id === listId ? updated : list));
      setEditingQuickListId(null);
      setEditingQuickListTitle('');
    } catch { /* ignore */ }
  };

  const handleDeleteQuickList = async (listId) => {
    if (!window.confirm('Delete this quick list?')) return;
    try {
      await fetch(`${API_QUICK_LISTS}/${listId}`, { method: 'DELETE' });
      setQuickLists(lists => lists.filter(list => list.id !== listId));
    } catch { /* ignore */ }
  };

  const handleAddQuickListItem = async (listId) => {
    const text = (newQuickListItems[listId] || '').trim();
    if (!text) return;
    try {
      const res = await fetch(`${API_QUICK_LISTS}/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const created = await res.json();
      setQuickLists(lists => lists.map(list => (
        list.id === listId ? { ...list, items: [...(list.items || []), created] } : list
      )));
      setNewQuickListItems(values => ({ ...values, [listId]: '' }));
    } catch { /* ignore */ }
  };

  const handleUpdateQuickListItem = async (listId, itemId, updates) => {
    try {
      const res = await fetch(`${API_QUICK_LISTS}/${listId}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updated = await res.json();
      setQuickLists(lists => lists.map(list => (
        list.id === listId
          ? { ...list, items: (list.items || []).map(item => item.id === itemId ? updated : item) }
          : list
      )));
      setEditingQuickItem(null);
      setEditingQuickItemText('');
    } catch { /* ignore */ }
  };

  const handleDeleteQuickListItem = async (listId, itemId) => {
    try {
      await fetch(`${API_QUICK_LISTS}/${listId}/items/${itemId}`, { method: 'DELETE' });
      setQuickLists(lists => lists.map(list => (
        list.id === listId
          ? { ...list, items: (list.items || []).filter(item => item.id !== itemId) }
          : list
      )));
    } catch { /* ignore */ }
  };

  const handleAddQuickNote = () => {
    const text = newQuickNoteText.trim();
    if (!text) return;
    saveQuickNotes(notes => [
      { id: Date.now().toString(), text, createdAt: new Date().toISOString() },
      ...notes,
    ]);
    setNewQuickNoteText('');
  };

  const handleSaveQuickNoteEdit = (noteId) => {
    const text = editingQuickNoteText.trim();
    if (!text) {
      saveQuickNotes(notes => notes.filter(note => note.id !== noteId));
    } else {
      saveQuickNotes(notes => notes.map(note => note.id === noteId ? { ...note, text } : note));
    }
    setEditingQuickNoteId(null);
    setEditingQuickNoteText('');
  };

  const handleDeleteQuickNote = (noteId) => {
    saveQuickNotes(notes => notes.filter(note => note.id !== noteId));
  };

  const handleConvertQuickNote = async (note) => {
    const text = (note?.text || '').trim();
    if (!text) return;
    try {
      await createNote(text);
      handleDeleteQuickNote(note.id);
    } catch (error) {
      console.error('Failed to convert quick note:', error);
    }
  };

  const [doneCollapsed, setDoneCollapsed] = React.useState(true);
  const doneCount = habits.filter(h => completions[selectedDate]?.[h.id]).length;
  const pct = habits.length > 0 ? Math.round((doneCount / habits.length) * 100) : 0;
  const pendingHabits = habits.filter(h => !completions[selectedDate]?.[h.id]);
  const doneHabits = habits.filter(h => completions[selectedDate]?.[h.id]);
  const visibleHabits = hideDone ? pendingHabits : habits;
  const hasTaggedHabits = habits.some(h => h.tag);

  const groupHabits = (list) => {
    if (!groupByTag || !hasTaggedHabits) return [{ label: null, habits: list }];

    const groupedHabits = list.reduce((acc, habit) => {
      const label = getTinyHabitTagLabel(habit);
      if (!acc[label]) acc[label] = [];
      acc[label].push(habit);
      return acc;
    }, {});

    return Object.keys(groupedHabits)
      .sort((a, b) => {
        if (a === TINY_HABIT_TAG_FALLBACK) return 1;
        if (b === TINY_HABIT_TAG_FALLBACK) return -1;
        return a.localeCompare(b);
      })
      .map(label => ({ label, habits: groupedHabits[label] }));
  };

  const visibleGroups = groupHabits(visibleHabits);
  const doneGroups = groupHabits(doneHabits);
  const isFullyCollapsed = collapseMode === 'full';
  const isHalfCollapsed = collapseMode === 'half';
  const displayLimit = isHalfCollapsed ? 8 : Number.POSITIVE_INFINITY;

  const limitGroups = (groups, limit) => {
    if (!Number.isFinite(limit)) return groups;
    let remaining = limit;
    return groups.reduce((acc, group) => {
      if (remaining <= 0) return acc;
      const habitsForGroup = group.habits.slice(0, remaining);
      if (habitsForGroup.length > 0) {
        acc.push({ ...group, habits: habitsForGroup });
        remaining -= habitsForGroup.length;
      }
      return acc;
    }, []);
  };

  const displayedGroups = limitGroups(visibleGroups, displayLimit);
  const hiddenPreviewCount = Math.max(0, visibleHabits.length - displayedGroups.reduce((sum, group) => sum + group.habits.length, 0));

  const setStoredCollapseMode = (mode) => {
    setCollapseMode(mode);
    try {
      localStorage.setItem('tinyHabitsDashboardCollapseMode', mode);
    } catch { /* ignore */ }
  };

  const renderHabitRow = (habit, doneSection = false) => {
    const isDone = !!(completions[selectedDate]?.[habit.id]);
    const isEditing = editingId === habit.id && !doneSection;

    return (
      <div key={habit.id} className="flex items-center gap-2 group">
        <button
          onClick={() => toggle(habit.id)}
          className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-gray-400'}`}
        >
          {isDone && <CheckIcon className="h-3 w-3" />}
        </button>
        {isEditing ? (
          <>
            <div className="flex-1 space-y-1">
              <input
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleEditSave(habit.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="w-full text-sm border border-blue-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
              <input
                value={editTag}
                onChange={e => setEditTag(e.target.value)}
                placeholder="Tag (optional)"
                className="w-full text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
            <button onClick={() => handleEditSave(habit.id)} className="text-xs px-1.5 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Save</button>
            <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600"><XMarkIcon className="h-3.5 w-3.5" /></button>
          </>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <div className={`text-sm truncate ${isDone ? 'line-through text-gray-400' : 'text-gray-700'}`}>{habit.name}</div>
              {habit.tag && !groupByTag && (
                <div className="mt-0.5">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                    {habit.tag}
                  </span>
                </div>
              )}
            </div>
            {!doneSection && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setEditingId(habit.id);
                    setEditName(habit.name);
                    setEditTag(habit.tag || '');
                  }}
                  className="p-0.5 text-gray-400 hover:text-gray-700 transition-colors"
                  title="Edit"
                >
                  <PencilSquareIcon className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(habit.id)} className="p-0.5 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="mb-4">
      <div className="mb-1 mt-2 border-b border-gray-200 pb-1 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Tiny Habits</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-gray-200 bg-white p-0.5">
            {[
              { value: 'open', label: 'open' },
              { value: 'half', label: 'half' },
              { value: 'full', label: 'full' },
            ].map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStoredCollapseMode(option.value)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                  collapseMode === option.value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-blue-600'
                }`}
                title={option.value === 'open' ? 'Open Tiny Habits' : option.value === 'half' ? 'Collapse Tiny Habits halfway' : 'Collapse Tiny Habits fully'}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button onClick={() => setActivePage('tiny-habits')} className="text-xs text-blue-500 hover:text-blue-700 transition-colors">See all →</button>
          {onHide && (
            <button onClick={onHide} className="text-xs text-gray-400 hover:text-gray-600 transition-colors" title="Hide panel">‹ hide</button>
          )}
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-100 px-4 py-3 shadow-sm">

        {/* Date nav */}
        <div className={`flex items-center justify-between ${isFullyCollapsed ? 'mb-0' : 'mb-3'}`}>
          <button onClick={() => shiftDate(-1)} className="p-0.5 text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-gray-600'}`}>
              {isToday ? 'Today' : fmtDate(selectedDate)}
            </span>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(today)}
                className="text-[10px] text-gray-400 hover:text-blue-500 border border-gray-200 rounded px-1 py-0.5 transition-colors"
              >
                reset
              </button>
            )}
          </div>
          <button
            onClick={() => shiftDate(1)}
            disabled={selectedDate >= today}
            className="p-0.5 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-30"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar + hide done toggle */}
        {habits.length > 0 && !isFullyCollapsed && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-gray-600">{doneCount}/{habits.length}</span>
            <button
              onClick={() => setHideDone(h => !h)}
              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${hideDone ? 'bg-gray-700 text-white border-gray-700' : 'text-gray-400 border-gray-200 hover:border-gray-400'}`}
              title={hideDone ? 'Show all' : 'Hide done'}
            >
              {hideDone ? 'show all' : 'hide done'}
            </button>
            {hasTaggedHabits && (
              <button
                onClick={() => setGroupByTag(current => !current)}
                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${groupByTag ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-400 border-gray-200 hover:border-gray-400'}`}
                title={groupByTag ? 'Grouped by tag' : 'Flat list'}
              >
                {groupByTag ? 'grouped by tag' : 'group by tag'}
              </button>
            )}
          </div>
        )}

        {/* Habit rows */}
        {!isFullyCollapsed && (
        <div className="space-y-1.5">
          {displayedGroups.map(({ label, habits: groupedHabits }) => (
            <div key={label || 'all'} className="space-y-1.5">
              {label && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {label === TINY_HABIT_TAG_FALLBACK ? label : `#${label}`}
                  </span>
                  <div className="flex-1 border-t border-gray-100" />
                </div>
              )}
              {groupedHabits.map(habit => renderHabitRow(habit))}
            </div>
          ))}
          {habits.length === 0 && !adding && (
            <div className="text-xs text-gray-400 py-1">No habits yet.</div>
          )}
          {hideDone && pendingHabits.length === 0 && doneHabits.length > 0 && (
            <div className="text-xs text-gray-400 py-1">All done for today! 🎉</div>
          )}
          {hiddenPreviewCount > 0 && (
            <button
              type="button"
              onClick={() => setStoredCollapseMode('open')}
              className="w-full rounded-md border border-dashed border-gray-200 px-2 py-1 text-xs text-gray-400 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
            >
              Show {hiddenPreviewCount} more
            </button>
          )}
        </div>
        )}

        {/* Collapsed done section (only when hideDone is on) */}
        {hideDone && doneHabits.length > 0 && !isFullyCollapsed && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => setDoneCollapsed(c => !c)}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors w-full"
            >
              {doneCollapsed ? <ChevronDownIcon className="h-3 w-3" /> : <ChevronUpIcon className="h-3 w-3" />}
              Done ({doneHabits.length})
            </button>
            {!doneCollapsed && (
              <div className="mt-1.5 space-y-1.5">
                {doneGroups.map(({ label, habits: groupedHabits }) => (
                  <div key={label || 'done-all'} className="space-y-1.5">
                    {label && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          {label === TINY_HABIT_TAG_FALLBACK ? label : `#${label}`}
                        </span>
                        <div className="flex-1 border-t border-gray-100" />
                      </div>
                    )}
                    {groupedHabits.map(habit => renderHabitRow(habit, true))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Full-width add */}
        {!isFullyCollapsed && (adding ? (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') setAdding(false);
                  }}
                  placeholder="New habit name…"
                  className="w-full text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
                <input
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') setAdding(false);
                  }}
                  placeholder="Single tag (optional)"
                  className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
              <button onClick={handleAdd} className="text-xs px-2.5 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Add</button>
              <button onClick={() => setAdding(false)} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-4 w-4" /></button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setAdding(true); setNewName(''); setNewTag(''); }}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 border border-dashed border-gray-200 hover:border-blue-300 rounded-lg transition-colors"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add habit
          </button>
        ))}
      </div>
      <div className="mt-3 bg-white rounded-lg border border-gray-100 px-4 py-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Quick Lists</h3>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
            <input
              value={newQuickListTitle}
              onChange={e => setNewQuickListTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddQuickList();
                if (e.key === 'Escape') setNewQuickListTitle('');
              }}
              placeholder="Add list"
              className="min-w-0 max-w-[8rem] rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
            <button
              type="button"
              onClick={handleAddQuickList}
              className="flex h-7 w-7 items-center justify-center rounded border border-blue-200 bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100"
              title="Add list"
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {quickLists.map(list => {
            const items = Array.isArray(list.items) ? list.items : [];
            const incomplete = items.filter(item => !item.done).length;
            const isEditingList = editingQuickListId === list.id;

            return (
              <div key={list.id} className="rounded-lg border border-gray-100 bg-gray-50/50 p-2">
                <div className="mb-1.5 flex items-center gap-2">
                  {isEditingList ? (
                    <input
                      autoFocus
                      value={editingQuickListTitle}
                      onChange={e => setEditingQuickListTitle(e.target.value)}
                      onBlur={() => handleRenameQuickList(list.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRenameQuickList(list.id);
                        if (e.key === 'Escape') {
                          setEditingQuickListId(null);
                          setEditingQuickListTitle('');
                        }
                      }}
                      className="min-w-0 flex-1 rounded border border-blue-300 px-1.5 py-0.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-300"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingQuickListId(list.id);
                        setEditingQuickListTitle(list.title || '');
                      }}
                      className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-gray-700"
                      title="Edit list title"
                    >
                      {list.title || 'Untitled list'}
                    </button>
                  )}
                  <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                    {incomplete}/{items.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuickList(list.id)}
                    className="text-gray-300 transition-colors hover:text-red-500"
                    title="Delete list"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  {items.map(item => {
                    const isEditingItem = editingQuickItem?.listId === list.id && editingQuickItem?.itemId === item.id;
                    return (
                      <div key={item.id} className="group flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuickListItem(list.id, item.id, { done: !item.done })}
                          className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                            item.done ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {item.done && <CheckIcon className="h-3 w-3" />}
                        </button>
                        {isEditingItem ? (
                          <input
                            autoFocus
                            value={editingQuickItemText}
                            onChange={e => setEditingQuickItemText(e.target.value)}
                            onBlur={() => handleUpdateQuickListItem(list.id, item.id, { text: editingQuickItemText })}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleUpdateQuickListItem(list.id, item.id, { text: editingQuickItemText });
                              if (e.key === 'Escape') {
                                setEditingQuickItem(null);
                                setEditingQuickItemText('');
                              }
                            }}
                            className="min-w-0 flex-1 rounded border border-blue-300 px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuickItem({ listId: list.id, itemId: item.id });
                              setEditingQuickItemText(item.text || '');
                            }}
                            className={`min-w-0 flex-1 truncate text-left text-xs ${item.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                            title="Edit item"
                          >
                            {item.text}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteQuickListItem(list.id, item.id)}
                          className="text-gray-300 opacity-0 transition-all hover:text-red-500 group-hover:opacity-100"
                          title="Delete item"
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                  {items.length === 0 && (
                    <div className="py-1 text-xs text-gray-400">No items yet.</div>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-1.5">
                  <input
                    value={newQuickListItems[list.id] || ''}
                    onChange={e => setNewQuickListItems(values => ({ ...values, [list.id]: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddQuickListItem(list.id);
                      if (e.key === 'Escape') setNewQuickListItems(values => ({ ...values, [list.id]: '' }));
                    }}
                    placeholder="Add item"
                    className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddQuickListItem(list.id)}
                    className="flex h-7 w-7 items-center justify-center rounded border border-blue-200 bg-white text-blue-600 transition-colors hover:bg-blue-50"
                    title="Add item"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
          {quickLists.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400">
              Add a quick list here.
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 bg-white rounded-lg border border-gray-100 px-4 py-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Quick Notes</h3>
        </div>

        <div className="flex items-start gap-1.5">
          <textarea
            value={newQuickNoteText}
            onChange={e => setNewQuickNoteText(e.target.value)}
            onKeyDown={e => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleAddQuickNote();
              if (e.key === 'Escape') setNewQuickNoteText('');
            }}
            placeholder="Add a quick note"
            rows={2}
            className="min-w-0 flex-1 resize-none rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
          <button
            type="button"
            onClick={handleAddQuickNote}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-blue-200 bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100"
            title="Add quick note"
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {quickNotes.map(note => {
            const isEditingNote = editingQuickNoteId === note.id;
            return (
              <div key={note.id} className="rounded-lg border border-gray-100 bg-gray-50/50 p-2">
                {isEditingNote ? (
                  <textarea
                    autoFocus
                    value={editingQuickNoteText}
                    onChange={e => setEditingQuickNoteText(e.target.value)}
                    onBlur={() => handleSaveQuickNoteEdit(note.id)}
                    onKeyDown={e => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSaveQuickNoteEdit(note.id);
                      if (e.key === 'Escape') {
                        setEditingQuickNoteId(null);
                        setEditingQuickNoteText('');
                      }
                    }}
                    rows={3}
                    className="w-full resize-none rounded border border-blue-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQuickNoteId(note.id);
                      setEditingQuickNoteText(note.text || '');
                    }}
                    className="w-full whitespace-pre-wrap text-left text-xs leading-relaxed text-gray-700"
                    title="Edit quick note"
                  >
                    {note.text}
                  </button>
                )}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="truncate text-[10px] text-gray-400">
                    {note.createdAt ? new Date(note.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : 'Quick note'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleConvertQuickNote(note)}
                      className="rounded border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                      title="Convert to note"
                    >
                      To note
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuickNote(note.id)}
                      className="text-gray-300 transition-colors hover:text-red-500"
                      title="Delete quick note"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {quickNotes.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400">
              Capture quick notes here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ notes, setNotes, setActivePage }) => {
  const { isPinned, isVisible, togglePinned } = useLeftPanel();
  const { openEditor } = useNoteEditor();
  const location = useLocation();
  const SUPER_CRITICAL_REVIEW_META = 'meta::review_super_critical';
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [timezones, setTimezones] = useState([]);
  const [showTimezones, setShowTimezones] = useState(true);
  const [selectedTimezones, setSelectedTimezones] = useState([]);
  const [eventScrollPosition, setEventScrollPosition] = useState(0);
  const [notesScrollPosition, setNotesScrollPosition] = useState(0);
  const [eventsHasOverflow, setEventsHasOverflow] = useState(false);
  const [notesHasOverflow, setNotesHasOverflow] = useState(false);
  const [eventNotesHasOverflow, setEventNotesHasOverflow] = useState(false);
  const [eventNotesScrolledRight, setEventNotesScrolledRight] = useState(false);
  const [showRemindersOnly, setShowRemindersOnly] = useState(false);
  const [showReviewsOverdueOnly, setShowReviewsOverdueOnly] = useState(false);
  const [showHabitsPanel, setShowHabitsPanel] = useState(() => {
    try { return localStorage.getItem('showHabitsPanel') !== 'false'; } catch { return true; }
  });
  const [tinyHabitsPanelWidth, setTinyHabitsPanelWidth] = useState(() => {
    try {
      return clampTinyHabitsPanelWidth(Number(localStorage.getItem('tinyHabitsPanelWidth')) || 384);
    } catch {
      return 384;
    }
  });
  const [isResizingTinyHabitsPanel, setIsResizingTinyHabitsPanel] = useState(false);
  const [showTimezonePopup, setShowTimezonePopup] = useState(false);
  const [showAddOptionsPopup, setShowAddOptionsPopup] = useState(false);
  const [showAlertsHelpPopup, setShowAlertsHelpPopup] = useState(false);
  const [isAlertsRemindersExpanded, setIsAlertsRemindersExpanded] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isAddingDeadline, setIsAddingDeadline] = useState(false);
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);
  const [isAddingTemporaryEvent, setIsAddingTemporaryEvent] = useState(false);
  const [activeFilters, setActiveFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('defaultEventFilters');
      return saved ? JSON.parse(saved) : ['deadline'];
    } catch { return ['deadline']; }
  });
  const [eventTextFilter, setEventTextFilter] = useState(''); // Text filter for events
  const eventSearchInputRef = useRef(null); // <-- Add ref for search input
  const [lastLoginTime, setLastLoginTime] = useState(null);
  const [activePopup, setActivePopup] = useState(null);
  const [dashboardDataRefreshTick, setDashboardDataRefreshTick] = useState(0);
  const [costcoFuelPrices, setCostcoFuelPrices] = useState(() => {
    try {
      const cached = localStorage.getItem(COSTCO_FUEL_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [costcoFuelHistory, setCostcoFuelHistory] = useState(() => {
    try {
      const cached = localStorage.getItem(COSTCO_FUEL_HISTORY_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [costcoFuelLoading, setCostcoFuelLoading] = useState(false);
  const [showCostcoFuelCache, setShowCostcoFuelCache] = useState(false);
  const [showAnalogClock, setShowAnalogClock] = useState(() => {
    try { return localStorage.getItem('dashboardShowAnalogClock') !== 'false'; } catch { return true; }
  });
  const [showTimeBuddy, setShowTimeBuddy] = useState(() => {
    try { return localStorage.getItem('dashboardShowTimeBuddy') !== 'false'; } catch { return true; }
  });
  const [clockFace, setClockFace] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboardClockFace');
      return ['classic', 'minimal', 'numbers'].includes(saved) ? saved : 'classic';
    } catch {
      return 'classic';
    }
  });
  const [showQuickSuperCriticalAdd, setShowQuickSuperCriticalAdd] = useState(false);
  const [quickSuperCriticalTitle, setQuickSuperCriticalTitle] = useState('');
  const [activeSuperCriticalPreviewId, setActiveSuperCriticalPreviewId] = useState(null);
  const [superCriticalActionMenu, setSuperCriticalActionMenu] = useState(null);
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);
  const [calendarPopupStyle, setCalendarPopupStyle] = useState({ top: 0, left: 16, width: 1100 });
  const quickSuperCriticalInputRef = useRef(null);
  const superCriticalPreviewOpenTimeoutRef = useRef(null);
  const superCriticalPreviewCloseTimeoutRef = useRef(null);
  const loadedDashboardFilterDefaultsRef = useRef(false);
  const dateTriggerRef = useRef(null);
  const calendarPopupRef = useRef(null);
  const calendarHoverTimeoutRef = useRef(null);

  // Refs for scroll containers
  const eventsScrollRef = useRef(null);
  const notesScrollRef = useRef(null);
  const eventNotesScrollRef = useRef(null);
  const reviewOverdueSearchInputRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isResizingTinyHabitsPanel) return;

    const handleMouseMove = (event) => {
      const nextWidth = clampTinyHabitsPanelWidth(window.innerWidth - event.clientX);
      setTinyHabitsPanelWidth(nextWidth);
      localStorage.setItem('tinyHabitsPanelWidth', String(nextWidth));
    };

    const handleMouseUp = () => {
      setIsResizingTinyHabitsPanel(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingTinyHabitsPanel]);

  useEffect(() => {
    if (loadedDashboardFilterDefaultsRef.current || !Array.isArray(notes)) return;
    const noteBackedFilters = readNoteBackedSettingFromNotes(notes, DASHBOARD_EVENT_FILTERS_SETTING_KEY, null);
    if (Array.isArray(noteBackedFilters) && noteBackedFilters.length > 0) {
      setActiveFilters(noteBackedFilters);
      localStorage.setItem('defaultEventFilters', JSON.stringify(noteBackedFilters));
    } else {
      try {
        const cachedFilters = JSON.parse(localStorage.getItem('defaultEventFilters') || 'null');
        if (Array.isArray(cachedFilters) && cachedFilters.length > 0) {
          saveNoteBackedSetting(DASHBOARD_EVENT_FILTERS_SETTING_KEY, cachedFilters, { setNotes })
            .catch(error => console.warn('Failed to migrate cached dashboard filters to note:', error));
        }
      } catch (error) {
        console.warn('Failed to read cached dashboard filters:', error);
      }
    }
    loadedDashboardFilterDefaultsRef.current = true;
  }, [notes, setNotes]);

  useEffect(() => {
    if (showQuickSuperCriticalAdd) {
      quickSuperCriticalInputRef.current?.focus();
    }
  }, [showQuickSuperCriticalAdd]);

  useEffect(() => {
    if (!superCriticalActionMenu) return;

    const closeActionMenu = () => setSuperCriticalActionMenu(null);
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeActionMenu();
    };

    document.addEventListener('click', closeActionMenu);
    document.addEventListener('contextmenu', closeActionMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', closeActionMenu);
      document.removeEventListener('contextmenu', closeActionMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [superCriticalActionMenu]);

  useEffect(() => () => {
    if (calendarHoverTimeoutRef.current) {
      clearTimeout(calendarHoverTimeoutRef.current);
    }
    if (superCriticalPreviewOpenTimeoutRef.current) {
      clearTimeout(superCriticalPreviewOpenTimeoutRef.current);
    }
    if (superCriticalPreviewCloseTimeoutRef.current) {
      clearTimeout(superCriticalPreviewCloseTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    const handleDashboardDataUpdated = () => setDashboardDataRefreshTick(tick => tick + 1);
    document.addEventListener('stockPriceUpdated', handleDashboardDataUpdated);
    document.addEventListener('exchangeRatesUpdated', handleDashboardDataUpdated);
    document.addEventListener('weatherUpdated', handleDashboardDataUpdated);
    return () => {
      document.removeEventListener('stockPriceUpdated', handleDashboardDataUpdated);
      document.removeEventListener('exchangeRatesUpdated', handleDashboardDataUpdated);
      document.removeEventListener('weatherUpdated', handleDashboardDataUpdated);
    };
  }, []);

  useEffect(() => {
    const getMelbourneDateKey = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' });
    const readStoredFuelData = (key, fallback) => {
      try {
        const cached = localStorage.getItem(key);
        return cached ? JSON.parse(cached) : fallback;
      } catch {
        return fallback;
      }
    };
    const saveFuelSnapshot = (data) => {
      const snapshot = { ...data, cacheDateKey: getMelbourneDateKey() };
      const previousHistory = readStoredFuelData(COSTCO_FUEL_HISTORY_KEY, []);
      const nextHistory = [
        snapshot,
        ...previousHistory.filter(item => item?.fetchedAt !== snapshot.fetchedAt),
      ].slice(0, 20);

      setCostcoFuelPrices(snapshot);
      setCostcoFuelHistory(nextHistory);
      localStorage.setItem(COSTCO_FUEL_CACHE_KEY, JSON.stringify(snapshot));
      localStorage.setItem(COSTCO_FUEL_HISTORY_KEY, JSON.stringify(nextHistory));
    };
    const fetchCostcoFuelPrices = async (force = false) => {
      const cached = readStoredFuelData(COSTCO_FUEL_CACHE_KEY, null);
      if (!force && cached?.cacheDateKey === getMelbourneDateKey()) {
        setCostcoFuelPrices(cached);
        setCostcoFuelHistory(readStoredFuelData(COSTCO_FUEL_HISTORY_KEY, []));
        return;
      }

      setCostcoFuelLoading(true);
      try {
        const response = await fetch(API_COSTCO_FUEL_PRICES);
        if (!response.ok) throw new Error(`Fuel price request failed: ${response.status}`);
        const data = await response.json();
        saveFuelSnapshot(data);
      } catch (error) {
        console.error('Error fetching Costco fuel prices:', error);
      } finally {
        setCostcoFuelLoading(false);
      }
    };

    fetchCostcoFuelPrices();
    const handleRefreshCostcoFuelPrices = () => fetchCostcoFuelPrices(true);
    document.addEventListener('refreshCostcoFuelPrices', handleRefreshCostcoFuelPrices);
    return () => document.removeEventListener('refreshCostcoFuelPrices', handleRefreshCostcoFuelPrices);
  }, []);

  // Load selected timezones from localStorage on component mount
  useEffect(() => {
    const savedTimezones = localStorage.getItem('selectedTimezones');
    if (savedTimezones) {
      setSelectedTimezones(JSON.parse(savedTimezones));
    }
  }, []);

  // Track last login time
  useEffect(() => {
    // Get previous login time from localStorage
    const previousLogin = localStorage.getItem('dashboardLastLogin');
    if (previousLogin) {
      try {
        const loginDate = new Date(previousLogin);
        setLastLoginTime(loginDate);
      } catch (error) {
        console.error('Error parsing last login time:', error);
      }
    }

    // Update current login time
    const currentLoginTime = new Date().toISOString();
    localStorage.setItem('dashboardLastLogin', currentLoginTime);
  }, []); // Run only once on mount

  const formattedTime = time.toLocaleTimeString(undefined, {
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = time.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const getNoteTitle = (note) => {
    const lines = (note?.content || '').split('\n');
    const eventDescription = lines
      .find(line => line.trim().startsWith('event_description:'))
      ?.replace(/^event_description:/, '')
      ?.trim();

    if (eventDescription) return eventDescription;

    return lines
      .find(line => {
        const trimmed = line.trim();
        return trimmed &&
          !trimmed.startsWith('meta::') &&
          !trimmed.startsWith('event_description:') &&
          !trimmed.startsWith('event_date:') &&
          !trimmed.startsWith('event_notes:') &&
          !trimmed.startsWith('event_recurring_type:') &&
          !trimmed.startsWith('event_tags:');
      })
      ?.replace(/^\{#h[12]#\}/, '')
      ?.replace(/^\{#bold#\}/, '')
      ?.trim() || 'Untitled review';
  };

  const removeMetaLine = (content, metaLine) => (
    (content || '')
      .split('\n')
      .filter(line => line.trim() !== metaLine)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );

  const noop = () => {};

  const updateDashboardNote = async (noteId, updatedContent) => {
    const response = await updateNoteById(noteId, updatedContent);
    const nextContent = response && response.content ? response.content : updatedContent;
    setNotes(prevNotes => prevNotes.map(existingNote => (
      existingNote.id === noteId
        ? { ...existingNote, content: nextContent }
        : existingNote
    )));
    return response;
  };

  const handleSuperCriticalMarkForReview = (noteId) => {
    const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
    delete reviews[noteId];
    localStorage.setItem('noteReviews', JSON.stringify(reviews));
  };

  const handleSuperCriticalMarkAsReminder = async (noteId) => {
    const note = (notes || []).find(existingNote => existingNote.id === noteId);
    if (!note?.content) return;

    const updatedContent = note.content.includes('meta::reminder')
      ? note.content
        .split('\n')
        .filter(line => !line.trim().startsWith('meta::reminder'))
        .join('\n')
        .trim()
      : `${note.content}\nmeta::reminder`;

    try {
      await updateDashboardNote(noteId, updatedContent);
    } catch (error) {
      console.error('Error updating reminder state:', error);
      alert('Failed to update reminder: ' + error.message);
    }
  };

  const getSuperCriticalWatchAge = (note) => {
    const watchDateMatch = note?.content?.match(/meta::watch::(\d{4}-\d{2}-\d{2})/);
    if (!watchDateMatch) return 0;

    const watchDate = new Date(watchDateMatch[1]);
    const now = new Date();
    return Math.ceil((now - watchDate) / (1000 * 60 * 60 * 24));
  };

  const handleSuperCriticalPreviewEnter = (noteId) => {
    if (superCriticalPreviewCloseTimeoutRef.current) {
      clearTimeout(superCriticalPreviewCloseTimeoutRef.current);
    }
    if (superCriticalPreviewOpenTimeoutRef.current) {
      clearTimeout(superCriticalPreviewOpenTimeoutRef.current);
    }
    superCriticalPreviewOpenTimeoutRef.current = setTimeout(() => {
      setActiveSuperCriticalPreviewId(noteId);
    }, 550);
  };

  const handleSuperCriticalPreviewLeave = () => {
    if (superCriticalPreviewOpenTimeoutRef.current) {
      clearTimeout(superCriticalPreviewOpenTimeoutRef.current);
    }
    if (superCriticalPreviewCloseTimeoutRef.current) {
      clearTimeout(superCriticalPreviewCloseTimeoutRef.current);
    }
    superCriticalPreviewCloseTimeoutRef.current = setTimeout(() => {
      setActiveSuperCriticalPreviewId(null);
    }, 220);
  };

  const renderSuperCriticalReviewPreview = (note, isVisible) => (
    <div
      className={`super-critical-review-preview absolute left-0 top-full z-50 mt-2 w-[min(820px,calc(100vw-3rem))] rounded-xl border p-3 text-left shadow-xl ${isVisible ? 'block' : 'hidden'}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="super-critical-review-preview-title mb-2 truncate text-xs font-bold uppercase tracking-wide">
        {getNoteTitle(note)}
      </div>
      <div className="super-critical-review-preview-body max-h-[70vh] overflow-y-auto rounded-lg border p-3 text-sm">
        <ReminderWatchCard
          notes={[note]}
          searchQuery=""
          duplicatedUrlColors={{}}
          editingLine={null}
          setEditingLine={noop}
          editedLineContent=""
          setEditedLineContent={noop}
          rightClickNoteId={null}
          rightClickIndex={null}
          setRightClickNoteId={noop}
          setRightClickIndex={noop}
          setRightClickPos={noop}
          editingInlineDate={null}
          setEditingInlineDate={noop}
          handleInlineDateSelect={noop}
          popupNoteText=""
          setPopupNoteText={noop}
          objList={[]}
          addingLineNoteId={null}
          setAddingLineNoteId={noop}
          newLineText=""
          setNewLineText={noop}
          newLineInputRef={{ current: null }}
          updateNote={updateDashboardNote}
          onContextMenu={noop}
          isWatchList={true}
          getNoteAge={getSuperCriticalWatchAge}
          onReview={handleSuperCriticalMarkForReview}
          onCadenceChange={handleSuperCriticalMarkForReview}
          onEdit={(selectedNote) => openEditor('edit', selectedNote.content, selectedNote.id)}
          onMarkForReview={handleSuperCriticalMarkForReview}
          onMarkAsReminder={handleSuperCriticalMarkAsReminder}
        />
      </div>
    </div>
  );

  const isTimedReview = (note) => (
    !!note?.content?.split('\n').some(line => line.trim().startsWith(TIMER_CADENCE_PREFIX))
  );
  const isReminderReview = (note) => (
    !!note?.content?.split('\n').some(line => line.trim().startsWith('meta::reminder'))
  );
  const superCriticalReviews = (notes || []).filter(note =>
    note?.content?.includes(SUPER_CRITICAL_REVIEW_META) &&
    !isTimedReview(note) &&
    !isReminderReview(note)
  );
  const timedWatchlistReviews = (notes || []).filter(note =>
    isTimedReview(note) &&
    !isReminderReview(note)
  ).sort((a, b) => {
    const aStatus = getTimerStatus(a);
    const bStatus = getTimerStatus(b);
    const aDays = aStatus?.days ?? Number.MAX_SAFE_INTEGER;
    const bDays = bStatus?.days ?? Number.MAX_SAFE_INTEGER;

    return aDays - bDays;
  });
  const regularWatchlistReviews = (notes || []).filter(note =>
    note?.content?.includes('meta::watch') &&
    !note?.content?.includes(SUPER_CRITICAL_REVIEW_META) &&
    !isTimedReview(note) &&
    !isReminderReview(note)
  );
  const reminderReviews = findDueRemindersAsNotes(notes || []).filter(note =>
    !note?.content?.includes(SUPER_CRITICAL_REVIEW_META)
  );
  const reviewStripCount = superCriticalReviews.length + timedWatchlistReviews.length + regularWatchlistReviews.length + reminderReviews.length;

  const handleAcknowledgeAllReminderReviews = () => {
    reminderReviews.forEach(note => addCurrentDateToLocalStorage(note.id));
    setDashboardDataRefreshTick(tick => tick + 1);
  };

  const handleAcknowledgeReminderReview = (event, noteId) => {
    event.preventDefault();
    event.stopPropagation();
    addCurrentDateToLocalStorage(noteId);
    setDashboardDataRefreshTick(tick => tick + 1);
  };

  const handleUnmarkSuperCriticalReview = async (note) => {
    setSuperCriticalActionMenu(null);
    const updatedContent = removeMetaLine(note?.content, SUPER_CRITICAL_REVIEW_META);

    try {
      const response = await updateNoteById(note.id, updatedContent);
      const nextContent = response && response.content ? response.content : updatedContent;
      setNotes(prevNotes => prevNotes.map(existingNote => (
        existingNote.id === note.id
          ? { ...existingNote, content: nextContent }
          : existingNote
      )));
    } catch (error) {
      console.error('Error unmarking super critical review:', error);
      alert('Failed to update review: ' + error.message);
    }
  };

  const handleDeleteSuperCriticalReview = async (noteId) => {
    setSuperCriticalActionMenu(null);
    if (!window.confirm('Delete this super critical review?')) return;

    try {
      await deleteNoteById(noteId);
      setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
    } catch (error) {
      console.error('Error deleting super critical review:', error);
      alert('Failed to delete review: ' + error.message);
    }
  };

  const scrollToReviewDue = (noteId) => {
    setSuperCriticalActionMenu(null);
    const scrollToTarget = () => {
      const target = document.querySelector(`[data-review-id="${noteId}"]`) ||
        document.querySelector('[data-section="review-overdue"]');
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    if (!document.querySelector(`[data-review-id="${noteId}"]`)) {
      document.dispatchEvent(new CustomEvent('showReviewTimerCards'));
      setTimeout(scrollToTarget, 100);
      return;
    }

    scrollToTarget();
  };

  const handleSuperCriticalActionMenu = (event, noteId) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = typeof event.clientX === 'number' && event.clientX > 0 ? event.clientX : rect.left;
    const y = typeof event.clientY === 'number' && event.clientY > 0 ? event.clientY : rect.bottom + 4;
    setActiveSuperCriticalPreviewId(null);
    setSuperCriticalActionMenu({
      noteId,
      x: Math.min(x, window.innerWidth - 190),
      y: Math.min(y, window.innerHeight - 94)
    });
  };

  const getTimedReviewDaysLabel = (note) => {
    const timerStatus = getTimerStatus(note);
    if (!timerStatus || timerStatus.days == null) return 'No date';
    if (timerStatus.expired) return `${timerStatus.daysExpired}d overdue`;
    if (timerStatus.days === 0) return 'Today';
    if (timerStatus.days === 1) return '1 day';
    return `${timerStatus.days} days`;
  };

  const getFirstNoteUrl = (note) => {
    const content = note?.content || '';
    const markdownMatch = content.match(/\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/);
    if (markdownMatch) return markdownMatch[1];

    return content.match(/https?:\/\/[^\s)]+/)?.[0] || '';
  };

  const handleReviewChipClick = (note) => {
    const url = getFirstNoteUrl(note);
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const renderReviewChip = (note, { isSuperCritical = false, isTimed = false, canAcknowledge = false } = {}) => {
    const isPreviewVisible = activeSuperCriticalPreviewId === note.id;
    const canUnmarkSuperCritical = isSuperCritical || note?.content?.includes(SUPER_CRITICAL_REVIEW_META);
    const timerStatus = isTimed ? getTimerStatus(note) : null;
    const firstNoteUrl = getFirstNoteUrl(note);

    return (
      <div
        key={note.id}
        className="group relative"
        onContextMenu={(event) => handleSuperCriticalActionMenu(event, note.id)}
        onMouseEnter={() => handleSuperCriticalPreviewEnter(note.id)}
        onMouseLeave={handleSuperCriticalPreviewLeave}
      >
        <button
          type="button"
          onClick={() => handleReviewChipClick(note)}
          onContextMenu={(event) => handleSuperCriticalActionMenu(event, note.id)}
          onKeyDown={(event) => {
            if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') {
              handleSuperCriticalActionMenu(event, note.id);
            }
          }}
          className={`super-critical-review-chip max-w-xs rounded-full border px-3 py-1 text-left text-xs font-semibold shadow-sm transition-colors ${firstNoteUrl ? 'cursor-pointer' : 'cursor-default'} ${isTimed ? 'timed-watchlist-review-chip' : 'truncate'} ${isSuperCritical ? '' : 'regular-watchlist-review-chip'}`}
          title={firstNoteUrl ? 'Open first URL. Right click for actions.' : 'No URL found. Right click for actions.'}
        >
          {isTimed ? (
            <span className="flex min-w-0 items-center gap-1">
              <span className={`truncate ${firstNoteUrl ? 'review-chip-link-text' : ''}`}>{getNoteTitle(note)}</span>
              <span className="timed-watchlist-review-days-pill flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                {getTimedReviewDaysLabel(note)}
              </span>
              <span className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${timerStatus?.once ? 'timed-watchlist-review-once-pill' : 'timed-watchlist-review-recurring-pill'}`}>
                {timerStatus?.once ? 'Once' : 'Recurring'}
              </span>
            </span>
          ) : (
            <span className="flex min-w-0 items-center gap-1.5">
              <span className={`truncate ${firstNoteUrl ? 'review-chip-link-text' : ''}`}>{getNoteTitle(note)}</span>
              {canAcknowledge && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => handleAcknowledgeReminderReview(event, note.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      handleAcknowledgeReminderReview(event, note.id);
                    }
                  }}
                  className="ml-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600 transition-colors hover:bg-blue-50"
                  title="Acknowledge reminder"
                >
                  <CheckIcon className="h-3 w-3" />
                </span>
              )}
            </span>
          )}
        </button>
        {superCriticalActionMenu?.noteId === note.id && (
          <div
            className="super-critical-review-action-menu fixed z-[100] min-w-44 overflow-hidden rounded-lg border py-1 text-sm shadow-xl"
            style={{ left: superCriticalActionMenu.x, top: superCriticalActionMenu.y }}
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
          >
            <button
              type="button"
              onClick={() => scrollToReviewDue(note.id)}
              className="super-critical-review-action-menu-item w-full px-3 py-2 text-left text-xs font-semibold"
            >
              Go to note
            </button>
            {canUnmarkSuperCritical && (
              <button
                type="button"
                onClick={() => handleUnmarkSuperCriticalReview(note)}
                className="super-critical-review-action-menu-item w-full px-3 py-2 text-left text-xs font-semibold"
              >
                Unmark
              </button>
            )}
            <button
              type="button"
              onClick={() => handleDeleteSuperCriticalReview(note.id)}
              className="super-critical-review-action-menu-item super-critical-review-action-menu-delete w-full px-3 py-2 text-left text-xs font-semibold"
            >
              Delete
            </button>
          </div>
        )}
        {renderSuperCriticalReviewPreview(note, isPreviewVisible)}
      </div>
    );
  };

  // Function to format timezone time in compact form
  const formatTimezoneTime = (timeZone) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
      }).format(time);
    } catch (error) {
      return '--:--';
    }
  };

  // Get compact timezone display
  // Smooth scroll function with easing
  const smoothScroll = (element, targetScrollLeft, duration = 600) => {
    const startScrollLeft = element.scrollLeft;
    const distance = targetScrollLeft - startScrollLeft;
    const startTime = performance.now();

    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

    const animateScroll = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);

      element.scrollLeft = startScrollLeft + (distance * easedProgress);

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  };

  // Horizontal scroll functions for events
  const scrollEventsLeft = () => {
    if (eventsScrollRef.current) {
      const currentScroll = eventsScrollRef.current.scrollLeft;
      const targetScroll = Math.max(0, currentScroll - 300);
      smoothScroll(eventsScrollRef.current, targetScroll);
    }
  };

  const scrollEventsRight = () => {
    if (eventsScrollRef.current) {
      const currentScroll = eventsScrollRef.current.scrollLeft;
      const maxScroll = eventsScrollRef.current.scrollWidth - eventsScrollRef.current.clientWidth;
      const targetScroll = Math.min(maxScroll, currentScroll + 300);
      smoothScroll(eventsScrollRef.current, targetScroll);
    }
  };

  // Horizontal scroll functions for notes
  const scrollNotesLeft = () => {
    if (notesScrollRef.current) {
      const currentScroll = notesScrollRef.current.scrollLeft;
      const targetScroll = Math.max(0, currentScroll - 300);
      smoothScroll(notesScrollRef.current, targetScroll);
    }
  };

  const scrollNotesRight = () => {
    if (notesScrollRef.current) {
      const currentScroll = notesScrollRef.current.scrollLeft;
      const maxScroll = notesScrollRef.current.scrollWidth - notesScrollRef.current.clientWidth;
      const targetScroll = Math.min(maxScroll, currentScroll + 300);
      smoothScroll(notesScrollRef.current, targetScroll);
    }
  };

  // Horizontal scroll functions for event notes
  const scrollEventNotesLeft = () => {
    if (eventNotesScrollRef.current) {
      const currentScroll = eventNotesScrollRef.current.scrollLeft;
      const targetScroll = Math.max(0, currentScroll - 300);
      smoothScroll(eventNotesScrollRef.current, targetScroll);
    }
  };

  const scrollEventNotesRight = () => {
    if (eventNotesScrollRef.current) {
      const currentScroll = eventNotesScrollRef.current.scrollLeft;
      const maxScroll = eventNotesScrollRef.current.scrollWidth - eventNotesScrollRef.current.clientWidth;
      const targetScroll = Math.min(maxScroll, currentScroll + 300);
      smoothScroll(eventNotesScrollRef.current, targetScroll);
    }
  };

  const resetEventNotesScroll = () => {
    if (eventNotesScrollRef.current) {
      smoothScroll(eventNotesScrollRef.current, 0);
    }
  };

  const updateEventNotesScrollState = () => {
    if (eventNotesScrollRef.current) {
      setEventNotesScrolledRight(eventNotesScrollRef.current.scrollLeft > 8);
    }
  };

  // Check for overflow in containers
  const checkOverflow = () => {
    if (eventsScrollRef.current) {
      const hasOverflow = eventsScrollRef.current.scrollWidth > eventsScrollRef.current.clientWidth;
      setEventsHasOverflow(hasOverflow);
    }
    if (notesScrollRef.current) {
      const hasOverflow = notesScrollRef.current.scrollWidth > notesScrollRef.current.clientWidth;
      setNotesHasOverflow(hasOverflow);
    }
    if (eventNotesScrollRef.current) {
      const hasOverflow = eventNotesScrollRef.current.scrollWidth > eventNotesScrollRef.current.clientWidth;
      setEventNotesHasOverflow(hasOverflow);
      setEventNotesScrolledRight(hasOverflow && eventNotesScrollRef.current.scrollLeft > 8);
    }
  };

  // Check overflow when component mounts and when events/notes change
  useEffect(() => {
    checkOverflow();
    // Add a small delay to ensure content is rendered
    const timer = setTimeout(checkOverflow, 100);
    return () => clearTimeout(timer);
  }, [events, notes]);

  // Add keyboard shortcut for 'c' key to open the add/action popup.
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle keys when not in an input/textarea and no modifier keys
      if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey &&
        e.target.tagName !== 'INPUT' &&
        e.target.tagName !== 'TEXTAREA' &&
        e.target.contentEditable !== 'true') {

        if (e.key === 'c') {
          e.preventDefault();
          e.stopPropagation();
          setShowAddOptionsPopup(true);
        } else if (e.key === 'q') {
          e.preventDefault();
          e.stopPropagation();
          openEditor('add', '', null, []);
        } else if (e.key === 'r') {
          e.preventDefault();
          e.stopPropagation();
          setShowRemindersOnly(true);
          setShowReviewsOverdueOnly(false);
        } else if (e.key === 'w') {
          e.preventDefault();
          e.stopPropagation();
          setShowReviewsOverdueOnly(true);
          setShowRemindersOnly(false);
        } else if (e.key === 't') {
          e.preventDefault();
          e.stopPropagation();
          setShowTimezonePopup(true);
        } else if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          e.stopPropagation();
          setShowAddOptionsPopup(true);
        } else if (e.key === 'Escape' && (showRemindersOnly || showReviewsOverdueOnly)) {
          e.preventDefault();
          e.stopPropagation();
          setShowRemindersOnly(false);
          setShowReviewsOverdueOnly(false);
        }
      }
    };

    // Only add the event listener if we're on the dashboard page
    const isDashboardPage = location.pathname === '/' || location.pathname === '/dashboard';

    if (isDashboardPage) {

      document.addEventListener('keydown', handleKeyDown);
      return () => {

        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [openEditor, showRemindersOnly, showReviewsOverdueOnly, setActivePage, location.pathname, togglePinned]);

  useEffect(() => {
    if (showReviewsOverdueOnly && eventSearchInputRef.current) {
      eventSearchInputRef.current.focus();
    }
  }, [showReviewsOverdueOnly]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (showReviewsOverdueOnly && e.key === 'w' && reviewOverdueSearchInputRef.current) {
        reviewOverdueSearchInputRef.current.focus();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showReviewsOverdueOnly]);

  const getCompactTimezones = () => {
    const timezonesToShow = selectedTimezones.length > 0 ? selectedTimezones : [
      'Australia/Sydney',
      'Asia/Kolkata',
      'America/New_York',
      'Europe/London'
    ];

    // Get base timezone from localStorage, default to AEST if not set
    const baseTimezone = localStorage.getItem('baseTimezone') || 'Australia/Sydney';

    const flagMap = {
      'Australia/Sydney': '🇦🇺',
      'Asia/Kolkata': '🇮🇳',
      'America/New_York': '🇺🇸',
      'America/Los_Angeles': '🇺🇸',
      'Europe/London': '🇬🇧',
      'Europe/Paris': '🇫🇷',
      'Asia/Tokyo': '🇯🇵',
      'Asia/Singapore': '🇸🇬',
      'Asia/Hong_Kong': '🇭🇰',
      'Asia/Shanghai': '🇨🇳',
      'Europe/Moscow': '🇷🇺',
      'Africa/Johannesburg': '🇿🇦',
      'America/Sao_Paulo': '🇧🇷',
      'Pacific/Auckland': '🇳🇿',
    };

    // Helper function to format date as YYYY-MM-DD in a given timezone
    const formatYMD = (date, tz) =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);

    // Helper function to get time difference from base timezone
    const getTimeDiffHours = (targetZone) => {
      const baseDate = new Date(new Date().toLocaleString('en-US', { timeZone: baseTimezone }));
      const targetDate = new Date(new Date().toLocaleString('en-US', { timeZone: targetZone }));
      return Math.round((baseDate - targetDate) / 3600000);
    };

    // Helper function to get time-based description
    const getTimeDescription = (hour) => {
      if (hour >= 0 && hour < 6) return 'pre-dawn';
      if (hour >= 6 && hour < 8) return 'early morning';
      if (hour >= 8 && hour < 10) return 'mid-morning';
      if (hour >= 10 && hour < 12) return 'late morning';
      if (hour >= 12 && hour < 14) return 'early afternoon';
      if (hour >= 14 && hour < 16) return 'mid-afternoon';
      if (hour >= 16 && hour < 18) return 'early evening';
      if (hour >= 18 && hour < 20) return 'evening';
      if (hour >= 20 && hour < 21) return 'late evening';
      if (hour >= 21 && hour < 24) return 'night';
      return 'night';
    };

    const timezoneData = timezonesToShow.map(timeZone => {
      const label = timeZone.split('/').pop().replace('_', ' ');
      const flag = flagMap[timeZone] || '';
      const time = formatTimezoneTime(timeZone);

      // Determine if this zone's date is before/after base timezone date
      const zoneYMD = formatYMD(new Date(), timeZone);
      const baseYMD = formatYMD(new Date(), baseTimezone);
      const isPreviousDay = zoneYMD < baseYMD;
      const isNextDay = zoneYMD > baseYMD;

      // Calculate relative day text
      let relativeDayText = 'today';
      if (isPreviousDay) {
        relativeDayText = 'yesterday';
      } else if (isNextDay) {
        relativeDayText = 'tomorrow';
      }

      // Get hour in the timezone for time description
      const timeInZone = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        hour: 'numeric',
      }).format(new Date());
      const hourNum = parseInt(timeInZone, 10);

      // Get time-based description and combine with day
      const timeDescription = getTimeDescription(hourNum);
      const enhancedRelativeDayText = `${relativeDayText} ${timeDescription}`;

      // Calculate time difference from base timezone
      const timeDiffHours = getTimeDiffHours(timeZone);

      return { label, flag, time, timeZone, timeDiffHours, relativeDayText: enhancedRelativeDayText };
    });

    // Sort by absolute distance from base timezone (nearest to farthest)
    return timezoneData.sort((a, b) => Math.abs(a.timeDiffHours) - Math.abs(b.timeDiffHours));
  };

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await loadAllNotes();
        if (response && response.notes) {
          setNotes(response.notes);

          // Extract events from notes
          const eventNotes = response.notes.filter(note => note && note.content && note.content.includes('meta::event::'));
          setEvents(eventNotes);
        }
      } catch (error) {
        console.error('Error loading notes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [setNotes]);

  useEffect(() => {
    if (!showCalendarPopup) return;

    updateCalendarPopupPosition();

    if (calendarPopupRef.current) {
      calendarPopupRef.current.scrollTop = 0;
    }

    const handleViewportChange = () => updateCalendarPopupPosition();

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [showCalendarPopup, isVisible]);

  if (loading) {
    return (
      <div className="p-4 w-full">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // Handler functions for add options
  const getWatchMetaTags = () => {
    const formattedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    return [`meta::watch::${formattedDate}`];
  };

  const handleAddNote = () => {
    openEditor('add', '', null, []);
  };

  const handleAddWatch = () => {
    openEditor('add', '', null, getWatchMetaTags());
  };

  const handleAddSuperCriticalReview = () => {
    openEditor('add', '', null, [...getWatchMetaTags(), SUPER_CRITICAL_REVIEW_META]);
  };

  const handleQuickAddSuperCriticalReview = async () => {
    const title = quickSuperCriticalTitle.trim();
    if (!title) return;

    const content = [
      title,
      ...getWatchMetaTags(),
      getDummyCadenceLine(),
      SUPER_CRITICAL_REVIEW_META,
    ].join('\n');

    try {
      const newNote = await createNote(content);
      setNotes(prev => [newNote, ...prev]);
      setQuickSuperCriticalTitle('');
      setShowQuickSuperCriticalAdd(false);
    } catch (error) {
      console.error('Error creating super critical review note:', error);
    }
  };

  const handleAddTimerReview = (cadenceType, cadenceValue, once = false) => {
    const timerTags = withTimerMeta('', cadenceType, cadenceValue, { once })
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
    openEditor('add', '', null, [...getWatchMetaTags(), ...timerTags]);
  };

  const handleAddEvent = () => {
    // Open EditEventModal for adding new event
    setEditingEvent(null);
    setIsAddingDeadline(false);
    setIsAddingHoliday(false);
    setIsAddingTemporaryEvent(false);
    setShowEditEventModal(true);
  };

  const handleAddTemporaryEvent = () => {
    setEditingEvent(null);
    setIsAddingDeadline(false);
    setIsAddingHoliday(false);
    setIsAddingTemporaryEvent(true);
    setShowEditEventModal(true);
  };

  const formatEventDateContent = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `event_description:\nevent_date:${year}-${month}-${day}T12:00`;
  };

  const handleAddCalendarEventForDate = (date) => {
    setEditingEvent({ content: formatEventDateContent(date) });
    setIsAddingDeadline(false);
    setIsAddingHoliday(false);
    setIsAddingTemporaryEvent(false);
    setShowEditEventModal(true);
  };

  const handleAddDeadline = () => {
    // Open EditEventModal for adding new deadline
    setEditingEvent(null);
    setIsAddingDeadline(true);
    setIsAddingHoliday(false);
    setIsAddingTemporaryEvent(false);
    setShowEditEventModal(true);
  };

  const handleAddHoliday = () => {
    // Open EditEventModal for adding new holiday
    setEditingEvent(null);
    setIsAddingDeadline(false);
    setIsAddingHoliday(true);
    setIsAddingTemporaryEvent(false);
    setShowEditEventModal(true);
  };

  const updateCalendarPopupPosition = () => {
    if (!dateTriggerRef.current) return;

    const triggerRect = dateTriggerRef.current.getBoundingClientRect();
    const viewportPadding = 16;
    const leftPanelWidth = isVisible ? 320 : 0;
    const availableWidth = Math.max(360, window.innerWidth - leftPanelWidth - (viewportPadding * 2));
    const popupWidth = Math.min(1100, availableWidth);
    const minLeft = leftPanelWidth + viewportPadding;
    const maxLeft = Math.max(minLeft, window.innerWidth - popupWidth - viewportPadding);
    const idealLeft = triggerRect.left + (triggerRect.width / 2) - (popupWidth / 2);

    setCalendarPopupStyle({
      top: triggerRect.bottom + 8,
      left: Math.min(Math.max(idealLeft, minLeft), maxLeft),
      width: popupWidth,
    });
  };

  const beginCalendarHover = () => {
    if (calendarHoverTimeoutRef.current) {
      clearTimeout(calendarHoverTimeoutRef.current);
    }
    calendarHoverTimeoutRef.current = setTimeout(() => {
      updateCalendarPopupPosition();
      setShowCalendarPopup(true);
    }, 250);
  };

  const endCalendarHover = () => {
    if (calendarHoverTimeoutRef.current) {
      clearTimeout(calendarHoverTimeoutRef.current);
      calendarHoverTimeoutRef.current = null;
    }
    setShowCalendarPopup(false);
  };

  // Get base timezone for display
  const baseTimezone = localStorage.getItem('baseTimezone') || 'Australia/Sydney';
  const baseTimezoneLabel = baseTimezone.split('/').pop().replace('_', ' ');
  const baseTimezoneFlag = {
    'Australia/Sydney': '🇦🇺',
    'Asia/Kolkata': '🇮🇳',
    'America/New_York': '🇺🇸',
    'America/Los_Angeles': '🇺🇸',
    'Europe/London': '🇬🇧',
    'Europe/Paris': '🇫🇷',
    'Asia/Tokyo': '🇯🇵',
    'Asia/Singapore': '🇸🇬',
    'Asia/Hong_Kong': '🇭🇰',
    'Asia/Shanghai': '🇨🇳',
    'Europe/Moscow': '🇷🇺',
    'Africa/Johannesburg': '🇿🇦',
    'America/Sao_Paulo': '🇧🇷',
    'Pacific/Auckland': '🇳🇿',
  }[baseTimezone] || '🌐';

  return (
    <div className="w-full pl-14 pr-0 pb-8">
      {/* Show only reminders when showRemindersOnly is true */}
      {showRemindersOnly ? (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Reminders Only</h2>
            <div className="text-sm text-gray-500">Press Escape to return to normal view • Use ↑↓ arrows to navigate, Enter/L to open link, M to dismiss • Vim: gg/G for first/last, number+j/k to jump (e.g. 4j, 3k)</div>
          </div>
          <RemindersAlert
            allNotes={notes}
            expanded={true}
            setNotes={setNotes}
            isRemindersOnlyMode={true}
          />
        </div>
      ) : showReviewsOverdueOnly ? (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Reviews Overdue Only</h2>
            <div className="text-sm text-gray-500">Press Escape to return to normal view • Use ↑↓ arrows to navigate, Enter to unfollow</div>
          </div>
          <ReviewOverdueAlert
            notes={notes}
            expanded={true}
            setNotes={setNotes}
            isReviewsOverdueOnlyMode={true}
            searchInputRef={reviewOverdueSearchInputRef}
          />
        </div>
      ) : (
        <div className="flex gap-6 items-start">
          {/* ── Main content column ── */}
          <div className="flex-1 min-w-0">
          {/* Review Strip */}
          {reviewStripCount > 0 && (
            <div className="mb-4 mt-3 space-y-3">
              {superCriticalReviews.length > 0 && (
                <div className="super-critical-reviews-panel rounded-xl border p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div className="super-critical-reviews-title text-xs font-bold uppercase tracking-wide">
                    Super critical ({superCriticalReviews.length})
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickSuperCriticalAdd(prev => !prev);
                      if (showQuickSuperCriticalAdd) {
                        setQuickSuperCriticalTitle('');
                      }
                    }}
                    className="super-critical-reviews-add inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors"
                  >
                    <PlusIcon className="h-3 w-3" />
                    Add
                  </button>
                </div>
                {showQuickSuperCriticalAdd && (
                  <div className="super-critical-reviews-quick-add mb-3 rounded-lg border p-2">
                    <div className="flex items-center gap-2">
                      <input
                        ref={quickSuperCriticalInputRef}
                        value={quickSuperCriticalTitle}
                        onChange={(e) => setQuickSuperCriticalTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleQuickAddSuperCriticalReview();
                          if (e.key === 'Escape') {
                            setShowQuickSuperCriticalAdd(false);
                            setQuickSuperCriticalTitle('');
                          }
                        }}
                        placeholder="Super critical review title"
                        className="super-critical-reviews-input flex-1 rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                      />
                      <button
                        type="button"
                        onClick={handleQuickAddSuperCriticalReview}
                        className="super-critical-reviews-primary rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowQuickSuperCriticalAdd(false);
                          setQuickSuperCriticalTitle('');
                        }}
                        className="super-critical-reviews-cancel px-2 py-1 text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="super-critical-reviews-hint mt-2 text-[11px]">
                      Creates a watched super-critical review with the default minimum review cadence.
                    </div>
                  </div>
                )}
                  <div className="flex flex-wrap gap-2">
                    {superCriticalReviews.map(note => renderReviewChip(note, { isSuperCritical: true }))}
                  </div>
                </div>
              )}
              {timedWatchlistReviews.length > 0 && (
                <div className="super-critical-reviews-panel rounded-xl border p-3 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="super-critical-reviews-title text-xs font-bold uppercase tracking-wide">
                      Timed ({timedWatchlistReviews.length})
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddOptionsPopup(true)}
                      className="super-critical-reviews-add inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors"
                    >
                      <PlusIcon className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                    <div className="flex flex-wrap gap-2">
                      {timedWatchlistReviews.map(note => renderReviewChip(note, { isTimed: true }))}
                    </div>
                </div>
              )}
              {regularWatchlistReviews.length > 0 && (
                <div className="super-critical-reviews-panel rounded-xl border p-3 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="super-critical-reviews-title text-xs font-bold uppercase tracking-wide">
                      Watchlist ({regularWatchlistReviews.length})
                    </div>
                    <button
                      type="button"
                      onClick={handleAddWatch}
                      className="super-critical-reviews-add inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors"
                    >
                      <PlusIcon className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                    <div className="flex flex-wrap gap-2">
                      {regularWatchlistReviews.map(note => renderReviewChip(note))}
                    </div>
                </div>
              )}
              {reminderReviews.length > 0 && (
                <div className="super-critical-reviews-panel rounded-xl border p-3 shadow-sm">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="super-critical-reviews-title text-xs font-bold uppercase tracking-wide">
                        Reminders ({reminderReviews.length})
                      </div>
                      <button
                        type="button"
                        onClick={handleAcknowledgeAllReminderReviews}
                        className="super-critical-reviews-add rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors"
                      >
                        Acknowledge all
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {reminderReviews.map(note => renderReviewChip(note, { canAcknowledge: true }))}
                    </div>
                </div>
              )}
            </div>
          )}

          {/* Backup Alert */}
          <div className="mb-4">
            <BackupAlert notes={notes} />
          </div>

          {/* First Row: Date and Timezone Display (Full Width) */}
          <div className={`mb-4 ${isPinned ? 'pt-8' : ''}`}>
            <div className="flex flex-col items-center">
              {/* First Row: Date and Current Time */}
              <div className="flex items-center gap-6 mb-4">
                <div
                  ref={dateTriggerRef}
                  className="relative"
                  onMouseEnter={beginCalendarHover}
                  onMouseLeave={endCalendarHover}
                >
                  <h1 className="text-3xl font-bold cursor-pointer">{formattedDate}</h1>

                  {/* Calendar dropdown popup - appears on hover after a short delay */}
                  <div
                    ref={calendarPopupRef}
                    style={calendarPopupStyle}
                    className={`fixed z-[70] max-h-[80vh] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl transition-all duration-200 ${
                      showCalendarPopup ? 'visible opacity-100' : 'invisible opacity-0'
                    }`}
                  >
                    <CustomCalendar allNotes={notes} onAddEventForDate={handleAddCalendarEventForDate} />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-base font-medium">{formattedTime}</div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <span>{baseTimezoneFlag}</span>
                    <span>{baseTimezoneLabel}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAnalogClock(value => {
                        const next = !value;
                        localStorage.setItem('dashboardShowAnalogClock', String(next));
                        return next;
                      });
                    }}
                    className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
                      showAnalogClock ? 'bg-blue-50 text-blue-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                    }`}
                    title={showAnalogClock ? 'Hide analog clocks' : 'Show analog clocks'}
                  >
                    Clock
                  </button>
                  {showAnalogClock && (
                    <select
                      value={clockFace}
                      onChange={(event) => {
                        setClockFace(event.target.value);
                        localStorage.setItem('dashboardClockFace', event.target.value);
                      }}
                      className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      title="Clock face"
                    >
                      <option value="classic">Classic</option>
                      <option value="minimal">Minimal</option>
                      <option value="numbers">Numbers</option>
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowTimeBuddy(value => {
                        const next = !value;
                        localStorage.setItem('dashboardShowTimeBuddy', String(next));
                        return next;
                      });
                    }}
                    className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
                      showTimeBuddy ? 'bg-blue-50 text-blue-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                    }`}
                    title={showTimeBuddy ? 'Hide Time Buddy' : 'Show Time Buddy'}
                  >
                    Time Buddy
                  </button>
                </div>
              </div>

              {/* Timezone Cards Display */}
              {showTimezones && (
                <div className="mb-6 w-full">
                  <TimeZoneDisplay
                    selectedTimezones={selectedTimezones}
                    showAnalogClock={showAnalogClock}
                    showTimeBuddy={showTimeBuddy}
                    clockFace={clockFace}
                  />
                </div>
              )}

              {/* Stock Information, Exchange Rates, Fuel Prices, and Weather - Button Row */}
              {showTimezones && (() => {
                let stockPrice = null;
                let stockSymbol = '';
                let stockShares = parseInt(localStorage.getItem('stockShares') || '100', 10);
                try {
                  const c = localStorage.getItem('stockPriceData');
                  if (c) { const d = JSON.parse(c); stockPrice = d.price; stockSymbol = d.symbol || ''; }
                } catch (e) { }
                const stockPriceHistory = loadDashboardStockPriceHistory();
                const stockPriceChange = getDashboardStockPriceChange(stockPriceHistory);

                const getMarketInfo = () => {
                  const now = new Date();
                  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
                  const day = etTime.getDay();
                  const hour = etTime.getHours();
                  const minute = etTime.getMinutes();
                  const currentMin = hour * 60 + minute;
                  const openMin = 9 * 60;
                  const closeMin = 16 * 60;
                  if (day === 0 || day === 6) {
                    const daysUntil = day === 0 ? 1 : 2;
                    const minsUntil = daysUntil * 24 * 60 - currentMin + openMin;
                    const h = Math.floor(minsUntil / 60);
                    const m = minsUntil % 60;
                    return { open: false, label: 'Closed', countdown: `Opens in ${daysUntil}d ${h % 24}h ${m}m` };
                  }
                  if (currentMin >= openMin && currentMin < closeMin) {
                    return { open: true, label: 'Open' };
                  }
                  let minsUntil = currentMin < openMin ? openMin - currentMin : (24 * 60 - currentMin) + openMin;
                  if (currentMin >= closeMin && day === 5) {
                    minsUntil += 2 * 24 * 60;
                  }
                  const h = Math.floor(minsUntil / 60);
                  const m = minsUntil % 60;
                  return { open: false, label: 'Closed', countdown: `Opens in ${h}h ${m}m` };
                };
                const marketInfo = getMarketInfo();

                void dashboardDataRefreshTick;

                let usdToInr = null, audToInr = null;
                try {
                  const c = localStorage.getItem('exchangeRatesData');
                  if (c) ({ usdToInr, audToInr } = JSON.parse(c));
                } catch (e) { }
                const inrToAud = audToInr ? 1 / audToInr : null;

                let weather = null;
                try {
                  const c = localStorage.getItem('weatherData');
                  if (c) weather = JSON.parse(c);
                } catch (e) { }

                const weatherCondition = weather
                  ? ((weather.rain > 0 || weather.precipitation > 0) ? 'Rainy' : (weather.todayRainSum > 0 || weather.todayPrecipSum > 0) ? 'Showers' : weather.temperature > 25 ? 'Sunny' : 'Cloudy')
                  : null;
                const tomorrowCondition = weather
                  ? ((weather.tomorrowRainSum > 0 || weather.tomorrowPrecipSum > 0) ? 'Showers' : weather.tomorrowMax > 25 ? 'Sunny' : 'Cloudy')
                  : null;
                const isRainyWeather = weatherCondition === 'Rainy' || weatherCondition === 'Showers';
                const formatFuelPrice = (price) => {
                  if (price == null || price === '') return '—';
                  if (typeof price === 'string' || typeof price === 'number') return price;
                  if (typeof price === 'object') return price.cheapest || price.current || price.price || price.average || '—';
                  return '—';
                };
                const fuelPriceToNumber = (price) => {
                  const formatted = formatFuelPrice(price);
                  if (formatted === '—') return null;
                  const match = String(formatted).match(/\d+(?:\.\d+)?/);
                  return match ? Number(match[0]) : null;
                };
                const getFuelSnapshotAverage = (snapshot) => {
                  if (!snapshot) return null;
                  const values = [
                    fuelPriceToNumber(snapshot.unleaded),
                    fuelPriceToNumber(snapshot.diesel),
                  ].filter(value => Number.isFinite(value));
                  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
                };
                const latestFuelAverage = getFuelSnapshotAverage(costcoFuelHistory?.[0] || costcoFuelPrices);
                const previousFuelAverage = getFuelSnapshotAverage(costcoFuelHistory?.[1]);
                const fuelTrend = latestFuelAverage != null && previousFuelAverage != null
                  ? {
                      direction: latestFuelAverage === previousFuelAverage ? 'same' : latestFuelAverage < previousFuelAverage ? 'down' : 'up',
                      amount: Math.abs(latestFuelAverage - previousFuelAverage),
                    }
                  : null;
                const fuelUpdatedText = costcoFuelPrices?.updatedAt
                  || (costcoFuelPrices?.fetchedAt ? new Date(costcoFuelPrices.fetchedAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' }) : '');
                const formatFuelSnapshotTime = (snapshot) => {
                  if (!snapshot?.fetchedAt) return snapshot?.cacheDateKey || 'Cached';
                  try {
                    return new Date(snapshot.fetchedAt).toLocaleString('en-AU', {
                      day: 'numeric',
                      month: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                    });
                  } catch {
                    return snapshot.cacheDateKey || 'Cached';
                  }
                };

                return (
                  <div className="mb-6 w-full">
                    <div className="bg-gray-100 p-2 sm:p-3 rounded-lg">
                      <div className="flex gap-1.5 sm:gap-2 items-stretch">
                        {/* Stock Information */}
                        <div
                          className="relative group flex-1 flex"
                          onMouseEnter={() => setActivePopup('stock')}
                          onMouseLeave={() => { if (activePopup === 'stock') setActivePopup(null); }}
                        >
                          <div className="w-full px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex items-start cursor-pointer">
                            <div className="text-left min-w-0 flex-1">
                              <div className="text-[10px] uppercase tracking-wide font-medium text-gray-500">
                                {stockSymbol ? <span className="font-bold text-gray-800">{stockSymbol}</span> : 'Stock'} <span className={`${marketInfo.open ? 'text-green-600' : 'text-red-500'}`}>({marketInfo.label}{!marketInfo.open && marketInfo.countdown ? ` - ${marketInfo.countdown}` : ''})</span>
                              </div>
                              <div className="flex items-center gap-2 text-base font-semibold text-gray-900 leading-tight">
                                <span className="truncate">{stockPrice != null ? `$${stockPrice.toFixed(2)}` : '—'}</span>
                                {stockPriceChange && (
                                  <span
                                    className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-lg font-black shadow-sm ring-1 ${
                                      stockPriceChange.direction === 'same'
                                        ? 'bg-gray-100 text-gray-600 ring-gray-200'
                                        : stockPriceChange.direction === 'up'
                                          ? 'bg-green-100 text-green-700 ring-green-200'
                                          : 'bg-red-100 text-red-700 ring-red-200'
                                    }`}
                                    title={stockPriceChange.direction === 'same'
                                      ? 'No change from previous call'
                                      : `${stockPriceChange.direction === 'up' ? 'Up' : 'Down'} $${stockPriceChange.amount.toFixed(2)}${stockPriceChange.percent !== null ? ` (${stockPriceChange.percent.toFixed(2)}%)` : ''} from previous call`}
                                  >
                                    {stockPriceChange.direction === 'same' ? '○' : stockPriceChange.direction === 'up' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                              {stockPrice != null && (() => {
                                const totalUsd = stockShares * stockPrice;
                                let audStr = '';
                                if (usdToInr && audToInr) {
                                  const usdToAud = audToInr / usdToInr;
                                  const totalAud = totalUsd / usdToAud;
                                  audStr = ` (A$${totalAud.toLocaleString('en-AU', { maximumFractionDigits: 0 })})`;
                                }
                                return (
                                  <div className="text-[10px] text-gray-500">
                                    Assets: <span className="font-medium text-gray-700">${totalUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}{audStr}</span>
                                  </div>
                                );
                              })()}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); document.dispatchEvent(new CustomEvent('refreshStockPrice')); }}
                              className="p-1 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
                              title="Refresh stock price"
                            >
                              <ArrowPathIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className={`absolute left-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 transition-all duration-200 ${activePopup === 'stock' ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                            <StockPrice forceExpanded={true} />
                          </div>
                        </div>

                        {/* Exchange Rates */}
                        <div
                          className="relative group flex-1 flex"
                          onMouseEnter={() => setActivePopup('exchange')}
                          onMouseLeave={() => { if (activePopup === 'exchange') setActivePopup(null); }}
                        >
                          <div className="w-full px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex items-start">
                            <div className="text-left min-w-0 flex-1">
                              <div className="text-[10px] uppercase tracking-wide font-medium text-gray-500">Exchange Rates</div>
                              <div className="text-sm font-semibold text-gray-900 leading-snug">
                                1 USD = <span className="text-green-700">₹{usdToInr != null ? usdToInr.toFixed(2) : '—'}</span> INR
                              </div>
                              <div className="text-sm font-semibold text-gray-900 leading-snug">
                                1 AUD = <span className="text-green-700">₹{audToInr != null ? audToInr.toFixed(2) : '—'}</span> INR
                              </div>
                              <div className="text-sm font-semibold text-gray-900 leading-snug">
                                1 INR = <span className="text-green-700">A${inrToAud != null ? inrToAud.toFixed(4) : '—'}</span> AUD
                              </div>
                            </div>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => { e.stopPropagation(); document.dispatchEvent(new CustomEvent('refreshExchangeRates')); }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  document.dispatchEvent(new CustomEvent('refreshExchangeRates'));
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
                              title="Refresh exchange rates"
                            >
                              <ArrowPathIcon className="h-3.5 w-3.5" />
                            </span>
                          </div>
                          <div className={`absolute left-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 transition-all duration-200 ${activePopup === 'exchange' ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                            <ExchangeRates forceExpanded={true} />
                          </div>
                        </div>

                        {/* Costco Fuel Prices */}
                        <div
                          className="relative group flex-1 flex"
                          onMouseEnter={() => setActivePopup('fuel')}
                          onMouseLeave={() => { if (activePopup === 'fuel') setActivePopup(null); }}
                        >
                          <div className="w-full px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex items-start">
                            <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-3 text-left">
                              <div className="min-w-0">
                                <div className="text-[10px] uppercase tracking-wide font-medium text-gray-500">
                                  {costcoFuelPrices?.station || 'Costco Epping Fuel'}
                                  {costcoFuelLoading && <span className="ml-1 text-blue-500">loading</span>}
                                </div>
                                <div className="mt-2 text-sm font-semibold text-gray-900 leading-snug">
                                  ULP <span className="text-green-700">{formatFuelPrice(costcoFuelPrices?.unleaded)}</span>
                                </div>
                                <div className="text-sm font-semibold text-gray-900 leading-snug">
                                  Diesel <span className="text-green-700">{formatFuelPrice(costcoFuelPrices?.diesel)}</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-center pr-1">
                                {fuelTrend && (
                                  <div
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xl font-black shadow-sm ring-1 ${
                                      fuelTrend.direction === 'same'
                                        ? 'bg-gray-100 text-gray-600 ring-gray-200'
                                        : fuelTrend.direction === 'down'
                                          ? 'bg-green-100 text-green-700 ring-green-200'
                                          : 'bg-red-100 text-red-700 ring-red-200'
                                    }`}
                                    title={fuelTrend.direction === 'same'
                                      ? 'No fuel price change from previous fetch'
                                      : `${fuelTrend.direction === 'down' ? 'Down' : 'Up'} ${fuelTrend.amount.toFixed(1)}c/L average from previous fetch`}
                                  >
                                    {fuelTrend.direction === 'same' ? '○' : fuelTrend.direction === 'down' ? '↓' : '↑'}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => { e.stopPropagation(); document.dispatchEvent(new CustomEvent('refreshCostcoFuelPrices')); }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  document.dispatchEvent(new CustomEvent('refreshCostcoFuelPrices'));
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
                              title="Refresh Costco fuel prices"
                            >
                              <ArrowPathIcon className="h-3.5 w-3.5" />
                            </span>
                          </div>
                          <div className={`absolute left-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 transition-all duration-200 ${activePopup === 'fuel' ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                            <div className="text-xs font-bold uppercase tracking-wide text-gray-500">{costcoFuelPrices?.station || 'Costco Epping'}</div>
                            <div className="mt-2 space-y-1 text-sm text-gray-700">
                              <div className="flex justify-between gap-3"><span>ULP</span><span className="font-semibold text-green-700">{formatFuelPrice(costcoFuelPrices?.unleaded)}</span></div>
                              <div className="flex justify-between gap-3"><span>Diesel</span><span className="font-semibold text-green-700">{formatFuelPrice(costcoFuelPrices?.diesel)}</span></div>
                            </div>
                            {fuelTrend && (
                              <div className={`mt-2 text-xs font-semibold ${
                                fuelTrend.direction === 'same'
                                  ? 'text-gray-500'
                                  : fuelTrend.direction === 'down'
                                    ? 'text-green-600'
                                    : 'text-red-600'
                              }`}>
                                {fuelTrend.direction === 'same'
                                  ? '○ Prices unchanged since last fetch'
                                  : `${fuelTrend.direction === 'down' ? '↓ Prices fell' : '↑ Prices rose'} ${fuelTrend.amount.toFixed(1)}c/L avg since last fetch`}
                              </div>
                            )}
                            <div className="mt-3 border-t border-gray-100 pt-2 text-[11px] text-gray-500">
                              {fuelUpdatedText && <div>Updated: {fuelUpdatedText}</div>}
                              <div className="flex items-center justify-between gap-2">
                                <span>Stored snapshots: {Array.isArray(costcoFuelHistory) ? Math.min(costcoFuelHistory.length, 20) : 0}/20</span>
                                <button
                                  type="button"
                                  onClick={() => setShowCostcoFuelCache(value => !value)}
                                  className="rounded border border-gray-200 bg-white px-2 py-0.5 font-semibold text-gray-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                >
                                  {showCostcoFuelCache ? 'Hide cache' : 'Show cache'}
                                </button>
                              </div>
                              {showCostcoFuelCache && (
                                <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-gray-100 bg-gray-50">
                                  {Array.isArray(costcoFuelHistory) && costcoFuelHistory.length > 0 ? (
                                    costcoFuelHistory.slice(0, 20).map((snapshot, index) => (
                                      <div
                                        key={`${snapshot?.fetchedAt || snapshot?.cacheDateKey || 'fuel'}-${index}`}
                                        className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-gray-100 px-2 py-1.5 last:border-b-0"
                                      >
                                        <span className="truncate font-medium text-gray-500">{formatFuelSnapshotTime(snapshot)}</span>
                                        <span className="font-semibold text-green-700">ULP {formatFuelPrice(snapshot?.unleaded)}</span>
                                        <span className="font-semibold text-green-700">D {formatFuelPrice(snapshot?.diesel)}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="px-2 py-2 text-gray-400">No cached values yet.</div>
                                  )}
                                </div>
                              )}
                              <a
                                href={costcoFuelPrices?.sourceUrl || 'https://petrolmate.com.au/station/epping-26337'}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                Source: Petrolmate / official fuel reporting
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Weather */}
                        <div
                          className="relative group flex-1 flex"
                          onMouseEnter={() => setActivePopup('weather')}
                          onMouseLeave={() => { if (activePopup === 'weather') setActivePopup(null); }}
                        >
                          <div className={`relative w-full px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex items-start overflow-hidden ${isRainyWeather ? 'weather-rainy-card' : ''}`}>
                            {isRainyWeather && (
                              <div className="weather-rainy-animation" aria-hidden="true">
                                <span />
                                <span />
                                <span />
                                <span />
                                <span />
                                <span />
                              </div>
                            )}
                            <div className="relative z-10 text-left min-w-0 flex-1">
                              <div className="text-[10px] uppercase tracking-wide font-medium text-gray-500">Weather</div>
                              {weather ? (
                                <>
                                  <div className="text-sm font-semibold text-gray-900 leading-snug">
                                    Today's weather: {weather.temperature?.toFixed(1)}° feels {weather.apparentTemperature?.toFixed(1)}°{weatherCondition ? `, ${weatherCondition}` : ''}
                                  </div>
                                  <div className="text-[11px] text-gray-500 leading-snug">
                                    Tomorrow: ↑{weather.tomorrowMax?.toFixed(0) ?? '—'}° ↓{weather.tomorrowMin?.toFixed(0) ?? '—'}°{tomorrowCondition ? `, ${tomorrowCondition}` : ''}
                                  </div>
                                </>
                              ) : (
                                <div className="text-sm font-semibold text-gray-900 leading-tight">—</div>
                              )}
                            </div>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => { e.stopPropagation(); document.dispatchEvent(new CustomEvent('refreshWeather')); }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  document.dispatchEvent(new CustomEvent('refreshWeather'));
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
                              title="Refresh weather"
                            >
                              <ArrowPathIcon className="h-3.5 w-3.5" />
                            </span>
                          </div>
                          <div className={`absolute right-0 top-full mt-2 w-[1100px] bg-transparent z-50 transition-all duration-200 ${activePopup === 'weather' ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                            <Weather forceExpanded={true} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>

          {/* Events Section */}
          <div className="mb-1 mt-2 border-b border-gray-200 pb-1">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Events</h2>
          </div>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <div className="flex flex-wrap gap-1 items-center">
                  {/* Filter chips */}
                  {[
                    { f: 'all',      label: 'All',      active: 'bg-blue-500 text-white' },
                    { f: 'deadline', label: 'Deadline',  active: 'bg-red-500 text-white' },
                    { f: 'holiday',  label: 'Holiday',   active: 'bg-blue-500 text-white' },
                    { f: 'others',   label: 'Others',    active: 'bg-gray-600 text-white' },
                  ].map(({ f, label, active }) => {
                    const isActive = activeFilters.includes(f);
                    return (
                      <button
                        key={f}
                        onClick={() => {
                          if (f === 'all') {
                            setActiveFilters(['all']);
                          } else {
                            setActiveFilters(prev => {
                              const without = prev.filter(x => x !== 'all' && x !== f);
                              return prev.includes(f) ? (without.length ? without : ['all']) : [...without, f];
                            });
                          }
                        }}
                        className={`px-2 py-1 text-xs rounded transition-colors ${isActive ? active : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Tags Filter Section */}
                <div className="flex flex-wrap gap-1 items-center border-l border-gray-300 pl-4">
                  {[
                    { f: 'birthday', label: '🎂 Birthday', active: 'bg-blue-500 text-white' },
                    { f: 'wedding',  label: '💍 Wedding',  active: 'bg-blue-500 text-white' },
                    { f: 'death',    label: '🕊️ Death',    active: 'bg-gray-600 text-white' },
                  ].map(({ f, label, active }) => {
                    const isActive = activeFilters.includes(f);
                    return (
                      <button
                        key={f}
                        onClick={() => {
                          setActiveFilters(prev => {
                            const without = prev.filter(x => x !== 'all' && x !== f);
                            return prev.includes(f) ? (without.length ? without : ['all']) : [...without, f];
                          });
                        }}
                        className={`px-2 py-1 text-xs rounded transition-colors ${isActive ? active : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                      >
                        {label}
                      </button>
                    );
                  })}

	                  {/* Set as Default button */}
	                  <button
	                    onClick={async () => {
	                      localStorage.setItem('defaultEventFilters', JSON.stringify(activeFilters));
	                      try {
	                        await saveNoteBackedSetting(DASHBOARD_EVENT_FILTERS_SETTING_KEY, activeFilters, { setNotes });
	                      } catch (error) {
	                        console.warn('Failed to save note-backed dashboard filter settings:', error);
	                      }
	                    }}
	                    className="px-2 py-1 text-xs text-blue-600 border border-blue-200 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
	                    title="Save current selection as a note-backed default"
	                  >
	                    Set Default
	                  </button>

                  {/* Text Filter Input with Clear Button */}
                  <div className="relative">
                    <input
                      ref={eventSearchInputRef}
                      type="text"
                      placeholder="Filter events..."
                      value={eventTextFilter}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setEventTextFilter(newValue);
                        if (newValue.trim() !== '' && !activeFilters.includes('all')) {
                          setActiveFilters(['all']);
                        }
                      }}
                      className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 pr-6"
                      style={{ width: '120px' }}
                    />
                    {eventTextFilter && (
                      <button
                        onClick={() => setEventTextFilter('')}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Clear filter"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Reset Button */}
                  <button
                    onClick={() => { setActiveFilters(['deadline']); setEventTextFilter(''); }}
                    className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    title="Reset filters"
                  >
                    <ArrowPathIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                {eventNotesScrolledRight && (
                  <button
                    onClick={resetEventNotesScroll}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
                    title="Reset event scroll"
                    aria-label="Reset event scroll"
                  >
                    <ArrowPathIcon className="h-3 w-3" />
                    Reset
                  </button>
                )}
                <button
                  onClick={() => {
                    // This will trigger the add event functionality
                    // We need to pass this through to EventManager
                    const event = new CustomEvent('addEvent');
                    document.dispatchEvent(event);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600 transition-colors hover:bg-blue-100"
                >
                  <PlusIcon className="h-3 w-3" />
                  Add Note
                </button>
                <button
                  onClick={() => {
                    handleAddTemporaryEvent();
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <PlusIcon className="h-3 w-3" />
                  Add Temporary
                </button>
                <button
                  onClick={() => {
                    setEditingEvent(null); // Set to null for new event
                    setIsAddingTemporaryEvent(false);
                    setShowEditEventModal(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600 transition-colors hover:bg-blue-100"
                >
                  <PlusIcon className="h-3 w-3" />
                  Add Event
                </button>
              </div>
            </div>
            {/* Event Notes Row */}
            <div className="relative group/events mb-2 overflow-visible">
              {/* Left Arrow - outside frame on hover */}
              {eventNotesHasOverflow && (
                <button
                  onClick={scrollEventNotesLeft}
                  className="absolute -left-10 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-md transition-all opacity-0 group-hover/events:opacity-100"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
              )}

              {/* Event Notes Container */}
              <div
                ref={eventNotesScrollRef}
                className="overflow-x-auto"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
                onScroll={updateEventNotesScrollState}
              >
                <div className="inline-flex gap-4 pb-1" style={{ minWidth: 'max-content' }}>
                  <EventManager
                    type="eventNotes"
                    notes={notes}
                    setActivePage={setActivePage}
                    setNotes={setNotes}
                    eventFilter={activeFilters}
                    eventTextFilter={eventTextFilter}
                    onEditEvent={(note) => {
                      setEditingEvent(note);
                      setIsAddingTemporaryEvent(false);
                      setShowEditEventModal(true);
                    }}
                    onDeleteNote={async (noteId) => {
                      console.log('[Dashboard EventManager] onDeleteNote called with:', noteId);
                      try {
                        await deleteNoteById(noteId);
                        console.log('[Dashboard EventManager] Backend delete successful');
                        setNotes(prevNotes => {
                          const updated = prevNotes.filter(n => n.id !== noteId);
                          console.log('[Dashboard EventManager] State updated, remaining notes:', updated.length);
                          return updated;
                        });
                      } catch (error) {
                        console.error('[Dashboard EventManager] Error:', error);
                        alert('Failed to delete: ' + error.message);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Right Arrow - overlay on hover */}
              {eventNotesHasOverflow && (
                <button
                  onClick={scrollEventNotesRight}
                  className="absolute -right-10 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-md transition-all opacity-0 group-hover/events:opacity-100"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              )}
            </div>


            {/* Upcoming Alerts Row */}

            {/* Notes Row */}
            <div className="relative group/notes mb-2 overflow-visible">
              {/* Left Arrow - outside frame on hover */}
              {notesHasOverflow && (
                <button
                  onClick={scrollNotesLeft}
                  className="absolute -left-10 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-md transition-all opacity-0 group-hover/notes:opacity-100"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
              )}

              {/* Notes Container */}
              <div
                ref={notesScrollRef}
                className="overflow-x-auto"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                <div className="inline-flex gap-4 pb-1" style={{ minWidth: 'max-content' }}>
                  <EventManager
                    type="notes"
                    notes={notes}
                    setActivePage={setActivePage}
                    onDeleteNote={async (noteId) => {
                      try {
                        await deleteNoteById(noteId);
                        setNotes(prevNotes => prevNotes.filter(n => n.id !== noteId));
                      } catch (error) {
                        console.error('Error deleting:', error);
                        alert('Failed to delete: ' + error.message);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Right Arrow - overlay on hover */}
              {notesHasOverflow && (
                <button
                  onClick={scrollNotesRight}
                  className="absolute -right-10 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-md transition-all opacity-0 group-hover/notes:opacity-100"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>



          {/* Alerts & Reminders Section */}
          <div className="mb-1 mt-2 border-b border-gray-200 pb-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAlertsRemindersExpanded(expanded => !expanded)}
              className="flex items-center gap-1 text-sm font-bold text-gray-400 uppercase tracking-wider transition-colors hover:text-gray-600"
              aria-expanded={isAlertsRemindersExpanded}
              title={isAlertsRemindersExpanded ? 'Collapse Alerts & Reminders' : 'Expand Alerts & Reminders'}
            >
              {isAlertsRemindersExpanded ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
              Alerts & Reminders
            </button>
            <button 
              onClick={() => setShowAlertsHelpPopup(true)}
              className="text-gray-400 hover:text-blue-500 transition-colors"
              title="Alerts & Reminders Wiki"
            >
              <InformationCircleIcon className="h-5 w-5" />
            </button>
          </div>
          {isAlertsRemindersExpanded && (
            <div className="mb-4">
              <AlertsProvider
                notes={notes}
                events={events}
                setNotes={setNotes}
              >
              </AlertsProvider>
            </div>
          )}

          {/* Watched Trackers Section */}
          <div className="mb-4">
            <WatchedTrackers notes={notes} setNotes={setNotes} />
          </div>

          {/* Tracked Info Cards */}
          <div className="mb-4">
            <TrackedInfoCards notes={notes} setNotes={setNotes} />
          </div>
          </div>{/* end main column */}

          {/* ── Right panel ── */}
          <div className="relative flex-shrink-0 sticky top-4">
            {showHabitsPanel ? (
              <div style={{ width: `${tinyHabitsPanelWidth}px` }}>
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsResizingTinyHabitsPanel(true);
                  }}
                  className="absolute -left-2 top-0 h-full w-3 cursor-col-resize bg-transparent transition-colors hover:bg-blue-300/40"
                  title="Resize Tiny Habits"
                  aria-label="Resize Tiny Habits"
                />
                <TinyHabitsDashboardWidget
                  setActivePage={setActivePage}
                  onHide={() => { setShowHabitsPanel(false); localStorage.setItem('showHabitsPanel', 'false'); }}
                />
              </div>
            ) : (
              <button
                onClick={() => { setShowHabitsPanel(true); localStorage.setItem('showHabitsPanel', 'true'); }}
                className="writing-mode-vertical text-xs text-gray-400 hover:text-blue-500 border border-dashed border-gray-200 hover:border-blue-300 rounded-lg px-2 py-3 transition-colors"
                title="Show Tiny Habits"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              >
                Tiny Habits ›
              </button>
            )}
          </div>
        </div>
      )}

      {/* Timezone Popup */}
      <TimezonePopup
        isOpen={showTimezonePopup}
        onClose={() => setShowTimezonePopup(false)}
      />

      {/* Add Options Popup */}
      <AddOptionsPopup
        isOpen={showAddOptionsPopup}
        onClose={() => setShowAddOptionsPopup(false)}
        onAddNote={handleAddNote}
        onAddWatch={handleAddWatch}
        onAddSuperCritical={handleAddSuperCriticalReview}
        onAddTimer={handleAddTimerReview}
        onAddEvent={handleAddEvent}
        onAddDeadline={handleAddDeadline}
        onAddHoliday={handleAddHoliday}
      />

      {/* Alerts Help Popup */}
      <AlertsHelpPopup
        isOpen={showAlertsHelpPopup}
        onClose={() => setShowAlertsHelpPopup(false)}
      />

      {/* Edit Event Modal */}
      {showEditEventModal && (
        <EditEventModal
          isOpen={showEditEventModal}
          note={editingEvent}
          onSave={async (content) => {
            if (editingEvent?.id) {
              // Update existing event
              const note = notes.find(n => n.id === editingEvent.id);
              if (note) {
                try {
                  // Update the note in the backend
                  const response = await updateNoteById(editingEvent.id, content);

                  // Update the note in the local state
                  const updatedNote = {
                    ...note,
                    content: response && response.content ? response.content : content
                  };
                  setNotes(notes.map(n => n.id === note.id ? updatedNote : n));
                } catch (error) {
                  console.error('Error updating note:', error);
                  // Still update local state even if backend fails
                  const updatedNote = { ...note, content: content };
                  setNotes(notes.map(n => n.id === note.id ? updatedNote : n));
                }
              }
            } else {
              // Add new event
              try {
                const newNote = await createNote(content);
                setNotes([...notes, newNote]);
              } catch (error) {
                console.error('Error creating note:', error);
                // Still add to local state even if backend fails
                const fallbackNote = {
                  id: Date.now().toString(),
                  content: content,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };
                setNotes([...notes, fallbackNote]);
              }
            }
            setShowEditEventModal(false);
            setEditingEvent(null);
            setIsAddingDeadline(false);
            setIsAddingHoliday(false);
            setIsAddingTemporaryEvent(false);
          }}
          onCancel={() => {
            setShowEditEventModal(false);
            setEditingEvent(null);
            setIsAddingDeadline(false);
            setIsAddingHoliday(false);
            setIsAddingTemporaryEvent(false);
          }}
          onSwitchToNormalEdit={() => {
            setShowEditEventModal(false);
            setEditingEvent(null);
            setIsAddingDeadline(false);
            setIsAddingHoliday(false);
            setIsAddingTemporaryEvent(false);
          }}
          onDelete={async (noteId) => {
            console.log('[Dashboard] onDelete called with noteId:', noteId);
            try {
              // Delete from backend
              console.log('[Dashboard] Calling deleteNoteById...');
              await deleteNoteById(noteId);
              console.log('[Dashboard] Backend delete successful');

              // Update notes state by filtering out the deleted note
              setNotes(prevNotes => {
                console.log('[Dashboard] Updating notes state');
                const updatedNotes = prevNotes.filter(n => n.id !== noteId);
                // Also update events state since events are derived from notes
                const eventNotes = updatedNotes.filter(note => note && note.content && note.content.includes('meta::event::'));
                console.log('[Dashboard] New events count:', eventNotes.length);
                setEvents(eventNotes);
                return updatedNotes;
              });
            } catch (error) {
              console.error('[Dashboard] Error deleting event:', error);
              alert('Failed to delete event: ' + error.message);
            }
            console.log('[Dashboard] Closing modal');
            setShowEditEventModal(false);
            setEditingEvent(null);
            setIsAddingDeadline(false);
            setIsAddingHoliday(false);
            setIsAddingTemporaryEvent(false);
          }}
          notes={notes}
          isAddDeadline={isAddingDeadline}
          isAddTemporary={isAddingTemporaryEvent && !editingEvent}
          prePopulatedTags={isAddingHoliday ? "holiday" : ""}
        />
      )}
    </div>
  );
};

export default Dashboard; 
