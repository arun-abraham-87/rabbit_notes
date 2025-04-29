import React, { useState, useEffect, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { parseNoteContent } from '../utils/TextUtils';
import moment from 'moment';

const NoteSearchModal = ({ notes, onSelectNote, isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedNotes, setExpandedNotes] = useState(new Set());
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const noteRefs = useRef([]);

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

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSelectedIndex(0); // Reset selection when opening
    }
  }, [isOpen]);

  // Update note refs when filtered notes change
  useEffect(() => {
    noteRefs.current = noteRefs.current.slice(0, filteredNotes.length);
  }, [filteredNotes]);

  // Focus and scroll to selected note
  const focusSelectedNote = (index) => {
    if (noteRefs.current[index]) {
      noteRefs.current[index].focus();
      noteRefs.current[index].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => {
        const newIndex = Math.min(filteredNotes.length - 1, prev + 1);
        focusSelectedNote(newIndex);
        return newIndex;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (selectedIndex === 0) {
        // If on first note, move focus to input and place cursor at end
        if (inputRef.current) {
          inputRef.current.focus();
          const length = inputRef.current.value.length;
          inputRef.current.setSelectionRange(length, length);
        }
        return;
      }
      setSelectedIndex(prev => {
        const newIndex = Math.max(0, prev - 1);
        focusSelectedNote(newIndex);
        return newIndex;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredNotes[selectedIndex]) {
        onSelectNote(filteredNotes[selectedIndex]);
      }
    }
  };

  // Update ESC key handling
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, filteredNotes, selectedIndex]);

  const toggleNoteExpand = (noteId) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const formatNoteContent = (content) => {
    const lines = content.split('\n');
    const nonMetaLines = lines.filter(line => !line.trim().startsWith('meta::'));
    
    return nonMetaLines.map((line, index) => {
      // Check for headings
      const h1Match = line.match(/^###(.+)###$/);
      const h2Match = line.match(/^##(.+)##$/);

      if (h1Match) {
        return (
          <h1 key={index} className="text-xl font-bold mb-2 text-gray-900">
            {parseNoteContent({ content: h1Match[1].trim(), searchTerm: '' }).map((element, idx) => (
              <React.Fragment key={idx}>{element}</React.Fragment>
            ))}
          </h1>
        );
      }

      if (h2Match) {
        return (
          <h2 key={index} className="text-lg font-semibold mb-2 text-gray-800">
            {parseNoteContent({ content: h2Match[1].trim(), searchTerm: '' }).map((element, idx) => (
              <React.Fragment key={idx}>{element}</React.Fragment>
            ))}
          </h2>
        );
      }

      // Regular lines with URL parsing
      return (
        <div 
          key={index} 
          className={`mb-1 ${index === 0 ? 'font-medium' : 'text-gray-500'}`}
        >
          {parseNoteContent({ content: line, searchTerm: '' }).map((element, idx) => (
            <React.Fragment key={idx}>{element}</React.Fragment>
          ))}
        </div>
      );
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      // Parse the date string using moment with the correct format
      const date = moment(dateString, "DD/MM/YYYY, hh:mm:ss a");
      return date.format("DD MMM YYYY, hh:mm A");
    } catch (error) {
      console.error('Error parsing date:', error);
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="p-4 border-b flex items-center justify-between">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={onClose}
            className="ml-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
            title="Close search"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div 
          ref={resultsRef}
          className="max-h-96 overflow-y-auto"
        >
          {filteredNotes.map((note, index) => {
            const isExpanded = expandedNotes.has(note.id);
            const lines = note.content.split('\n');
            const displayLines = isExpanded ? lines : lines.slice(0, 4);
            
            return (
              <div
                key={note.id}
                ref={el => noteRefs.current[index] = el}
                tabIndex={0}
                className={`p-4 cursor-pointer transition-colors duration-150 outline-none ${
                  index === selectedIndex 
                    ? 'bg-blue-50 border-l-4 border-blue-500 ring-2 ring-blue-200' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => onSelectNote(note)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSelectNote(note);
                  }
                }}
              >
                <div className="text-sm">
                  {formatNoteContent(displayLines.join('\n'))}
                  {lines.length > 4 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNoteExpand(note.id);
                      }}
                      className="text-xs text-blue-500 hover:text-blue-700 mt-1"
                    >
                      {isExpanded ? 'Show less' : 'Show more...'}
                    </button>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatDate(note.created_datetime)}
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