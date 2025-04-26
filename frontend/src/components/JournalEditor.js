import React, { useState, useEffect, useCallback } from 'react';
import { loadJournal, saveJournal } from '../utils/ApiUtils';
import { toast } from 'react-toastify';

const JournalEditor = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [journalContent, setJournalContent] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load journal entry when date changes
  useEffect(() => {
    const fetchJournal = async () => {
      try {
        const journal = await loadJournal(selectedDate);
        setJournalContent(journal.content);
        setMetadata(journal.metadata);
      } catch (error) {
        toast.error('Failed to load journal entry');
      }
    };
    fetchJournal();
  }, [selectedDate]);

  // Auto-save functionality with debounce
  const debouncedSave = useCallback(
    async (content) => {
      if (!content.trim()) return;
      
      try {
        setIsSaving(true);
        const journal = await saveJournal(selectedDate, content);
        setMetadata(journal.metadata);
        toast.success('Journal saved', { autoClose: 2000 });
      } catch (error) {
        toast.error('Failed to save journal');
      } finally {
        setIsSaving(false);
      }
    },
    [selectedDate]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      debouncedSave(journalContent);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [journalContent, debouncedSave]);

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const handleContentChange = (e) => {
    setJournalContent(e.target.value);
  };

  const handleManualSave = async () => {
    await debouncedSave(journalContent);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {metadata && (
            <div className="text-sm text-gray-500">
              <span>Words: {metadata.wordCount}</span>
              <span className="mx-2">•</span>
              <span>Characters: {metadata.charCount}</span>
              {metadata.mood && (
                <>
                  <span className="mx-2">•</span>
                  <span>Mood: {metadata.mood}</span>
                </>
              )}
            </div>
          )}
        </div>
        <button
          onClick={handleManualSave}
          disabled={isSaving}
          className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
            isSaving ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
      
      {metadata?.tags?.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {metadata.tags.map((tag, index) => (
            <span key={index} className="px-2 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mb-2 text-sm text-gray-500">
        Use #tag for tags, mood::happy for mood, and topic::work for topics
      </div>
      
      <textarea
        value={journalContent}
        onChange={handleContentChange}
        placeholder="Write your journal entry here..."
        className="w-full h-[calc(100vh-200px)] p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-sans text-base leading-relaxed"
      />
    </div>
  );
};

export default JournalEditor; 