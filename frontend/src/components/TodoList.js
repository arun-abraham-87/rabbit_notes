import React, { useState, useEffect, useRef } from 'react';
import {
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/solid';
import { processContent } from '../utils/TextUtils';
import { formatDate } from '../utils/DateUtils';

const TodoList = ({ todos, notes, updateTodosCallback, updateNoteCallBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorities, setPriorities] = useState({});
  const [priorityFilter, setPriorityFilter] = useState(null);
  const [snackbar, setSnackbar] = useState(null);
  const [removedTodo, setRemovedTodo] = useState(null);
  const [groupByPriority, setGroupByPriority] = useState(true);

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
      console.log('Note Updated:', id);
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
    } else {
      console.error('Err: Failed to update note');
    }
  };

  const onPriorityChange = (id, level) => {
    console.log(`Todo ${id} marked as ${level} priority.`);
    const note = todos.find((todo) => todo.id === id);
    if (note) {
      console.log(`Content: ${note.content}`);
      const cleanedContent = note.content.replace(/#(high|medium|low)/gi, '').trim();
      const updatedContent = `${cleanedContent} #${level}`;
      updateTodo(id, updatedContent);
    } else {
      console.warn(`Note with id ${id} not found.`);
    }
  };

  const handlePriorityClick = (id, level) => {
    setPriorities((prev) => ({ ...prev, [id]: level }));
    onPriorityChange(id, level);
  };

  const handleCheckboxChange = (id, checked) => {
    console.log(`Checkbox toggled for todo ${id} - Checked: ${checked}`);
    const note = todos.find((todo) => todo.id === id);
    if (!note) return console.warn(`Note with id ${id} not found.`);

    if (checked) {
      const updatedContent = note.content.replace(/\b#?todo\b/gi, '').trim();
      updateTodo(id, updatedContent, true)

      const timeoutId = setTimeout(() => {
        updateTodo(id, updatedContent, true);
        setSnackbar(null);
        setRemovedTodo(null);
      }, 5000);

      setSnackbar({ id, content: note.content, timeoutId });
      setRemovedTodo({ ...note, content: updatedContent });
    } else {
      console.log(`Todo ${id} unchecked - no action taken`);
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

  const filteredTodos = todos.filter((todo) => {
    const matchesSearch = todo.content.toLowerCase().includes(searchQuery.toLowerCase());
 
    const tagMatch = todo.content.match(/meta::(high|medium|low)/i);
    const tag = tagMatch ? tagMatch[1].toLowerCase() : 'low';
 
    const assignedPriority = priorities[todo.id] || tag;
    const matchesPriority = priorityFilter ? assignedPriority === priorityFilter : true;
 
    const isMetaTodo = todo.content.includes('meta::todo');
 
    return matchesSearch && matchesPriority && isMetaTodo;
  });

  const computePriorityCounts = () => {
    let high = 0, medium = 0, low = 0;
    filteredTodos.forEach(todo => {
      const tagMatch = todo.content.match(/meta::(high|medium|low)/i);
      const tag = tagMatch ? tagMatch[1].toLowerCase() : 'low';
      const assigned = priorities[todo.id] || tag;
      if (assigned === 'high') high++;
      else if (assigned === 'medium') medium++;
      else low++;
    });
    return {
      total: filteredTodos.length,
      high,
      medium,
      low
    };
  };

  const renderTodoCard = (todo) => {
    const ageColorClass = getAgeClass(todo.created_datetime);
    const tagPriority = todo.content.includes('#high')
      ? 'high'
      : todo.content.includes('#medium')
      ? 'medium'
      : todo.content.includes('#low')
      ? 'low'
      : null;
    const currentPriority = priorities[todo.id] || tagPriority || 'low';

    return (
      <div
        key={todo.id}
        className={`group flex flex-col gap-3 p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all duration-200 ${
          currentPriority === 'high'
            ? 'border-l-4 border-l-rose-500 border-t border-r border-b border-rose-100'
            : currentPriority === 'medium'
            ? 'border-l-4 border-l-amber-500 border-t border-r border-b border-amber-100'
            : 'border-l-4 border-l-emerald-500 border-t border-r border-b border-emerald-100'
        }`}
      >
        <div className="flex items-start gap-4">
          {/* Checkbox and Content */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                onChange={(e) => handleCheckboxChange(todo.id, e.target.checked)}
              />
              <div className="flex-1 text-sm text-gray-800">
                {(() => {
                  const content = todo.content
                    .replace(/#?todo/gi, '')
                    .replace(/meta::[^\s]+/gi, '')
                    .trim();

                  // Split content into segments (text and links)
                  return content.split(/(https?:\/\/[^\s]+)/g).map((segment, i) => {
                    if (segment.match(/^https?:\/\//)) {
                      // Handle links
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
                    } else {
                      // Handle text with search highlighting
                      const words = segment.split(/(\s+)/);
                      const processed = words
                        .map((word, j) => {
                          if (j === 0 && !word.match(/^\s+$/)) {
                            return word.charAt(0).toUpperCase() + word.slice(1);
                          }
                          return word;
                        })
                        .join('');

                      if (!searchQuery) return processed;

                      return processed.split(new RegExp(`(${searchQuery})`, 'gi'))
                        .map((part, index) =>
                          part.toLowerCase() === searchQuery.toLowerCase() ? (
                            <mark 
                              key={`highlight-${i}-${index}`} 
                              className="bg-yellow-100/75 text-gray-900 rounded-sm"
                            >
                              {part}
                            </mark>
                          ) : part
                        );
                    }
                  });
                })()}
              </div>
            </div>

            {/* Priority and Actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <button
                  title="High Priority"
                  onClick={() => handlePriorityClick(todo.id, 'high')}
                  className={`p-1.5 rounded-lg transition-all duration-200 ${
                    currentPriority === 'high'
                      ? 'bg-rose-100 text-rose-700'
                      : 'hover:bg-rose-50 text-gray-400 hover:text-rose-600'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-current" />
                </button>
                <button
                  title="Medium Priority"
                  onClick={() => handlePriorityClick(todo.id, 'medium')}
                  className={`p-1.5 rounded-lg transition-all duration-200 ${
                    currentPriority === 'medium'
                      ? 'bg-amber-100 text-amber-700'
                      : 'hover:bg-amber-50 text-gray-400 hover:text-amber-600'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-current" />
                </button>
                <button
                  title="Low Priority"
                  onClick={() => handlePriorityClick(todo.id, 'low')}
                  className={`p-1.5 rounded-lg transition-all duration-200 ${
                    currentPriority === 'low'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'hover:bg-emerald-50 text-gray-400 hover:text-emerald-600'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-current" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleCheckboxChange(todo.id, true)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors duration-200"
                >
                  Complete
                </button>
                <div className="h-4 w-px bg-gray-200" />
                <button className="p-1 rounded-lg hover:bg-gray-100 transition-all duration-200">
                  <PencilIcon className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                </button>
                <button className="p-1 rounded-lg hover:bg-gray-100 transition-all duration-200">
                  <TrashIcon className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                </button>
              </div>
            </div>
          </div>

          {/* Date */}
          <div className={`text-xs font-medium ${ageColorClass} bg-opacity-10 px-2.5 py-1 rounded-lg`}>
            {formatDate(todo.created_datetime)}
          </div>
        </div>
      </div>
    );
  };

  const { total, high, medium, low } = computePriorityCounts();

  return (
    <div className="space-y-6">
      {/* Search and Group Controls */}
      <div className="flex flex-col gap-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search todos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
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

        {/* Group Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGroupByPriority(!groupByPriority)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
          >
            {groupByPriority ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
            Group by Priority
          </button>
        </div>
      </div>

      {/* Priority Stats */}
      <div className="grid grid-cols-4 gap-4">
        <button
          onClick={() => setPriorityFilter(null)}
          className={`flex flex-col items-center p-4 rounded-xl border bg-white transition-all duration-200 ${
            priorityFilter === null
              ? 'ring-2 ring-indigo-500 ring-offset-2'
              : 'hover:border-indigo-200 hover:shadow-sm'
          }`}
        >
          <div className="text-xs font-medium text-gray-500 mb-1">Total</div>
          <div className="text-2xl font-bold text-gray-900">{total}</div>
        </button>
        <button
          onClick={() => setPriorityFilter('high')}
          className={`flex flex-col items-center p-4 rounded-xl border transition-all duration-200 ${
            priorityFilter === 'high'
              ? 'bg-rose-50 border-rose-200 ring-2 ring-rose-500 ring-offset-2'
              : 'bg-white hover:bg-rose-50/50 hover:border-rose-200 hover:shadow-sm'
          }`}
        >
          <div className="text-xs font-medium text-rose-600 mb-1">High</div>
          <div className="text-2xl font-bold text-rose-700">{high}</div>
        </button>
        <button
          onClick={() => setPriorityFilter('medium')}
          className={`flex flex-col items-center p-4 rounded-xl border transition-all duration-200 ${
            priorityFilter === 'medium'
              ? 'bg-amber-50 border-amber-200 ring-2 ring-amber-500 ring-offset-2'
              : 'bg-white hover:bg-amber-50/50 hover:border-amber-200 hover:shadow-sm'
          }`}
        >
          <div className="text-xs font-medium text-amber-600 mb-1">Medium</div>
          <div className="text-2xl font-bold text-amber-700">{medium}</div>
        </button>
        <button
          onClick={() => setPriorityFilter('low')}
          className={`flex flex-col items-center p-4 rounded-xl border transition-all duration-200 ${
            priorityFilter === 'low'
              ? 'bg-emerald-50 border-emerald-200 ring-2 ring-emerald-500 ring-offset-2'
              : 'bg-white hover:bg-emerald-50/50 hover:border-emerald-200 hover:shadow-sm'
          }`}
        >
          <div className="text-xs font-medium text-emerald-600 mb-1">Low</div>
          <div className="text-2xl font-bold text-emerald-700">{low}</div>
        </button>
      </div>

      {/* Todo List */}
      <div className="space-y-6">
        {groupByPriority ? (
          ['high', 'medium', 'low'].map((priority) => {
            const group = filteredTodos.filter((todo) => {
              const tagMatch = todo.content.match(/meta::(high|medium|low)/i);
              const tag = tagMatch ? tagMatch[1].toLowerCase() : 'low';
              const assignedPriority = priorities[todo.id] || tag;
              return assignedPriority === priority;
            });
            if (!group.length) return null;
            return (
              <div key={priority} className="space-y-4">
                <h3
                  className={`text-sm font-semibold capitalize ${
                    priority === 'high'
                      ? 'text-rose-600'
                      : priority === 'medium'
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {priority} Priority • {group.length}
                </h3>
                <div className="space-y-3">
                  {group.map(renderTodoCard)}
                </div>
              </div>
            );
          })
        ) : (
          <div className="space-y-3">
            {filteredTodos.map(renderTodoCard)}
          </div>
        )}
      </div>

      {/* Snackbar */}
      {snackbar && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300">
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
