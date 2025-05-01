import React, { useState, useEffect } from 'react';

const NoteFilters = ({
  setLines,
  setShowTodoSubButtons,
  setActivePriority,
  setSearchQuery,
  searchQuery,
  settings = {},
  onExcludeEventsChange,
  onExcludeMeetingsChange,
  onDeadlinePassedChange
}) => {
  const [showTodoButtons, setShowTodoButtons] = useState(false);
  const [showEventButtons, setShowEventButtons] = useState(false);
  const [showMeetingButtons, setShowMeetingButtons] = useState(false);
  const [activePriorityFilter, setActivePriorityFilter] = useState('');
  const [excludeEvents, setExcludeEvents] = useState(settings.excludeEventsByDefault || false);
  const [excludeMeetings, setExcludeMeetings] = useState(settings.excludeMeetingsByDefault || false);
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

  const handleClear = () => {
    setShowTodoButtons(false);
    setShowEventButtons(false);
    setShowMeetingButtons(false);
    setActivePriorityFilter('');
    setShowTodoSubButtons(false);
    setActivePriority('');
    setExcludeEvents(false);
    setExcludeMeetings(false);
    setLines([{ id: 'line-0', text: '', isTitle: false }]);
    setSearchQuery('');
  };

  return (
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
        onClick={() => handleFilterClick('#people')}
        className={`px-3 py-1 text-xs rounded transition-all transform ${
          searchQuery?.includes('#people')
            ? 'opacity-100 scale-105 bg-pink-300 border border-pink-700'
            : 'opacity-30 hover:opacity-60 border'
        }`}
      >
        People
      </button>

      <div className="flex items-center gap-3 ml-2">
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={excludeEvents}
            onChange={(e) => handleExcludeEventsChange(e.target.checked)}
            className="form-checkbox h-3 w-3 text-purple-600"
          />
          Exclude Events
        </label>
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

      <button
        onClick={handleClear}
        className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
      >
        Clear
      </button>
    </div>
  );
};

export default NoteFilters; 