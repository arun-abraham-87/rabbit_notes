import React, { useState, useEffect, useRef } from 'react';
import { PencilIcon } from '@heroicons/react/24/solid';
import { TrashIcon } from '@heroicons/react/24/solid';
import { processContent } from '../utils/TextUtils';
import { formatDate } from '../utils/DateUtils';

const TodoList = ({ todos, notes , updateTodosCallback, updateNoteCallBack}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorities, setPriorities] = useState({});
  const [priorityFilter, setPriorityFilter] = useState(null);
  const [snackbar, setSnackbar] = useState(null); // { id, content, timeoutId }
  const [removedTodo, setRemovedTodo] = useState(null); // { id, content }
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

    const tag = todo.content.includes('#high')
      ? 'high'
      : todo.content.includes('#medium')
      ? 'medium'
      : todo.content.includes('#low')
      ? 'low'
      : 'low';

    const assignedPriority = priorities[todo.id] || tag;
    const matchesPriority = priorityFilter ? assignedPriority === priorityFilter : true;

    return matchesSearch && matchesPriority;
  });

  const computePriorityCounts = () => {
    let high = 0, medium = 0, low = 0;
    filteredTodos.forEach(todo => {
      const tag = todo.content.includes('#high')
        ? 'high'
        : todo.content.includes('#medium')
        ? 'medium'
        : todo.content.includes('#low')
        ? 'low'
        : 'low';
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

  const { total, high, medium, low } = computePriorityCounts();

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
        className={`flex justify-between items-start p-2 mb-3 rounded-lg border-l-4 border bg-card text-card-foreground shadow-sm relative group transition-shadow duration-200 ${
          currentPriority === 'high' ? 'border-l-red-500'
          : currentPriority === 'medium' ? 'border-l-yellow-500'
          : 'border-l-green-500'
        }`}
      >
        <div className="flex-1">
          <input
            type="checkbox"
            className="mr-2"
            onChange={(e) => handleCheckboxChange(todo.id, e.target.checked)}
          />
          <pre className="whitespace-pre-wrap">
            {(() => {
              const processedSegments = [];
              let started = false;

              todo.content
                .replace(/#?todo/gi, '')
                .trim()
                .split(/(https?:\/\/[^\s]+)/g)
                .forEach((segment, i) => {
                  if (segment.match(/^https?:\/\//)) {
                    try {
                      const url = new URL(segment);
                      processedSegments.push(
                        <a
                          key={`link-${i}`}
                          href={segment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 underline"
                        >
                          {url.hostname.replace(/^www\./, '')}
                        </a>
                      );
                    } catch {
                      processedSegments.push(segment);
                    }
                  } else {
                    const words = segment.split(/(\s+)/);
                    const processed = words.map((word, j) => {
                      if (!started && word.trim() && !word.match(/^\s+$/)) {
                        started = true;
                        return word.charAt(0).toUpperCase() + word.slice(1);
                      }
                      return word;
                    }).join('');

                    processedSegments.push(
                      processed
                        .split(new RegExp(`(${searchQuery})`, 'gi'))
                        .map((part, index) =>
                          part.toLowerCase() === searchQuery.toLowerCase() ? (
                            <mark key={`highlight-${i}-${index}`} className="bg-yellow-300">{part}</mark>
                          ) : (
                            part
                          )
                        )
                    );
                  }
                });

              return processedSegments;
            })()}
          </pre>
          <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
            <div className="flex space-x-1 items-center">
              <button
                title="High Priority"
                onClick={() => handlePriorityClick(todo.id, 'high')}
                className={`text-[10px] transition-transform opacity-30 hover:opacity-90 hover:scale-150 ${currentPriority === 'high' ? 'opacity-80' : ''}`}
              >🔴</button>
              <button
                title="Medium Priority"
                onClick={() => handlePriorityClick(todo.id, 'medium')}
                className={`text-[10px] transition-transform opacity-30 hover:opacity-90 hover:scale-150 ${currentPriority === 'medium' ? 'opacity-80' : ''}`}
              >🟡</button>
              <button
                title="Low Priority"
                onClick={() => handlePriorityClick(todo.id, 'low')}
                className={`text-[10px] transition-transform opacity-30 hover:opacity-90 hover:scale-150 ${currentPriority === 'low' ? 'opacity-80' : ''}`}
              >🟢</button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleCheckboxChange(todo.id, true)}
                className="text-blue-500 hover:underline"
              >
                Mark as todo
              </button>
              <PencilIcon className="h-4 w-4 cursor-pointer hover:text-blue-500" />
              <TrashIcon className="h-4 w-4 cursor-pointer hover:text-red-500" />
            </div>
          </div>
        </div>
        <div className={`text-xs ${ageColorClass}`}>
          {formatDate(todo.created_datetime)}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="my-2">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search todos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border px-2 py-1 rounded w-full pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              title="Clear"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <div className="my-2 flex items-center space-x-2">
        <input
          type="checkbox"
          checked={groupByPriority}
          onChange={(e) => setGroupByPriority(e.target.checked)}
          id="groupPriority"
        />
        <label htmlFor="groupPriority" className="text-sm">Group by Priority</label>
      </div>
      <div className="flex space-x-4 mb-4 text-sm">
        <div
          onClick={() => setPriorityFilter(null)}
          className={`flex-1 border rounded p-3 bg-white shadow text-center cursor-pointer ${
            priorityFilter === null ? '' : 'opacity-50 hover:opacity-100'
          }`}
        >
          <div className="text-gray-500 text-xs">Total</div>
          <div className="text-lg font-bold">{total}</div>
        </div>
        <div
          onClick={() => setPriorityFilter('high')}
          className={`flex-1 border rounded p-3 bg-white shadow text-center cursor-pointer ${
            priorityFilter === null
              ? ''
              : priorityFilter === 'high'
              ? 'ring-2 ring-red-500'
              : 'opacity-50 hover:opacity-100'
          }`}
        >
          <div className="text-red-500 text-xs">High</div>
          <div className="text-lg font-bold">{high}</div>
        </div>
        <div
          onClick={() => setPriorityFilter('medium')}
          className={`flex-1 border rounded p-3 bg-white shadow text-center cursor-pointer ${
            priorityFilter === null
              ? ''
              : priorityFilter === 'medium'
              ? 'ring-2 ring-yellow-500'
              : 'opacity-50 hover:opacity-100'
          }`}
        >
          <div className="text-yellow-500 text-xs">Medium</div>
          <div className="text-lg font-bold">{medium}</div>
        </div>
        <div
          onClick={() => setPriorityFilter('low')}
          className={`flex-1 border rounded p-3 bg-white shadow text-center cursor-pointer ${
            priorityFilter === null
              ? ''
              : priorityFilter === 'low'
              ? 'ring-2 ring-green-500'
              : 'opacity-50 hover:opacity-100'
          }`}
        >
          <div className="text-green-500 text-xs">Low</div>
          <div className="text-lg font-bold">{low}</div>
        </div>
      </div>
      {groupByPriority ? (
        ['high', 'medium', 'low'].map(priority => {
          const group = filteredTodos.filter(todo => {
            const tag = todo.content.includes('#high')
              ? 'high'
              : todo.content.includes('#medium')
              ? 'medium'
              : todo.content.includes('#low')
              ? 'low'
              : 'low';
            const assignedPriority = priorities[todo.id] || tag;
            return assignedPriority === priority;
          });
          if (!group.length) return null;
          return (
            <div key={priority}>
              <h3 className={`text-md font-semibold capitalize my-2 ${
                priority === 'high' ? 'text-red-500'
                : priority === 'medium' ? 'text-yellow-500'
                : 'text-green-500'
              }`}>
                {priority} Priority
              </h3>
              <div className="pl-8">
                {group.map(renderTodoCard)}
              </div>
            </div>
          );
        })
      ) : (
        filteredTodos.map(renderTodoCard)
      )}
      {snackbar && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded shadow-lg z-50 transition-opacity duration-300">
          Todo marked complete
          <button onClick={handleUndo} className="ml-4 underline">Undo</button>
        </div>
      )}
    </div>
  );
};

export default TodoList;
