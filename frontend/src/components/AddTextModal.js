import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const AddTextModal = ({ isOpen, onClose, onSave, noteId, url, isEditing = false, initialText = '', noteContent = '' }) => {
  const [customText, setCustomText] = useState(initialText);
  const [customUrl, setCustomUrl] = useState(url);
  const [availableTextOptions, setAvailableTextOptions] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('handleSubmit called with customText:', customText, 'customUrl:', customUrl);
    if (customText.trim() && customUrl.trim()) {
      // Check if the custom text was selected from the note
      const wasSelectedFromNote = availableTextOptions.some(option => option.value === customText);
      console.log('wasSelectedFromNote:', wasSelectedFromNote);
      
      if (wasSelectedFromNote) {
        // Remove the selected text from the note content
        const updatedContent = noteContent.replace(customText, '');
        console.log('Saving with text removal. customText:', customText, 'updatedContent:', updatedContent);
        onSave(noteId, customUrl.trim(), customText.trim(), updatedContent);
      } else {
        // Use original note content (no text removal)
        console.log('Saving without text removal. customText:', customText, 'noteContent:', noteContent);
        onSave(noteId, customUrl.trim(), customText.trim(), noteContent);
      }
      
      setCustomText('');
      setCustomUrl('');
      onClose();
    }
  };

  const handleClose = () => {
    setCustomText('');
    setCustomUrl('');
    onClose();
  };



  const parseNoteContentToOptions = (content) => {
    if (!content) return [];
    
    // Split content into lines and filter out empty lines and meta tags
    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('meta::'))
      .filter(line => line !== url); // Exclude the URL itself
    
    // Create options from lines
    return lines.map((line, index) => ({
      id: index,
      text: line,
      value: line
    }));
  };

  const handleDropdownSelection = (selectedValue) => {
    console.log('Dropdown selection:', selectedValue);
    if (selectedValue) {
      console.log('Setting custom text to:', selectedValue);
      setCustomText(selectedValue);
      // Don't save immediately - just populate the custom text field
    }
  };

  // Update customText when initialText changes (for editing mode)
  React.useEffect(() => {
    if (isOpen) {
      setCustomText(initialText);
      setCustomUrl(url);
      setAvailableTextOptions(parseNoteContentToOptions(noteContent));
    }
  }, [initialText, url, isOpen, noteContent]);

  // Handle Cmd+Enter to save and close
  useEffect(() => {
    const handleKeyDown = (e) => {
      console.log('AddTextModal keydown:', e.key, 'metaKey:', e.metaKey, 'ctrlKey:', e.ctrlKey, 'isOpen:', isOpen);
      if (isOpen && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        console.log('Cmd+Enter detected in AddTextModal');
        e.preventDefault();
        console.log('customText:', customText, 'customUrl:', customUrl);
        if (customText.trim() && customUrl.trim()) {
          console.log('Saving with Cmd+Enter');
          
          // Check if the custom text was selected from the note
          const wasSelectedFromNote = availableTextOptions.some(option => option.value === customText);
          
          if (wasSelectedFromNote) {
            // Remove the selected text from the note content
            const updatedContent = noteContent.replace(customText, '');
            onSave(noteId, customUrl.trim(), customText.trim(), updatedContent);
          } else {
            // Use original note content (no text removal)
            onSave(noteId, customUrl.trim(), customText.trim(), noteContent);
          }
          
          setCustomText('');
          setCustomUrl('');
          onClose();
        } else {
          console.log('Validation failed - missing text or URL');
        }
      }
    };

    if (isOpen) {
      console.log('AddTextModal: Setting up keydown listener');
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        console.log('AddTextModal: Cleaning up keydown listener');
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, customText, customUrl, noteId, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {isEditing ? 'Edit Link Text' : 'Add Custom Text'}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6" onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            console.log('Form Cmd+Enter detected');
            if (customText.trim() && customUrl.trim()) {
              console.log('Form saving with Cmd+Enter');
              
              // Check if the custom text was selected from the note
              const wasSelectedFromNote = availableTextOptions.some(option => option.value === customText);
              
              if (wasSelectedFromNote) {
                // Remove the selected text from the note content
                const updatedContent = noteContent.replace(customText, '');
                onSave(noteId, customUrl.trim(), customText.trim(), updatedContent);
              } else {
                // Use original note content (no text removal)
                onSave(noteId, customUrl.trim(), customText.trim(), noteContent);
              }
              
              setCustomText('');
              setCustomUrl('');
              onClose();
            }
          }
        }}>
          <div className="mb-4">
            <label htmlFor="customText" className="block text-sm font-medium text-gray-700 mb-2">
              Custom Text
            </label>
            <input
              type="text"
              id="customText"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  console.log('Input Cmd+Enter detected');
                  if (customText.trim() && customUrl.trim()) {
                    console.log('Input saving with Cmd+Enter');
                    
                    // Check if the custom text was selected from the note
                    const wasSelectedFromNote = availableTextOptions.some(option => option.value === customText);
                    
                    if (wasSelectedFromNote) {
                      // Remove the selected text from the note content
                      const updatedContent = noteContent.replace(customText, '');
                      onSave(noteId, customUrl.trim(), customText.trim(), updatedContent);
                    } else {
                      // Use original note content (no text removal)
                      onSave(noteId, customUrl.trim(), customText.trim(), noteContent);
                    }
                    
                    setCustomText('');
                    setCustomUrl('');
                    onClose();
                  }
                }
              }}
              placeholder="Enter custom text for the link"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              autoFocus
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="customUrl" className="block text-sm font-medium text-gray-700 mb-2">
              URL
            </label>
            <input
              type="url"
              id="customUrl"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  console.log('URL Input Cmd+Enter detected');
                  if (customText.trim() && customUrl.trim()) {
                    console.log('URL Input saving with Cmd+Enter');
                    
                    // Check if the custom text was selected from the note
                    const wasSelectedFromNote = availableTextOptions.some(option => option.value === customText);
                    
                    if (wasSelectedFromNote) {
                      // Remove the selected text from the note content
                      const updatedContent = noteContent.replace(customText, '');
                      onSave(noteId, customUrl.trim(), customText.trim(), updatedContent);
                    } else {
                      // Use original note content (no text removal)
                      onSave(noteId, customUrl.trim(), customText.trim(), noteContent);
                    }
                    
                    setCustomText('');
                    setCustomUrl('');
                    onClose();
                  }
                }
              }}
              placeholder="Enter URL"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          {/* Note Content Selection Section */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Text from Note
            </label>
            {availableTextOptions.length > 0 ? (
              <div className="space-y-2">
                <select
                  value=""
                  onChange={(e) => handleDropdownSelection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose text from note...</option>
                  {availableTextOptions.map((option) => (
                    <option key={option.id} value={option.value}>
                      {option.text.length > 50 ? option.text.substring(0, 50) + '...' : option.text}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-gray-500">
                  {availableTextOptions.length} text option{availableTextOptions.length !== 1 ? 's' : ''} available from note
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">
                No text options available from note
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isEditing ? 'Update Link' : 'Add Link'} (⌘+Enter)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTextModal; 