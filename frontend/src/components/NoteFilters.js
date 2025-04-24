import React, { useState } from 'react';

const NoteFilters = ({
  setLines,
  setShowTodoSubButtons,
  setActivePriority,
  setSearchQuery,
  searchQuery
}) => {
  const [showTodoButtons, setShowTodoButtons] = useState(false);
  const [activePriorityFilter, setActivePriorityFilter] = useState('');

  const handleTodoClick = () => {
    setShowTodoSubButtons(false);
    setActivePriority('');
    setLines((prev) => {
      const exists = prev.some(line => line.text.includes('meta::todo'));
      if (exists) return prev;
      return [...prev.filter(line => line.text.trim() !== ''), { id: `line-${Date.now()}`, text: 'meta::todo', isTitle: false }];
    });
    if (setSearchQuery) setSearchQuery(prev => (prev ? prev + ' ' : '') + 'meta::todo');
    setShowTodoButtons(true);
    setShowTodoSubButtons(true);
  };

  const handlePriorityClick = (priority, metaTag) => {
    setLines((prev) => {
      const exists = prev.some(line => line.text.includes(metaTag));
      if (exists) return prev;
      return [...prev.filter(line => line.text.trim() !== ''), { id: `line-${Date.now()}`, text: metaTag, isTitle: false }];
    });
    if (setSearchQuery) setSearchQuery(prev => (prev ? prev + ' ' : '') + metaTag);
    setActivePriorityFilter(priority);
    setActivePriority(priority);
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

      {showTodoButtons && (
        <div className="flex gap-1">
          <button
            onClick={() => handlePriorityClick('high', 'meta::high')}
            className={`px-2 py-1 text-xs rounded transition-all transform hover:opacity-100 hover:scale-105 
              ${activePriorityFilter === '' || activePriorityFilter === 'high' ? 'opacity-100' : 'opacity-30'}
              ${activePriorityFilter === 'high' ? 'bg-red-300 border border-red-700' : 'bg-red-100 hover:bg-red-200 text-red-800'}`}
          >
            High
          </button>
          <button
            onClick={() => handlePriorityClick('medium', 'meta::medium')}
            className={`px-2 py-1 text-xs rounded transition-all transform hover:opacity-100 hover:scale-105 
              ${activePriorityFilter === '' || activePriorityFilter === 'medium' ? 'opacity-100' : 'opacity-30'}
              ${activePriorityFilter === 'medium' ? 'bg-yellow-300 border border-yellow-700' : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800'}`}
          >
            Medium
          </button>
          <button
            onClick={() => handlePriorityClick('low', 'meta::low')}
            className={`px-2 py-1 text-xs rounded transition-all transform hover:opacity-100 hover:scale-105 
              ${activePriorityFilter === '' || activePriorityFilter === 'low' ? 'opacity-100' : 'opacity-30'}
              ${activePriorityFilter === 'low' ? 'bg-green-300 border border-green-700' : 'bg-green-100 hover:bg-green-200 text-green-800'}`}
          >
            Low
          </button>
        </div>
      )}

      <button
        onClick={() => {
          setLines((prev) => {
            const exists = prev.some(line => line.text.includes('#watch'));
            if (exists) return prev;
            return [...prev.filter(line => line.text.trim() !== ''), { id: `line-${Date.now()}`, text: '#watch', isTitle: false }];
          });
          if (setSearchQuery) setSearchQuery(prev => (prev ? prev + ' ' : '') + '#watch');
          setShowTodoButtons(false);
          setActivePriorityFilter('');
          setShowTodoSubButtons(false);
          setActivePriority('');
        }}
        className={`px-3 py-1 text-xs rounded transition-all transform ${
          searchQuery?.includes('#watch')
            ? 'opacity-100 scale-105 bg-yellow-300 border border-yellow-700'
            : 'opacity-30 hover:opacity-60 border'
        }`}
      >
        Watch List
      </button>

      <button
        onClick={() => {
          setLines((prev) => {
            const exists = prev.some(line => line.text.includes('meta::today::'));
            if (exists) return prev;
            return [...prev.filter(line => line.text.trim() !== ''), { id: `line-${Date.now()}`, text: 'meta::today::', isTitle: false }];
          });
          if (setSearchQuery) setSearchQuery(prev => (prev ? prev + ' ' : '') + 'meta::today::');
          setShowTodoButtons(false);
          setActivePriorityFilter('');
          setShowTodoSubButtons(false);
          setActivePriority('');
        }}
        className={`px-3 py-1 text-xs rounded transition-all transform ${
          searchQuery?.includes('meta::today::')
            ? 'opacity-100 scale-105 bg-green-300 border border-green-700'
            : 'opacity-30 hover:opacity-60 border'
        }`}
      >
        Today
      </button>

      <div className="relative group">
        <button className="px-3 py-1 text-xs rounded transition-all transform opacity-30 hover:opacity-60 border">
          More Filters ▾
        </button>
        <div className="absolute left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 hidden group-hover:block min-w-[140px]">
          <button
            onClick={() => {
              setLines((prev) => {
                const exists = prev.some(line => line.text.includes('meta::end_date::'));
                if (exists) return prev;
                return [...prev.filter(line => line.text.trim() !== ''), { id: `line-${Date.now()}`, text: 'meta::end_date::', isTitle: false }];
              });
              if (setSearchQuery) setSearchQuery(prev => (prev ? prev + ' ' : '') + 'meta::end_date::');
              setShowTodoButtons(false);
              setActivePriorityFilter('');
              setShowTodoSubButtons(false);
              setActivePriority('');
            }}
            className="block w-full text-left px-3 py-1 text-xs hover:bg-gray-100"
          >
            Has End Date
          </button>
          <button
            onClick={() => {
              setLines((prev) => {
                const exists = prev.some(line => line.text.includes('meta::Abbreviation::'));
                if (exists) return prev;
                return [...prev.filter(line => line.text.trim() !== ''), { id: `line-${Date.now()}`, text: 'meta::Abbreviation::', isTitle: false }];
              });
              if (setSearchQuery) setSearchQuery(prev => (prev ? prev + ' ' : '') + 'meta::Abbreviation::');
              setShowTodoButtons(false);
              setActivePriorityFilter('');
              setShowTodoSubButtons(false);
              setActivePriority('');
            }}
            className="block w-full text-left px-3 py-1 text-xs hover:bg-gray-100"
          >
            Abbreviation
          </button>
          <button
            onClick={() => {
              setLines((prev) => {
                const exists = prev.some(line => line.text.includes('#people'));
                if (exists) return prev;
                return [...prev.filter(line => line.text.trim() !== ''), { id: `line-${Date.now()}`, text: '#people', isTitle: false }];
              });
              if (setSearchQuery) setSearchQuery(prev => (prev ? prev + ' ' : '') + '#people');
              setShowTodoButtons(false);
              setActivePriorityFilter('');
              setShowTodoSubButtons(false);
              setActivePriority('');
            }}
            className="block w-full text-left px-3 py-1 text-xs hover:bg-gray-100"
          >
            People
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteFilters; 