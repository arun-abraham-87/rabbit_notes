import React, { useState } from 'react';

import NotesListByDate from '../components/NotesListByDate.js';
import DateSelectorBar from '../components/DateSelectorBar.js';
import TextEditor from '../components/TextEditor.js'
import InfoPanel from '../components/InfoPanel.js';
import NotesList from '../components/NotesList.js';
import NoteEditor from '../components/NoteEditor';

const NotesListing = ({ objList, notes, addNote, setNotes, objects, searchQuery, setSearchQuery, addTag, setNoteDate, totals, setTotals }) => {

    const [checked, setChecked] = useState(false);

    const handleTagClick = (tag) => {
        setSearchQuery(tag);
    };

    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm max-w-[80%] mx-auto p-6">
            <DateSelectorBar setNoteDate={setNoteDate} />
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
                <NotesListByDate notes={notes} searchQuery={searchQuery} onWordClick={handleTagClick} />
            ) : (
                <NotesList objList={objList} notes={notes} addNotes={addNote} updateNoteCallback={setNotes} updateTotals={setTotals} objects={objects} addObjects={addTag} searchTerm={searchQuery} onWordClick={handleTagClick} />
            )}
        </div>
    )
};

export default NotesListing;