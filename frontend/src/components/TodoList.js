import React, { useState, useEffect, useRef } from 'react';
import { PencilIcon } from '@heroicons/react/24/solid';
import { TrashIcon } from '@heroicons/react/24/solid';
import { processContent } from '../utils/TextUtils';
import { formatDate } from '../utils/DateUtils';

const TodoList = ({ todos }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorities, setPriorities] = useState({});

  const parseAusDate = (str) => {
    const [datePart, timePart, ampm] = str.split(/[\s,]+/);
    const [day, month, year] = datePart.split('/').map(Number);
    let [hour, minute, second] = timePart.split(':').map(Number);
    if (ampm.toLowerCase() === 'pm' && hour !== 12) hour += 12;
    if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
    return new Date(year, month - 1, day, hour, minute, second);
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

  const onPriorityChange = (id, level) => {
    console.log(`Todo ${id} marked as ${level} priority.`);
  };

  const handlePriorityClick = (id, level) => {
    setPriorities((prev) => ({ ...prev, [id]: level }));
    onPriorityChange(id, level);
  };

  const filteredTodos = todos.filter((todo) =>
    todo.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="my-2">
        <input
          type="text"
          placeholder="Search todos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border px-2 py-1 rounded w-full"
        />
      </div>
      {filteredTodos.map((todo) => {
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
            className="flex justify-content p-2 mb-3 rounded-lg border bg-card text-card-foreground shadow-sm relative group transition-shadow duration-200 items-center"
          >
            <div className="flex flex-col flex-auto w-full">
              <div className="flex items-center justify-between py-1 px-2">
                <div className="flex items-center flex-1">
                  <input
                    type="checkbox"
                    className="mr-2"
                    // Placeholder for checkbox state handling
                  />
                  <pre className="whitespace-pre-wrap">{processContent(todo.content.replace(/\btodo\b/i, '').trim())}</pre>
                </div>
                <div className="flex space-x-1 mr-2">
                  <button
                    title="High Priority"
                    onClick={() => handlePriorityClick(todo.id, 'high')}
                    className={`transition-opacity hover:opacity-100 ${currentPriority === 'high' ? 'scale-125 opacity-90' : 'opacity-20'}`}
                  >🔴</button>
                  <button
                    title="Medium Priority"
                    onClick={() => handlePriorityClick(todo.id, 'medium')}
                    className={`transition-opacity hover:opacity-100 ${currentPriority === 'medium' ? 'scale-125 opacity-90' : 'opacity-20'}`}
                  >🟡</button>
                  <button
                    title="Low Priority"
                    onClick={() => handlePriorityClick(todo.id, 'low')}
                    className={`transition-opacity hover:opacity-100 ${currentPriority === 'low' ? 'scale-125 opacity-90' : 'opacity-20'}`}
                  >🟢</button>
                </div>
                <div className={`text-xs text-right ${ageColorClass}`}>
                  {formatDate(todo.created_datetime)}
                </div>
              </div>
            </div>
          </div>
        );
      })}

    </div>
  );
};

export default TodoList;
