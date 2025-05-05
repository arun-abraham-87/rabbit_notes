import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  EyeIcon,
  FlagIcon
} from '@heroicons/react/24/solid';
import { useNoteEditor } from '../contexts/NoteEditorContext';
import { useNotes } from '../contexts/NotesContext';
import NoteEditor from './NoteEditor';
import { getSettings, defaultSettings, loadTags } from '../utils/ApiUtils';

const NoteEditorModal = () => {
  const { isOpen, initialContent, mode, noteId, closeEditor } = useNoteEditor();
  const { addNote, updateNote } = useNotes();
  const [settings, setSettings] = useState({});
  const [objList, setObjList] = useState([]);
  const [excludeEvents, setExcludeEvents] = useState(false);
  const [excludeMeetings, setExcludeMeetings] = useState(false);
  const [selectedMetaTags, setSelectedMetaTags] = useState([]);
  const [showPriorityOptions, setShowPriorityOptions] = useState(false);

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

    const fetchTags = async () => {
      try {
        const tags = await loadTags();
        setObjList(tags || []);
      } catch (error) {
        console.error('Failed to load tags:', error);
      }
    };

    loadSettings();
    fetchTags();
  }, []);

  const handleMetaTagClick = (tagType) => {
    const now = new Date();
    const formattedDate = now.toISOString();
    let newTags = [...selectedMetaTags];

    switch (tagType) {
      case 'todo':
        // Toggle todo tag
        if (newTags.some(tag => tag.startsWith('meta::todo'))) {
          // Remove todo and all priority tags
          newTags = newTags.filter(tag => 
            !tag.startsWith('meta::todo') && 
            !tag.startsWith('meta::critical') && 
            !tag.startsWith('meta::high') && 
            !tag.startsWith('meta::medium') && 
            !tag.startsWith('meta::low')
          );
          setShowPriorityOptions(false);
        } else {
          newTags.push(`meta::todo::${formattedDate}`);
          setShowPriorityOptions(true);
        }
        break;
      case 'critical':
      case 'high':
      case 'medium':
      case 'low':
        // Toggle priority tag
        const priorityTag = `meta::${tagType}`;
        if (newTags.includes(priorityTag)) {
          // Remove just this priority tag
          newTags = newTags.filter(tag => tag !== priorityTag);
        } else {
          // Remove any existing priority tags and add the new one
          newTags = newTags.filter(tag => 
            !tag.startsWith('meta::critical') && 
            !tag.startsWith('meta::high') && 
            !tag.startsWith('meta::medium') && 
            !tag.startsWith('meta::low')
          );
          newTags.push(priorityTag);
        }
        setShowPriorityOptions(true);
        break;
      case 'watch':
        // Toggle watch tag
        if (newTags.some(tag => tag.startsWith('meta::watch'))) {
          newTags = newTags.filter(tag => !tag.startsWith('meta::watch'));
        } else {
          newTags.push(`meta::watch::${formattedDate}`);
        }
        setShowPriorityOptions(false);
        break;
      default:
        return;
    }

    setSelectedMetaTags(newTags);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-blue-600';
      default:
        return 'text-gray-500';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">{mode === 'edit' ? 'Edit Note' : 'New Note'}</h2>
          <button
            onClick={closeEditor}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <NoteEditor
          isAddMode={mode === 'add'}
          isModal={true}
          note={mode === 'edit' ? { id: noteId, content: initialContent } : null}
          onSave={(content) => {
            console.log('Original content:', content);
            console.log('Selected meta tags:', selectedMetaTags);
            
            // Handle both string content and note objects
            const noteContent = typeof content === 'string' ? content : content.content;
            
            // Ensure content ends with a newline
            const contentWithNewline = noteContent.endsWith('\n') ? noteContent : noteContent + '\n';
            console.log('Content with newline:', contentWithNewline);
            
            // Append meta tags with newlines
            const finalContent = selectedMetaTags.length > 0 
              ? contentWithNewline + selectedMetaTags.join('\n') + '\n'
              : contentWithNewline;
            console.log('Final content to save:', finalContent);
            
            if (mode === 'add') {
              // Save the note with the combined content
              addNote(finalContent);
            } else {
              // Update the existing note
              updateNote(noteId, finalContent);
            }
            closeEditor();
          }}
          addNote={addNote}
          onCancel={() => {
            setSelectedMetaTags([]);
            setShowPriorityOptions(false);
            closeEditor();
          }}
          text={initialContent}
          objList={objList}
          settings={settings}
          onExcludeEventsChange={setExcludeEvents}
          onExcludeMeetingsChange={setExcludeMeetings}
        />
        <div className="flex flex-col items-center gap-4 mt-4 p-2 border-t border-gray-200">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleMetaTagClick('todo')}
                className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${
                  selectedMetaTags.some(tag => tag.startsWith('meta::todo')) ? 'bg-green-100' : ''
                }`}
                title="Mark as Todo"
              >
                <CheckCircleIcon className={`h-5 w-5 ${
                  selectedMetaTags.some(tag => tag.startsWith('meta::todo')) ? 'text-green-600' : 'text-gray-500'
                }`} />
              </button>
              {showPriorityOptions && (
                <>
                  <button
                    onClick={() => handleMetaTagClick('critical')}
                    className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${
                      selectedMetaTags.includes('meta::critical') ? 'bg-red-100' : ''
                    }`}
                    title="Critical Priority"
                  >
                    <FlagIcon className={`h-5 w-5 ${
                      selectedMetaTags.includes('meta::critical') ? 'text-red-600' : 'text-red-400'
                    }`} />
                  </button>
                  <button
                    onClick={() => handleMetaTagClick('high')}
                    className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${
                      selectedMetaTags.includes('meta::high') ? 'bg-orange-100' : ''
                    }`}
                    title="High Priority"
                  >
                    <FlagIcon className={`h-5 w-5 ${
                      selectedMetaTags.includes('meta::high') ? 'text-orange-600' : 'text-orange-400'
                    }`} />
                  </button>
                  <button
                    onClick={() => handleMetaTagClick('medium')}
                    className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${
                      selectedMetaTags.includes('meta::medium') ? 'bg-yellow-100' : ''
                    }`}
                    title="Medium Priority"
                  >
                    <FlagIcon className={`h-5 w-5 ${
                      selectedMetaTags.includes('meta::medium') ? 'text-yellow-600' : 'text-yellow-400'
                    }`} />
                  </button>
                  <button
                    onClick={() => handleMetaTagClick('low')}
                    className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${
                      selectedMetaTags.includes('meta::low') ? 'bg-blue-100' : ''
                    }`}
                    title="Low Priority"
                  >
                    <FlagIcon className={`h-5 w-5 ${
                      selectedMetaTags.includes('meta::low') ? 'text-blue-600' : 'text-blue-400'
                    }`} />
                  </button>
                </>
              )}
            </div>
            <button
              onClick={() => handleMetaTagClick('watch')}
              className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${
                selectedMetaTags.some(tag => tag.startsWith('meta::watch')) ? 'bg-purple-100' : ''
              }`}
              title="Add to Watch List"
            >
              <EyeIcon className={`h-5 w-5 ${
                selectedMetaTags.some(tag => tag.startsWith('meta::watch')) ? 'text-purple-600' : 'text-gray-500'
              }`} />
            </button>
          </div>

          {selectedMetaTags.length > 0 && (
            <div className="mt-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
              Will add:
              {selectedMetaTags.map((tag, index) => (
                <div key={index} className="font-mono mt-1">{tag}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteEditorModal;