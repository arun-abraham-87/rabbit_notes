import React, { createContext, useContext, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import NoteSearchModal from '../components/NoteSearchModal';

const SearchModalContext = createContext();

export const SearchModalProvider = ({ children, notes }) => {
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

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

    const handleNoteSelect = (note) => {
        setIsSearchModalOpen(false);
        // You can add additional logic here to handle the selected note
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