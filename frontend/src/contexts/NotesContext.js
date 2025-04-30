import React, { createContext, useContext, useState, useEffect } from 'react';
import { addNewNote, loadAllNotes, updateNoteById } from '../utils/ApiUtils';

const NotesContext = createContext();

export function NotesProvider({ children }) {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const data = await loadAllNotes('', null);
        setNotes(data.notes || []);
      } catch (error) {
        console.error('Error loading notes:', error);
        setNotes([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, []);

  const addNote = async (content) => {
    try {
      const newNote = await addNewNote(content);
      setNotes(prevNotes => [...prevNotes, newNote]);
      return newNote;
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  };

  const updateNote = async (noteId, content) => {
    try {
      const updatedNote = await updateNoteById(noteId, content);
      setNotes(prevNotes => 
        prevNotes.map(note => note.id === noteId ? updatedNote : note)
      );
      return updatedNote;
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  };

  return (
    <NotesContext.Provider value={{ 
      notes, 
      setNotes, 
      addNote, 
      updateNote,
      isLoading 
    }}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
} 