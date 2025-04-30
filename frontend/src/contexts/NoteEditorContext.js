import React, { createContext, useContext, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

const NoteEditorContext = createContext();

export function NoteEditorProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialContent, setInitialContent] = useState('');
  const [mode, setMode] = useState('add'); // 'add' or 'edit'

  // Add keyboard shortcut for opening note editor in add mode
  useHotkeys('meta+k', (e) => {
    e.preventDefault();
    console.log('Command+K pressed'); // Debug log
    setIsOpen(true);
    setInitialContent('');
    setMode('add');
  }, {
    enableOnFormTags: true,
    keydown: true,
    keyup: false
  });

  const openEditor = (content = '', mode = 'add') => {
    setIsOpen(true);
    setInitialContent(content);
    setMode(mode);
  };

  const closeEditor = () => {
    setIsOpen(false);
    setInitialContent('');
    setMode('add');
  };

  return (
    <NoteEditorContext.Provider value={{
      isOpen,
      initialContent,
      mode,
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