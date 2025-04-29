import React from 'react';
import { parseNoteContent } from '../utils/TextUtils';

const CriticalTodosSection = ({ notes }) => {
  // Filter notes that have meta::critical tag and are todos
  const criticalTodos = notes.filter(note => 
    note.content.includes('meta::critical') && 
    note.content.includes('meta::todo')
  );

  if (criticalTodos.length === 0) return null;

  return (
    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
      <h3 className="text-lg font-semibold text-red-800 mb-2">Critical Todos</h3>
      <div className="space-y-2">
        {criticalTodos.map(note => {
          // Extract the todo content (first non-meta line)
          const contentLines = note.content.split('\n');
          const todoContent = contentLines.find(line => 
            !line.trim().startsWith('meta::') && 
            line.trim().length > 0
          );

          return (
            <div 
              key={note.id} 
              className="p-3 bg-red-100 border border-red-200 rounded-md hover:bg-red-200 transition-colors"
            >
              <div className="text-red-900">
                {parseNoteContent({ content: todoContent || '', searchTerm: '' }).map((element, idx) => (
                  <React.Fragment key={idx}>{element}</React.Fragment>
                ))}
              </div>
              <div className="text-xs text-red-600 mt-1">
                {new Date(note.created_at).toLocaleDateString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CriticalTodosSection; 