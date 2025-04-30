import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { useNoteEditor } from '../contexts/NoteEditorContext';
import { useNotes } from '../contexts/NotesContext';
import NoteEditor from './NoteEditor';
import { getSettings, defaultSettings, loadTags } from '../utils/ApiUtils';

const NoteEditorModal = () => {
  const { isOpen, initialContent, closeEditor } = useNoteEditor();
  const { addNote } = useNotes();
  const [settings, setSettings] = useState({});
  const [objList, setObjList] = useState([]);
  const [excludeEvents, setExcludeEvents] = useState(false);
  const [excludeMeetings, setExcludeMeetings] = useState(false);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeEditor();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeEditor]);

  // Load settings and tags on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await getSettings();
        const mergedSettings = { ...defaultSettings, ...savedSettings };
        setSettings(mergedSettings);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    const loadTags = async () => {
      try {
        const tags = await loadTags();
        setObjList(tags || []);
      } catch (error) {
        console.error('Failed to load tags:', error);
      }
    };

    loadSettings();
    loadTags();
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">New Note</h2>
          <button
            onClick={closeEditor}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <NoteEditor
          isAddMode={true}
          onSave={(content) => {
            addNote(content);
            closeEditor();
          }}
          onCancel={closeEditor}
          text={initialContent}
          objList={objList}
          settings={settings}
          onExcludeEventsChange={setExcludeEvents}
          onExcludeMeetingsChange={setExcludeMeetings}
        />
      </div>
    </div>
  );
};

export default NoteEditorModal; 