import React, { useState, useEffect } from 'react';
import { updateNoteById } from '../utils/ApiUtils';
import { ClockIcon, PencilIcon, XMarkIcon, CheckIcon, ClipboardDocumentListIcon, BellIcon, EyeSlashIcon, PauseIcon, ChevronDownIcon, PlayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import CadenceSelector from './CadenceSelector';
import NoteEditor from './NoteEditor';
import { checkNeedsReview, formatTimeElapsed } from '../utils/watchlistUtils';
import { Alerts } from './Alerts';
import { addCurrentDateToLocalStorage, updateCadenceHoursMinutes, findwatchitemsOverdue, findDueRemindersAsNotes, parseReviewCadenceMeta, renderCadenceSummary, getNextReviewDate, getHumanFriendlyTimeDiff, handleCadenceChange } from '../utils/CadenceHelpUtils';

const ReviewOverdueAlert = ({ notes, expanded: initialExpanded = true, setNotes }) => {
  const [expandedNotes, setExpandedNotes] = useState({});
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showPriorityPopup, setShowPriorityPopup] = useState(false);
  const [noteToConvert, setNoteToConvert] = useState(null);
  const [showCadenceSelector, setShowCadenceSelector] = useState(null);
  const [overdueNotes, setOverdueNotes] = useState([]);
  const [snoozedNotes, setSnoozedNotes] = useState([]);
  const [isSnoozedExpanded, setIsSnoozedExpanded] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const overdueNotes = findwatchitemsOverdue(notes);
    // Filter out notes with reminder tag
    const filteredOverdue = overdueNotes.filter(note => !note.content.includes('meta::reminder'));
    setOverdueNotes(filteredOverdue);
    
    // Get all watch notes that are not overdue and don't have reminder tag
    const allWatchNotes = notes.filter(note => 
      note.content.includes('meta::watch') && 
      !note.content.includes('meta::reminder')
    );
    const snoozed = allWatchNotes.filter(note => !overdueNotes.some(overdue => overdue.id === note.id));
    setSnoozedNotes(snoozed);
  }, [notes]);

  const filterNotesBySearch = (notes) => {
    if (!searchText.trim()) return notes;
    
    const searchLower = searchText.toLowerCase();
    return notes.filter(note => {
      // Remove meta tags for search
      const contentWithoutMeta = note.content
        .split('\n')
        .filter(line => !line.trim().startsWith('meta::'))
        .join('\n')
        .toLowerCase();
      
      return contentWithoutMeta.includes(searchLower);
    });
  };

  const filteredOverdueNotes = filterNotesBySearch(overdueNotes);
  const filteredSnoozedNotes = filterNotesBySearch(snoozedNotes);

  if (overdueNotes.length === 0 && snoozedNotes.length === 0) return null;

  const toggleNoteExpand = (noteId) => {
    setExpandedNotes(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  };

  const handleEditNote = (note) => {
    setSelectedNote(note);
    setShowNoteEditor(true);
  };

  const handleUnfollow = async (note) => {
    try {
      // Remove the entire line containing meta::watch
      const updatedContent = note.content
        .split('\n')
        .filter(line => !line.trim().startsWith('meta::watch'))
        .join('\n')
        .trim();
      
      // Update the note
      await updateNoteById(note.id, updatedContent);
      
      // Update the notes list immediately
      const updatedNotes = notes.map(n => 
        n.id === note.id ? { ...n, content: updatedContent } : n
      );
      setNotes(updatedNotes);

      // Remove from localStorage
      const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
      delete reviews[note.id];
      localStorage.setItem('noteReviews', JSON.stringify(reviews));

      const cadences = JSON.parse(localStorage.getItem('noteReviewCadence') || '{}');
      delete cadences[note.id];
      localStorage.setItem('noteReviewCadence', JSON.stringify(cadences));

      Alerts.success('Note removed from watchlist');
    } catch (error) {
      console.error('Error unfollowing note:', error);
      Alerts.error('Failed to remove from watchlist');
    }
  };

  const formatContent = (content) => {
    // Split content into lines, trim each line, and filter out empty lines
    const lines = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => !line.trim().startsWith('meta::'))
      .filter(line => line.length > 0);

    // Function to convert text to sentence case
    const toSentenceCase = (text) => {
      // Check if it's a URL or markdown link
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const markdownMatch = text.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
      if (urlRegex.test(text) || markdownMatch) return text;

      // Convert to sentence case
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    };

    const firstLine = lines[0] || '';
    const secondLine = lines[1] || '';
    const remainingLines = lines.slice(2).filter(line => line.length > 0);

    // Check if first line is a URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const firstLineUrlMatch = firstLine.match(urlRegex);
    const secondLineUrlMatch = secondLine.match(urlRegex);
    
    // Function to format a URL line
    const formatUrlLine = (line) => {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urlMatch = line.match(urlRegex);
      if (!urlMatch) return line;

      const url = urlMatch[0];
      const markdownMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
      
      // Always use "Link" as the text, regardless of markdown or plain URL
      return (
        <a
          href={markdownMatch ? markdownMatch[2] : url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 inline-flex items-center text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
            <path fillRule="evenodd" d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" clipRule="evenodd" />
          </svg>
          Link
        </a>
      );
    };

    // If first line is URL
    if (firstLineUrlMatch) {
      return (
        <>
          <div>{formatUrlLine(firstLine)}</div>
          {secondLine && <div className="mt-1 text-gray-600">{toSentenceCase(secondLine)}</div>}
          {remainingLines.length > 0 && (
            <>
              {expandedNotes[content] ? (
                <div className="mt-2 text-gray-600">
                  {remainingLines.map((line, index) => (
                    <div key={index}>{toSentenceCase(line)}</div>
                  ))}
                </div>
              ) : null}
              <button
                onClick={() => toggleNoteExpand(content)}
                className="mt-1 text-sm text-blue-600 hover:text-blue-800"
              >
                {expandedNotes[content] ? 'Show less' : 'Show more'}
              </button>
            </>
          )}
        </>
      );
    }

    // If second line is URL
    if (secondLineUrlMatch) {
      return (
        <>
          <div>{toSentenceCase(firstLine)}</div>
          <div className="mt-1 text-gray-600">{formatUrlLine(secondLine)}</div>
          {remainingLines.length > 0 && (
            <>
              {expandedNotes[content] ? (
                <div className="mt-2 text-gray-600">
                  {remainingLines.map((line, index) => (
                    <div key={index}>{toSentenceCase(line)}</div>
                  ))}
                </div>
              ) : null}
              <button
                onClick={() => toggleNoteExpand(content)}
                className="mt-1 text-sm text-blue-600 hover:text-blue-800"
              >
                {expandedNotes[content] ? 'Show less' : 'Show more'}
              </button>
            </>
          )}
        </>
      );
    }

    // For regular content
    if (lines.length > 1) {
      return (
        <>
          <div>{toSentenceCase(firstLine)}</div>
          {expandedNotes[content] ? (
            <div className="mt-2 text-gray-600">
              {lines.slice(1).map((line, index) => (
                <div key={index}>{toSentenceCase(line)}</div>
              ))}
            </div>
          ) : null}
          {lines.length > 2 && (
            <button
              onClick={() => toggleNoteExpand(content)}
              className="mt-1 text-sm text-blue-600 hover:text-blue-800"
            >
              {expandedNotes[content] ? 'Show less' : 'Show more'}
            </button>
          )}
        </>
      );
    }

    // If only one line
    return toSentenceCase(firstLine);
  };

  const handleConvertToTodo = (note) => {
    setNoteToConvert(note);
    setShowPriorityPopup(true);
  };

  const handlePrioritySelect = async (priority) => {
    if (!noteToConvert) return;

    try {
      // Add todo tag and priority tag
      let updatedContent = `${noteToConvert.content}\nmeta::todo::`;
      
      // Add appropriate priority tag
      if (priority === 'critical') {
        updatedContent += '\nmeta::critical';
      } else {
        updatedContent += `\nmeta::${priority}`;
      }

      await updateNoteById(noteToConvert.id, updatedContent);
      
      // Update the notes list immediately
      const updatedNotes = notes.map(n => 
        n.id === noteToConvert.id ? { ...n, content: updatedContent } : n
      );
      setNotes(updatedNotes);
      
      Alerts.success(`Note converted to ${priority} priority todo`);
    } catch (error) {
      console.error('Error converting to todo:', error);
      Alerts.error('Failed to convert to todo');
    } finally {
      setShowPriorityPopup(false);
      setNoteToConvert(null);
    }
  };

  const handleCadence = async (note, hours, minutes = 0) => {
    try {
      console.log('Setting cadence for note:', note.id, 'hours:', hours, 'minutes:', minutes);
      const updatedContent = updateCadenceHoursMinutes(note, hours, minutes);
      if (updatedContent) {
        await updateNoteById(note.id, updatedContent);
        addCurrentDateToLocalStorage(note.id);
        setNotes(notes.map(n => n.id === note.id ? { ...n, content: updatedContent } : n));
        Alerts.success('Review cadence updated');
      }
    } catch (error) {
      console.error('Error updating cadence:', error);
      Alerts.error('Failed to update review cadence');
    }
  };

  const handleAddReminder = async (note) => {
    try {
      const updatedContent = `${note.content}\nmeta::reminder`;
      await updateNoteById(note.id, updatedContent);
      
      // Update the notes list immediately
      const updatedNotes = notes.map(n => 
        n.id === note.id ? { ...n, content: updatedContent } : n
      );
      setNotes(updatedNotes);
      
      Alerts.success('Reminder added to note');
    } catch (error) {
      console.error('Error adding reminder:', error);
      Alerts.error('Failed to add reminder');
    }
  };

  const handleUnsnooze = (note) => {
    try {
      // Get current reviews from localStorage
      const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
      
      // Delete the review entry for this note
      delete reviews[note.id];
      
      // Update localStorage
      localStorage.setItem('noteReviews', JSON.stringify(reviews));
      
      // Force a re-render by updating the notes state
      setNotes([...notes]);
      
      Alerts.success('Note unsnoozed');
    } catch (error) {
      console.error('Error unsnoozing note:', error);
      Alerts.error('Failed to unsnooze note');
    }
  };

  const getCadenceDisplay = (note) => {
    const meta = parseReviewCadenceMeta(note.content);
    if (!meta) {
      console.warn('No cadence meta found for note:', note);
      return 'Every 12 hours';
    }
    const summary = renderCadenceSummary(note);
    if (!summary || summary.trim() === '' || summary === 'Review every') {
      console.warn('Cadence summary is empty or invalid for note:', note, 'meta:', meta);
      return 'Every 12 hours';
    }
    // Remove "Review " from the beginning and ensure first letter is capitalized
    let display = summary.replace(/^Review\s+/, '').replace(/^[a-z]/, letter => letter.toUpperCase());
    // Remove "0d " from the beginning if present
    display = display.replace(/^Every\s+0d\s+/, 'Every ');
    // Convert 24-hour time to 12-hour format with AM/PM
    display = display.replace(/(\d{2}):(\d{2})/g, (match, hours, minutes) => {
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    });
    return display;
  };

  const getTimeUntilNextReview = (note) => {
    const nextReview = getNextReviewDate(note);
    if (!nextReview) return null;
    
    const now = new Date();
    const timeUntilNext = nextReview - now;
    if (timeUntilNext <= 0) return null;
    
    const diff = getHumanFriendlyTimeDiff(nextReview);
    // Remove "0d " from the beginning if present
    return diff.replace(/^0d\s+/, '');
  };

  const onCadenceChange = (note, cadenceObj) => {
    try {
      const updatedContent = handleCadenceChange(note, cadenceObj);
      if (updatedContent) {
        // Update the notes list immediately
        const updatedNotes = notes.map(n => 
          n.id === note.id ? { ...n, content: updatedContent } : n
        );
        setNotes(updatedNotes);
        setShowCadenceSelector(null);
        Alerts.success('Review cadence updated');
      }
    } catch (error) {
      console.error('Error updating cadence:', error);
      Alerts.error('Failed to update review cadence');
    }
  };

  return (
    <div className="w-full">
      {/* Search Box */}
      <div className="mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
            placeholder="Search watchlist..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Overdue Notes Section */}
      {filteredOverdueNotes.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden h-full mb-4">
          <div className="bg-red-50 px-6 py-4 border-b border-red-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ClockIcon className="h-6 w-6 text-red-500" />
                <h3 className="ml-3 text-base font-semibold text-red-800">
                  Review Overdue ({filteredOverdueNotes.length})
                </h3>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredOverdueNotes.map((note, index) => {
              const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
              const reviewTime = reviews[note.id];
              const timeUntilNext = getTimeUntilNextReview(note);

              return (
                <div 
                  key={note.id} 
                  className={`px-6 py-3 transition-colors duration-150 min-h-[120px] ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-gray-100`}
                >
                  <div className="grid grid-cols-4 gap-4">
                    {/* First Section - Description (50%) */}
                    <div className="col-span-2 flex flex-col">
                      <h4 className="text-base font-medium text-gray-900 mb-2 break-words">
                        {formatContent(note.content)}
                      </h4>
                      <div className="flex flex-col gap-1 text-sm text-gray-500">
                        <div className="grid grid-cols-[120px_1fr] items-center">
                          <span className="text-xs text-gray-500">Review cadence:</span>
                          <span className="text-xs text-gray-500">{getCadenceDisplay(note)}</span>
                        </div>
                        {timeUntilNext && (
                          <div className="grid grid-cols-[120px_1fr] items-center">
                            <span className="text-xs text-red-500">Next review:</span>
                            <span className="text-xs text-red-500">{timeUntilNext}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Second Section - Review In Buttons (25%) */}
                    <div className="flex flex-wrap gap-1 items-center justify-end">
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-sm text-gray-600 mr-2">Review in:</span>
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => handleCadence(note, 2, 0)}
                            className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                            title="Set 2 hour cadence"
                          >
                            2h
                          </button>
                          <button
                            onClick={() => handleCadence(note, 4, 0)}
                            className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                            title="Set 4 hour cadence"
                          >
                            4h
                          </button>
                          <button
                            onClick={() => handleCadence(note, 12, 0)}
                            className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                            title="Set 12 hour cadence"
                          >
                            12h
                          </button>
                          <button
                            onClick={() => handleCadence(note, 48, 0)}
                            className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                            title="Set 2 day cadence"
                          >
                            2d
                          </button>
                          <button
                            onClick={() => handleCadence(note, 72, 0)}
                            className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                            title="Set 3 day cadence"
                          >
                            3d
                          </button>
                          <button
                            onClick={() => handleCadence(note, 168, 0)}
                            className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                            title="Set 7 day cadence"
                          >
                            7d
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Third Section - Unfollow and Actions */}
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleUnfollow(note)}
                        className="p-2 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
                        title="Remove from watchlist"
                      >
                        <EyeSlashIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEditNote(note)}
                        className="p-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                        title="Edit note"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <div 
                        onClick={() => toggleNoteExpand(`actions-${note.id}`)}
                        className="py-2 text-xs font-medium text-gray-700 cursor-pointer flex items-center"
                      >
                        <div className="flex items-center">
                          <span>Actions</span>
                          <svg
                            className={`w-4 h-4 ml-1 transform transition-transform duration-200 ${expandedNotes[`actions-${note.id}`] ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Dropdown */}
                  {expandedNotes[`actions-${note.id}`] && (
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-2 justify-end">
                        {showCadenceSelector === note.id ? (
                          <CadenceSelector
                            noteId={note.id}
                            notes={notes}
                            onCadenceChange={async () => {
                              // Fetch the updated note content (simulate by reloading from backend or localStorage)
                              // For now, re-fetch from backend is not shown, so we update from localStorage or force a refresh
                              // Option 1: If you have a way to fetch the updated note, do it here
                              // Option 2: For now, just close the selector and force a re-render
                              const updatedNotes = notes.map(n => {
                                if (n.id === note.id) {
                                  // Try to get the latest content from localStorage if available
                                  // (Assume updateCadenceHoursMinutes already updated the note content in localStorage)
                                  // If not, just keep the old content (will update on next full refresh)
                                  return { ...n, content: n.content };
                                }
                                return n;
                              });
                              setNotes(updatedNotes);
                              setShowCadenceSelector(null);
                            }}
                          />
                        ) : (
                          <button
                            onClick={() => setShowCadenceSelector(note.id)}
                            className="px-4 py-2 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                            title="Set custom cadence"
                          >
                            <ClockIcon className="w-5 h-5 inline-block mr-1" />
                            <span>Set cadence</span>
                          </button>
                        )}
                        {!note.content.includes('meta::reminder') && (
                          <button
                            onClick={() => handleAddReminder(note)}
                            className="px-4 py-2 text-xs font-medium text-yellow-700 bg-yellow-50 rounded-lg hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-150"
                            title="Set as reminder"
                          >
                            <BellIcon className="w-5 h-5 inline-block mr-1" />
                            <span>Set as reminder</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Snoozed Notes Section */}
      {filteredSnoozedNotes.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden h-full">
          <div 
            className="bg-gray-50 px-6 py-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors duration-150"
            onClick={() => setIsSnoozedExpanded(!isSnoozedExpanded)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <PauseIcon className="h-6 w-6 text-gray-500" />
                <h3 className="ml-3 text-base font-semibold text-gray-800">
                  Snoozing Watch List ({filteredSnoozedNotes.length})
                </h3>
              </div>
              <ChevronDownIcon 
                className={`h-5 w-5 text-gray-500 transform transition-transform duration-200 ${
                  isSnoozedExpanded ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>
          {isSnoozedExpanded && (
            <div className="divide-y divide-gray-100">
              {filteredSnoozedNotes.map((note, index) => {
                const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
                const reviewTime = reviews[note.id];
                const timeUntilNext = getTimeUntilNextReview(note);

                return (
                  <div 
                    key={note.id} 
                    className={`px-6 py-3 transition-colors duration-150 min-h-[120px] ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-gray-100`}
                  >
                    <div className="grid grid-cols-4 gap-4">
                      {/* First Section - Description (50%) */}
                      <div className="col-span-2 flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                          <PauseIcon className="h-4 w-4 text-gray-400" />
                          <h4 className="text-base font-medium text-gray-900 break-words">
                            {formatContent(note.content)}
                          </h4>
                        </div>
                        <div className="flex flex-col gap-1 text-sm text-gray-500">
                          <div className="grid grid-cols-[120px_1fr] items-center">
                            <span className="text-xs text-gray-500">Review cadence:</span>
                            <span className="text-xs text-gray-500">{getCadenceDisplay(note)}</span>
                          </div>
                          {timeUntilNext && (
                            <div className="grid grid-cols-[120px_1fr] items-center">
                              <span className="text-xs text-gray-500">Next review:</span>
                              <span className="text-xs text-gray-500">{timeUntilNext}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Second Section - Review In Buttons (25%) */}
                      <div className="flex flex-wrap gap-1 items-center justify-end">
                        <div className="flex flex-wrap gap-1 items-center">
                          <span className="text-sm text-gray-600 mr-2">Review in:</span>
                          <div className="flex flex-wrap gap-1">
                            <button
                              onClick={() => handleCadence(note, 2, 0)}
                              className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                              title="Set 2 hour cadence"
                            >
                              2h
                            </button>
                            <button
                              onClick={() => handleCadence(note, 4, 0)}
                              className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                              title="Set 4 hour cadence"
                            >
                              4h
                            </button>
                            <button
                              onClick={() => handleCadence(note, 12, 0)}
                              className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                              title="Set 12 hour cadence"
                            >
                              12h
                            </button>
                            <button
                              onClick={() => handleCadence(note, 48, 0)}
                              className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                              title="Set 2 day cadence"
                            >
                              2d
                            </button>
                            <button
                              onClick={() => handleCadence(note, 72, 0)}
                              className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                              title="Set 3 day cadence"
                            >
                              3d
                            </button>
                            <button
                              onClick={() => handleCadence(note, 168, 0)}
                              className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                              title="Set 7 day cadence"
                            >
                              7d
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Third Section - Unfollow and Actions */}
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleUnsnooze(note)}
                          className="p-2 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-150"
                          title="Unsnooze note"
                        >
                          <PlayIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleUnfollow(note)}
                          className="p-2 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
                          title="Remove from watchlist"
                        >
                          <EyeSlashIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleEditNote(note)}
                          className="p-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                          title="Edit note"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <div 
                          onClick={() => toggleNoteExpand(`actions-${note.id}`)}
                          className="py-2 text-xs font-medium text-gray-700 cursor-pointer flex items-center"
                        >
                          <div className="flex items-center">
                            <span>Actions</span>
                            <svg
                              className={`w-4 h-4 ml-1 transform transition-transform duration-200 ${expandedNotes[`actions-${note.id}`] ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions Dropdown */}
                    {expandedNotes[`actions-${note.id}`] && (
                      <div className="mt-4">
                        <div className="flex flex-wrap gap-2 justify-end">
                          {showCadenceSelector === note.id ? (
                            <CadenceSelector
                              noteId={note.id}
                              notes={notes}
                              onCadenceChange={async () => {
                                // Fetch the updated note content (simulate by reloading from backend or localStorage)
                                // For now, re-fetch from backend is not shown, so we update from localStorage or force a refresh
                                // Option 1: If you have a way to fetch the updated note, do it here
                                // Option 2: For now, just close the selector and force a re-render
                                const updatedNotes = notes.map(n => {
                                  if (n.id === note.id) {
                                    // Try to get the latest content from localStorage if available
                                    // (Assume updateCadenceHoursMinutes already updated the note content in localStorage)
                                    // If not, just keep the old content (will update on next full refresh)
                                    return { ...n, content: n.content };
                                  }
                                  return n;
                                });
                                setNotes(updatedNotes);
                                setShowCadenceSelector(null);
                              }}
                            />
                          ) : (
                            <button
                              onClick={() => setShowCadenceSelector(note.id)}
                              className="px-4 py-2 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                              title="Set custom cadence"
                            >
                              <ClockIcon className="w-5 h-5 inline-block mr-1" />
                              <span>Set cadence</span>
                            </button>
                          )}
                          {!note.content.includes('meta::reminder') && (
                            <button
                              onClick={() => handleAddReminder(note)}
                              className="px-4 py-2 text-xs font-medium text-yellow-700 bg-yellow-50 rounded-lg hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-150"
                              title="Set as reminder"
                            >
                              <BellIcon className="w-5 h-5 inline-block mr-1" />
                              <span>Set as reminder</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Show message when no results found */}
      {searchText && filteredOverdueNotes.length === 0 && filteredSnoozedNotes.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          No notes found matching "{searchText}"
        </div>
      )}

      {/* Priority Selection Popup */}
      {showPriorityPopup && noteToConvert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Select Priority</h3>
              <button
                onClick={() => setShowPriorityPopup(false)}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-2">
              {['critical', 'high', 'medium', 'low'].map((priority) => (
                <button
                  key={priority}
                  onClick={() => handlePrioritySelect(priority)}
                  className={`w-full px-4 py-2 text-left text-sm font-medium rounded-lg transition-colors duration-150 ${
                    priority === 'critical' 
                      ? 'text-red-700 hover:bg-red-50' 
                      : priority === 'high'
                      ? 'text-orange-700 hover:bg-orange-50'
                      : priority === 'medium'
                      ? 'text-yellow-700 hover:bg-yellow-50'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Note Editor Modal */}
      {showNoteEditor && selectedNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Edit Note</h2>
              <button
                onClick={() => setShowNoteEditor(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <NoteEditor
              note={selectedNote}
              onSave={async (updatedContent) => {
                try {
                  await updateNoteById(selectedNote.id, updatedContent);
                  // Update the notes list immediately after successful update
                  const updatedNotes = notes.map(n => 
                    n.id === selectedNote.id ? { ...n, content: updatedContent } : n
                  );
                  setNotes(updatedNotes);
                  setShowNoteEditor(false);
                  Alerts.success('Note updated successfully');
                } catch (error) {
                  console.error('Error updating note:', error);
                  Alerts.error('Failed to update note');
                }
              }}
              onCancel={() => setShowNoteEditor(false)}
              objList={[]}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewOverdueAlert; 