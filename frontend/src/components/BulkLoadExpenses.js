import React, { useState, useCallback } from 'react';
import { XMarkIcon, ArrowUpTrayIcon, ChevronRightIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import Papa from 'papaparse';
import { createNote } from '../utils/ApiUtils';
import { toast } from 'react-toastify';

const BulkLoadExpenses = ({ isOpen, onClose, onBulkCreate }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [showNotePreview, setShowNotePreview] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateRow = (row, index) => {
    const rowErrors = [];
    
    // Check if row has enough columns
    if (row.length < 3) {
      rowErrors.push(`Row ${index + 1}: Missing required columns. Expected at least 3 columns.`);
      return rowErrors;
    }

    // Validate date format (dd/mm/yyyy)
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!row[0] || !dateRegex.test(row[0])) {
      rowErrors.push(`Row ${index + 1}: Invalid date format. Expected dd/mm/yyyy.`);
    } else {
      const [day, month, year] = row[0].split('/');
      const date = new Date(year, month - 1, day);
      if (isNaN(date.getTime())) {
        rowErrors.push(`Row ${index + 1}: Invalid date. Please check the day, month, and year values.`);
      }
    }

    // Validate description
    if (!row[1] || row[1].trim() === '') {
      rowErrors.push(`Row ${index + 1}: Description is required.`);
    }

    // Validate tag
    if (!row[2] || row[2].trim() === '') {
      rowErrors.push(`Row ${index + 1}: Tag is required.`);
    }

    // Validate deadline flag if present
    if (row[3] && row[3].toLowerCase() !== 'true' && row[3].toLowerCase() !== 'false') {
      rowErrors.push(`Row ${index + 1}: Deadline flag must be 'true' or 'false'.`);
    }

    return rowErrors;
  };

  const processFile = useCallback((file) => {
    if (file.type !== 'text/csv') {
      setErrors(['Please upload a CSV file']);
      return;
    }

    Papa.parse(file, {
      complete: (results) => {
        if (results.errors.length > 0) {
          setErrors(['Error parsing CSV file: ' + results.errors[0].message]);
          return;
        }

        const validationErrors = [];
        const validData = results.data
          .filter((row, index) => {
            const rowErrors = validateRow(row, index);
            if (rowErrors.length > 0) {
              validationErrors.push(...rowErrors);
              return false;
            }
            return true;
          })
          .map(row => ({
            date: row[0],
            description: row[1],
            tag: row[2],
            isDeadline: row[3]?.toLowerCase() === 'true'
          }));

        setParsedData(validData);
        setErrors(validationErrors);
      },
      error: (error) => {
        setErrors(['Error parsing CSV file: ' + error.message]);
        console.error('CSV Parse Error:', error);
      }
    });
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const getNoteContent = (row) => {
    // Convert dd/mm/yyyy to YYYY-MM-DDThh:mm format
    const [day, month, year] = row.date.split('/');
    const eventDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00`;
    const metaDate = new Date(year, month - 1, day).toISOString();
    
    let content = `event_description:${row.description}
event_date:${eventDate}
event_tags:${row.tag}
meta::event::${metaDate}`;

    if (row.isDeadline) {
      content += '\nmeta::deadline\nmeta::event_deadline';
    }

    return content;
  };

  const handleConfirm = useCallback(() => {
    if (parsedData.length > 0) {
      setShowNotePreview(true);
    }
  }, [parsedData]);

  const handleFinalConfirm = useCallback(async () => {
    if (parsedData.length > 0) {
      setIsCreating(true);
      const toastId = toast.loading(`Creating ${parsedData.length} notes...`);
      
      try {
        await onBulkCreate(parsedData);
        
        toast.update(toastId, {
          render: `Successfully created ${parsedData.length} notes!`,
          type: "success",
          isLoading: false,
          autoClose: 3000
        });
        onClose();
      } catch (error) {
        console.error('Error creating notes:', error);
        toast.update(toastId, {
          render: 'Failed to create notes. Please try again.',
          type: "error",
          isLoading: false,
          autoClose: 3000
        });
      } finally {
        setIsCreating(false);
      }
    }
  }, [parsedData, onBulkCreate, onClose]);

  const handleDownloadSample = () => {
    // Sample data with generic dummy events
    const sampleData = [
      ['25/03/2024', 'Dummy Event 1', 'Tag1', 'false'],
      ['15/04/2024', 'Dummy Event 2', 'Tag2', 'false'],
      ['01/05/2024', 'Dummy Event 3', 'Tag3', 'true']
    ];

    // Convert to CSV
    const csv = Papa.unparse(sampleData);

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_events.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 z-50">
            <div className="absolute right-0 top-0 pr-4 pt-4">
              <button
                type="button"
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                onClick={onClose}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
                  {showNotePreview ? 'Confirm Note Format' : 'Bulk Load Events'}
                </h3>

                {!showNotePreview ? (
                  <>
                    <div className="flex justify-end mb-4">
                      <button
                        onClick={handleDownloadSample}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                        Download Sample CSV
                      </button>
                    </div>
                    <div
                      className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center ${
                        isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-2">
                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer rounded-md bg-white px-3 py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
                        >
                          <span>Upload a file</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            accept=".csv"
                            className="sr-only"
                            onChange={handleFileSelect}
                          />
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          or drag and drop a CSV file
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Format: date (dd/mm/yyyy), description, tag, is_deadline (true/false)
                        </p>
                      </div>
                    </div>

                    {errors.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-red-600 mb-2">Validation Errors:</h4>
                        <div className="max-h-40 overflow-y-auto">
                          <ul className="list-disc pl-5 space-y-1">
                            {errors.map((error, index) => (
                              <li key={index} className="text-sm text-red-600">
                                {error}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {parsedData.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Preview ({parsedData.length} valid entries)
                        </h4>
                        <div className="max-h-60 overflow-y-auto">
                          <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Tag</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Deadline</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                              {parsedData.map((row, index) => (
                                <tr key={index}>
                                  <td className="px-3 py-2 text-sm text-gray-500">{row.date}</td>
                                  <td className="px-3 py-2 text-sm text-gray-500">{row.description}</td>
                                  <td className="px-3 py-2 text-sm text-gray-500">{row.tag}</td>
                                  <td className="px-3 py-2 text-sm text-gray-500">{row.isDeadline ? 'Yes' : 'No'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        onClick={onClose}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className={`rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm ${
                          parsedData.length > 0 && errors.length === 0
                            ? 'bg-indigo-600 hover:bg-indigo-500'
                            : 'bg-gray-400 cursor-not-allowed'
                        }`}
                        onClick={handleConfirm}
                        disabled={parsedData.length === 0 || errors.length > 0}
                      >
                        Confirm Upload
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-4 space-y-4">
                      <p className="text-sm text-gray-500">
                        The following notes will be created:
                      </p>
                      <div className="max-h-96 overflow-y-auto space-y-4">
                        {parsedData.map((row, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900">Note {index + 1}</span>
                            </div>
                            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-white p-2 rounded border">
                              {getNoteContent(row)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        onClick={() => setShowNotePreview(false)}
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        className={`rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm ${
                          isCreating 
                            ? 'bg-indigo-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-500'
                        }`}
                        onClick={handleFinalConfirm}
                        disabled={isCreating}
                      >
                        {isCreating ? 'Creating Notes...' : 'Create Notes'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkLoadExpenses; 