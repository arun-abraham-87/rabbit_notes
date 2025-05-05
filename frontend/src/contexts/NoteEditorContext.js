import React, { createContext, useContext, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

const NoteEditorContext = createContext();

export function NoteEditorProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialContent, setInitialContent] = useState('');
  const [mode, setMode] = useState('add'); // 'add' or 'edit'
  const [noteId, setNoteId] = useState(null);
  const [metaTags, setMetaTags] = useState([]);

  // Add keyboard shortcut for opening note editor in add mode
  useHotkeys('meta+k', (e) => {
    e.preventDefault();
    console.log('Command+K pressed'); // Debug log
    setIsOpen(true);
    setInitialContent('');
    setMode('add');
    setNoteId(null);
    setMetaTags([]);
  }, {
    enableOnFormTags: true,
    keydown: true,
    keyup: false
  });

  const openEditor = (mode = 'add', content = '', id = null, tags = []) => {
    setIsOpen(true);
    setInitialContent(content);
    setMode(mode);
    setNoteId(id);
    setMetaTags(tags);
  };

  const closeEditor = () => {
    setIsOpen(false);
    setInitialContent('');
    setMode('add');
    setNoteId(null);
    setMetaTags([]);
  };

  return (
    <NoteEditorContext.Provider value={{
      isOpen,
      initialContent,
      mode,
      noteId,
      metaTags,
      openEditor,
      closeEditor
    }}>
      {children}
    </NoteEditorContext.Provider>
  );
}

export function useNoteEditor() {
  const context = useContext(NoteEditorContext);
  if (!context) {
    throw new Error('useNoteEditor must be used within a NoteEditorProvider');
  }
  return context;
} 