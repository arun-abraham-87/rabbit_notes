import React, { useState, useEffect, useCallback } from 'react';
import { format, addDays } from 'date-fns';
import { loadJournal, saveJournal } from '../utils/ApiUtils';
import TagInput from './TagInput';
import { ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { ExclamationCircleIcon, TrashIcon } from '@heroicons/react/24/outline';

const JournalEditor = ({ date, onSaved }) => {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [metadata, setMetadata] = useState({});
  const [saveStatus, setSaveStatus] = useState('pristine'); // 'pristine' | 'unsaved' | 'saving' | 'saved' | 'error'
  const [currentDate, setCurrentDate] = useState(date);
  const [isStale, setIsStale] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState('');
  const [lastSavedTags, setLastSavedTags] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadJournalData = useCallback(async (targetDate) => {
    try {
      setIsLoading(true);
      const journal = await loadJournal(targetDate);
      if (journal) {
        setContent(journal.content);
        setTags(journal.tags);
        setMetadata(journal.metadata);
        setLastSavedContent(journal.content);
        setLastSavedTags(journal.tags);
      } else {
        // Initialize new journal
        setContent('');
        setTags([]);
        setMetadata({});
        setLastSavedContent('');
        setLastSavedTags([]);
      }
      setSaveStatus('pristine');
      setIsStale(false);
    } catch (error) {
      console.error('Error loading journal:', error);
      setSaveStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentDate) {
      loadJournalData(currentDate);
    } else {
      setIsLoading(false);
    }
  }, [currentDate, loadJournalData]);

  // Check for unsaved changes
  useEffect(() => {
    const contentChanged = content !== lastSavedContent;
    const tagsChanged = JSON.stringify(tags) !== JSON.stringify(lastSavedTags);
    if (contentChanged || tagsChanged) {
      setSaveStatus('unsaved');
    }
  }, [content, tags, lastSavedContent, lastSavedTags]);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      setSaveStatus('saving');
      const now = new Date().toISOString();
      await saveJournal(currentDate, {
        content,
        tags,
        metadata: {
          lastModified: now,
          created: metadata.created || now,
          tags: tags,
          wordCount: content.trim().split(/\s+/).filter(Boolean).length,
          charCount: content.length,
          mood: metadata.mood || null,
          topics: metadata.topics || []
        }
      });
      setLastSavedContent(content);
      setLastSavedTags([...tags]);
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error saving journal:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [content, tags, currentDate, metadata]);

  // Debounced auto-save
  useEffect(() => {
    if (!isLoading && saveStatus === 'unsaved') {
      const saveTimer = setTimeout(() => {
        handleSave();
      }, 1000); // Wait 1 second after last change before saving

      return () => clearTimeout(saveTimer);
    }
  }, [content, tags, handleSave, isLoading, saveStatus]);

  const handleContentChange = (e) => {
    setContent(e.target.value);
  };

  const handleTagsChange = (newTags) => {
    setTags(newTags);
  };

  const handleDateChange = (direction) => {
    const newDate = addDays(new Date(currentDate), direction === 'forward' ? 1 : -1)
      .toISOString()
      .split('T')[0];
    setCurrentDate(newDate);
  };

  const getStatusDisplay = () => {
    switch (saveStatus) {
      case 'unsaved':
        return {
          icon: <ExclamationCircleIcon className="h-5 w-5" />,
          text: 'Unsaved changes',
          className: 'text-amber-600'
        };
      case 'saving':
        return {
          icon: <div className="h-5 w-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />,
          text: 'Saving...',
          className: 'text-gray-600'
        };
      case 'saved':
        return {
          icon: <CheckCircleIcon className="h-5 w-5" />,
          text: 'All changes saved',
          className: 'text-green-600'
        };
      case 'error':
        return {
          icon: <ExclamationCircleIcon className="h-5 w-5" />,
          text: 'Save failed',
          className: 'text-red-600'
        };
      default:
        return null;
    }
  };

  const handleDelete = async () => {
    try {
      // Save empty content to effectively delete the entry
      await saveJournal(currentDate, {
        content: '',
        tags: [],
        metadata: {
          lastModified: new Date().toISOString(),
          deleted: true
        }
      });
      setContent('');
      setTags([]);
      setMetadata({});
      setShowDeleteConfirm(false);
      setSaveStatus('pristine');
      if (onSaved) onSaved();
    } catch (error) {
      console.error('Error deleting journal:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const status = getStatusDisplay();

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDateChange('backward')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Previous day"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <h2 className="text-2xl font-semibold text-gray-900 min-w-[200px] text-center">
              {format(new Date(currentDate), 'MMMM d, yyyy')}
            </h2>
            <button
              onClick={() => handleDateChange('forward')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Next day"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            {status && (
              <div className={`flex items-center gap-2 ${status.className}`}>
                {status.icon}
                <span className="text-sm font-medium">{status.text}</span>
              </div>
            )}
            <div className="relative">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                title="Delete journal entry"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
              
              {/* Delete Confirmation Popup */}
              {showDeleteConfirm && (
                <div className="absolute right-0 top-full mt-2 bg-white border rounded-lg shadow-lg p-4 w-72 z-20">
                  <p className="text-sm text-gray-700 mb-3">
                    Are you sure you want to delete this journal entry? This action cannot be undone.
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <TagInput tags={tags} onChange={handleTagsChange} />
        </div>

        <div className="mb-6">
          <textarea
            value={content}
            onChange={handleContentChange}
            spellCheck="true"
            className="w-full h-96 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Write your journal entry here..."
          />
        </div>
      </div>
    </div>
  );
};

export default JournalEditor; 