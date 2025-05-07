import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { debounce } from 'lodash';
import { XMarkIcon } from '@heroicons/react/24/solid';

import InfoPanel from './InfoPanel.js';
import NotesList from './NotesList.js';
import WatchList from './WatchList';
import { updateNoteById, loadNotes, defaultSettings } from '../utils/ApiUtils';
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
    const [showDeadlinePassedFilter, setShowDeadlinePassedFilter] = useState(false);
    const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
    const searchInputRef = useRef(null);

    // Focus search input on mount
    useEffect(() => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, []);

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
            return (!searchQuery && isSameAsTodaysDate(note.created_datetime)) || searchInNote(note, searchQuery);
        });
        setTotals({ totals: filtered.length });
        return filtered;
    }, [allNotes, searchQuery]);

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
                        <input
                            ref={searchInputRef}
                            type="search"
                            className="w-full p-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden [&::-webkit-search-results-button]:hidden [&::-webkit-search-results-decoration]:hidden"
                            value={localSearchQuery}
                            onChange={handleSearchChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Search notes... (Cmd+Enter to create note)"
                        />
                        {localSearchQuery && (
                            <button
                                onClick={() => {
                                    setLocalSearchQuery('');
                                    setSearchQuery('');
                                    searchInputRef.current?.focus();
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                                aria-label="Clear search"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                    {/* <InfoPanel
                        totals={totals}
                    /> */}
                    <NotesList
                        objList={mergedObjList}
                        notes={filteredNotes}
                        allNotes={allNotes}
                        addNotes={addNote}
                        updateNoteCallback={handleNoteUpdate}
                        updateTotals={setTotals}
                        objects={objects}
                        addObjects={addTag}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        onWordClick={handleTagClick}
                        settings={settings}
                    />
                </div>
            </div>
        </div>
    );
};

export default NotesMainContainer;