import React, { useState, useEffect, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { XMarkIcon, ChevronDownIcon, ChevronUpIcon, TrashIcon } from '@heroicons/react/24/solid';
import { parseNoteContent } from '../utils/TextUtils';
import { getAgeInStringFmt } from '../utils/DateUtils';
import { getRecentSearches, addRecentSearch } from '../utils/SearchUtils';
import moment from 'moment';

const NoteSearchModal = ({ notes, onSelectNote, isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedNotes, setExpandedNotes] = useState(new Set());
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const noteRefs = useRef([]);

  useEffect(() => {
    if (isOpen) {
      setRecentSearches(getRecentSearches());
      setSearchQuery('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [isOpen]);

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
    
    // Split search query into individual words
    const searchTerms = searchQuery.toLowerCase().split(' ').filter(term => term.length > 0);
    if (searchTerms.length === 0) return false;
    
    // Get the full note content in lowercase
    const noteContent = note.content.toLowerCase();
    
    // Check if all search terms are present in the note content
    return searchTerms.every(term => noteContent.includes(term));
  }).slice(0, 10); // Limit to 10 results

  const handleSearch = (query) => {
    setSearchQuery(query);
    // Reset selected index when search query changes
    setSelectedIndex(0);
  };

  const handleKeyDown = (e) => {
    // Handle arrow keys for navigation regardless of focus
    if (e.key === 'ArrowDown' && filteredNotes.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      const newIndex = (selectedIndex + 1) % filteredNotes.length;
      setSelectedIndex(newIndex);
      return;
    } else if (e.key === 'ArrowUp' && filteredNotes.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      const newIndex = (selectedIndex - 1 + filteredNotes.length) % filteredNotes.length;
      setSelectedIndex(newIndex);
      return;
    }
    
    // Handle other keys only when input is focused
    if (e.target === inputRef.current) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && filteredNotes.length > 0) {
        e.preventDefault();
        const selectedNote = filteredNotes[selectedIndex];
        
        // Save search term to recent searches when a note is selected via Enter
        if (searchQuery.trim()) {
          const currentSearches = getRecentSearches();
          const filteredSearches = currentSearches.filter(
            search => search !== searchQuery
          );
          filteredSearches.unshift(searchQuery);
          
          // Keep only last 5 searches
          const limitedSearches = filteredSearches.slice(0, 5);
          
          localStorage.setItem('recentSearches', JSON.stringify(limitedSearches));
          setRecentSearches(limitedSearches);
        }
        
        onSelectNote(selectedNote);
        onClose();
      }
    }
  };

  // Auto-scroll to selected note when navigating with arrow keys
  useEffect(() => {
    if (selectedIndex >= 0 && noteRefs.current[selectedIndex]) {
      noteRefs.current[selectedIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  // Ensure selectedIndex is valid when filtered results change
  useEffect(() => {
    if (filteredNotes.length > 0 && selectedIndex >= filteredNotes.length) {
      setSelectedIndex(0);
    }
  }, [filteredNotes, selectedIndex]);

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

  const highlightSearchTerms = (text) => {
    if (!searchQuery) return text;
    
    const searchTerms = searchQuery.toLowerCase().split(' ').filter(term => term.length > 0);
    let highlightedText = text;
    
    searchTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
    });
    
    return highlightedText;
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
            <span dangerouslySetInnerHTML={{ __html: highlightSearchTerms(h1Match[1].trim()) }} />
          </h1>
        );
      }

      if (h2Match) {
        return (
          <h2 key={index} className="text-lg font-semibold mb-2 text-gray-800">
            <span dangerouslySetInnerHTML={{ __html: highlightSearchTerms(h2Match[1].trim()) }} />
          </h2>
        );
      }

      // Regular lines with URL parsing
      return (
        <div 
          key={index} 
          className={`mb-1 ${index === 0 ? 'font-medium' : 'text-gray-500'}`}
        >
          {parseNoteContent({ content: line, searchTerm: searchQuery }).map((element, idx) => {
            if (typeof element === 'string') {
              return <span key={idx} dangerouslySetInnerHTML={{ __html: highlightSearchTerms(element) }} />;
            }
            return element;
          })}
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

  const handleDeleteRecentSearch = (searchToDelete, e) => {
    e.stopPropagation(); // Prevent triggering the search
    const currentSearches = getRecentSearches();
    const filteredSearches = currentSearches.filter(search => search !== searchToDelete);
    localStorage.setItem('recentSearches', JSON.stringify(filteredSearches));
    setRecentSearches(filteredSearches);
  };

  const handleClearAllRecentSearches = () => {
    localStorage.setItem('recentSearches', JSON.stringify([]));
    setRecentSearches([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-start justify-center pt-20 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search notes..."
              className="w-full px-4 py-3 pl-10 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            title="Close search"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>



        {/* Results Container */}
        <div 
          ref={resultsRef}
          className="max-h-[60vh] overflow-y-auto"
        >
          {recentSearches.length > 0 && !searchQuery && (
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-gray-500">Recent searches:</div>
                <button
                  onClick={handleClearAllRecentSearches}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  <TrashIcon className="h-3 w-3" />
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {recentSearches.map((search) => (
                  <button
                    key={search}
                    onClick={() => handleSearch(search)}
                    className="group px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 flex items-center gap-1"
                  >
                    {search}
                    <button
                      onClick={(e) => handleDeleteRecentSearch(search, e)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredNotes.map((note, index) => {
            const isExpanded = expandedNotes.has(note.id);
            const lines = note.content.split('\n');
            const displayLines = isExpanded ? lines : lines.slice(0, 4);
            const isEven = index % 2 === 0;
            const isSelected = index === selectedIndex;
            
            return (
              <div
                key={note.id}
                ref={el => noteRefs.current[index] = el}
                tabIndex={0}
                className={`group p-4 cursor-pointer transition-all duration-200 outline-none border-b border-gray-50 last:border-b-0 ${
                  isSelected
                    ? 'bg-blue-200 border-l-4 border-l-blue-600 shadow-md' 
                    : isEven 
                      ? 'bg-gray-50' 
                      : 'bg-gray-100'
                }`}
                onClick={() => {
                  // Save search term to recent searches when a note is clicked
                  if (searchQuery.trim()) {
                    const currentSearches = getRecentSearches();
                    const filteredSearches = currentSearches.filter(
                      search => search !== searchQuery
                    );
                    filteredSearches.unshift(searchQuery);
                    
                    // Keep only last 5 searches
                    const limitedSearches = filteredSearches.slice(0, 5);
                    
                    localStorage.setItem('recentSearches', JSON.stringify(limitedSearches));
                    setRecentSearches(limitedSearches);
                  }
                  
                  onSelectNote(note);
                  onClose();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSelectNote(note);
                  }
                }}
              >
                <div className="flex flex-col gap-2">
                  {/* Note Age */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                        Added {getAgeInStringFmt(note.created_datetime)}
                      </span>

                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNote(note, true); // Pass true to indicate edit mode
                        onClose();
                      }}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200"
                      title="Edit note"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                  </div>

                  {/* Note Content */}
                  <div className="text-sm space-y-1.5">
                    {formatNoteContent(displayLines.join('\n'))}
                  </div>

                  {/* Expand/Collapse Button */}
                  {lines.length > 4 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNoteExpand(note.id);
                      }}
                      className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 mt-1 group-hover:underline"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUpIcon className="h-3 w-3" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDownIcon className="h-3 w-3" />
                          Show more
                        </>
                      )}
                    </button>
                  )}

                  {/* Date and Time */}
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                      {formatDate(note.created_datetime)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* No Results Message */}
          {filteredNotes.length === 0 && searchQuery && (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-2">No notes found</div>
              <div className="text-sm text-gray-500">
                Try different search terms or check your spelling
              </div>
            </div>
          )}

          {/* Empty State */}
          {!searchQuery && (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-2">Start typing to search notes</div>
              <div className="text-sm text-gray-500">
                Search by any word or phrase in your notes
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-500 text-center">
          {filteredNotes.length > 0 && (
            <div>
              Showing {filteredNotes.length} of {notes.length} notes
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteSearchModal; 