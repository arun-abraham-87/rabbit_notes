import React, { useState, useEffect, useCallback } from 'react';
import { format, addDays } from 'date-fns';
import { loadJournal, saveJournal } from '../utils/ApiUtils';
import TagInput from './TagInput';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

const JournalEditor = ({ date, onSaved }) => {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [metadata, setMetadata] = useState({});
  const [saveStatus, setSaveStatus] = useState('');
  const [currentDate, setCurrentDate] = useState(date);

  const loadJournalData = useCallback(async (targetDate) => {
    try {
      setIsLoading(true);
      const journal = await loadJournal(targetDate);
      if (journal) {
        setContent(journal.content);
        setTags(journal.tags);
        setMetadata(journal.metadata);
      } else {
        // Initialize new journal
        setContent('');
        setTags([]);
        setMetadata({});
      }
    } catch (error) {
      console.error('Error loading journal:', error);
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

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      setSaveStatus('Saving...');
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
      setSaveStatus('Saved');
      // Clear the "Saved" message after 2 seconds
      setTimeout(() => {
        setSaveStatus('');
      }, 2000);
    } catch (error) {
      console.error('Error saving journal:', error);
      setSaveStatus('Save failed');
      setTimeout(() => {
        setSaveStatus('');
      }, 3000);
    } finally {
      setIsSaving(false);
    }
  }, [content, tags, currentDate, metadata]);

  // Debounced auto-save
  useEffect(() => {
    if (!isLoading) {
      const saveTimer = setTimeout(() => {
        handleSave();
      }, 1000); // Wait 1 second after last change before saving

      return () => clearTimeout(saveTimer);
    }
  }, [content, tags, handleSave, isLoading]);

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

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
          {saveStatus && (
            <span className="text-sm text-gray-500 transition-opacity duration-200">
              {saveStatus}
            </span>
          )}
        </div>

        <div className="mb-6">
          <TagInput tags={tags} onChange={handleTagsChange} />
        </div>

        <div className="mb-6">
          <textarea
            value={content}
            onChange={handleContentChange}
            className="w-full h-96 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Write your journal entry here..."
          />
        </div>
      </div>
    </div>
  );
};

export default JournalEditor; 