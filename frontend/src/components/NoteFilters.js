import React, { useState, useEffect } from 'react';
import { isBackupDoneMessageNote, isTimelineNote, searchInNote } from '../utils/NotesUtils';
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
  onExcludeTimelinesChange,
  onExcludeBackupDoneMessagesChange,
  onExcludePeopleChange,
  resetTrigger = 0,
  // Controlled values from parent
  excludeEvents: excludeEventsProp,
  excludeMeetings: excludeMeetingsProp,
  excludeEventNotes: excludeEventNotesProp,
  excludeBackupNotes: excludeBackupNotesProp,
  excludeWatchEvents: excludeWatchEventsProp,
  excludeBookmarks: excludeBookmarksProp,
  excludeExpenses: excludeExpensesProp,
  excludeSensitive: excludeSensitiveProp,
  excludeTrackers: excludeTrackersProp,
  excludeTimelines: excludeTimelinesProp,
  excludeBackupDoneMessages: excludeBackupDoneMessagesProp,
  excludePeople: excludePeopleProp,
}) => {
  const isControlled = excludeEventsProp !== undefined;

  const [excludeEventsLocal, setExcludeEventsLocal] = useState(settings.excludeEventsByDefault || false);
  const [excludeMeetingsLocal, setExcludeMeetingsLocal] = useState(settings.excludeMeetingsByDefault || false);
  const [excludeEventNotesLocal, setExcludeEventNotesLocal] = useState(true);
  const [excludeBackupNotesLocal, setExcludeBackupNotesLocal] = useState(true);
  const [excludeWatchEventsLocal, setExcludeWatchEventsLocal] = useState(true);
  const [excludeBookmarksLocal, setExcludeBookmarksLocal] = useState(true);
  const [excludeExpensesLocal, setExcludeExpensesLocal] = useState(true);
  const [excludeSensitiveLocal, setExcludeSensitiveLocal] = useState(true);
  const [excludeTrackersLocal, setExcludeTrackersLocal] = useState(true);
  const [excludeTimelinesLocal, setExcludeTimelinesLocal] = useState(true);
  const [excludeBackupDoneMessagesLocal, setExcludeBackupDoneMessagesLocal] = useState(true);
  const [excludePeopleLocal, setExcludePeopleLocal] = useState(true);

  // Use controlled values if provided, otherwise fall back to local state
  const excludeEvents = isControlled ? excludeEventsProp : excludeEventsLocal;
  const excludeMeetings = isControlled ? excludeMeetingsProp : excludeMeetingsLocal;
  const excludeEventNotes = isControlled ? excludeEventNotesProp : excludeEventNotesLocal;
  const excludeBackupNotes = isControlled ? excludeBackupNotesProp : excludeBackupNotesLocal;
  const excludeWatchEvents = isControlled ? excludeWatchEventsProp : excludeWatchEventsLocal;
  const excludeBookmarks = isControlled ? excludeBookmarksProp : excludeBookmarksLocal;
  const excludeExpenses = isControlled ? excludeExpensesProp : excludeExpensesLocal;
  const excludeSensitive = isControlled ? excludeSensitiveProp : excludeSensitiveLocal;
  const excludeTrackers = isControlled ? excludeTrackersProp : excludeTrackersLocal;
  const excludeTimelines = isControlled ? excludeTimelinesProp : excludeTimelinesLocal;
  const excludeBackupDoneMessages = isControlled ? excludeBackupDoneMessagesProp : excludeBackupDoneMessagesLocal;
  const excludePeople = isControlled ? excludePeopleProp : excludePeopleLocal;

  // Reset all filters when resetTrigger changes (and is not 0) — only needed for uncontrolled mode
  useEffect(() => {
    if (resetTrigger > 0 && !isControlled) {
      setExcludeEventsLocal(settings.excludeEventsByDefault || false);
      setExcludeMeetingsLocal(settings.excludeMeetingsByDefault || false);
      setExcludeEventNotesLocal(true);
      setExcludeBackupNotesLocal(true);
      setExcludeWatchEventsLocal(true);
      setExcludeBookmarksLocal(true);
      setExcludeExpensesLocal(true);
      setExcludeSensitiveLocal(true);
      setExcludeTrackersLocal(true);
      setExcludeTimelinesLocal(true);
      setExcludeBackupDoneMessagesLocal(true);
      setExcludePeopleLocal(true);
      if (setSearchQuery) setSearchQuery('');
      if (setLines) setLines([{ id: 'line-0', text: '', isTitle: false }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetTrigger]);

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


  const handleEventClick = () => {
    const filterAdded = toggleFilter('meta::event::');

    // If filter is added, uncheck exclude events
    if (filterAdded) {
      handleExcludeEventsChange(false);
    } else {
      // When filter is removed, restore default state from settings
      handleExcludeEventsChange(settings.excludeEventsByDefault || false);
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
    if (!isControlled) setExcludeEventsLocal(checked);
    if (onExcludeEventsChange) onExcludeEventsChange(checked);
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
    if (!isControlled) setExcludeMeetingsLocal(checked);
    if (onExcludeMeetingsChange) onExcludeMeetingsChange(checked);
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
    if (!isControlled) setExcludeEventNotesLocal(checked);
    if (onExcludeEventNotesChange) onExcludeEventNotesChange(checked);
  };

  const handleExcludeBackupNotesChange = (checked) => {
    if (!isControlled) setExcludeBackupNotesLocal(checked);
    if (onExcludeBackupNotesChange) onExcludeBackupNotesChange(checked);
  };

  const handleExcludeWatchEventsChange = (checked) => {
    if (!isControlled) setExcludeWatchEventsLocal(checked);
    if (onExcludeWatchEventsChange) onExcludeWatchEventsChange(checked);
  };

  const handleExcludeBookmarksChange = (checked) => {
    if (!isControlled) setExcludeBookmarksLocal(checked);
    if (onExcludeBookmarksChange) onExcludeBookmarksChange(checked);
  };

  const handleExcludeExpensesChange = (checked) => {
    if (!isControlled) setExcludeExpensesLocal(checked);
    if (onExcludeExpensesChange) onExcludeExpensesChange(checked);
  };

  const handleExcludeSensitiveChange = (checked) => {
    if (!isControlled) setExcludeSensitiveLocal(checked);
    if (onExcludeSensitiveChange) onExcludeSensitiveChange(checked);
  };

  const handleExcludeTrackersChange = (checked) => {
    if (!isControlled) setExcludeTrackersLocal(checked);
    if (onExcludeTrackersChange) onExcludeTrackersChange(checked);
  };

  const handleExcludeTimelinesChange = (checked) => {
    if (!isControlled) setExcludeTimelinesLocal(checked);
    if (onExcludeTimelinesChange) onExcludeTimelinesChange(checked);
  };

  const handleExcludeBackupDoneMessagesChange = (checked) => {
    if (!isControlled) setExcludeBackupDoneMessagesLocal(checked);
    if (onExcludeBackupDoneMessagesChange) onExcludeBackupDoneMessagesChange(checked);
  };

  const handleExcludePeopleChange = (checked) => {
    if (!isControlled) setExcludePeopleLocal(checked);
    if (onExcludePeopleChange) onExcludePeopleChange(checked);
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

  const timelineNotesCount = notesMatchingSearch.filter(isTimelineNote).length;

  const backupDoneMessagesCount = notesMatchingSearch.filter(isBackupDoneMessageNote).length;

  const peopleNotesCount = notesMatchingSearch.filter(note =>
    note.content && note.content.includes('meta::person::')
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
    handleExcludeEventsChange(false);
    handleExcludeMeetingsChange(false);
    handleExcludeEventNotesChange(false);
    handleExcludeBackupNotesChange(false);
    handleExcludeWatchEventsChange(false);
    handleExcludeBookmarksChange(false);
    handleExcludeExpensesChange(false);
    handleExcludeSensitiveChange(false);
    handleExcludeTrackersChange(false);
    handleExcludeTimelinesChange(false);
    handleExcludeBackupDoneMessagesChange(false);
    handleExcludePeopleChange(false);
    if (setLines) setLines([{ id: 'line-0', text: '', isTitle: false }]);
    if (setSearchQuery) setSearchQuery('');
  };

  const handleReset = () => {
    handleExcludeEventsChange(settings.excludeEventsByDefault || false);
    handleExcludeMeetingsChange(settings.excludeMeetingsByDefault || false);
    handleExcludeEventNotesChange(true);
    handleExcludeBackupNotesChange(true);
    handleExcludeWatchEventsChange(true);
    handleExcludeBookmarksChange(true);
    handleExcludeExpensesChange(true);
    handleExcludeSensitiveChange(true);
    handleExcludeTrackersChange(true);
    handleExcludeTimelinesChange(true);
    handleExcludeBackupDoneMessagesChange(true);
    handleExcludePeopleChange(true);
    setLines([{ id: 'line-0', text: '', isTitle: false }]);
    setSearchQuery('');
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Main filter buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleEventClick}
          className={`px-3 py-1 text-xs rounded transition-all transform ${searchQuery?.includes('meta::event::')
            ? 'opacity-100 scale-105 bg-blue-300 border border-blue-700'
            : 'opacity-30 hover:opacity-60 border'
            }`}
        >
          Events
        </button>

        <button
          onClick={() => handleFilterClick('meta::watch')}
          className={`px-3 py-1 text-xs rounded transition-all transform ${searchQuery?.includes('#watch')
            ? 'opacity-100 scale-105 bg-yellow-300 border border-yellow-700'
            : 'opacity-30 hover:opacity-60 border'
            }`}
        >
          Watch List
        </button>

        <button
          onClick={() => handleFilterClick('meta::event_deadline:')}
          className={`px-3 py-1 text-xs rounded transition-all transform ${searchQuery?.includes('meta::event_deadline:')
            ? 'opacity-100 scale-105 bg-orange-300 border border-orange-700'
            : 'opacity-30 hover:opacity-60 border'
            }`}
        >
          Deadline
        </button>

        <button
          onClick={() => handleFilterClick('meta::Abbreviation::')}
          className={`px-3 py-1 text-xs rounded transition-all transform ${searchQuery?.includes('meta::Abbreviation::')
            ? 'opacity-100 scale-105 bg-indigo-300 border border-indigo-700'
            : 'opacity-30 hover:opacity-60 border'
            }`}
        >
          Abbreviation
        </button>

        <button
          onClick={handleWorkstreamClick}
          className={`px-3 py-1 text-xs rounded transition-all transform ${searchQuery?.includes('meta::workstream')
            ? 'opacity-100 scale-105 bg-orange-300 border border-orange-700'
            : 'opacity-30 hover:opacity-60 border'
            }`}
        >
          Workstream
        </button>


        <button
          onClick={() => handleFilterClick('meta::notes_pinned')}
          className={`px-3 py-1 text-xs rounded transition-all transform ${searchQuery?.includes('meta::notes_pinned')
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
        <span className="text-xs text-gray-700 font-medium self-center">Exclude:</span>
        <div className="flex flex-col">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={excludeMeetings}
              onChange={(e) => handleExcludeMeetingsChange(e.target.checked)}
              className="form-checkbox h-3 w-3 text-purple-600"
            />
            Meetings
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
            Event Notes
          </label>
          {excludeEventNotes && eventNotesCount > 0 && searchQuery && searchQuery.trim() !== '' && (
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
            Backup
          </label>
          {excludeBackupNotes && backupNotesCount > 0 && searchQuery && searchQuery.trim() !== '' && (
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
            Watch Events
          </label>
          {excludeWatchEvents && watchEventsCount > 0 && searchQuery && searchQuery.trim() !== '' && (
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
            Bookmarks
          </label>
          {excludeBookmarks && bookmarksCount > 0 && searchQuery && searchQuery.trim() !== '' && (
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
            Expenses
          </label>
          {excludeExpenses && expensesCount > 0 && searchQuery && searchQuery.trim() !== '' && (
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
            Sensitive
          </label>
          {excludeSensitive && sensitiveNotesCount > 0 && searchQuery && searchQuery.trim() !== '' && (
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
            Trackers
          </label>
          {excludeTrackers && trackerNotesCount > 0 && searchQuery && searchQuery.trim() !== '' && (
            <span className="ml-5 mt-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
              {trackerNotesCount} hidden
            </span>
          )}
        </div>
        <div className="flex flex-col">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={excludeTimelines}
              onChange={(e) => handleExcludeTimelinesChange(e.target.checked)}
              className="form-checkbox h-3 w-3 text-purple-600"
            />
            Timelines
          </label>
          {excludeTimelines && timelineNotesCount > 0 && searchQuery && searchQuery.trim() !== '' && (
            <span className="ml-5 mt-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
              {timelineNotesCount} hidden
            </span>
          )}
        </div>
        <div className="flex flex-col">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={excludeBackupDoneMessages}
              onChange={(e) => handleExcludeBackupDoneMessagesChange(e.target.checked)}
              className="form-checkbox h-3 w-3 text-purple-600"
            />
            Backup Done Messages
          </label>
          {excludeBackupDoneMessages && backupDoneMessagesCount > 0 && searchQuery && searchQuery.trim() !== '' && (
            <span className="ml-5 mt-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
              {backupDoneMessagesCount} hidden
            </span>
          )}
        </div>
        <div className="flex flex-col">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={excludePeople}
              onChange={(e) => handleExcludePeopleChange(e.target.checked)}
              className="form-checkbox h-3 w-3 text-purple-600"
            />
            People
          </label>
          {excludePeople && peopleNotesCount > 0 && searchQuery && searchQuery.trim() !== '' && (
            <span className="ml-5 mt-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
              {peopleNotesCount} hidden
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteFilters; 
