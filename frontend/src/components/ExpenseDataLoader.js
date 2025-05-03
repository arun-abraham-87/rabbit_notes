import React, { useState, useCallback, useEffect } from 'react';
import { XMarkIcon, ArrowUpTrayIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { updateNoteById, createNote, loadAllNotes } from '../utils/ApiUtils';

const ExpenseDataLoader = ({ onClose, noteId }) => {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [selectedColumns, setSelectedColumns] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [mergeColumns, setMergeColumns] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [expenseSourceTypes, setExpenseSourceTypes] = useState([]);
  const [expenseSourceNames, setExpenseSourceNames] = useState([]);
  const [selectedSourceType, setSelectedSourceType] = useState('');
  const [selectedSourceName, setSelectedSourceName] = useState('');

  useEffect(() => {
    const fetchExpenseSources = async () => {
      try {
        const response = await loadAllNotes();
        const allNotes = response.notes || [];
        
        console.log('All Notes:', allNotes);
        
        // Filter notes with meta::expense_source_type tag
        const sourceTypes = allNotes.filter(note => 
          note.content.split('\n').some(line => line.trim() === 'meta::expense_source_type')
        ).map(note => ({
          id: note.id,
          name: note.content.split('\n')[0]
        }));

        // Filter notes with meta::expense_source_name tag
        const sourceNames = allNotes.filter(note => 
          note.content.split('\n').some(line => line.trim() === 'meta::expense_source_name')
        ).map(note => ({
          id: note.id,
          name: note.content.split('\n')[0]
        }));
        
        console.log('Source Types:', sourceTypes);
        console.log('Source Names:', sourceNames);
        
        setExpenseSourceTypes(sourceTypes);
        setExpenseSourceNames(sourceNames);
      } catch (error) {
        console.error('Error fetching expense sources:', error);
      }
    };

    fetchExpenseSources();
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target.result;
                // Split by newlines and filter out empty lines
                const rows = text.split('\n')
                    .filter(row => row.trim().length > 0)
                    .map(row => {
                        // Handle quoted fields that may contain commas
                        const cells = [];
                        let currentCell = '';
                        let inQuotes = false;
                        
                        for (let i = 0; i < row.length; i++) {
                            const char = row[i];
                            
                            if (char === '"') {
                                inQuotes = !inQuotes;
                            } else if (char === ',' && !inQuotes) {
                                cells.push(currentCell.trim());
                                currentCell = '';
                            } else {
                                currentCell += char;
                            }
                        }
                        cells.push(currentCell.trim());
                        
                        return cells.map(cell => cell.replace(/^"|"$/g, ''));
                    });
                
                if (rows.length > 0) {
                    // Validate that all rows have the same number of columns
                    const numColumns = rows[0].length;
                    const isValid = rows.every(row => row.length === numColumns);
                    
                    if (!isValid) {
                        throw new Error('CSV file has inconsistent number of columns');
                    }
                    
                    // Create generic headers based on the number of columns in the first row
                    const genericHeaders = Array.from({ length: numColumns }, (_, i) => `Column ${i + 1}`);
                    setHeaders(genericHeaders);
                    setData(rows);
                }
            } catch (error) {
                console.error('Error parsing CSV file:', error);
                alert('Error parsing CSV file. Please ensure it is properly formatted.');
            }
        };
        reader.readAsText(file);
    }
  }, []);

  const handleColumnDragStart = (index) => {
    setDraggedColumn(index);
  };

  const handleColumnDragOver = (e, index) => {
    e.preventDefault();
  };

  const handleColumnDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedColumn === null) return;

    const newHeaders = [...headers];
    const [movedHeader] = newHeaders.splice(draggedColumn, 1);
    newHeaders.splice(targetIndex, 0, movedHeader);

    const newData = data.map(row => {
      const newRow = [...row];
      const [movedCell] = newRow.splice(draggedColumn, 1);
      newRow.splice(targetIndex, 0, movedCell);
      return newRow;
    });

    setHeaders(newHeaders);
    setData(newData);
    setDraggedColumn(null);
  };

  const handleRowSelect = (index) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const handleDeleteSelected = () => {
    const newData = data.filter((_, index) => !selectedRows.has(index));
    setData(newData);
    setSelectedRows(new Set());
  };

  const handleColumnSelect = (index) => {
    const newSelected = new Set(selectedColumns);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedColumns(newSelected);
    
    // Also add to merge columns when selecting
    const newMerge = [...mergeColumns];
    if (!newMerge.includes(index)) {
      newMerge.push(index);
      setMergeColumns(newMerge);
    }
  };

  const handleColumnMergeSelect = (index) => {
    const newMerge = [...mergeColumns];
    if (newMerge.includes(index)) {
      newMerge.splice(newMerge.indexOf(index), 1);
    } else {
      newMerge.push(index);
    }
    setMergeColumns(newMerge);
  };

  const handleDeleteSelectedColumns = () => {
    if (selectedColumns.size === 0) return;

    const newHeaders = headers.filter((_, index) => !selectedColumns.has(index));
    const newData = data.map(row => 
      row.filter((_, index) => !selectedColumns.has(index))
    );

    setHeaders(newHeaders);
    setData(newData);
    setSelectedColumns(new Set());
    setMergeColumns([]); // Also clear merge selection
  };

  const handleMergeColumns = () => {
    if (mergeColumns.length < 2) {
      console.log('Not enough columns selected for merge:', mergeColumns);
      return;
    }

    // Sort merge columns to ensure proper order
    const sortedMergeColumns = [...mergeColumns].sort((a, b) => a - b);
    
    const newHeaders = [...headers];
    const mergedHeader = sortedMergeColumns.map(i => headers[i]).join(' ');
    newHeaders.splice(sortedMergeColumns[0], sortedMergeColumns.length, mergedHeader);

    const newData = data.map(row => {
      const newRow = [...row];
      const mergedCell = sortedMergeColumns.map(i => row[i]).join(' ');
      newRow.splice(sortedMergeColumns[0], sortedMergeColumns.length, mergedCell);
      return newRow;
    });

    setHeaders(newHeaders);
    setData(newData);
    setMergeColumns([]);
    setSelectedColumns(new Set()); // Also clear selection
  };

  const handleSave = async () => {
    if (!selectedSourceType || !selectedSourceName) {
      alert('Please select both expense source type and name');
      return;
    }

    try {
        // Save all rows without quotes
        const formattedLines = data.map(row => 
            row.map(cell => cell.replace(/^"|"$/g, '')).join(' ')
        );

        // Create content with meta::expense tag and links to source notes
        const content = [
            ...formattedLines,
            'meta::expense',
            `meta::link::${selectedSourceType}`,
            `meta::link::${selectedSourceName}`
        ].join('\n');

        let response;
        if (noteId) {
            // Update existing note
            response = await updateNoteById(noteId, content);
        } else {
            // Create new note
            response = await createNote(content);
        }

        if (response) {
            setSavedCount(formattedLines.length);
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                onClose();
            }, 2000);
        } else {
            console.error('Failed to save note');
        }
    } catch (error) {
        console.error('Error saving note:', error);
    }
  };

  // Add useEffect to debug mergeColumns state
  useEffect(() => {
    console.log('Current mergeColumns state:', mergeColumns);
  }, [mergeColumns]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h1 className="text-2xl font-bold">CSV Editor</h1>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4">
          {data.length === 0 ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Drag and drop a CSV file here, or click to select
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expense Source Type *
                    </label>
                    <select
                      value={selectedSourceType}
                      onChange={(e) => setSelectedSourceType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select a source type</option>
                      {expenseSourceTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expense Source Name *
                    </label>
                    <select
                      value={selectedSourceName}
                      onChange={(e) => setSelectedSourceName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select a source name</option>
                      {expenseSourceNames.map((name) => (
                        <option key={name.id} value={name.id}>
                          {name.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteSelected}
                    disabled={selectedRows.size === 0}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    Delete Selected Rows
                  </button>
                  <button
                    onClick={handleDeleteSelectedColumns}
                    disabled={selectedColumns.size === 0}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    Delete Selected Columns
                  </button>
                  <button
                    onClick={handleMergeColumns}
                    disabled={mergeColumns.length < 2}
                    className={`px-4 py-2 text-white rounded-md ${
                      mergeColumns.length >= 2 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Merge Selected Columns ({mergeColumns.length})
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 ml-auto"
                  >
                    Save to Note
                  </button>
                </div>
              </div>

              <div className="relative overflow-x-auto shadow-md sm:rounded-lg border border-gray-200">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-white z-10 border-r border-gray-200">
                          Select
                        </th>
                        {headers.map((header, index) => (
                          <th
                            key={index}
                            draggable
                            onDragStart={() => handleColumnDragStart(index)}
                            onDragOver={(e) => handleColumnDragOver(e, index)}
                            onDrop={(e) => handleColumnDrop(e, index)}
                            className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-move max-w-[50ch] break-words ${
                              mergeColumns.includes(index) ? 'bg-blue-100' : ''
                            } ${selectedColumns.has(index) ? 'bg-red-100' : ''}`}
                            onClick={() => handleColumnSelect(index)}
                            onDoubleClick={() => handleColumnMergeSelect(index)}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className={selectedRows.has(rowIndex) ? 'bg-blue-50' : ''}
                        >
                          <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200">
                            <input
                              type="checkbox"
                              checked={selectedRows.has(rowIndex)}
                              onChange={() => handleRowSelect(rowIndex)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-6 py-4 text-sm text-gray-500 max-w-[50ch] break-words"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-center mb-4">
              <CheckCircleIcon className="h-12 w-12 text-green-500" />
            </div>
            <h3 className="text-lg font-medium text-center mb-2">Success!</h3>
            <p className="text-gray-600 text-center">
              Successfully saved {savedCount} records.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseDataLoader; 