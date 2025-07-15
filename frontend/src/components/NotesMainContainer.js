import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { debounce } from 'lodash';
import { XMarkIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';

import InfoPanel from './InfoPanel.js';
import NotesList from './NotesList.js';
import WatchList from './WatchList';
import { updateNoteById, loadNotes, defaultSettings, deleteNoteById } from '../utils/ApiUtils';
import { isSameAsTodaysDate } from '../utils/DateUtils';
import { searchInNote, buildSuggestionsFromNotes } from '../utils/NotesUtils';
import NoteFilters from './NoteFilters';

const NotesMainContainer = ({
    objList = [],
    allNotes = [],
    addNote,
    setAllNotes,
    objects = [],
    searchQuery = '',
    setSearchQuery,
    addTag,
    settings = defaultSettings,
}) => {
    const [checked, setChecked] = useState(false);
    const [compressedView, setCompressedView] = useState(false);
    const [totals, setTotals] = useState({ totals: 0 });
    const [currentDate, setCurrentDate] = useState(null);
    const [excludeEvents, setExcludeEvents] = useState(settings?.excludeEventsByDefault || false);
    const [excludeMeetings, setExcludeMeetings] = useState(settings?.excludeMeetingsByDefault || false);
    const [excludeEventNotes, setExcludeEventNotes] = useState(true); // Default to true to exclude event notes
    const [excludeBackupNotes, setExcludeBackupNotes] = useState(true); // Default to true to exclude backup notes
    const [showDeadlinePassedFilter, setShowDeadlinePassedFilter] = useState(false);
    const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
    const [focusMode, setFocusMode] = useState(() => {
        // Load focus mode state from localStorage on component mount
        const saved = localStorage.getItem('focusMode');
        return saved ? JSON.parse(saved) : false;
    });
    const searchInputRef = useRef(null);

    // Focus search input on mount
    useEffect(() => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, []);

    // Save focus mode state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('focusMode', JSON.stringify(focusMode));
    }, [focusMode]);

    // Debounced search function
    const debouncedSetSearchQuery = useCallback(
        debounce((query) => {
            setSearchQuery(query);
        }, 500),
        []
    );

    // Update local search query immediately, but debounce the actual search
    const handleSearchChange = (e) => {
        const query = e.target.value;
        setLocalSearchQuery(query);
        debouncedSetSearchQuery(query);
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (e) => {
        // Check for Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && localSearchQuery.trim()) {
            e.preventDefault();
            addNote(localSearchQuery);
            setLocalSearchQuery('');
            setSearchQuery('');
        }
    };

    // Cleanup debounced function on unmount
    useEffect(() => {
        return () => {
            debouncedSetSearchQuery.cancel();
        };
    }, [debouncedSetSearchQuery]);

    // Filter notes for display based on selected date and exclude states
    const filteredNotes = useMemo(() => {
        const filtered = allNotes.filter(note => {
            // Exclude event notes if the filter is enabled
            if (excludeEventNotes && note.content && note.content.includes('meta::event::')) {
                return false;
            }
            // Exclude backup notes if the filter is enabled
            if (excludeBackupNotes && note.content && note.content.includes('meta::notes_backup_date')) {
                return false;
            }
            return (!searchQuery && isSameAsTodaysDate(note.created_datetime)) || searchInNote(note, searchQuery);
        });
        setTotals({ totals: filtered.length });
        return filtered;
    }, [allNotes, searchQuery, excludeEventNotes, excludeBackupNotes]);

    const handleTagClick = (tag) => {
        setLocalSearchQuery(tag);
        setSearchQuery(tag);
    };

    const handleNoteUpdate = async (noteId, updatedContent) => {
        try {
            const response = await updateNoteById(noteId, updatedContent);
            setAllNotes(allNotes.map(note => note.id === noteId ? { ...note, content: updatedContent } : note));
            setTotals(allNotes.length);
        } catch (error) {
            console.error('Error updating note:', error);
        }
    };

    const handleDelete = async (noteId) => {
        try {
            await deleteNoteById(noteId);
            setAllNotes(allNotes.filter(note => note.id !== noteId));
            setTotals(allNotes.length);
        } catch (error) {   
            console.error('Error deleting note:', error);
        }
    };

    // Build suggestions from allNotes
    const mergedObjList = useMemo(() =>
        buildSuggestionsFromNotes(allNotes, objList),
        [allNotes, objList]
    );

    return (
        <div className="flex flex-col h-full">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full p-6">
                <div className="mt-4">
                    <div className="relative">
                        <textarea
                            ref={searchInputRef}
                            className="w-full p-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[40px] max-h-[120px] overflow-y-auto"
                            value={localSearchQuery}
                            onChange={handleSearchChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Search notes... (Cmd+Enter to create note)"
                            rows={1}
                            style={{
                                resize: 'none',
                                overflow: 'hidden'
                            }}
                            onInput={(e) => {
                                // Auto-resize the textarea
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                            }}
                        />
                        {localSearchQuery && (
                            <button
                                onClick={() => {
                                    setLocalSearchQuery('');
                                    setSearchQuery('');
                                    searchInputRef.current?.focus();
                                }}
                                className="absolute right-2 top-2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                                aria-label="Clear search"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                    {/* <InfoPanel
                        totals={totals}
                    /> */}
                    <div className="flex items-center justify-between mt-4 mb-2">
                        <NoteFilters
                            setLines={() => {}}
                            setShowTodoSubButtons={() => {}}
                            setActivePriority={() => {}}
                            setSearchQuery={setSearchQuery}
                            searchQuery={searchQuery}
                            settings={settings}
                            onExcludeEventsChange={setExcludeEvents}
                            onExcludeMeetingsChange={setExcludeMeetings}
                            onDeadlinePassedChange={setShowDeadlinePassedFilter}
                            onExcludeEventNotesChange={setExcludeEventNotes}
                            onExcludeBackupNotesChange={setExcludeBackupNotes}
                        />
                        <button
                            onClick={() => setFocusMode(!focusMode)}
                            className={`flex items-center gap-2 px-3 py-1 text-xs font-medium rounded transition-colors duration-150 ${
                                focusMode 
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
                        >
                            {focusMode ? (
                                <>
                                    <EyeSlashIcon className="h-4 w-4" />
                                    Focus Mode
                                </>
                            ) : (
                                <>
                                    <EyeIcon className="h-4 w-4" />
                                    Focus Mode
                                </>
                            )}
                        </button>
                    </div>
                    <NotesList
                        objList={mergedObjList}
                        allNotes={filteredNotes}
                        addNotes={addNote}
                        updateNoteCallback={handleNoteUpdate}
                        handleDelete={handleDelete}
                        updateTotals={setTotals}
                        objects={objects}
                        addObjects={addTag}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        onWordClick={handleTagClick}
                        settings={settings}
                        focusMode={focusMode}
                    />
                </div>
            </div>
        </div>
    );
};

export default NotesMainContainer;