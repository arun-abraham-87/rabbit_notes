import React, { useState, useEffect, useMemo } from 'react';

import NotesListByDate from './NotesListByDate.js';
import InfoPanel from './InfoPanel.js';
import NotesList from './NotesList.js';
import NoteEditor from './NoteEditor.js';
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


    // Filter notes for display based on selected date and exclude states
    const filteredNotes = useMemo(() => {
        const filtered = allNotes.filter(note => {
            return (!searchQuery && isSameAsTodaysDate(note.created_datetime)) || searchInNote(note, searchQuery);
        });
        setTotals({ totals: filtered.length });
        return filtered;
    }, [allNotes, searchQuery]);


    const handleTagClick = (tag) => {
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
                    <NoteEditor
                        objList={mergedObjList}
                        note={{ id: '', content: '' }}
                        text=""
                        addNote={addNote}
                        
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        isAddMode={true}
                        settings={settings}
                    />
          {/* <NoteFilters
            setLines={false}
            setShowTodoSubButtons={false}
            setActivePriority={false}
            setSearchQuery={setSearchQuery}
            searchQuery={searchQuery}
            settings={settings}
          /> */}
                    <InfoPanel
                        totals={totals}
                    />
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