import React, { useState, useCallback } from 'react';
import { XMarkIcon, ArrowUpTrayIcon, CheckIcon } from '@heroicons/react/24/solid';
import { saveJournal } from '../utils/ApiUtils';
import { format, parseISO, isValid } from 'date-fns';

const JournalPreviewCard = ({ date, content, onSelect, isSelected }) => {
  const previewContent = content.length > 150 ? content.substring(0, 150) + '...' : content;
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  // Try to parse and format the date, fallback to raw date if parsing fails
  let displayDate = date;
  try {
    const parsedDate = parseISO(date);
    if (isValid(parsedDate)) {
      displayDate = format(parsedDate, 'dd-MM-yyyy');
    }
  } catch (error) {
    // Keep the original date if parsing fails
    console.warn('Failed to parse date:', date);
  }

  return (
    <div 
      className={`border rounded-lg p-4 cursor-pointer transition-all ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onSelect(date)}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-medium text-gray-900">{displayDate}</h4>
          <p className="text-sm text-gray-500">{wordCount} words</p>
        </div>
        {isSelected && <CheckIcon className="h-5 w-5 text-blue-500" />}
      </div>
      <p className="text-sm text-gray-600 whitespace-pre-wrap">{previewContent}</p>
    </div>
  );
};

const LoadJournalsModal = ({ isOpen, onClose, onJournalsLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [previewJournals, setPreviewJournals] = useState([]);
  const [selectedJournals, setSelectedJournals] = useState(new Set());
  const [fileContent, setFileContent] = useState('');

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);

    const file = e.dataTransfer.files[0];
    if (!file) {
      setError('No file selected');
      return;
    }

    // Accept any text file or file with no type
    if (file.type && !file.type.includes('text/') && file.type !== '') {
      setError('Please upload a text file');
      return;
    }

    try {
      const text = await file.text();
      setFileContent(text);
      
      // Split the text into lines and process each line
      const lines = text.split('\n')
        .filter(line => line.trim()) // Remove empty lines
        .map(line => {
          // Remove the SQL insert statement prefix
          const cleanedLine = line.replace(
            /^insert into pms_journal \(committed,journal_date,journal,user_id,id\) values \(/,
            ''
          );
          
          const parts = cleanedLine.split(',');
          if (parts.length < 2) {
            return null;
          }
          
          // Ignore position 0, use position 1 as date
          const date = parts[1].trim().replace(/'/g, ''); // Remove quotes
          
          // Extract content between single quotes
          const remainingText = parts.slice(2).join(',');
          const contentMatch = remainingText.match(/'([^']*)'/);
          const content = contentMatch ? contentMatch[1] : remainingText.trim();
          
          // Try to parse the date, if it fails, return null
          try {
            const parsedDate = parseISO(date);
            if (!isValid(parsedDate)) {
              console.warn('Invalid date:', date);
              return null;
            }
          } catch (error) {
            console.warn('Failed to parse date:', date);
            return null;
          }
          
          return {
            date,
            content
          };
        })
        .filter(entry => entry !== null); // Remove any invalid entries

      if (lines.length === 0) {
        setError('No valid journal entries found in the file');
        return;
      }

      setPreviewJournals(lines);
      setSelectedJournals(new Set(lines.map(entry => entry.date)));
    } catch (error) {
      console.error('Error reading file:', error);
      setError(`Failed to read file: ${error.message}`);
    }
  }, []);

  const handleImport = async () => {
    if (selectedJournals.size === 0) {
      setError('Please select at least one journal to import');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress({ current: 0, total: selectedJournals.size });

    try {
      let processedCount = 0;
      for (const journal of previewJournals) {
        if (selectedJournals.has(journal.date)) {
          await saveJournal(journal.date, {
            content: journal.content,
            metadata: {
              created: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              tags: [],
              wordCount: journal.content.split(/\s+/).filter(Boolean).length,
              charCount: journal.content.length
            }
          });
          processedCount++;
          setProgress(prev => ({ ...prev, current: processedCount }));
        }
      }

      onJournalsLoaded();
      onClose();
    } catch (error) {
      console.error('Error importing journals:', error);
      setError('Failed to import journals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleJournalSelection = (date) => {
    setSelectedJournals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const toggleAllJournals = () => {
    if (selectedJournals.size === previewJournals.length) {
      setSelectedJournals(new Set());
    } else {
      setSelectedJournals(new Set(previewJournals.map(j => j.date)));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Load Journals</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {previewJournals.length === 0 ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <ArrowUpTrayIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">Drag and drop your journal SQL file here</p>
            <p className="text-sm text-gray-500">
              The file should contain SQL insert statements for pms_journal table
            </p>
            {error && (
              <p className="text-sm text-red-600 mt-4">{error}</p>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={toggleAllJournals}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {selectedJournals.size === previewJournals.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={handleImport}
                disabled={loading || selectedJournals.size === 0}
                className={`px-4 py-2 rounded-lg ${
                  loading || selectedJournals.size === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {loading ? `Importing (${progress.current}/${progress.total})` : 'Import Selected'}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-2">
              {previewJournals.map((journal) => (
                <JournalPreviewCard
                  key={journal.date}
                  date={journal.date}
                  content={journal.content}
                  onSelect={toggleJournalSelection}
                  isSelected={selectedJournals.has(journal.date)}
                />
              ))}
            </div>
          </div>
        )}

        {error && previewJournals.length > 0 && (
          <p className="text-sm text-red-600 mt-4">{error}</p>
        )}
      </div>
    </div>
  );
};

export default LoadJournalsModal; 