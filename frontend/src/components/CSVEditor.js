import React, { useState, useCallback } from 'react';
import { XMarkIcon, ArrowUpTrayIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { updateNoteById, createNote } from '../utils/ApiUtils';

const CSVEditor = ({ onClose, noteId }) => {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [mergeColumns, setMergeColumns] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

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
            const text = event.target.result;
            // Split by newlines and filter out empty lines
            const rows = text.split('\n')
                .filter(row => row.trim().length > 0)
                .map(row => row.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
            
            if (rows.length > 0) {
                // Create generic headers based on the number of columns in the first row
                const numColumns = rows[0].length;
                const genericHeaders = Array.from({ length: numColumns }, (_, i) => `Column ${i + 1}`);
                setHeaders(genericHeaders);
                // Use all rows as data
                setData(rows);
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

  const handleMergeColumns = () => {
    if (mergeColumns.length < 2) return;

    const newHeaders = [...headers];
    const mergedHeader = mergeColumns.map(i => headers[i]).join(' ');
    newHeaders.splice(mergeColumns[0], mergeColumns.length, mergedHeader);

    const newData = data.map(row => {
      const newRow = [...row];
      const mergedCell = mergeColumns.map(i => row[i]).join(' ');
      newRow.splice(mergeColumns[0], mergeColumns.length, mergedCell);
      return newRow;
    });

    setHeaders(newHeaders);
    setData(newData);
    setMergeColumns([]);
  };

  const handleSave = async () => {
    try {
        // Save all rows without quotes
        const formattedLines = data.map(row => 
            row.map(cell => cell.replace(/^"|"$/g, '')).join(' ')
        );

        // Create content with meta::expense tag at the end
        const content = [
            ...formattedLines,
            'meta::expense'
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
              <div className="mb-4 flex gap-2">
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedRows.size === 0}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  Delete Selected Rows
                </button>
                <button
                  onClick={handleMergeColumns}
                  disabled={mergeColumns.length < 2}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Merge Selected Columns
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 ml-auto"
                >
                  Save to Note
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Select
                      </th>
                      {headers.map((header, index) => (
                        <th
                          key={index}
                          draggable
                          onDragStart={() => handleColumnDragStart(index)}
                          onDragOver={(e) => handleColumnDragOver(e, index)}
                          onDrop={(e) => handleColumnDrop(e, index)}
                          className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-move ${
                            mergeColumns.includes(index) ? 'bg-blue-100' : ''
                          }`}
                          onClick={() => {
                            const newMerge = [...mergeColumns];
                            if (newMerge.includes(index)) {
                              setMergeColumns(newMerge.filter(i => i !== index));
                            } else {
                              newMerge.push(index);
                              setMergeColumns(newMerge);
                            }
                          }}
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
                        <td className="px-6 py-4 whitespace-nowrap">
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
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
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

export default CSVEditor; 