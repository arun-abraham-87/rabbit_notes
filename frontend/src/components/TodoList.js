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
import { processContent } from '../utils/TextUtils';
import { formatDate } from '../utils/DateUtils';

const TodoList = ({ todos, notes, updateTodosCallback, updateNoteCallBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorities, setPriorities] = useState({});
  const [priorityFilter, setPriorityFilter] = useState(null);
  const [snackbar, setSnackbar] = useState(null);
  const [removedTodo, setRemovedTodo] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('priority'); // 'priority', 'date', 'age'
  const [showFilters, setShowFilters] = useState(false);

  const parseAusDate = (str) => {
    const [datePart, timePart, ampmRaw] = str.split(/[\s,]+/);
    const [day, month, year] = datePart?.split('/')?.map(Number) || [];
    let [hour, minute, second] = timePart?.split(':')?.map(Number) || [];
    const ampm = ampmRaw ? ampmRaw.toLowerCase() : null;

    if (ampm === 'pm' && hour !== 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;

    return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
  };

  const getAgeClass = (createdDate) => {
    const ageInDays = (Date.now() - parseAusDate(createdDate)) / (1000 * 60 * 60 * 24);
    if (ageInDays > 2) return 'text-red-500';
    if (ageInDays > 1) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getAgeLabel = (createdDate) => {
    const now = new Date();
    const created = parseAusDate(createdDate);
    const diffMs = now - created;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays >= 1) return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m ago`;
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
      const cleanedContent = note.content.replace(/meta::(high|medium|low)/gi, '').trim();
      const updatedContent = `${cleanedContent}\nmeta::${level}`;
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

  const { total, high, medium, low } = filteredTodos.reduce(
    (acc, todo) => {
      const tagMatch = todo.content.match(/meta::(high|medium|low)/i);
      const tag = tagMatch ? tagMatch[1].toLowerCase() : 'low';
      const priority = priorities[todo.id] || tag;
      acc[priority]++;
      acc.total++;
      return acc;
    },
    { total: 0, high: 0, medium: 0, low: 0 }
  );

  const renderTodoCard = (todo) => {
    const tagMatch = todo.content.match(/meta::(high|medium|low)/i);
    const tag = tagMatch ? tagMatch[1].toLowerCase() : 'low';
    const currentPriority = priorities[todo.id] || tag;
    const ageColorClass = getAgeClass(todo.created_datetime);

    const priorityColors = {
      high: 'border-l-rose-500 bg-rose-50',
      medium: 'border-l-amber-500 bg-amber-50',
      low: 'border-l-emerald-500 bg-emerald-50'
    };

    return (
      <div
        key={todo.id}
        className={`group relative ${
          viewMode === 'grid' ? 'h-[200px]' : 'min-h-[80px]'
        } flex flex-col rounded-lg border-l-4 shadow-sm hover:shadow-md transition-all duration-200 ${
          priorityColors[currentPriority]
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-white bg-opacity-50">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              onChange={(e) => handleCheckboxChange(todo.id, e.target.checked)}
            />
            <span className={`text-xs font-medium ${ageColorClass}`}>
              {getAgeLabel(todo.created_datetime)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePriorityClick(todo.id, 'high')}
              className={`p-1.5 rounded transition-all duration-200 ${
                currentPriority === 'high'
                  ? 'bg-rose-200 text-rose-700'
                  : 'hover:bg-rose-100 text-gray-400 hover:text-rose-600'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-current" />
            </button>
            <button
              onClick={() => handlePriorityClick(todo.id, 'medium')}
              className={`p-1.5 rounded transition-all duration-200 ${
                currentPriority === 'medium'
                  ? 'bg-amber-200 text-amber-700'
                  : 'hover:bg-amber-100 text-gray-400 hover:text-amber-600'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-current" />
            </button>
            <button
              onClick={() => handlePriorityClick(todo.id, 'low')}
              className={`p-1.5 rounded transition-all duration-200 ${
                currentPriority === 'low'
                  ? 'bg-emerald-200 text-emerald-700'
                  : 'hover:bg-emerald-100 text-gray-400 hover:text-emerald-600'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-current" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-3 overflow-auto">
          <div className="text-sm text-gray-800">
            {(() => {
              const content = todo.content
                .replace(/meta::todo/gi, '')
                .replace(/meta::[^\s]+/gi, '')
                .trim();

              return content.split(/(https?:\/\/[^\s]+)/g).map((segment, i) => {
                if (segment.match(/^https?:\/\//)) {
                  try {
                    const url = new URL(segment);
                    return (
                      <a
                        key={`link-${i}`}
                        href={segment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-700 hover:underline transition-colors duration-200"
                      >
                        {url.hostname.replace(/^www\./, '')}
                      </a>
                    );
                  } catch {
                    return segment;
                  }
                }

                if (!searchQuery) return segment;

                return segment.split(new RegExp(`(${searchQuery})`, 'gi'))
                  .map((part, index) =>
                    part.toLowerCase() === searchQuery.toLowerCase() ? (
                      <mark 
                        key={`highlight-${i}-${index}`} 
                        className="bg-yellow-100 text-gray-900 rounded-sm px-0.5"
                      >
                        {part}
                      </mark>
                    ) : part
                  );
              });
            })()}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-white bg-opacity-50">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleCheckboxChange(todo.id, true)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors duration-200"
            >
              Complete
            </button>
            <div className="flex items-center gap-2">
              <button className="p-1 rounded hover:bg-gray-100 transition-all duration-200">
                <PencilIcon className="h-4 w-4 text-gray-500 hover:text-gray-700" />
              </button>
              <button className="p-1 rounded hover:bg-gray-100 transition-all duration-200">
                <TrashIcon className="h-4 w-4 text-gray-500 hover:text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
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
              placeholder="Search todos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
