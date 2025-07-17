import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, ChevronUpIcon, BellIcon, CheckIcon, ClockIcon } from '@heroicons/react/24/outline';
import CadenceSelector from './CadenceSelector';
import { Alerts } from './Alerts';
import { findDueReminders, addCurrentDateToLocalStorage, getLastReviewObject } from '../utils/CadenceHelpUtils';

const QUICK_CADENCES = [
  { label: '2h', value: '2h' },
  { label: '4h', value: '4h' },
  { label: '12h', value: '12h' },
  { label: '2d', value: '2d' },
  { label: '3d', value: '3d' },
  { label: '7d', value: '7d' },
];

const RemindersAlert = ({ allNotes, expanded: initialExpanded = true, setNotes, isRemindersOnlyMode = false }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [expandedDetails, setExpandedDetails] = useState({});
  const [hoveredNote, setHoveredNote] = useState(null);
  const [showCadenceSelector, setShowCadenceSelector] = useState(null);
  const [reminderObjs, setReminderObjs] = useState([]);
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [focusedReminderIndex, setFocusedReminderIndex] = useState(-1);

  useEffect(() => {
    const dueReminders = findDueReminders(allNotes);
    setReminderObjs(dueReminders);

    // Find upcoming reminders (not yet due)
    const upcoming = allNotes
      .filter(note => {
        const lastReview = getLastReviewObject(note);
        if (!lastReview) return false;
        
        const cadenceMatch = note.content.match(/meta::cadence::([^\n]+)/);
        if (!cadenceMatch) return false;
        
        const cadence = cadenceMatch[1];
        const nextReview = new Date(lastReview.date);
        
        // Parse cadence and add to nextReview
        const match = cadence.match(/(\d+)([hd])/);
        if (!match) return false;
        
        const [, amount, unit] = match;
        if (unit === 'h') {
          nextReview.setHours(nextReview.getHours() + parseInt(amount));
        } else if (unit === 'd') {
          nextReview.setDate(nextReview.getDate() + parseInt(amount));
        }
        
        return nextReview > new Date();
      })
      .map(note => ({
        note,
        nextReview: (() => {
          const lastReview = getLastReviewObject(note);
          const cadenceMatch = note.content.match(/meta::cadence::([^\n]+)/);
          const cadence = cadenceMatch[1];
          const nextReview = new Date(lastReview.date);
          
          const match = cadence.match(/(\d+)([hd])/);
          const [, amount, unit] = match;
          if (unit === 'h') {
            nextReview.setHours(nextReview.getHours() + parseInt(amount));
          } else if (unit === 'd') {
            nextReview.setDate(nextReview.getDate() + parseInt(amount));
          }
          
          return nextReview;
        })()
      }))
      .sort((a, b) => a.nextReview - b.nextReview);

    setUpcomingReminders(upcoming);
  }, [allNotes]);

  // Add keyboard navigation for reminders-only mode
  useEffect(() => {
    if (!isRemindersOnlyMode) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const totalReminders = reminderObjs.length + upcomingReminders.length;
      if (totalReminders === 0) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setFocusedReminderIndex(prev => 
          prev > 0 ? prev - 1 : totalReminders - 1
        );
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setFocusedReminderIndex(prev => 
          prev < totalReminders - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'Enter' && focusedReminderIndex >= 0) {
        e.preventDefault();
        e.stopPropagation();
        // Handle Enter key - dismiss the focused reminder
        const allReminders = [...reminderObjs, ...upcomingReminders];
        const focusedReminder = allReminders[focusedReminderIndex];
        if (focusedReminder) {
          // Dismiss the focused reminder (same as clicking the green tick)
          handleDismiss(focusedReminder.note);
        }
      } else if (e.key === 'l' && focusedReminderIndex >= 0) {
        e.preventDefault();
        e.stopPropagation();
        // Handle 'l' key - open link in the focused reminder
        const allReminders = [...reminderObjs, ...upcomingReminders];
        const focusedReminder = allReminders[focusedReminderIndex];
        if (focusedReminder) {
          // Extract URLs from the reminder content
          const content = focusedReminder.note.content;
          
          // Regex to match both markdown-style links [text](url) and plain URLs
          const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
          const plainUrlRegex = /(https?:\/\/[^\s)]+)/g;
          
          const links = [];
          
          // Extract markdown-style links first
          let match;
          while ((match = markdownLinkRegex.exec(content)) !== null) {
            links.push({
              url: match[2],
              text: match[1]
            });
          }
          
          // Extract plain URLs (excluding those already found in markdown links)
          const markdownUrls = links.map(link => link.url);
          while ((match = plainUrlRegex.exec(content)) !== null) {
            if (!markdownUrls.includes(match[1])) {
              links.push({
                url: match[1],
                text: match[1] // Use URL as text for plain URLs
              });
            }
          }
          
          if (links.length === 1) {
            // Open the single link
            window.open(links[0].url, '_blank');
          } else if (links.length > 1) {
            // Show popup with multiple links (similar to NotesList functionality)
            console.log('Multiple links found:', links);
            // For now, just open the first link
            window.open(links[0].url, '_blank');
          } else {
            console.log('No URLs found in reminder');
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isRemindersOnlyMode, reminderObjs.length, upcomingReminders.length, focusedReminderIndex]);

  // Reset focused index when reminders change
  useEffect(() => {
    setFocusedReminderIndex(-1);
  }, [reminderObjs, upcomingReminders]);

  // Scroll to focused reminder when it changes
  useEffect(() => {
    if (isRemindersOnlyMode && focusedReminderIndex >= 0) {
      const allReminders = [...reminderObjs, ...upcomingReminders];
      const focusedReminder = allReminders[focusedReminderIndex];
      if (focusedReminder) {
        // Find the DOM element and scroll to it
        const reminderElement = document.querySelector(`[data-reminder-id="${focusedReminder.note.id}"]`);
        if (reminderElement) {
          reminderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [focusedReminderIndex, isRemindersOnlyMode, reminderObjs, upcomingReminders]);

  // Add the vibrating animation style for the bell icon
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes vibrate {
          0% { transform: rotate(0deg); }
          20% { transform: rotate(-15deg); }
          40% { transform: rotate(12deg); }
          60% { transform: rotate(-9deg); }
          80% { transform: rotate(6deg); }
          100% { transform: rotate(0deg); }
        }
        .bell-vibrate {
          animation: vibrate 0.3s ease-in-out infinite;
          transform-origin: top;
        }
      `;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  const handleDismiss = async (note) => {
    try {
      addCurrentDateToLocalStorage(note.id);
      setReminderObjs(findDueReminders(allNotes));
    } catch (error) {
      console.error('Error dismissing reminder:', error);
      Alerts.error('Failed to dismiss reminder');
    }
  };

  const toggleDetails = (noteId) => {
    setExpandedDetails(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  };

  const formatReminderContent = (content, isExpanded, toggleDetails) => {
    // Only count/display non-meta and non-blank lines
    const lines = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('meta::'));

    // Helper to render a line with URL logic
    const renderLine = (line, key) => {
      // Markdown link: [text](url)
      const markdownMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
      if (markdownMatch) {
        const text = markdownMatch[1];
        const url = markdownMatch[2];
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800"
          >
            {text}
          </a>
        );
      }
      // Plain URL
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urlMatch = line.match(urlRegex);
      if (urlMatch) {
        // Replace all URLs in the line with clickable links (host name as text)
        let lastIndex = 0;
        const parts = [];
        urlMatch.forEach((url, i) => {
          const index = line.indexOf(url, lastIndex);
          if (index > lastIndex) {
            parts.push(line.slice(lastIndex, index));
          }
          const host = url.replace(/^https?:\/\//, '').split('/')[0];
          parts.push(
            <a
              key={key + '-url-' + i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              {host}
            </a>
          );
          lastIndex = index + url.length;
        });
        if (lastIndex < line.length) {
          parts.push(line.slice(lastIndex));
        }
        return <span key={key}>{parts}</span>;
      }
      // No URL, render as plain text
      return <span key={key}>{line}</span>;
    };

    // Swap logic: if first line is a URL and second is plain text, swap for display
    let firstLine = lines[0] || '';
    let secondLine = lines[1] || '';
    const urlRegex = /^(https?:\/\/[^\s]+)$/;
    if (lines.length >= 2 && urlRegex.test(firstLine) && !urlRegex.test(secondLine)) {
      // Also check that second line is not a markdown link
      const markdownLinkRegex = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/;
      if (!markdownLinkRegex.test(secondLine)) {
        // Swap
        [firstLine, secondLine] = [secondLine, firstLine];
      }
    }
    const remainingLines = lines.slice(2);

    return (
      <>
        <div className="font-medium">{renderLine(firstLine, 'first')}</div>
        {secondLine && <div className="mt-1 text-gray-600">{renderLine(secondLine, 'second')}</div>}
        {lines.length > 2 && (
          <>
            {isExpanded ? (
              <div className="mt-2 text-gray-600">
                {remainingLines.map((line, index) => (
                  <div key={index}>{renderLine(line, 'rem-' + index)}</div>
                ))}
              </div>
            ) : null}
            <button
              onClick={toggleDetails}
              className="mt-1 text-sm text-blue-600 hover:text-blue-800"
            >
              {isExpanded ? 'Show less' : `Show more (${lines.length - 2} more line${lines.length - 2 > 1 ? 's' : ''})`}
            </button>
          </>
        )}
      </>
    );
  };

  const handleQuickCadence = async (noteId, cadence) => {
    try {
      const note = allNotes.find(n => n.id === noteId);
      if (!note) return;

      // Update the note's cadence
      const updatedNote = {
        ...note,
        content: note.content.replace(/meta::cadence::[^\n]*/, `meta::cadence::${cadence}`)
      };

      // Update the notes array
      const updatedNotes = allNotes.map(n => n.id === noteId ? updatedNote : n);
      if (typeof setNotes === 'function') {
        setNotes(updatedNotes);
      }
      
      // Dismiss the current reminder
      addCurrentDateToLocalStorage(noteId);
      setReminderObjs(findDueReminders(updatedNotes));
    } catch (error) {
      console.error('Error setting quick cadence:', error);
      Alerts.error('Failed to set cadence');
    }
  };

  const formatDate = (date) => {
    const now = new Date();
    const diff = date - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `in ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return 'soon';
    }
  };

  if (reminderObjs.length === 0 && upcomingReminders.length === 0) return null;

  return (
    <div className="space-y-4 w-full">
      {/* Active Reminders Section */}
      {reminderObjs.length > 0 && (
        <div className="space-y-4">
          {reminderObjs.map((reminderObj, index) => {
            const note = reminderObj.note;
            const isDetailsExpanded = expandedDetails[note.id];
            const isHovered = hoveredNote === note.id;
            const isFocused = isRemindersOnlyMode && focusedReminderIndex === index;
            const contentLines = note.content
              .split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 0 && !line.startsWith('meta::'));
            const hasMoreContent = contentLines.length > 2;

            return (
              <div
                key={note.id}
                data-reminder-id={note.id}
                className={`bg-amber-100 border shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-all duration-200 ${
                  isFocused 
                    ? 'border-blue-500 ring-2 ring-blue-300 bg-amber-50' 
                    : 'border-amber-200'
                }`}
                onMouseEnter={() => setHoveredNote(note.id)}
                onMouseLeave={() => setHoveredNote(null)}
              >
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {hasMoreContent && (
                        <button
                          onClick={() => toggleDetails(note.id)}
                          className="text-purple-700 hover:text-purple-900 focus:outline-none"
                        >
                          {isDetailsExpanded ? (
                            <ChevronUpIcon className="h-5 w-5" />
                          ) : (
                            <ChevronDownIcon className="h-5 w-5" />
                          )}
                        </button>
                      )}
                      {/* Bell icon with vibration animation */}
                      <BellIcon className="h-5 w-5 text-purple-700 bell-vibrate" />
                      <div>
                        {formatReminderContent(note.content, isDetailsExpanded, () => toggleDetails(note.id))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {showCadenceSelector === note.id ? (
                        <CadenceSelector
                          noteId={note.id}
                          notes={allNotes}
                          onCadenceChange={() => {
                            setShowCadenceSelector(null);
                            if (typeof setNotes === 'function') {
                              setNotes([...allNotes]);
                            }
                          }}
                        />
                      ) : (
                        <>
                          <div className="flex gap-1 mr-2">
                            {QUICK_CADENCES.map(({ label, value }) => (
                              <button
                                key={value}
                                onClick={() => handleQuickCadence(note.id, value)}
                                className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors duration-150"
                                style={{ padding: '2px 6px', background: 'none', border: 'none' }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => setShowCadenceSelector(note.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 underline mr-2"
                            style={{ padding: 0, background: 'none', border: 'none' }}
                          >
                            Set Cadence
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDismiss(note)}
                        className="px-3 py-1 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-150"
                        title="Dismiss"
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upcoming Reminders Section */}
      {upcomingReminders.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            Upcoming Reminders
          </h3>
          <div className="space-y-3">
            {upcomingReminders.map(({ note, nextReview }, index) => {
              const isDetailsExpanded = expandedDetails[note.id];
              const isFocused = isRemindersOnlyMode && focusedReminderIndex === reminderObjs.length + index;
              const contentLines = note.content
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0 && !line.startsWith('meta::'));
              const hasMoreContent = contentLines.length > 2;

              return (
                <div
                  key={note.id}
                  data-reminder-id={note.id}
                  className={`bg-gray-50 border rounded-lg overflow-hidden hover:shadow-md transition-all duration-200 ${
                    isFocused 
                      ? 'border-blue-500 ring-2 ring-blue-300 bg-gray-100' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {hasMoreContent && (
                          <button
                            onClick={() => toggleDetails(note.id)}
                            className="text-gray-500 hover:text-gray-700 focus:outline-none"
                          >
                            {isDetailsExpanded ? (
                              <ChevronUpIcon className="h-5 w-5" />
                            ) : (
                              <ChevronDownIcon className="h-5 w-5" />
                            )}
                          </button>
                        )}
                        <div>
                          {formatReminderContent(note.content, isDetailsExpanded, () => toggleDetails(note.id))}
                          <div className="mt-1 text-sm text-gray-500">
                            {formatDate(nextReview)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1 mr-2">
                          {QUICK_CADENCES.map(({ label, value }) => (
                            <button
                              key={value}
                              onClick={() => handleQuickCadence(note.id, value)}
                              className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors duration-150"
                              style={{ padding: '2px 6px', background: 'none', border: 'none' }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setShowCadenceSelector(note.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 underline mr-2"
                          style={{ padding: 0, background: 'none', border: 'none' }}
                        >
                          Set Cadence
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RemindersAlert;