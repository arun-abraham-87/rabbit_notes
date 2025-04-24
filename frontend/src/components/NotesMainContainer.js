import React, { useState } from 'react';

import NotesListByDate from './NotesListByDate.js';
import DateSelectorBar from './DateSelectorBar.js';
import TextEditor from './TextEditor.js'
import InfoPanel from './InfoPanel.js';
import NotesList from './NotesList.js';
import NoteEditor from './NoteEditor.js';

const NotesMainContainer = ({ 
    objList, 
    notes, 
    addNote, 
    setNotes, 
    objects, 
    searchQuery, 
    setSearchQuery, 
    addTag, 
    setNoteDate, 
    totals, 
    setTotals,
    settings
}) => {
    const [checked, setChecked] = useState(false);

    const handleTagClick = (tag) => {
        setSearchQuery(tag);
    };

    const updateNoteCallback = async (noteId, updatedContent) => {
        await setNotes(noteId, updatedContent);
    };

    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full p-6">
            <DateSelectorBar setNoteDate={setNoteDate} defaultCollapsed={true} />
            <NoteEditor
                objList={objList}
                note={{ id: '', content: '' }}
                text=""
                addNote={addNote}
                onSave={(note) => {
                    addNote(note.content);
                }}
                onCancel={() => {
                    console.log("NoteEditor canceled");
                }}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isAddMode={true}
            />
            <InfoPanel totals={totals} grpbyViewChkd={checked} enableGroupByView={setChecked} />
            {checked ? (
                <NotesListByDate 
                    notes={notes} 
                    searchQuery={searchQuery} 
                    onWordClick={handleTagClick}
                    settings={settings}
                />
            ) : (
                <NotesList 
                    objList={objList} 
                    notes={notes} 
                    addNotes={addNote} 
                    updateNoteCallback={updateNoteCallback}
                    updateTotals={setTotals} 
                    objects={objects} 
                    addObjects={addTag} 
                    searchTerm={searchQuery} 
                    onWordClick={handleTagClick}
                    settings={settings}
                />
            )}
        </div>
    )
};

export default NotesMainContainer;