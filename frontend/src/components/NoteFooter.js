// frontend/src/components/NoteFooter.js
import React, { useState, useEffect, useRef } from 'react';
import {
  XCircleIcon,
  CheckCircleIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  BookmarkIcon,
  LinkIcon,
  EyeIcon,
  ClockIcon,
  FlagIcon,
  ChevronDownIcon,
  ClipboardIcon,
  ArrowsPointingInIcon,
  CodeBracketIcon,
  XMarkIcon,
  FolderIcon,
  StarIcon,
} from '@heroicons/react/24/solid';
import { MapPinIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { getDateInDDMMYYYYFormat, getAgeInStringFmt } from '../utils/DateUtils';
import { toast } from 'react-toastify';
import { getDummyCadenceLine } from '../utils/CadenceHelpUtils';
import ConvertToBookmarkModal from './ConvertToBookmarkModal';

const Tooltip = ({ text, children }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      <div className={`
        absolute bottom-full left-1/2 -translate-x-1/2 mb-2 
        px-2 py-1 text-xs text-white bg-gray-800 rounded-md 
        whitespace-nowrap pointer-events-none z-50
        transition-opacity duration-75
        ${isHovered ? 'opacity-100' : 'opacity-0'}
      `}>
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800"></div>
      </div>
    </div>
  );
};

const NoteFooter = ({
  note,
  showCreatedDate,
  handleDelete,
  setPopupNoteText,
  setLinkingNoteId,
  setLinkSearchTerm,
  setLinkPopupVisible,
  selectedNotes,
  toggleNoteSelection,
  updateNote,
  focusMode = false
}) => {
  const [showPinPopup, setShowPinPopup] = useState(false);
  const [selectedPinLines, setSelectedPinLines] = useState([]);
  const [showRawNote, setShowRawNote] = useState(false);
  const [showRemoveTagsConfirm, setShowRemoveTagsConfirm] = useState(false);
  const [showConvertToBookmarkModal, setShowConvertToBookmarkModal] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const pinPopupRef = useRef(null);
  const rawNotePopupRef = useRef(null);
  const lines = note.content.split('\n');
  const isMergeMode = selectedNotes.length > 0;

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Handle Pin popup
      if (pinPopupRef.current && !pinPopupRef.current.contains(event.target)) {
        setShowPinPopup(false);
      }
      // Handle Raw Note popup
      if (rawNotePopupRef.current && !rawNotePopupRef.current.contains(event.target)) {
        setShowRawNote(false);
      }
      // Handle More Actions dropdown
      if (!event.target.closest('[data-more-actions]')) {
        setShowMoreActions(false);
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setShowPinPopup(false);
        setShowRawNote(false);
        setShowMoreActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  const toggleLineSelection = (lineNum) => {
    setSelectedPinLines(prev =>
      prev.includes(lineNum)
        ? prev.filter(l => l !== lineNum)
        : [...prev, lineNum]
    );
  };

  const handlePinLines = () => {
    if (selectedPinLines.length === 0) {
      toast.error('Please select at least one line to pin');
      return;
    }

    const timestamp = new Date().toISOString();
    const lines = note.content.split('\n');

    // Remove any existing pin metadata
    const contentWithoutPinMeta = lines
      .filter(line => !line.trim().startsWith('meta::pin::'))
      .join('\n');

    // Convert 0-based indices to 1-based line numbers
    const lineNumbers = selectedPinLines.map(index => index + 1);

    // Create pin metadata with 1-based line numbers
    const pinMeta = `meta::pin::${lineNumbers.join(',')}`;

    // Combine content with new pin metadata
    const newContent = `${contentWithoutPinMeta}\n${pinMeta}`;

    updateNote(note.id, newContent);
    setSelectedPinLines([]);
    setShowPinPopup(false);
    toast.success('Lines marked for pinning');
  };

  // Add this function to check if a line is pinned (using 1-based line numbers)
  const isPinned = (index) => {
    const pinMetaLine = note.content
      .split('\n')
      .find(line => line.trim().startsWith('meta::pin::'));

    if (!pinMetaLine) return false;

    const pinnedLineNumbers = pinMetaLine
      .replace('meta::pin::', '')
      .split(',')
      .map(num => parseInt(num.trim()));

    // Convert 0-based index to 1-based line number for comparison
    return pinnedLineNumbers.includes(index + 1);
  };

  const handleAction = (action) => {
    const lines = note.content.split('\n');
    const hasAction = lines.some(l => l.trim().startsWith(`meta::${action}::`));

    if (hasAction) {
      // Remove the action if it exists
      let without = lines
        .filter(l => !l.trim().startsWith(`meta::${action}::`))
        .join('\n')
        .trim();

      if (action === 'watch') {
        // then remove from without line starting with meta::review_cadence 
        without = without.split('\n').filter(l => !l.trim().startsWith('meta::review_cadence::')).join('\n');
      }

      updateNote(note.id, without);
      toast.success(`Removed ${action} tag`);
    } else {
      // Add the action if it doesn't exist
      const without = lines
        .filter(l => !l.trim().startsWith(`meta::${action}::`))
        .join('\n')
        .trim();

      if (action === 'watch') {
        // then remove from without line starting with meta::review_cadence 
        const withoutReviewCadence = without.split('\n').filter(l => !l.trim().startsWith('meta::review_cadence::')).join('\n');
        //  For watch action, use the note's creation date
        updateNote(note.id, `${withoutReviewCadence}\nmeta::watch::${note.created_datetime}\n${getDummyCadenceLine()}`);
        toast.success('Added to watch list');
      } else {
        // For other actions, use current timestamp
        const ts = new Date().toISOString();
        updateNote(note.id, `${without}\nmeta::${action}::${ts}`);
        toast.success(`Added ${action} tag`);
      }
    }
  };

  // Handle pin/unpin note functionality
  const handlePinNote = () => {
    const lines = note.content.split('\n');
    const isPinned = lines.some(l => l.trim().startsWith('meta::notes_pinned'));

    if (isPinned) {
      // Remove the pin tag
      const without = lines
        .filter(l => !l.trim().startsWith('meta::notes_pinned'))
        .join('\n')
        .trim();
      updateNote(note.id, without);
      toast.success('Note unpinned');
    } else {
      // Add the pin tag
      const ts = new Date().toISOString();
      updateNote(note.id, `${note.content}\nmeta::notes_pinned::${ts}`);
      toast.success('Note pinned to right panel');
    }
  };

  const handleTodoAction = (priority = null) => {
    const timestamp = new Date().toISOString();
    const lines = note.content.split('\n');
    const isTodo = lines.some(l => l.trim().startsWith('meta::todo::'));
    const currentPriority = priority ?
      lines.some(l => l.trim().startsWith(`meta::${priority}`)) : false;

    // Filter out all todo-related meta tags
    const contentWithoutTodoMeta = lines
      .filter(line =>
        !line.trim().startsWith('meta::todo::') &&
        !line.trim().startsWith('meta::low') &&
        !line.trim().startsWith('meta::medium') &&
        !line.trim().startsWith('meta::high')
      )
      .join('\n')
      .trim();

    if (!priority) {
      // Toggling todo status
      if (isTodo) {
        // Remove todo status
        updateNote(note.id, contentWithoutTodoMeta);
        toast.success('Removed todo status');
      } else {
        // Add todo status
        updateNote(note.id, `${contentWithoutTodoMeta}\nmeta::todo::${timestamp}`);
        toast.success('Marked as todo');
      }
    } else {
      if (!isTodo) {
        // If not a todo yet, make it a todo with the selected priority
        updateNote(note.id, `${contentWithoutTodoMeta}\nmeta::todo::${timestamp}\nmeta::${priority}`);
        toast.success(`Marked as todo with ${priority} priority`);
      } else if (currentPriority) {
        // If already has this priority, remove only the priority
        updateNote(note.id, `${contentWithoutTodoMeta}\nmeta::todo::${timestamp}`);
        toast.success(`Removed ${priority} priority`);
      } else {
        // Change to new priority
        updateNote(note.id, `${contentWithoutTodoMeta}\nmeta::todo::${timestamp}\nmeta::${priority}`);
        toast.success(`Changed to ${priority} priority`);
      }
    }
  };

  const isTodo = note.content.toLowerCase().includes('meta::todo::');
  const currentPriority = isTodo ?
    note.content.toLowerCase().includes('meta::low') ? 'low' :
      note.content.toLowerCase().includes('meta::medium') ? 'medium' :
        note.content.toLowerCase().includes('meta::high') ? 'high' : null : null;

  const handleRemoveAllTags = () => {
    const lines = note.content.split('\n');
    const contentWithoutTags = lines
      .filter(line => !line.trim().startsWith('meta::'))
      .join('\n')
      .trim();

    updateNote(note.id, contentWithoutTags);
    setShowRemoveTagsConfirm(false);
    toast.success('All tags removed from note');
  };

  const handleSensitiveAction = () => {
    const lines = note.content.split('\n');
    const hasSensitive = lines.some(l => l.trim().startsWith('meta::sensitive::'));

    if (hasSensitive) {
      // Remove the sensitive tag if it exists
      const without = lines
        .filter(l => !l.trim().startsWith('meta::sensitive::'))
        .join('\n')
        .trim();
      updateNote(note.id, without);
      toast.success('Removed sensitive tag');
    } else {
      // Add the sensitive tag if it doesn't exist
      const without = lines
        .filter(l => !l.trim().startsWith('meta::sensitive::'))
        .join('\n')
        .trim();
      const ts = new Date().toISOString();
      updateNote(note.id, `${without}\nmeta::sensitive::${ts}`);
      toast.success('Added sensitive tag');
    }
  };

  const handleConvertToBookmark = (bookmarkContent) => {
    updateNote(note.id, bookmarkContent);
    toast.success('Note converted to web bookmark!');
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-500">
      <div className="flex items-center space-x-2">
        {/* Left side - Created date */}
        {showCreatedDate && !focusMode && (
          <span className="text-gray-400">
            Created: {getDateInDDMMYYYYFormat(note.created_datetime)}({getAgeInStringFmt(note.created_datetime)})
          </span>
        )}
      </div>

      {!focusMode && (
      <div className="flex items-center bg-gray-50 rounded-lg">


        {/* Watch and Pin Group - Keep these in right panel */}
        <div className="flex items-center space-x-1 px-2 py-1 bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Tooltip text="Watch">
            <button
              onClick={() => handleAction('watch')}
              className={`p-1 hover:bg-gray-100 rounded-full transition-colors ${note.content.includes('meta::watch::') ? 'bg-green-100' : ''
                }`}
            >
              <EyeIcon className={`h-4 w-4 transition-colors ${note.content.includes('meta::watch::') ? 'text-green-500' : 'text-gray-500 hover:text-green-500'
                }`} />
            </button>
          </Tooltip>

          <Tooltip text={note.content.includes('meta::notes_pinned') ? 'Unpin Note' : 'Pin Note to Right Panel'}>
            <button
              onClick={handlePinNote}
              className={`p-1 hover:bg-gray-100 rounded-full transition-colors ${note.content.includes('meta::notes_pinned') ? 'bg-red-100' : ''
                }`}
            >
              <StarIcon className={`h-4 w-4 transition-colors ${note.content.includes('meta::notes_pinned') ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                }`} />
            </button>
          </Tooltip>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-gray-200 mx-px opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

        {/* More Actions Dropdown */}
        <div className="flex items-center space-x-1 px-2 py-1 bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200" data-more-actions>
          <div className="relative">
            <Tooltip text="More Actions">
              <button
                onClick={() => setShowMoreActions(!showMoreActions)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronDownIcon className="h-4 w-4 text-gray-500 hover:text-blue-500 transition-colors" />
              </button>
            </Tooltip>
            
            {showMoreActions && (
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="py-1">
                  <button
                    onClick={() => {
                      handleAction('bookmark');
                      setShowMoreActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                  >
                    <BookmarkIcon className={`h-4 w-4 mr-2 ${note.content.includes('meta::bookmark::') ? 'text-yellow-500' : 'text-gray-500'}`} />
                    Bookmark
                  </button>
                  
                  <button
                    onClick={() => {
                      handleAction('abbreviation');
                      setShowMoreActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                  >
                    <TagIcon className={`h-4 w-4 mr-2 ${note.content.includes('meta::abbreviation::') ? 'text-purple-500' : 'text-gray-500'}`} />
                    Mark as Abbreviation
                  </button>
                  
                  <button
                    onClick={() => {
                      handleAction('workstream');
                      setShowMoreActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                  >
                    <FolderIcon className={`h-4 w-4 mr-2 ${note.content.includes('meta::workstream::') ? 'text-indigo-500' : 'text-gray-500'}`} />
                    Workstream
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowRemoveTagsConfirm(true);
                      setShowMoreActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                  >
                    <XMarkIcon className="h-4 w-4 mr-2 text-gray-500" />
                    Remove All Tags
                  </button>
                  
                  <button
                    onClick={() => {
                      handleSensitiveAction();
                      setShowMoreActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                  >
                    <EyeIcon className={`h-4 w-4 mr-2 ${note.content.includes('meta::sensitive::') ? 'text-orange-500' : 'text-gray-500'}`} />
                    Mark as Sensitive
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowConvertToBookmarkModal(true);
                      setShowMoreActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                  >
                    <GlobeAltIcon className="h-4 w-4 mr-2 text-gray-500" />
                    Convert to Web Bookmark
                  </button>
                  
                  <div className="border-t border-gray-200 my-1"></div>
                  
                  <button
                    onClick={() => {
                      handleTodoAction();
                      setShowMoreActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                  >
                    <ClockIcon className={`h-4 w-4 mr-2 ${isTodo ? 'text-blue-500' : 'text-gray-500'}`} />
                    {isTodo ? 'Remove Todo Status' : 'Mark as Todo'}
                  </button>
                  
                  {isTodo && (
                    <>
                      <button
                        onClick={() => {
                          handleTodoAction('high');
                          setShowMoreActions(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center pl-6"
                      >
                        <FlagIcon className={`h-4 w-4 mr-2 ${currentPriority === 'high' ? 'text-red-500' : 'text-red-400'}`} />
                        High Priority
                      </button>
                      
                      <button
                        onClick={() => {
                          handleTodoAction('medium');
                          setShowMoreActions(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center pl-6"
                      >
                        <FlagIcon className={`h-4 w-4 mr-2 ${currentPriority === 'medium' ? 'text-yellow-500' : 'text-yellow-400'}`} />
                        Medium Priority
                      </button>
                      
                      <button
                        onClick={() => {
                          handleTodoAction('low');
                          setShowMoreActions(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center pl-6"
                      >
                        <FlagIcon className={`h-4 w-4 mr-2 ${currentPriority === 'low' ? 'text-blue-500' : 'text-blue-400'}`} />
                        Low Priority
                      </button>
                    </>
                  )}
                  
                  <div className="border-t border-gray-200 my-1"></div>
                  
                  <button
                    onClick={() => {
                      setShowPinPopup(!showPinPopup);
                      setShowMoreActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                  >
                    <MapPinIcon className={`h-4 w-4 mr-2 ${showPinPopup ? 'text-blue-500' : 'text-gray-500'}`} />
                    Pin Lines
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-gray-200 mx-px opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

        {/* Link Group */}
        <div className="flex items-center space-x-1 px-2 py-1 bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Tooltip text="Link Note">
            <button
              onClick={() => {
                setLinkingNoteId(note.id);
                setLinkSearchTerm('');
                setLinkPopupVisible(true);
              }}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <LinkIcon className="h-4 w-4 text-gray-500 hover:text-blue-500 transition-colors" />
            </button>
          </Tooltip>

          <Tooltip text={selectedNotes.length === 0 ? 'Start Merge' : selectedNotes.includes(note.id) ? 'Unselect for Merge' : 'Select for Merge'}>
            <button
              onClick={() => toggleNoteSelection(note.id)}
              className={`p-1 hover:bg-gray-100 rounded-full transition-colors ${selectedNotes.includes(note.id) ? 'bg-blue-100' : ''
                }`}
            >
              <ArrowsPointingInIcon className={`h-4 w-4 transition-colors ${selectedNotes.includes(note.id) ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'
                }`} />
            </button>
          </Tooltip>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-gray-200 mx-px opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

        {/* View and Copy Group */}
        <div className="flex items-center space-x-1 px-2 py-1 bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Tooltip text="Copy to Clipboard">
            <button
              onClick={() => {
                navigator.clipboard.writeText(note.content);
                toast.success('Note content copied to clipboard!');
              }}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ClipboardIcon className="h-4 w-4 text-gray-500 hover:text-blue-500 transition-colors" />
            </button>
          </Tooltip>

          <Tooltip text="View Raw Note">
            <button
              onClick={() => setShowRawNote(!showRawNote)}
              className={`p-1 hover:bg-gray-100 rounded-full transition-colors ${showRawNote ? 'bg-gray-100' : ''
                }`}
            >
              <CodeBracketIcon className={`h-4 w-4 transition-colors ${showRawNote ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'
                }`} />
            </button>
          </Tooltip>


        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-gray-200 mx-px opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

        {/* Edit/Delete Group */}
        <div className="flex items-center space-x-1 px-2 py-1 bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Tooltip text="Edit Note">
            <button
              onClick={() => setPopupNoteText(note.id)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <PencilIcon className="h-4 w-4 text-gray-500 hover:text-blue-500 transition-colors" />
            </button>
          </Tooltip>

          <Tooltip text="Delete Note">
            <button
              onClick={() => handleDelete(note.id)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <TrashIcon className="h-4 w-4 text-gray-500 hover:text-red-500 transition-colors" />
            </button>
          </Tooltip>
        </div>
      </div>
      )}

      {showRawNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Raw Note Content</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(note.content);
                    toast.success('Raw note content copied to clipboard!');
                  }}
                  className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                >
                  <ClipboardIcon className="h-4 w-4 mr-1.5" />
                  Copy
                </button>
                <button
                  onClick={() => setShowRawNote(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
              <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                <pre className="whitespace-pre-wrap break-words text-sm font-mono text-gray-700 max-w-full" style={{ wordBreak: 'break-word' }}>
                  {note.content.split('\n').map((line, index) => (
                    <div
                      key={index}
                      className={line.trim().startsWith('meta::') ? 'text-red-500' : ''}
                    >
                      {line}
                    </div>
                  ))}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPinPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Pin Lines to Top</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePinLines}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  disabled={selectedPinLines.length === 0}
                >
                  <CheckCircleIcon className="h-4 w-4 mr-1.5" />
                  Pin Selected Lines
                </button>
                <button
                  onClick={() => {
                    setShowPinPopup(false);
                    setSelectedPinLines([]);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
              <div className="space-y-1">
                {lines.map((line, index) => (
                  <div
                    key={index}
                    className={`flex items-start space-x-3 p-2 rounded ${isPinned(index) ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center space-x-3 min-w-[60px]">
                      <input
                        type="checkbox"
                        checked={selectedPinLines.includes(index)}
                        onChange={() => toggleLineSelection(index)}
                        className="rounded text-blue-500 w-4 h-4"
                      />
                      <span className="text-sm text-gray-400 select-none font-mono">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex-1 text-sm text-gray-700 font-mono break-words whitespace-pre-wrap">
                      {line || <em className="text-gray-400">Empty line</em>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Tags Confirmation Modal */}
      {showRemoveTagsConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Remove All Tags</h2>
              <button
                onClick={() => setShowRemoveTagsConfirm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="mb-6">
              <p className="text-gray-600">
                Are you sure you want to remove all tags from this note? This will remove all meta tags including bookmarks, todos, priorities, and pins. This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRemoveTagsConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveAllTags}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Remove All Tags
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Bookmark Modal */}
      <ConvertToBookmarkModal
        isOpen={showConvertToBookmarkModal}
        onClose={() => setShowConvertToBookmarkModal(false)}
        note={note}
        onConvert={handleConvertToBookmark}
      />
    </div>
  );
};

export default NoteFooter;