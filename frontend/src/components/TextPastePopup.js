import React, { useEffect, useRef } from 'react';
import { XMarkIcon, EyeIcon } from '@heroicons/react/24/solid';

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
}) => {
  const textareaRef = useRef(null);

  // Auto focus and clear textarea when popup opens
  useEffect(() => {
    if (isOpen) {
      setNewNoteText('');
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  }, [isOpen, setNewNoteText]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onSave, onClose]);

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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Note Content</label>
            <textarea
              ref={textareaRef}
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              className="w-full h-32 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Type your note here... (Press Cmd+Enter to save)"
            />
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