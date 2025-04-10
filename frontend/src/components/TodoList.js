import React, { useState, useEffect, useRef } from 'react';
import { PencilIcon } from '@heroicons/react/24/solid';
import { TrashIcon } from '@heroicons/react/24/solid';
import { processContent } from '../utils/TextUtils';
import { formatDate } from '../utils/DateUtils';

const TodoList = ({ todos }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const parseAusDate = (str) => {
    const [datePart, timePart, ampm] = str.split(/[\s,]+/);
    const [day, month, year] = datePart.split('/').map(Number);
    let [hour, minute, second] = timePart.split(':').map(Number);
    if (ampm.toLowerCase() === 'pm' && hour !== 12) hour += 12;
    if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
    return new Date(year, month - 1, day, hour, minute, second);
  };

  const getAgeClass = (createdDate) => {
    const ageInDays = Math.floor((Date.now() - parseAusDate(createdDate)) / (1000 * 60 * 60 * 24));
    if (ageInDays <= 2) return 'text-red-500';
    if (ageInDays <= 5) return 'text-yellow-500';
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
        return (
          <div
            key={todo.id}
            className="flex justify-content p-4 mb-6 rounded-lg border bg-card text-card-foreground shadow-sm relative group transition-shadow duration-200 items-center"
          >
            <div className="flex flex-col flex-auto">
              <div className="flex items-center justify-between space-x-2 p-2">
                <pre className="flex-1">{processContent(todo.content.replace(/\btodo\b/i, '').trim())}</pre>
                <span className={`text-xs ${ageColorClass}`}>{getAgeLabel(todo.created_datetime)}</span>
              </div>
            </div>
          </div>
        );
      })}

    </div>
  );
};

export default TodoList;
