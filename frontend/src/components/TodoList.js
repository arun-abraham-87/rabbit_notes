import React, { useState, useEffect } from 'react';
import {
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ClockIcon,
  ArrowPathIcon,
  FunnelIcon,
  ListBulletIcon,
  Squares2X2Icon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/solid';
import { parseNoteContent } from '../utils/TextUtils';
import { formatDate } from '../utils/DateUtils';

const TodoList = ({ todos, notes, updateTodosCallback, updateNoteCallBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorities, setPriorities] = useState({});
  const [priorityFilter, setPriorityFilter] = useState(null);
  const [snackbar, setSnackbar] = useState(null);
  const [removedTodo, setRemovedTodo] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // Changed from 'grid' to 'list'
  const [sortBy, setSortBy] = useState('priority'); // 'priority', 'date', 'age'
  const [showFilters, setShowFilters] = useState(true); // Changed from false to true

  // Get overdue high priority todos
  const getOverdueHighPriorityTodos = () => {
    return todos.filter(todo => {
      const tagMatch = todo.content.match(/meta::(high|medium|low)/i);
      const priority = tagMatch ? tagMatch[1].toLowerCase() : 'low';
      const todoDateMatch = todo.content.match(/meta::todo::([^\n]+)/);
      const createdDate = todoDateMatch ? new Date(todoDateMatch[1]) : new Date(todo.created_datetime);
      const daysOld = (Date.now() - createdDate) / (1000 * 60 * 60 * 24);
      return priority === 'high' && daysOld > 2;
    });
  };

  // Check for overdue todos every hour instead of every minute since we're checking days
  useEffect(() => {
    const interval = setInterval(() => {
      const overdueTodos = getOverdueHighPriorityTodos();
      if (overdueTodos.length > 0) {
        // Force a re-render
        setPriorities(prev => ({...prev}));
      }
    }, 3600000); // Check every hour

    return () => clearInterval(interval);
  }, [todos]);

  const overdueTodos = getOverdueHighPriorityTodos();

  const parseAusDate = (str) => {
    // For ISO format dates (e.g., 2025-04-24T14:16:35.161Z)
    if (str.includes('T') && str.endsWith('Z')) {
      return new Date(str);
    }

    // For Australian format dates
    const [datePart, timePart, ampmRaw] = str.split(/[\s,]+/);
    const [day, month, year] = datePart?.split('/')?.map(Number) || [];
    let [hour, minute, second] = timePart?.split(':')?.map(Number) || [];
    const ampm = ampmRaw ? ampmRaw.toLowerCase() : null;

    if (ampm === 'pm' && hour !== 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;

    return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
  };

  const getAgeClass = (createdDate) => {
    const created = new Date(createdDate); // Use direct Date constructor for ISO strings
    const ageInDays = (Date.now() - created) / (1000 * 60 * 60 * 24);
    if (ageInDays > 2) return 'text-red-500';
    if (ageInDays > 1) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getAgeLabel = (createdDate) => {
    const now = new Date();
    const created = new Date(createdDate); // Use direct Date constructor for ISO strings
    const diffMs = now - created;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays >= 1) return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m ago`;
  };

  const getPriorityAge = (content) => {
    const match = content.match(/meta::priority_age::(.+)/);
    if (!match) return null;
    
    const priorityDate = new Date(match[1]);
    const now = new Date();
    const diffMs = now - priorityDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes === 0 ? 'just now' : `${diffMinutes}m`;
      }
      return `${diffHours}h`;
    }
    return `${diffDays}d`;
  };

  const updateTodo = async (id, updatedContent, removeNote = false) => {
    const response = await fetch(`http://localhost:5001/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: updatedContent }),
    });

    if (response.ok) {
      let updatedTodos;
      if (removeNote) {
        updatedTodos = todos.filter((note) => note.id !== id);
      } else {
        updatedTodos = todos.map((note) =>
          note.id === id ? { ...note, content: updatedContent } : note
        );
      }
      updateNoteCallBack(
        notes.map((note) =>
          note.id === id ? { ...note, content: updatedContent } : note
        )
      );
      updateTodosCallback(updatedTodos);
    }
  };

  const onPriorityChange = (id, level) => {
    const note = todos.find((todo) => todo.id === id);
    if (note) {
      const currentDate = new Date().toISOString();
      const cleanedContent = note.content
        .split('\n')
        .filter(line => 
          !line.trim().startsWith('meta::high') && 
          !line.trim().startsWith('meta::medium') && 
          !line.trim().startsWith('meta::low') &&
          !line.trim().startsWith('meta::priority_age::')
        )
        .join('\n')
        .trim();
      const updatedContent = `${cleanedContent}\nmeta::${level}\nmeta::priority_age::${currentDate}`;
      updateTodo(id, updatedContent);
    }
  };

  const handlePriorityClick = (id, level) => {
    setPriorities((prev) => ({ ...prev, [id]: level }));
    onPriorityChange(id, level);
  };

  const handleCheckboxChange = (id, checked) => {
    const note = todos.find((todo) => todo.id === id);
    if (!note) return;

    if (checked) {
      const updatedContent = note.content.replace(/meta::todo/gi, '').trim();
      updateTodo(id, updatedContent, true);

      const timeoutId = setTimeout(() => {
        updateTodo(id, updatedContent, true);
        setSnackbar(null);
        setRemovedTodo(null);
      }, 5000);

      setSnackbar({ id, content: note.content, timeoutId });
      setRemovedTodo({ ...note, content: updatedContent });
    }
  };

  const handleUndo = () => {
    if (snackbar?.timeoutId) clearTimeout(snackbar.timeoutId);
    if (removedTodo) {
      const updatedTodos = [removedTodo, ...todos];
      updateTodosCallback(updatedTodos);
    }
    setSnackbar(null);
    setRemovedTodo(null);
  };

  // Calculate total todos and priority counts (only filtered by search)
  const { total, high, medium, low } = todos.reduce(
    (acc, todo) => {
      // Only count if it matches search and is a todo
      if (todo.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
          todo.content.includes('meta::todo')) {
        // Increment total
        acc.total++;
        
        // Count priorities independently of priority filter
        const tagMatch = todo.content.match(/meta::(high|medium|low)/i);
        const priority = tagMatch ? tagMatch[1].toLowerCase() : 'low';
        acc[priority]++;
      }
      return acc;
    },
    { total: 0, high: 0, medium: 0, low: 0 }
  );

  // Filter todos for display based on all filters
  const filteredTodos = todos
    .filter((todo) => {
      const matchesSearch = todo.content.toLowerCase().includes(searchQuery.toLowerCase());
      const tagMatch = todo.content.match(/meta::(high|medium|low)/i);
      const tag = tagMatch ? tagMatch[1].toLowerCase() : 'low';
      const assignedPriority = priorities[todo.id] || tag;
      const matchesPriority = priorityFilter ? assignedPriority === priorityFilter : true;
      const isMetaTodo = todo.content.includes('meta::todo');
      return matchesSearch && matchesPriority && isMetaTodo;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        const getPriorityValue = (todo) => {
          const match = todo.content.match(/meta::(high|medium|low)/i);
          const priority = match ? match[1].toLowerCase() : 'low';
          return priority === 'high' ? 3 : priority === 'medium' ? 2 : 1;
        };
        return getPriorityValue(b) - getPriorityValue(a);
      } else if (sortBy === 'date') {
        return parseAusDate(b.created_datetime) - parseAusDate(a.created_datetime);
      } else if (sortBy === 'age') {
        return parseAusDate(a.created_datetime) - parseAusDate(b.created_datetime);
      }
      return 0;
    });

  // Add new function to create todo
  const createTodo = async (content) => {
    const now = new Date();
    const timestamp = now.toISOString(); // This gives us format like 2025-04-24T14:16:35.161Z
    const todoContent = `${content}\nmeta::todo::${timestamp}\nmeta::low\nmeta::priority_age::${timestamp}`;
    
    try {
      const response = await fetch('http://localhost:5001/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: todoContent }),
      });

      if (response.ok) {
        const newTodo = await response.json();
        updateTodosCallback([newTodo, ...todos]);
        updateNoteCallBack([newTodo, ...notes]);
        setSearchQuery(''); // Clear the search bar after creating todo
      }
    } catch (error) {
      console.error('Failed to create todo:', error);
    }
  };

  // Add handler for Cmd+Enter
  const handleSearchKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      createTodo(searchQuery.trim());
    }
  };

  const renderTodoCard = (todo) => {
    const tagMatch = todo.content.match(/meta::(high|medium|low)/i);
    const tag = tagMatch ? tagMatch[1].toLowerCase() : 'low';
    const currentPriority = priorities[todo.id] || tag;
    
    // Extract creation date from meta::todo tag
    const todoDateMatch = todo.content.match(/meta::todo::([^\n]+)/);
    const createdDate = todoDateMatch ? todoDateMatch[1] : todo.created_datetime;
    const ageColorClass = getAgeClass(createdDate);
    const priorityAge = getPriorityAge(todo.content);

    const priorityColors = {
      high: 'bg-rose-50',
      medium: 'bg-amber-50',
      low: 'bg-emerald-50'
    };

    return (
      <div
        key={todo.id}
        className={`group relative ${
          viewMode === 'grid' ? 'h-[200px]' : 'min-h-[80px]'
        } flex flex-col rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 ${
          priorityColors[currentPriority]
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-white/50">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              onChange={(e) => handleCheckboxChange(todo.id, e.target.checked)}
            />
            <span className={`text-xs font-medium ${ageColorClass}`}>
              {getAgeLabel(createdDate)}
            </span>
            {priorityAge && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-xs font-medium text-gray-500">
                  {currentPriority} for {priorityAge}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePriorityClick(todo.id, 'high')}
              className={`px-2 py-1 rounded font-medium transition-all duration-200 ${
                currentPriority === 'high'
                  ? 'bg-rose-200 text-rose-700'
                  : 'hover:bg-rose-100 text-gray-400 hover:text-rose-600'
              }`}
              title="High priority"
            >
              H
            </button>
            <button
              onClick={() => handlePriorityClick(todo.id, 'medium')}
              className={`px-2 py-1 rounded font-medium transition-all duration-200 ${
                currentPriority === 'medium'
                  ? 'bg-amber-200 text-amber-700'
                  : 'hover:bg-amber-100 text-gray-400 hover:text-amber-600'
              }`}
              title="Medium priority"
            >
              M
            </button>
            <button
              onClick={() => handlePriorityClick(todo.id, 'low')}
              className={`px-2 py-1 rounded font-medium transition-all duration-200 ${
                currentPriority === 'low'
                  ? 'bg-emerald-200 text-emerald-700'
                  : 'hover:bg-emerald-100 text-gray-400 hover:text-emerald-600'
              }`}
              title="Low priority"
            >
              L
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-3 overflow-auto">
          <div className="text-sm text-gray-800 whitespace-pre-wrap">
            {(() => {
              // Remove all meta tags from content
              const content = todo.content
                .split('\n')
                .filter(line => !line.trim().startsWith('meta::'))
                .join('\n')
                .trim();

              // Split content into lines to handle headings
              return content.split('\n').map((line, lineIndex) => {
                // Check for headings first
                const h1Match = line.match(/^###(.+)###$/);
                const h2Match = line.match(/^##(.+)##$/);

                if (h1Match) {
                  return (
                    <h1 key={`line-${lineIndex}`} className="text-xl font-bold mb-2 text-gray-900">
                      {parseNoteContent({ content: h1Match[1].trim(), searchTerm: searchQuery })}
                    </h1>
                  );
                }

                if (h2Match) {
                  return (
                    <h2 key={`line-${lineIndex}`} className="text-lg font-semibold mb-2 text-gray-800">
                      {parseNoteContent({ content: h2Match[1].trim(), searchTerm: searchQuery })}
                    </h2>
                  );
                }

                // Process regular lines with URLs and search highlighting
                return (
                  <div key={`line-${lineIndex}`} className="mb-1">
                    {parseNoteContent({ content: line, searchTerm: searchQuery })}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {overdueTodos.length > 0 && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-rose-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-rose-800">
                Attention needed: {overdueTodos.length} high priority {overdueTodos.length === 1 ? 'todo' : 'todos'} older than 2 days
              </h3>
              <div className="mt-2 text-sm text-rose-700">
                <ul className="list-disc pl-5 space-y-1">
                  {overdueTodos.map(todo => (
                    <li key={todo.id}>
                      {todo.content.split('\n').filter(line => !line.trim().startsWith('meta::')).join(' ').slice(0, 100)}
                      {todo.content.length > 100 ? '...' : ''}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Header Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Todo List</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
              title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
            >
              {viewMode === 'grid' ? (
                <ListBulletIcon className="h-5 w-5 text-gray-600" />
              ) : (
                <Squares2X2Icon className="h-5 w-5 text-gray-600" />
              )}
            </button>
            <button
              onClick={() => setShowFilters(prev => !prev)}
              className={`p-2 rounded-lg transition-all duration-200 ${
                showFilters ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Toggle filters"
            >
              <FunnelIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 bg-white rounded-xl border p-4 shadow-sm">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search todos or press Cmd+Enter to create new todo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="block w-full pl-10 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {showFilters && (
            <div className="flex flex-col gap-4 pt-4 border-t">
              {/* Priority Stats */}
              <div className="grid grid-cols-4 gap-4">
                <button
                  onClick={() => setPriorityFilter(null)}
                  className={`flex flex-col items-center p-3 rounded-lg border transition-all duration-200 ${
                    priorityFilter === null
                      ? 'ring-2 ring-indigo-500 ring-offset-2'
                      : 'hover:border-indigo-200 hover:shadow-sm'
                  }`}
                >
                  <div className="text-xs font-medium text-gray-500">Total</div>
                  <div className="text-2xl font-bold text-gray-900">{total}</div>
                </button>
                <button
                  onClick={() => setPriorityFilter('high')}
                  className={`flex flex-col items-center p-3 rounded-lg border transition-all duration-200 ${
                    priorityFilter === 'high'
                      ? 'bg-rose-50 border-rose-200 ring-2 ring-rose-500 ring-offset-2'
                      : 'hover:bg-rose-50/50 hover:border-rose-200 hover:shadow-sm'
                  }`}
                >
                  <div className="text-xs font-medium text-rose-600">High</div>
                  <div className="text-2xl font-bold text-rose-700">{high}</div>
                </button>
                <button
                  onClick={() => setPriorityFilter('medium')}
                  className={`flex flex-col items-center p-3 rounded-lg border transition-all duration-200 ${
                    priorityFilter === 'medium'
                      ? 'bg-amber-50 border-amber-200 ring-2 ring-amber-500 ring-offset-2'
                      : 'hover:bg-amber-50/50 hover:border-amber-200 hover:shadow-sm'
                  }`}
                >
                  <div className="text-xs font-medium text-amber-600">Medium</div>
                  <div className="text-2xl font-bold text-amber-700">{medium}</div>
                </button>
                <button
                  onClick={() => setPriorityFilter('low')}
                  className={`flex flex-col items-center p-3 rounded-lg border transition-all duration-200 ${
                    priorityFilter === 'low'
                      ? 'bg-emerald-50 border-emerald-200 ring-2 ring-emerald-500 ring-offset-2'
                      : 'hover:bg-emerald-50/50 hover:border-emerald-200 hover:shadow-sm'
                  }`}
                >
                  <div className="text-xs font-medium text-emerald-600">Low</div>
                  <div className="text-2xl font-bold text-emerald-700">{low}</div>
                </button>
              </div>

              {/* Sort Controls */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Sort by:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSortBy('priority')}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                      sortBy === 'priority'
                        ? 'bg-indigo-100 text-indigo-700 font-medium'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    Priority
                  </button>
                  <button
                    onClick={() => setSortBy('date')}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                      sortBy === 'date'
                        ? 'bg-indigo-100 text-indigo-700 font-medium'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    Newest
                  </button>
                  <button
                    onClick={() => setSortBy('age')}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                      sortBy === 'age'
                        ? 'bg-indigo-100 text-indigo-700 font-medium'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    Oldest
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Todo Grid/List */}
      <div className={`grid gap-4 ${
        viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
      }`}>
        {filteredTodos.map(renderTodoCard)}
      </div>

      {/* Empty State */}
      {filteredTodos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircleIcon className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No todos found</h3>
          <p className="text-sm text-gray-500">
            {searchQuery
              ? "No todos match your search criteria"
              : "You're all caught up! Add a new todo to get started"}
          </p>
        </div>
      )}

      {/* Snackbar */}
      {snackbar && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
          <span className="text-sm">Todo completed</span>
          <button
            onClick={handleUndo}
            className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors duration-200"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
};

export default TodoList;
