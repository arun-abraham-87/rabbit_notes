import React, { useState, useEffect } from 'react';
import { searchInNote } from '../utils/NotesUtils';
import { isSameAsTodaysDate } from '../utils/DateUtils';

const NoteFilters = ({
  setLines,
  setShowTodoSubButtons,
  setActivePriority,
  setSearchQuery,
  searchQuery,
  settings = {},
  allNotes = [],
  onExcludeEventsChange,
  onExcludeMeetingsChange,
  onDeadlinePassedChange,
  onExcludeEventNotesChange,
  onExcludeBackupNotesChange,
  onExcludeWatchEventsChange,
  onExcludeBookmarksChange,
  onExcludeExpensesChange,
  onExcludeSensitiveChange,
  onExcludeTrackersChange,
  resetFilters = false
}) => {
  const [showTodoButtons, setShowTodoButtons] = useState(false);
  const [showEventButtons, setShowEventButtons] = useState(false);
  const [showMeetingButtons, setShowMeetingButtons] = useState(false);
  const [activePriorityFilter, setActivePriorityFilter] = useState('');
  const [excludeEvents, setExcludeEvents] = useState(settings.excludeEventsByDefault || false);
  const [excludeMeetings, setExcludeMeetings] = useState(settings.excludeMeetingsByDefault || false);
  const [excludeEventNotes, setExcludeEventNotes] = useState(true); // Default to true to exclude event notes
  const [excludeBackupNotes, setExcludeBackupNotes] = useState(true); // Default to true to exclude backup notes
  const [excludeWatchEvents, setExcludeWatchEvents] = useState(true); // Default to true to exclude watch events
  const [excludeBookmarks, setExcludeBookmarks] = useState(true); // Default to true to exclude bookmarks
  const [excludeExpenses, setExcludeExpenses] = useState(true); // Default to true to exclude expenses
  const [excludeSensitive, setExcludeSensitive] = useState(true); // Default to true to exclude sensitive notes
  const [excludeTrackers, setExcludeTrackers] = useState(true); // Default to true to exclude tracker notes
  const [showDeadlinePassedFilter, setShowDeadlinePassedFilter] = useState(false);

  // Only set the initial state of checkboxes
  useEffect(() => {
    setExcludeEvents(settings.excludeEventsByDefault || false);
    setExcludeMeetings(settings.excludeMeetingsByDefault || false);
  }, [settings.excludeEventsByDefault, settings.excludeMeetingsByDefault]);

  // Notify parent component when exclude states change
  useEffect(() => {
    if (onExcludeEventsChange) {
      onExcludeEventsChange(excludeEvents);
    }
  }, [excludeEvents, onExcludeEventsChange]);

  useEffect(() => {
    if (onExcludeMeetingsChange) {
      onExcludeMeetingsChange(excludeMeetings);
    }
  }, [excludeMeetings, onExcludeMeetingsChange]);

  // Notify parent component when deadline passed filter changes
  useEffect(() => {
    if (onDeadlinePassedChange) {
      onDeadlinePassedChange(showDeadlinePassedFilter);
    }
  }, [showDeadlinePassedFilter, onDeadlinePassedChange]);

  useEffect(() => {
    if (onExcludeEventNotesChange) {
      onExcludeEventNotesChange(excludeEventNotes);
    }
  }, [excludeEventNotes, onExcludeEventNotesChange]);

  useEffect(() => {
    if (onExcludeBackupNotesChange) {
      onExcludeBackupNotesChange(excludeBackupNotes);
    }
  }, [excludeBackupNotes, onExcludeBackupNotesChange]);

  useEffect(() => {
    if (onExcludeWatchEventsChange) {
      onExcludeWatchEventsChange(excludeWatchEvents);
    }
  }, [excludeWatchEvents, onExcludeWatchEventsChange]);

  useEffect(() => {
    if (onExcludeBookmarksChange) {
      onExcludeBookmarksChange(excludeBookmarks);
    }
  }, [excludeBookmarks, onExcludeBookmarksChange]);

  useEffect(() => {
    if (onExcludeExpensesChange) {
      onExcludeExpensesChange(excludeExpenses);
    }
  }, [excludeExpenses, onExcludeExpensesChange]);

  useEffect(() => {
    if (onExcludeSensitiveChange) {
      onExcludeSensitiveChange(excludeSensitive);
    }
  }, [excludeSensitive, onExcludeSensitiveChange]);

  useEffect(() => {
    if (onExcludeTrackersChange) {
      onExcludeTrackersChange(excludeTrackers);
    }
  }, [excludeTrackers, onExcludeTrackersChange]);

  // Reset all filters when resetFilters prop is true
  useEffect(() => {
    if (resetFilters) {
      setExcludeEvents(false);
      setExcludeMeetings(false);
      setExcludeEventNotes(false);
      setExcludeBackupNotes(false);
      setExcludeWatchEvents(false);
      setExcludeBookmarks(false);
      setExcludeExpenses(false);
      setExcludeSensitive(false);
      setShowDeadlinePassedFilter(false);
      setShowTodoButtons(false);
      setShowEventButtons(false);
      setShowMeetingButtons(false);
      setActivePriorityFilter('');
      setActivePriority('');
    }
  }, [resetFilters]);

  const removeFilterFromQuery = (filterText) => {
    if (setSearchQuery) {
      setSearchQuery(prev => {
        const words = prev.split(' ');
        const filteredWords = words.filter(word => word !== filterText);
        return filteredWords.join(' ').trim();
      });
    }
  };

  const toggleFilter = (filterText) => {
    if (searchQuery?.includes(filterText)) {
      // Remove the filter
      removeFilterFromQuery(filterText);
      return false; // Return false to indicate filter was removed
    } else {
      // Add the filter
      if (setSearchQuery) {
        setSearchQuery(prev => {
          const trimmedPrev = prev ? prev.trim() : '';
          return trimmedPrev ? `${trimmedPrev} ${filterText}` : filterText;
        });
      }
      return true; // Return true to indicate filter was added
    }
  };

  const handleTodoClick = () => {
    const filterAdded = toggleFilter('meta::todo');
    
    if (filterAdded) {
      setShowTodoButtons(true);
      setShowTodoSubButtons(true);
    } else {
      setShowTodoButtons(false);
      setShowTodoSubButtons(false);
      setActivePriority('');
      setActivePriorityFilter('');
      // Remove any priority tags when todo is removed
      if (setSearchQuery) {
        setSearchQuery(prev => {
          const words = prev.split(' ');
          return words
            .filter(word => 
              !word.includes('meta::high') && 
              !word.includes('meta::medium') && 
              !word.includes('meta::low')
            )
            .join(' ')
            .trim();
        });
      }
    }

    setLines((prev) => {
      if (filterAdded) {
        const exists = prev.some(line => line.text.includes('meta::todo'));
        if (exists) return prev;
        return [...prev.filter(line => line.text.trim() !== ''), { id: `line-${Date.now()}`, text: 'meta::todo', isTitle: false }];
      } else {
        // Remove todo and priority lines
        return prev.filter(line => 
          !line.text.includes('meta::todo') && 
          !line.text.includes('meta::high') && 
          !line.text.includes('meta::medium') && 
          !line.text.includes('meta::low')
        );
      }
    });
  };

  const handleEventClick = () => {
    const filterAdded = toggleFilter('meta::event::');
    setShowEventButtons(filterAdded);
    
    // If filter is added, uncheck exclude events
    if (filterAdded) {
      setExcludeEvents(false);
    } else {
      // When filter is removed, restore default state from settings
      setExcludeEvents(settings.excludeEventsByDefault || false);
    }
    
    setLines((prev) => {
      if (filterAdded) {
        const exists = prev.some(line => line.text.includes('meta::event::'));
        if (exists) return prev;
        return [...prev.filter(line => line.text.trim() !== ''), { id: `line-${Date.now()}`, text: 'meta::event::', isTitle: false }];
      } else {
        return prev.filter(line => !line.text.includes('meta::event::'));
      }
    });
  };

  const handleMeetingClick = () => {
    const filterAdded = toggleFilter('meta::meeting::');
    setShowMeetingButtons(filterAdded);
    
    // If filter is added, uncheck exclude meetings
    if (filterAdded) {
      setExcludeMeetings(false);
    } else {
      // When filter is removed, restore default state from settings
      setExcludeMeetings(settings.excludeMeetingsByDefault || false);
    }
    
    setLines((prev) => {
      if (filterAdded) {
        const exists = prev.some(line => line.text.includes('meta::meeting::'));
        if (exists) return prev;
        return [...prev.filter(line => line.text.trim() !== ''), { id: `line-${Date.now()}`, text: 'meta::meeting::', isTitle: false }];
      } else {
        return prev.filter(line => !line.text.includes('meta::meeting::'));
      }
    });
  };

  const handlePriorityClick = (priority, metaTag) => {
    if (activePriorityFilter === priority) {
      // Remove the priority
      setActivePriorityFilter('');
      setActivePriority('');
      removeFilterFromQuery(metaTag);
      setLines((prev) => prev.filter(line => !line.text.includes(metaTag)));
    } else {
      // Set new priority
      setLines((prev) => {
        const withoutPriorities = prev.filter(line => 
          !line.text.includes('meta::high') && 
          !line.text.includes('meta::medium') && 
          !line.text.includes('meta::low')
        );
        return [...withoutPriorities, { id: `line-${Date.now()}`, text: metaTag, isTitle: false }];
      });

      if (setSearchQuery) {
        setSearchQuery(prev => {
          const withoutPriorities = prev
            .split(' ')
            .filter(word => 
              !word.includes('meta::high') && 
              !word.includes('meta::medium') && 
              !word.includes('meta::low')
            )
            .join(' ');
          return `${withoutPriorities} ${metaTag}`.trim();
        });
      }

      setActivePriorityFilter(priority);
      setActivePriority(priority);
    }
  };

  const handleFilterClick = (filterText) => {
    const filterAdded = toggleFilter(filterText);
    setLines((prev) => {
      if (filterAdded) {
        const exists = prev.some(line => line.text.includes(filterText));
        if (exists) return prev;
        return [...prev.filter(line => line.text.trim() !== ''), { id: `line-${Date.now()}`, text: filterText, isTitle: false }];
      } else {
        return prev.filter(line => !line.text.includes(filterText));
      }
    });
  };

  const handleWorkstreamClick = () => {
    const filterAdded = toggleFilter('meta::workstream');
    setLines((prev) => {
      if (filterAdded) {
        const exists = prev.some(line => line.text.includes('meta::workstream'));
        if (exists) return prev;
        return [...prev.filter(line => line.text.trim() !== ''), { id: `line-${Date.now()}`, text: 'meta::workstream', isTitle: false }];
      } else {
        return prev.filter(line => !line.text.includes('meta::workstream'));
      }
    });
  };

  const handleExcludeEventsChange = (checked) => {
    setExcludeEvents(checked);
    // Only update search query if it already contains filter text
    if (searchQuery?.includes('-meta::event::') || searchQuery?.includes('-meta::meeting::')) {
      if (checked) {
        setSearchQuery(prev => {
          const trimmedPrev = prev ? prev.trim() : '';
          return trimmedPrev ? `${trimmedPrev} -meta::event::` : '-meta::event::';
        });
      } else {
        setSearchQuery(prev => {
          const words = prev.split(' ');
          return words.filter(word => word !== '-meta::event::').join(' ').trim();
        });
      }
    }
  };

  const handleExcludeMeetingsChange = (checked) => {
    setExcludeMeetings(checked);
    // Only update search query if it already contains filter text
    if (searchQuery?.includes('-meta::event::') || searchQuery?.includes('-meta::meeting::')) {
      if (checked) {
        setSearchQuery(prev => {
          const trimmedPrev = prev ? prev.trim() : '';
          return trimmedPrev ? `${trimmedPrev} -meta::meeting::` : '-meta::meeting::';
        });
      } else {
        setSearchQuery(prev => {
          const words = prev.split(' ');
          return words.filter(word => word !== '-meta::meeting::').join(' ').trim();
        });
      }
    }
  };

  const handleExcludeEventNotesChange = (checked) => {
    setExcludeEventNotes(checked);
  };

  const handleExcludeBackupNotesChange = (checked) => {
    setExcludeBackupNotes(checked);
  };

  const handleExcludeWatchEventsChange = (checked) => {
    setExcludeWatchEvents(checked);
  };

  const handleExcludeBookmarksChange = (checked) => {
    setExcludeBookmarks(checked);
  };

  const handleExcludeExpensesChange = (checked) => {
    setExcludeExpenses(checked);
  };

  const handleExcludeSensitiveChange = (checked) => {
    setExcludeSensitive(checked);
  };

  const handleExcludeTrackersChange = (checked) => {
    setExcludeTrackers(checked);
  };

  // Helper function to filter notes based on search query
  const getNotesMatchingSearch = () => {
    if (!searchQuery) return allNotes;
    
    return allNotes.filter(note => {
      // Check if note matches search criteria
      return (!searchQuery && isSameAsTodaysDate(note.created_datetime)) || searchInNote(note, searchQuery);
    });
  };

  // Get notes that match the current search query
  const notesMatchingSearch = getNotesMatchingSearch();

  // Calculate sensitive notes count (only from notes matching search)
  const sensitiveNotesCount = notesMatchingSearch.filter(note => 
    note.content && note.content.includes('meta::sensitive::')
  ).length;

  // Calculate tracker notes count (only from notes matching search)
  const trackerNotesCount = notesMatchingSearch.filter(note => 
    note.content && note.content.includes('meta::tracker')
  ).length;

  // Calculate event notes count (only from notes matching search)
  const eventNotesCount = notesMatchingSearch.filter(note => 
    note.content && note.content.includes('meta::event::')
  ).length;

  // Calculate backup notes count (only from notes matching search)
  const backupNotesCount = notesMatchingSearch.filter(note => 
    note.content && note.content.includes('meta::notes_backup_date')
  ).length;

  // Calculate watch events count (only from notes matching search)
  const watchEventsCount = notesMatchingSearch.filter(note => 
    note.content && note.content.includes('meta::watch')
  ).length;

  // Calculate bookmarks count (only from notes matching search)
  const bookmarksCount = notesMatchingSearch.filter(note => 
    note.content && (note.content.includes('meta::bookmark') || note.content.includes('meta::web_bookmark'))
  ).length;

  // Calculate expenses count (only from notes matching search)
  const expensesCount = notesMatchingSearch.filter(note => 
    note.content && note.content.includes('meta::expense')
  ).length;

  const handleClear = () => {
    setShowTodoButtons(false);
    setShowEventButtons(false);
    setShowMeetingButtons(false);
    setActivePriorityFilter('');
    setShowTodoSubButtons(false);
    setActivePriority('');
    setExcludeEvents(false);
    setExcludeMeetings(false);
    setExcludeEventNotes(false); // Clear all checkboxes
    setExcludeBackupNotes(false); // Clear all checkboxes
          setExcludeWatchEvents(false); // Clear watch events checkbox
      setExcludeBookmarks(false); // Clear bookmarks checkbox
      setExcludeExpenses(false); // Clear expenses checkbox
      setExcludeSensitive(false); // Clear sensitive checkbox
      setExcludeTrackers(false); // Clear tracker checkbox
    setLines([{ id: 'line-0', text: '', isTitle: false }]);
    setSearchQuery('');
  };

  const handleReset = () => {
    // Reset to initial state (on load state)
    setShowTodoButtons(false);
    setShowEventButtons(false);
    setShowMeetingButtons(false);
    setActivePriorityFilter('');
    setShowTodoSubButtons(false);
    setActivePriority('');
    setShowDeadlinePassedFilter(false);
    
    // Reset exclude checkboxes to their initial values
    setExcludeEvents(settings.excludeEventsByDefault || false);
    setExcludeMeetings(settings.excludeMeetingsByDefault || false);
    setExcludeEventNotes(true); // Default to true to exclude event notes
    setExcludeBackupNotes(true); // Default to true to exclude backup notes
    setExcludeWatchEvents(true); // Default to true to exclude watch events
    setExcludeBookmarks(true); // Default to true to exclude bookmarks
    setExcludeExpenses(true); // Default to true to exclude expenses
    setExcludeSensitive(true); // Default to true to exclude sensitive notes
    setExcludeTrackers(true); // Default to true to exclude tracker notes
    
    // Clear search query and lines
    setLines([{ id: 'line-0', text: '', isTitle: false }]);
    setSearchQuery('');
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Main filter buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleTodoClick}
          className={`px-3 py-1 text-xs rounded transition-all transform ${
            showTodoButtons
              ? 'opacity-100 scale-105 bg-purple-300 border border-purple-700'
              : 'opacity-30 hover:opacity-60 border'
          }`}
        >
          Todos
        </button>

        <button
          onClick={handleEventClick}
          className={`px-3 py-1 text-xs rounded transition-all transform ${
            showEventButtons
              ? 'opacity-100 scale-105 bg-blue-300 border border-blue-700'
              : 'opacity-30 hover:opacity-60 border'
          }`}
        >
          Events
        </button>

        <button
          onClick={handleMeetingClick}
          className={`px-3 py-1 text-xs rounded transition-all transform ${
            showMeetingButtons
              ? 'opacity-100 scale-105 bg-green-300 border border-green-700'
              : 'opacity-30 hover:opacity-60 border'
          }`}
        >
          Meetings
        </button>

        {showTodoButtons && (
          <div className="flex gap-1">
            <button
              onClick={() => handlePriorityClick('high', 'meta::high')}
              className={`px-2 py-1 text-xs rounded transition-all transform hover:opacity-100 hover:scale-105 
                ${activePriorityFilter === 'high' ? 'bg-red-300 border border-red-700' : 'bg-red-100 hover:bg-red-200 text-red-800'}`}
            >
              High
            </button>
            <button
              onClick={() => handlePriorityClick('medium', 'meta::medium')}
              className={`px-2 py-1 text-xs rounded transition-all transform hover:opacity-100 hover:scale-105 
                ${activePriorityFilter === 'medium' ? 'bg-yellow-300 border border-yellow-700' : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800'}`}
            >
              Medium
            </button>
            <button
              onClick={() => handlePriorityClick('low', 'meta::low')}
              className={`px-2 py-1 text-xs rounded transition-all transform hover:opacity-100 hover:scale-105 
                ${activePriorityFilter === 'low' ? 'bg-green-300 border border-green-700' : 'bg-green-100 hover:bg-green-200 text-green-800'}`}
            >
              Low
            </button>
          </div>
        )}

        <button
          onClick={() => handleFilterClick('meta::watch')}
          className={`px-3 py-1 text-xs rounded transition-all transform ${
            searchQuery?.includes('#watch')
              ? 'opacity-100 scale-105 bg-yellow-300 border border-yellow-700'
              : 'opacity-30 hover:opacity-60 border'
          }`}
        >
          Watch List
        </button>

        <button
          onClick={() => handleFilterClick('meta::today::')}
          className={`px-3 py-1 text-xs rounded transition-all transform ${
            searchQuery?.includes('meta::today::')
              ? 'opacity-100 scale-105 bg-green-300 border border-green-700'
              : 'opacity-30 hover:opacity-60 border'
          }`}
        >
          Today
        </button>

        <button
          onClick={() => {
            const filterAdded = toggleFilter('meta::end_date::');
            setShowDeadlinePassedFilter(filterAdded);
          }}
          className={`px-3 py-1 text-xs rounded transition-all transform ${
            searchQuery?.includes('meta::end_date::')
              ? 'opacity-100 scale-105 bg-blue-300 border border-blue-700'
              : 'opacity-30 hover:opacity-60 border'
          }`}
        >
          End Date
        </button>

        {showDeadlinePassedFilter && (
          <button
            onClick={() => setShowDeadlinePassedFilter(prev => !prev)}
            className={`px-3 py-1 text-xs rounded transition-all transform ${
              showDeadlinePassedFilter
                ? 'opacity-100 scale-105 bg-red-300 border border-red-700'
                : 'opacity-30 hover:opacity-60 border'
            }`}
          >
            Deadline Passed
          </button>
        )}

        <button
          onClick={() => handleFilterClick('meta::Abbreviation::')}
          className={`px-3 py-1 text-xs rounded transition-all transform ${
            searchQuery?.includes('meta::Abbreviation::')
              ? 'opacity-100 scale-105 bg-indigo-300 border border-indigo-700'
              : 'opacity-30 hover:opacity-60 border'
          }`}
        >
          Abbreviation
        </button>

        <button
          onClick={handleWorkstreamClick}
          className={`px-3 py-1 text-xs rounded transition-all transform ${
            searchQuery?.includes('meta::workstream')
              ? 'opacity-100 scale-105 bg-orange-300 border border-orange-700'
              : 'opacity-30 hover:opacity-60 border'
          }`}
        >
          Workstream
        </button>

        <button
          onClick={() => handleFilterClick('meta::review_pending')}
          className={`px-3 py-1 text-xs rounded transition-all transform ${
            searchQuery?.includes('meta::review_pending')
              ? 'opacity-100 scale-105 bg-yellow-300 border border-yellow-700'
              : 'opacity-30 hover:opacity-60 border'
          }`}
        >
          Review Pending
        </button>

        <button
          onClick={() => handleFilterClick('meta::people')}
          className={`px-3 py-1 text-xs rounded transition-all transform ${
            searchQuery?.includes('meta::people')
              ? 'opacity-100 scale-105 bg-pink-300 border border-pink-700'
              : 'opacity-30 hover:opacity-60 border'
          }`}
        >
          People
        </button>

        <button
          onClick={() => handleFilterClick('meta::notes_pinned')}
          className={`px-3 py-1 text-xs rounded transition-all transform ${
            searchQuery?.includes('meta::notes_pinned')
              ? 'opacity-100 scale-105 bg-red-300 border border-red-700'
              : 'opacity-30 hover:opacity-60 border'
          }`}
        >
          Pinned Notes
        </button>

        <button
          onClick={handleClear}
          className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
        >
          Clear
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-1 text-xs rounded bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200"
        >
          Reset
        </button>
      </div>

      {/* Exclude filters on a new line */}
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={excludeMeetings}
              onChange={(e) => handleExcludeMeetingsChange(e.target.checked)}
              className="form-checkbox h-3 w-3 text-purple-600"
            />
            Exclude Meetings
          </label>
        </div>
        <div className="flex flex-col">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={excludeEventNotes}
              onChange={(e) => handleExcludeEventNotesChange(e.target.checked)}
              className="form-checkbox h-3 w-3 text-purple-600"
            />
            Exclude Event Notes
          </label>
          {excludeEventNotes && eventNotesCount > 0 && (
            <span className="ml-5 mt-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
              {eventNotesCount} hidden
            </span>
          )}
        </div>
        <div className="flex flex-col">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={excludeBackupNotes}
              onChange={(e) => handleExcludeBackupNotesChange(e.target.checked)}
              className="form-checkbox h-3 w-3 text-purple-600"
            />
            Exclude Backup
          </label>
          {excludeBackupNotes && backupNotesCount > 0 && (
            <span className="ml-5 mt-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
              {backupNotesCount} hidden
            </span>
          )}
        </div>
        <div className="flex flex-col">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={excludeWatchEvents}
              onChange={(e) => handleExcludeWatchEventsChange(e.target.checked)}
              className="form-checkbox h-3 w-3 text-purple-600"
            />
            Exclude Watch Events
          </label>
          {excludeWatchEvents && watchEventsCount > 0 && (
            <span className="ml-5 mt-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
              {watchEventsCount} hidden
            </span>
          )}
        </div>
        <div className="flex flex-col">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={excludeBookmarks}
              onChange={(e) => handleExcludeBookmarksChange(e.target.checked)}
              className="form-checkbox h-3 w-3 text-purple-600"
            />
            Exclude Bookmarks
          </label>
          {excludeBookmarks && bookmarksCount > 0 && (
            <span className="ml-5 mt-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
              {bookmarksCount} hidden
            </span>
          )}
        </div>
        <div className="flex flex-col">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={excludeExpenses}
              onChange={(e) => handleExcludeExpensesChange(e.target.checked)}
              className="form-checkbox h-3 w-3 text-purple-600"
            />
            Exclude Expenses
          </label>
          {excludeExpenses && expensesCount > 0 && (
            <span className="ml-5 mt-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
              {expensesCount} hidden
            </span>
          )}
        </div>
        <div className="flex flex-col">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={excludeSensitive}
              onChange={(e) => handleExcludeSensitiveChange(e.target.checked)}
              className="form-checkbox h-3 w-3 text-purple-600"
            />
            Exclude Sensitive
          </label>
          {excludeSensitive && sensitiveNotesCount > 0 && (
            <span className="ml-5 mt-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
              {sensitiveNotesCount} hidden
            </span>
          )}
        </div>
        <div className="flex flex-col">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={excludeTrackers}
              onChange={(e) => handleExcludeTrackersChange(e.target.checked)}
              className="form-checkbox h-3 w-3 text-purple-600"
            />
            Exclude Trackers
          </label>
          {excludeTrackers && trackerNotesCount > 0 && (
            <span className="ml-5 mt-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
              {trackerNotesCount} hidden
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteFilters; 