import React, { useState, useEffect, useRef } from 'react';
import { updateNoteById } from '../utils/ApiUtils';
import { ChevronDownIcon, ChevronUpIcon, BellIcon, CheckIcon } from '@heroicons/react/24/outline';
import CadenceSelector from './CadenceSelector';
import {Alerts} from './Alerts';
import { findDueReminders, addCurrentDateToLocalStorage } from '../utils/CadenceUtils';

const RemindersAlert = ({ notes, expanded: initialExpanded = true, setNotes }) => {
    const [isExpanded, setIsExpanded] = useState(initialExpanded);
    const [showAllReminders, setShowAllReminders] = useState(false);
    const [expandedDetails, setExpandedDetails] = useState({});
    const [hoveredNote, setHoveredNote] = useState(null);
    const [showCadenceSelector, setShowCadenceSelector] = useState(null);
  
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
  
    // Use findDueReminders to get reminders that are due for review
    const dueReminders = findDueReminders(notes);
    const reminders = dueReminders.map(dr => dr.note);
  
    if (reminders.length === 0) return null;
  
    const handleDismiss = async (note) => {
      try {
        // let lines = note.content.split('\n');
        // const metaIdx = lines.findIndex(line => line.startsWith('meta::reminder'));
        // if (metaIdx !== -1) {
        //   lines[metaIdx] = lines[metaIdx].replace('meta::reminder', 'meta::reminder_dismissed');
        //   const updatedContent = lines.join('\n');
        //   await updateNoteById(note.id, updatedContent);
        //   const updatedNotes = notes.map(n => 
        //     n.id === note.id ? { ...n, content: updatedContent } : n
        //   );
        //   setNotes(updatedNotes);
        //   Alerts.success('Reminder dismissed');
        // }
        addCurrentDateToLocalStorage(note.id);
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
  
    if (reminders.length === 0) return null;
  
    const displayedReminders = showAllReminders ? reminders : reminders.slice(0, 3);
    const hasMoreReminders = reminders.length > 3;
  
    return (
      <div className="space-y-4 w-full">
        {displayedReminders.map((note, index) => {
          const isDetailsExpanded = expandedDetails[note.id];
          const isHovered = hoveredNote === note.id;
          return (
            <div 
              key={note.id} 
              className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-all duration-200"
              onMouseEnter={() => setHoveredNote(note.id)}
              onMouseLeave={() => setHoveredNote(null)}
            >
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
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
                        notes={notes}
                        onCadenceChange={() => {
                          setShowCadenceSelector(null);
                          if (typeof setNotes === 'function') {
                            setNotes([...notes]);
                          }
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => setShowCadenceSelector(note.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline mr-2"
                        style={{ padding: 0, background: 'none', border: 'none' }}
                      >
                        Set Cadence
                      </button>
                    )}
                    <button
                      onClick={() => handleDismiss(note)}
                      className="px-3 py-1 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-150"
                      title="Dismiss"
                    >123
                      <CheckIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
               
              </div>
            </div>
          );
        })}
        {hasMoreReminders && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowAllReminders(!showAllReminders)}
              className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-800 focus:outline-none bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {showAllReminders ? 'Show Less' : `Show ${reminders.length - 3} More`}
            </button>
          </div>
        )}
      </div>
    );
  };

  export default RemindersAlert;