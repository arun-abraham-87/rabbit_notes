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

const LeftPanel = ({ notes, setNotes, selectedNote, setSelectedNote, searchQuery, settings, setSettings }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [showQuickLinks, setShowQuickLinks] = useState(true);
  const [showMeetingsSection, setShowMeetingsSection] = useState(true);
  const [showEventsSection, setShowEventsSection] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [unsavedSettings, setUnsavedSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  // Update unsavedSettings when settings prop changes
  useEffect(() => {
    setUnsavedSettings(settings);
  }, [settings]);

  // Collapse / Expand helpers
  const handleCollapseAll = () => {
    setShowQuickLinks(false);
    setShowMeetingsSection(false);
    setShowEventsSection(false);
  };
  const handleOpenAll = () => {
    setShowQuickLinks(true);
    setShowMeetingsSection(true);
    setShowEventsSection(true);
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
    const result = notes.flatMap(note => {
      if (note.content.split('\n').some(line => line.trim().startsWith('meta::meeting'))) {
        const lines = note.content.split('\n');
        // Extract duration from meta tag
        const durationMatch = note.content.match(/meta::meeting_duration::(\d+)/);
        const duration = durationMatch ? parseInt(durationMatch[1]) : null;
        return [{ 
          id: note.id, 
          context: lines[0].trim(), 
          time: lines[1].trim(),
          duration: duration
        }];
      }
      return [];
    });
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
      if (note.content.split('\n').some(line => line.trim().startsWith('meta::event'))) {
        const lines = note.content.split('\n');
        return [{ id: note.id, context: lines[0].trim(), time: lines[1].trim() }];
      }
      return [];
    });
    return result.sort((a, b) => new Date(a.time) - new Date(b.time));
  }, [notes]);

  const visibleEvents = useMemo(() => {
    return events.filter(e => new Date(e.time).getTime() >= now);
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

  const handleSettingChange = (key, value) => {
    setUnsavedSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
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

  return (
    <>
      {alertMeetingId && (() => {
        const m = meetings.find(x => x.id === alertMeetingId);
        return (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="p-8 rounded-lg shadow-xl bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-pulse max-w-sm text-center">
              <h3 className="text-xl font-bold mb-2 text-white">Meeting Soon!</h3>
              <p className="mb-4 text-white text-lg">{m.context}</p>
              <p className="mb-6 text-white text-base">{m.time}</p>
              <button
                onClick={() => {
                  const note = notes.find(n => n.id === alertMeetingId);
                  if (note) {
                    const ackLine = `meta::meeting_acknowledge::${new Date().toISOString()}`;
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

      <div className="w-full h-full bg-slate-50 p-3 flex flex-col">
        <div className="flex-1 space-y-2 overflow-y-auto text-sm">
          {/* Collapse / Open controls */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-2">
              <button
                onClick={handleCollapseAll}
                className="p-2 bg-white hover:bg-indigo-50 rounded-lg text-indigo-600 hover:text-indigo-700 transition-colors duration-150 shadow-sm"
                title="Collapse All Sections"
              >
                <ChevronDoubleUpIcon className="h-5 w-5" />
              </button>
              <button
                onClick={handleOpenAll}
                className="p-2 bg-white hover:bg-indigo-50 rounded-lg text-indigo-600 hover:text-indigo-700 transition-colors duration-150 shadow-sm"
                title="Expand All Sections"
              >
                <ChevronDoubleDownIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

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
          <div className="bg-white p-3 rounded-lg shadow-sm mb-3">
            <h2
              className="font-semibold text-gray-800 mb-2 flex justify-between items-center cursor-pointer p-1.5 hover:bg-indigo-50 rounded-lg text-base"
              onClick={() => setShowQuickLinks(prev => !prev)}
            >
              <span>Quick Links</span>
              {showQuickLinks ? 
                <ChevronDoubleUpIcon className="h-4 w-4 text-indigo-600" /> : 
                <ChevronDoubleDownIcon className="h-4 w-4 text-indigo-600" />
              }
            </h2>
            {showQuickLinks && (
              uniqueUrls.length === 0 ? (
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
                      <button
                        onClick={() => removeBookmarkFromNotes(url, notes, setNotes)}
                        className="ml-2 text-gray-400 hover:text-red-500 focus:outline-none"
                      >
                        &times;
                      </button>
                    </div>
                  );
                })
              )
            )}
          </div>

          {/* Bookmarks Section */}
          <div className="bg-white p-3 rounded-lg shadow-sm mb-3">
            <h2
              className="font-semibold text-gray-800 mb-2 flex justify-between items-center cursor-pointer p-1.5 hover:bg-indigo-50 rounded-lg text-base"
              onClick={() => setShowQuickLinks(prev => !prev)}
            >
              <span>Bookmarks</span>
              {showQuickLinks ? 
                <ChevronDoubleUpIcon className="h-4 w-4 text-indigo-600" /> : 
                <ChevronDoubleDownIcon className="h-4 w-4 text-indigo-600" />
              }
            </h2>
            {showQuickLinks && (
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

          {/* Meetings Section */}
          {visibleMeetings.length > 0 && (
            <div className="bg-indigo-50 pb-3 px-3 rounded-lg shadow-sm mb-3">
              <h2
                className="font-semibold text-gray-800 mb-2 flex justify-between items-center cursor-pointer p-1.5 hover:bg-indigo-100 rounded-lg text-base"
                onClick={() => setShowMeetingsSection(prev => !prev)}
              >
                <span>
                  Meetings
                  <span className="text-indigo-600 ml-2 text-sm">({visibleMeetings.length})</span>
                </span>
                {showMeetingsSection ? 
                  <ChevronDoubleUpIcon className="h-4 w-4 text-indigo-600" /> : 
                  <ChevronDoubleDownIcon className="h-4 w-4 text-indigo-600" />
                }
              </h2>
              {showMeetingsSection && visibleMeetings.map((m, idx) => {
                const eventTime = new Date(m.time).getTime();
                const diff = eventTime - now;
                const isFlashing = diff > 0 && diff <= 10 * 60 * 1000;
                return (
                  <div
                    key={m.id}
                    className="group relative mb-2 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <div className={`p-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-indigo-100'} ${isFlashing ? 'animate-pulse bg-purple-100' : ''} rounded-lg`}>
                      <div className="text-base font-medium text-gray-800">{m.context}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {(() => {
                          const d = new Date(m.time);
                          const today = new Date(now);
                          return d.toDateString() === today.toDateString() ? 'Today' :
                            d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                        })()}
                      </div>
                      <div className="text-sm text-gray-600">
                        {(() => {
                          const d = new Date(m.time);
                          let h = d.getHours(), mnt = d.getMinutes();
                          const ampm = h >= 12 ? 'PM' : 'AM';
                          h = h % 12 || 12;
                          return `${h}:${mnt.toString().padStart(2, '0')} ${ampm}`;
                        })()}
                        {m.duration && (
                          <span className="ml-2 text-indigo-500">
                            • {m.duration} mins
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-indigo-600 mt-1">
                        {(() => {
                          const delta = new Date(m.time).getTime() - now;
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
            </div>
          )}

          {/* Events Section */}
          {visibleEvents.length > 0 && (
            <div className="bg-purple-50 pb-3 px-3 rounded-lg shadow-sm mb-3">
              <h2
                className="font-semibold text-gray-800 mb-2 flex justify-between items-center cursor-pointer p-1.5 hover:bg-purple-100 rounded-lg text-base"
                onClick={() => setShowEventsSection(prev => !prev)}
              >
                <span>
                  Events
                  <span className="text-purple-600 ml-2 text-sm">({visibleEvents.length})</span>
                </span>
                {showEventsSection ? 
                  <ChevronDoubleUpIcon className="h-4 w-4 text-purple-600" /> : 
                  <ChevronDoubleDownIcon className="h-4 w-4 text-purple-600" />
                }
              </h2>
              {showEventsSection && visibleEvents.map((e, idx) => {
                const eventTime = new Date(e.time).getTime();
                const diff = eventTime - now;
                const isFlashing = diff > 0 && diff <= 10 * 60 * 1000;
                return (
                  <div
                    key={e.id}
                    className="group relative mb-2 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <div className={`p-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-purple-100'} ${isFlashing ? 'animate-pulse bg-purple-200' : ''} rounded-lg`}>
                      <div className="text-base font-medium text-gray-800">{e.context}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {(() => {
                          const d = new Date(e.time);
                          return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
                        })()}
                      </div>
                      <div className="text-sm font-medium text-purple-600 mt-1">
                        {(() => {
                          const delta = new Date(e.time).getTime() - now;
                          if (delta <= 0) return 'Today';
                          
                          const millisecondsPerDay = 86400000;
                          const millisecondsPerMonth = millisecondsPerDay * 30.44;
                          const millisecondsPerYear = millisecondsPerDay * 365.25;
                          
                          const years = Math.floor(delta / millisecondsPerYear);
                          const remainingAfterYears = delta % millisecondsPerYear;
                          
                          const months = Math.floor(remainingAfterYears / millisecondsPerMonth);
                          const remainingAfterMonths = remainingAfterYears % millisecondsPerMonth;
                          
                          const days = Math.ceil(remainingAfterMonths / millisecondsPerDay);
                          
                          const parts = [];
                          if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
                          if (months > 0) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
                          if (days > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
                          
                          return `in ${parts.join(', ')}`;
                        })()}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingEventId(e.id)}
                      className="absolute top-3 right-3 p-1.5 rounded-md bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-50"
                    >
                      <PencilSquareIcon className="h-4 w-4 text-purple-600" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Settings button at bottom */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center justify-center p-2.5 bg-white hover:bg-indigo-50 rounded-lg text-gray-700 hover:text-indigo-600 transition-colors duration-150 shadow-sm"
            title="Settings"
          >
            <Cog6ToothIcon className="h-5 w-5 mr-2" />
            <span className="text-sm font-medium">Settings</span>
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
              {/* Theme Setting */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Theme</label>
                <select
                  value={unsavedSettings.theme}
                  onChange={(e) => handleSettingChange('theme', e.target.value)}
                  className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              {/* Sort By Setting */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Sort Notes By</label>
                <select
                  value={unsavedSettings.sortBy}
                  onChange={(e) => handleSettingChange('sortBy', e.target.value)}
                  className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base"
                >
                  <option value="date">Date</option>
                  <option value="priority">Priority</option>
                </select>
              </div>

              {/* Auto Collapse Setting */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoCollapse"
                  checked={unsavedSettings.autoCollapse}
                  onChange={(e) => handleSettingChange('autoCollapse', e.target.checked)}
                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-lg"
                />
                <label htmlFor="autoCollapse" className="ml-3 block text-base text-gray-700">
                  Auto-collapse sections
                </label>
              </div>

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
        return (
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
          />
        );
      })()}
    </>
  );
};

export default LeftPanel;