import React, { useEffect, useRef, useState, useMemo } from 'react';
import { XMarkIcon, EyeIcon } from '@heroicons/react/24/solid';
import { buildSuggestionsFromNotes } from '../utils/NotesUtils';

const TextPastePopup = ({
  isOpen,
  onClose,
  newNoteText,
  setNewNoteText,
  pasteText,
  selectedPriority,
  setSelectedPriority,
  isWatchSelected,
  setIsWatchSelected,
  onSave,
  objList = [], // Add objList prop for tag suggestions
  allNotes = [], // Add allNotes prop for people and workstreams
}) => {
  const textareaRef = useRef(null);
  
  // Add state for tag suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredTags, setFilteredTags] = useState([]);
  const [selectedTagIndex, setSelectedTagIndex] = useState(-1);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [throttleRef] = useState({ current: null });

  // Build merged suggestions from objList and allNotes (people and workstreams)
  const mergedObjList = useMemo(() =>
    buildSuggestionsFromNotes(allNotes, objList),
    [allNotes, objList]
  );

  // Auto focus and clear textarea when popup opens
  useEffect(() => {
    if (isOpen) {
      setNewNoteText('');
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  }, [isOpen, setNewNoteText]);

  // Handle text change with tag suggestions
  const handleTextChange = (e) => {
    const value = e.target.value;
    setNewNoteText(value);

    // Handle tag suggestions
    if (value.trim().length === 0) {
      setShowSuggestions(false);
      return;
    }

    const match = value.trim().match(/(\S+)$/);
    if (match) {
      const filterText = match[1].toLowerCase();

      clearTimeout(throttleRef.current);
      throttleRef.current = setTimeout(() => {
        const filtered = mergedObjList.filter((tag) =>
          tag && tag.text && tag.text.toLowerCase().includes(filterText)
        );

        if (filtered.length > 0) {
          const textarea = textareaRef.current;
          if (textarea) {
            // Get the textarea's position
            const rect = textarea.getBoundingClientRect();
            
            // Calculate cursor position using textarea properties
            const textBeforeCursor = value.substring(0, textarea.selectionStart);
            const lines = textBeforeCursor.split('\n');
            const currentLineIndex = lines.length - 1;
            const currentLine = lines[currentLineIndex];
            
            // Estimate character width (approximate)
            const charWidth = 8; // Approximate character width
            const cursorX = rect.left + (currentLine.length * charWidth) + 20; // Add padding
            
            // Calculate vertical position
            const lineHeight = 20; // Approximate line height
            const cursorY = rect.top + (currentLineIndex * lineHeight) + lineHeight + 10;
            
            setCursorPosition({ x: cursorX, y: cursorY });
            setFilteredTags(filtered.map(tag => tag.text));
            setShowSuggestions(true);
          }
        } else {
          setShowSuggestions(false);
        }
      }, 150);
    } else {
      setShowSuggestions(false);
    }
  };

  // Handle tag selection
  const handleSelectTag = (tag) => {
    const lastSpaceIndex = newNoteText.lastIndexOf(" ");
    const updatedText =
      (lastSpaceIndex === -1 ? "" : newNoteText.slice(0, lastSpaceIndex + 1)) +
      `${tag} `;
    setNewNoteText(updatedText);
    setShowSuggestions(false);
    setSelectedTagIndex(-1);
    
    // Focus back to textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      // Handle suggestion navigation
      if (showSuggestions) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedTagIndex((prev) =>
            prev < filteredTags.length - 1 ? prev + 1 : 0
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedTagIndex((prev) =>
            prev > 0 ? prev - 1 : filteredTags.length - 1
          );
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (selectedTagIndex >= 0) {
            handleSelectTag(filteredTags[selectedTagIndex]);
          } else if (filteredTags.length > 0) {
            handleSelectTag(filteredTags[0]);
          }
        } else if (e.key === "Tab") {
          e.preventDefault();
          if (filteredTags.length > 0) {
            handleSelectTag(filteredTags[0]);
          }
        } else if (e.key === "Escape") {
          setShowSuggestions(false);
        }
      } else {
        // Handle Cmd+Enter (or Ctrl+Enter) to save
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          onSave();
          return;
        }

        // Handle Escape to close
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onSave, onClose, showSuggestions, filteredTags, selectedTagIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg p-6 w-full max-w-2xl ${
        selectedPriority === 'critical' ? 'ring-4 ring-red-500' :
        selectedPriority === 'high' ? 'ring-2 ring-orange-500' :
        selectedPriority === 'medium' ? 'ring-2 ring-yellow-500' :
        selectedPriority === 'low' ? 'ring-2 ring-green-500' :
        'ring-1 ring-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Create New Note</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">New Note Content</label>
            <textarea
              ref={textareaRef}
              value={newNoteText}
              onChange={handleTextChange}
              className="w-full h-32 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Type your note here... (Press Cmd+Enter to save)"
            />
            {/* Tag suggestions popup */}
            {showSuggestions && (
              <div
                className="fixed bg-white border-2 border-purple-500 rounded-lg shadow-lg p-2 z-[9999] max-h-40 overflow-y-auto no-scrollbar text-sm w-52"
                style={{
                  left: cursorPosition.x,
                  top: cursorPosition.y,
                  minHeight: '40px'
                }}
              >
                {filteredTags.length === 0 ? (
                  <div className="p-2 text-gray-500">No matching tags</div>
                ) : (
                  filteredTags.map((tag, index) => (
                    <div
                      key={tag}
                      onClick={() => handleSelectTag(tag)}
                      className={`p-2 cursor-pointer hover:bg-purple-100 ${
                        selectedTagIndex === index ? "bg-purple-200" : ""
                      }`}
                    >
                      {tag}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clipboard Content (Reference Only)</label>
            <div className="w-full h-32 p-2 border border-gray-300 rounded-lg bg-gray-50 overflow-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-600">{pasteText}</pre>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsWatchSelected(!isWatchSelected)}
                className={`p-1 rounded-md ${isWatchSelected ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                title="Watch"
              >
                <EyeIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Priority:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setSelectedPriority(selectedPriority === 'critical' ? null : 'critical')}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${selectedPriority === 'critical' ? 'bg-red-600 ring-2 ring-red-300 text-white' : 'bg-red-200 hover:bg-red-300 text-red-700'}`}
                  title="Critical"
                >
                  C
                </button>
                <button
                  onClick={() => setSelectedPriority(selectedPriority === 'high' ? null : 'high')}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${selectedPriority === 'high' ? 'bg-orange-600 ring-2 ring-orange-300 text-white' : 'bg-orange-200 hover:bg-orange-300 text-orange-700'}`}
                  title="High"
                >
                  H
                </button>
                <button
                  onClick={() => setSelectedPriority(selectedPriority === 'medium' ? null : 'medium')}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${selectedPriority === 'medium' ? 'bg-yellow-600 ring-2 ring-yellow-300 text-white' : 'bg-yellow-200 hover:bg-yellow-300 text-yellow-700'}`}
                  title="Medium"
                >
                  M
                </button>
                <button
                  onClick={() => setSelectedPriority(selectedPriority === 'low' ? null : 'low')}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${selectedPriority === 'low' ? 'bg-green-600 ring-2 ring-green-300 text-white' : 'bg-green-200 hover:bg-green-300 text-green-700'}`}
                  title="Low"
                >
                  L
                </button>
              </div>
            </div>
          </div>
          {(selectedPriority || isWatchSelected) && (
            <div className="text-sm text-gray-600 italic space-y-1">
              {selectedPriority && (
                <div>Marked as todo - priority {selectedPriority}</div>
              )}
              {isWatchSelected && (
                <div>Added to watch list</div>
              )}
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
};

export default TextPastePopup; 