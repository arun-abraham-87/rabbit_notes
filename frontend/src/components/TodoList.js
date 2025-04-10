import React, { useState, useEffect, useRef } from 'react';
import { PencilIcon } from '@heroicons/react/24/solid';
import { TrashIcon } from '@heroicons/react/24/solid';
import { processContent } from '../utils/TextUtils';
import { formatDate } from '../utils/DateUtils';

const TodoList = ({ todos }) => {

  return (
    <div>
      {todos.map((todo) => (
        <div
          key={todo.id}
          className="flex justify-content p-4 mb-6 rounded-lg border bg-card text-card-foreground shadow-sm relative group transition-shadow duration-200 items-center"
        >
          <div className="flex flex-col flex-auto">
            <div className="p-2">
                <pre>{processContent(todo.content)}</pre>
            </div>
            <div className="text-xs text-gray-700 p-1">
              {formatDate(todo.created_datetime)}
            </div>
          </div>
        </div>
      ))}

    </div>
  );
};

export default TodoList;
