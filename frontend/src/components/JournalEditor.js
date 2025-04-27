import React, { useState, useEffect, useCallback } from 'react';
import { format, addDays } from 'date-fns';
import { loadJournal, saveJournal } from '../utils/ApiUtils';
import TagInput from './TagInput';
import { ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { ExclamationCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { checkText } from '../utils/languageTool';
import { toast } from 'react-hot-toast';

const HighlightedTextarea = ({ value, onChange, grammarIssues }) => {
  const getHighlightedText = () => {
    if (!grammarIssues || grammarIssues.length === 0) {
      return value;
    }

    let result = value;
    let offset = 0;
    
    // Sort issues by offset to handle them in order
    const sortedIssues = [...grammarIssues].sort((a, b) => a.offset - b.offset);
    
    sortedIssues.forEach(issue => {
      const start = issue.offset + offset;
      const end = start + issue.length;
      const before = result.substring(0, start);
      const highlighted = `<span class="bg-yellow-300">${result.substring(start, end)}</span>`;
      const after = result.substring(end);
      result = before + highlighted + after;
      offset += highlighted.length - (end - start);
    });

    return result;
  };

  return (
    <div className="relative">
      <div
        className="absolute inset-0 p-4 whitespace-pre-wrap text-transparent"
        dangerouslySetInnerHTML={{ __html: getHighlightedText() }}
        style={{ zIndex: 1, pointerEvents: 'none' }}
      />
      <textarea
        value={value}
        onChange={onChange}
        spellCheck="true"
        className="w-full h-96 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-transparent relative z-10"
        placeholder="Write your journal entry here..."
      />
    </div>
  );
};

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
  const [grammarResults, setGrammarResults] = useState(null);
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);

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

  // Debounced grammar check
  useEffect(() => {
    if (!content.trim()) {
      setGrammarResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsCheckingGrammar(true);
        const result = await checkText(content);
        setGrammarResults(result);
        if (result.matches && result.matches.length > 0) {
          toast.warning(`Found ${result.matches.length} issues`);
        }
      } catch (error) {
        console.error('Error checking grammar:', error);
      } finally {
        setIsCheckingGrammar(false);
      }
    }, 1000); // Wait 1 second after typing stops

    return () => clearTimeout(timer);
  }, [content]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const status = getStatusDisplay();

  return (
    <div className="p-4">
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
            {isCheckingGrammar && (
              <div className="flex items-center gap-2 text-gray-600">
                <div className="h-5 w-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Checking grammar...</span>
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
          <HighlightedTextarea
            value={content}
            onChange={handleContentChange}
            grammarIssues={grammarResults?.matches || []}
          />
        </div>

        {grammarResults && grammarResults.matches && grammarResults.matches.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Grammar Check Results</h3>
            <ul className="space-y-2">
              {grammarResults.matches.map((match, index) => {
                const textBeforeOffset = content.substring(0, match.offset);
                const lineNumber = (textBeforeOffset.match(/\n/g) || []).length + 1;
                const charPosition = match.offset - textBeforeOffset.lastIndexOf('\n') - 1;
                
                return (
                  <li key={index} className="text-sm text-gray-700">
                    <span className="font-medium text-red-600">
                      Position {match.offset} (Line {lineNumber}, Char {charPosition}):
                    </span> {match.message}
                    {match.replacements && match.replacements.length > 0 && (
                      <div className="ml-4 mt-1">
                        <span className="text-gray-500">Suggestions:</span>
                        <ul className="list-disc list-inside">
                          {match.replacements.map((replacement, idx) => (
                            <li key={idx} className="text-gray-600">{replacement.value}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default JournalEditor; 