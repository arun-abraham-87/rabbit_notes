import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { loadJournal, saveJournal } from '../utils/ApiUtils';
import TagInput from './TagInput';

const JournalEditor = ({ date, onSaved }) => {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [metadata, setMetadata] = useState({});

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

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveJournal(date, {
        content,
        tags,
        lastModified: new Date().toISOString(),
        metadata: {
          ...metadata,
          wordCount: content.trim().split(/\s+/).length
        }
      });
      onSaved?.();
    } catch (error) {
      console.error('Error saving journal:', error);
    } finally {
      setIsSaving(false);
    }
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
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            {format(new Date(date), 'MMMM d, yyyy')}
          </h2>
        </div>

        <div className="mb-6">
          <TagInput tags={tags} onChange={setTags} />
        </div>

        <div className="mb-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-96 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Write your journal entry here..."
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JournalEditor; 