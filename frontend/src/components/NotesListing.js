import React, { useState} from 'react';

import NotesListByDate from '../components/NotesListByDate.js';
import DateSelectorBar from '../components/DateSelectorBar.js';
import TextEditor from '../components/TextEditor.js'
import InfoPanel from '../components/InfoPanel.js';
import NotesList from '../components/NotesList.js';

const NotesListing = ({ notes, addNote , setNotes, objects ,searchQuery, setSearchQuery, addTag ,setNoteDate, totals, setTotals}) => {
    
    const [checked, setChecked] = useState(false);
    

    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm max-w-[80%] mx-auto p-6">
            <DateSelectorBar setNoteDate={setNoteDate} />
            <TextEditor addNotes={addNote} objList={objects} searchQuery={setSearchQuery} />
            <InfoPanel totals={totals} grpbyViewChkd={checked} enableGroupByView={setChecked} />
            {checked ? (
                <NotesListByDate notes={notes} searchQuery={searchQuery} />
            ) : (
                <NotesList notes={notes} addNotes={addNote} updateNoteCallback={setNotes} updateTotals={setTotals} objects={objects} addObjects={addTag} />
            )}
        </div>
    )
};

export default NotesListing;