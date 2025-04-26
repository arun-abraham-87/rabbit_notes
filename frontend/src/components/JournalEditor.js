import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { loadJournal, saveJournal } from '../utils/ApiUtils';
import TagInput from './TagInput';

const JournalEditor = ({ date, onSaved }) => {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [metadata, setMetadata] = useState({});
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    const loadJournalData = async () => {
      try {
        setIsLoading(true);
        const journal = await loadJournal(date);
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
    };

    if (date) {
      loadJournalData();
    } else {
      setIsLoading(false);
    }
  }, [date]);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      setSaveStatus('Saving...');
      const now = new Date().toISOString();
      await saveJournal(date, {
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
  }, [content, tags, date, metadata]);

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
          <h2 className="text-2xl font-semibold text-gray-900">
            {format(new Date(date), 'MMMM d, yyyy')}
          </h2>
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