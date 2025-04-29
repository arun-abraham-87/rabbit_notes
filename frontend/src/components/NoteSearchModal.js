import React, { useState, useEffect, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

const NoteSearchModal = ({ notes, onSelectNote, isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useHotkeys('up', (e) => {
    e.preventDefault();
    setSelectedIndex(prev => Math.max(0, prev - 1));
  }, { enabled: isOpen });

  useHotkeys('down', (e) => {
    e.preventDefault();
    setSelectedIndex(prev => Math.min(filteredNotes.length - 1, prev + 1));
  }, { enabled: isOpen });

  useHotkeys('enter', (e) => {
    e.preventDefault();
    if (filteredNotes[selectedIndex]) {
      onSelectNote(filteredNotes[selectedIndex]);
    }
  }, { enabled: isOpen });

  useHotkeys('esc', () => {
    onClose();
  }, { enabled: isOpen });

  // Fuzzy search implementation
  const fuzzySearch = (text, query) => {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    let queryIndex = 0;
    let textIndex = 0;

    while (textIndex < textLower.length && queryIndex < queryLower.length) {
      if (textLower[textIndex] === queryLower[queryIndex]) {
        queryIndex++;
      }
      textIndex++;
    }

    return queryIndex === queryLower.length;
  };

  const filteredNotes = notes.filter(note => {
    if (!searchQuery) return false;
    
    // Search in note content
    const content = note.content.toLowerCase();
    const lines = content.split('\n');
    
    // Check if any line matches the search query
    return lines.some(line => fuzzySearch(line, searchQuery));
  }).slice(0, 10); // Limit to 10 results

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="p-4">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="max-h-96 overflow-y-auto">
          {filteredNotes.map((note, index) => {
            const lines = note.content.split('\n');
            const matchingLine = lines.find(line => fuzzySearch(line, searchQuery));
            
            return (
              <div
                key={note.id}
                className={`p-4 cursor-pointer hover:bg-gray-100 ${
                  index === selectedIndex ? 'bg-blue-50' : ''
                }`}
                onClick={() => onSelectNote(note)}
              >
                <div className="text-sm font-medium text-gray-900">
                  {matchingLine || lines[0]}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(note.created_datetime).toLocaleDateString()}
                </div>
              </div>
            );
          })}
          {filteredNotes.length === 0 && searchQuery && (
            <div className="p-4 text-center text-gray-500">
              No notes found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteSearchModal; 