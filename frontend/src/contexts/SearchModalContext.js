import React, { createContext, useContext, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate } from 'react-router-dom';
import NoteSearchModal from '../components/NoteSearchModal';
import { useNoteEditor } from './NoteEditorContext';

const SearchModalContext = createContext();

export const SearchModalProvider = ({ children, notes }) => {
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const { openEditor } = useNoteEditor();
    const navigate = useNavigate();

    // Add Cmd+P shortcut to open search modal
    useHotkeys('meta+p', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsSearchModalOpen(true);
    }, {
        preventDefault: true,
        enableOnFormTags: true,
        keydown: true,
        keyup: false
    });

    const handleNoteSelect = (note, isEditMode = false) => {
        setIsSearchModalOpen(false);
        if (isEditMode) {
            openEditor('edit', note.content, note.id);
        } else {
            // Navigate to notes page with a search query that will show only this note
            // Create a unique search term that will match only this specific note
            const searchQuery = `id:${note.id}`;
            navigate('/notes', { state: { searchQuery } });
        }
    };

    return (
        <SearchModalContext.Provider value={{ isSearchModalOpen, setIsSearchModalOpen, handleNoteSelect }}>
            {children}
            <NoteSearchModal
                notes={notes}
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                onSelectNote={handleNoteSelect}
            />
        </SearchModalContext.Provider>
    );
};

export const useSearchModal = () => {
    const context = useContext(SearchModalContext);
    if (!context) {
        throw new Error('useSearchModal must be used within a SearchModalProvider');
    }
    return context;
}; 