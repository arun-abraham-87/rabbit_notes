import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';

const AddTextModal = ({ isOpen, onClose, onSave, onRemove, noteId, url, isEditing = false, initialText = '', noteContent = '' }) => {
  const [customText, setCustomText] = useState(initialText);
  const [customUrl, setCustomUrl] = useState(url);
  const [availableTextOptions, setAvailableTextOptions] = useState([]);
  const customTextInputRef = useRef(null);
  const customUrlInputRef = useRef(null);

  const toTitleCase = (text) => text
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());

  const getSelectedTextOption = (text = customText) => (
    availableTextOptions.find(option => option.value === text)
  );

  const getContentWithSelectedTextRemoved = (selectedOption) => {
    if (!selectedOption) return noteContent;
    return noteContent.replace(selectedOption.sourceText || selectedOption.value, '');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('[AddTextModal handleSubmit] customText:', JSON.stringify(customText), 'customUrl:', JSON.stringify(customUrl), 'noteId:', noteId);
    console.log('[AddTextModal handleSubmit] noteContent (first 200):', noteContent?.slice(0, 200));

    if (customText.trim() && customUrl.trim()) {
      const selectedOption = getSelectedTextOption(customText);
      const wasSelectedFromNote = Boolean(selectedOption);
      console.log('[AddTextModal handleSubmit] wasSelectedFromNote:', wasSelectedFromNote);

      if (wasSelectedFromNote) {
        const updatedContent = getContentWithSelectedTextRemoved(selectedOption);
        console.log('[AddTextModal handleSubmit] calling onSave with updatedContent (selected from note)');
        onSave(noteId, customUrl.trim(), customText.trim(), updatedContent);
      } else {
        console.log('[AddTextModal handleSubmit] calling onSave with original noteContent');
        onSave(noteId, customUrl.trim(), customText.trim(), noteContent);
      }

      setCustomText('');
      setCustomUrl('');
      onClose();
    } else {
      console.warn('[AddTextModal handleSubmit] SKIPPED - customText or customUrl empty:', { customText, customUrl });
    }
  };

  const handleClose = () => {
    setCustomText('');
    setCustomUrl('');
    onClose();
  };

  const cleanTextOptionFromLine = (line) => {
    const withoutFormatting = line
      .replace(/^\s*[-*]\s+/, '')
      .replace(/^\{#h[12]#\}/, '')
      .replace(/^\{#bold#\}/, '')
      .replace(/^\{#italics#\}/, '')
      .trim();

    const withoutMarkdownUrls = withoutFormatting.replace(/\[([^\]]+)\]\((?:https?:\/\/|www\.)[^)\s]+\)/gi, '');
    const withoutRawUrls = withoutMarkdownUrls
      .replace(/\bhttps?:\/\/[^\s)]+/gi, '')
      .replace(/\bwww\.[^\s)]+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    return withoutRawUrls;
  };



  const parseNoteContentToOptions = (content) => {
    if (!content) return [];
    
    // Split content into lines and filter out empty lines and meta tags
    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('meta::'))
      .filter(line => line !== url); // Exclude the URL itself
    
    // Create options from lines, avoiding raw URLs in the selectable text.
    return lines
      .map((line) => ({
        sourceText: cleanTextOptionFromLine(line),
      }))
      .filter(option => option.sourceText.length > 0)
      .filter(option => option.sourceText !== url)
      .map(option => ({
        ...option,
        text: toTitleCase(option.sourceText),
        value: toTitleCase(option.sourceText),
      }))
      .filter((option, index, allOptions) => (
        allOptions.findIndex(candidate => candidate.value.toLowerCase() === option.value.toLowerCase()) === index
      ))
      .sort((a, b) => a.text.localeCompare(b.text, undefined, { sensitivity: 'base' }))
      .map((option, index) => ({
        id: index,
        ...option
      }));
  };

  const handleDropdownSelection = (selectedValue) => {
    
    if (selectedValue) {
      
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
      console.log('[AddTextModal] capture keydown', {
        key: e.key,
        targetTag: e.target?.tagName,
        activeTag: document.activeElement?.tagName,
        isOpen
      });
      // Block 'j' and 'k' keys at capture phase when modal is open
      if (isOpen && (e.key === 'j' || e.key === 'k')) {
        const activeElement = document.activeElement;
        if (activeElement && (
          activeElement === customTextInputRef.current ||
          activeElement === customUrlInputRef.current ||
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA'
        )) {
          console.log('[AddTextModal] stopping propagation (NOT preventing default) - allowing character to be typed', {
            key: e.key,
            activeElementTag: activeElement?.tagName
          });
          // DON'T prevent default - we want the character to be typed!
          // Just stop propagation to prevent vim handler from seeing it
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }
      
      if (isOpen && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        
        e.preventDefault();
        
        if (customText.trim() && customUrl.trim()) {
          
          
          // Check if the custom text was selected from the note
          const selectedOption = getSelectedTextOption(customText);
          const wasSelectedFromNote = Boolean(selectedOption);
          
          if (wasSelectedFromNote) {
            // Remove the selected text from the note content
            const updatedContent = getContentWithSelectedTextRemoved(selectedOption);
            onSave(noteId, customUrl.trim(), customText.trim(), updatedContent);
          } else {
            // Use original note content (no text removal)
            onSave(noteId, customUrl.trim(), customText.trim(), noteContent);
          }
          
          setCustomText('');
          setCustomUrl('');
          onClose();
        } else {
          
        }
      }
    };

    if (isOpen) {
      // Use capture phase to intercept before vim handler
      document.addEventListener('keydown', handleKeyDown, true);
      return () => {
        
        document.removeEventListener('keydown', handleKeyDown, true);
      };
    }
  }, [isOpen, customText, customUrl, noteId, onSave, onClose, noteContent, availableTextOptions]);

  // Log when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      console.log('[AddTextModal] Modal opened - checking DOM', {
        modalElement: document.querySelector('[data-add-text-modal="true"]'),
        allModals: document.querySelectorAll('[data-modal="true"]').length
      });
      // Verify the modal is in DOM after a brief delay
      setTimeout(() => {
        const modalEl = document.querySelector('[data-add-text-modal="true"]');
        console.log('[AddTextModal] Modal DOM check after delay', {
          found: !!modalEl,
          element: modalEl
        });
      }, 100);
    } else {
      console.log('[AddTextModal] Modal closed');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" 
      data-modal="true" 
      data-add-text-modal="true"
      data-link-text-popup="true"
      onClick={(e) => {
        // Close modal when clicking on the backdrop
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      onKeyDown={(e) => {
        // Stop propagation to prevent global listeners from intercepting
        e.stopPropagation();
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-96 max-w-md mx-4"
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing
      >
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
            
            if (customText.trim() && customUrl.trim()) {
              
              
              // Check if the custom text was selected from the note
              const selectedOption = getSelectedTextOption(customText);
              const wasSelectedFromNote = Boolean(selectedOption);
              
              if (wasSelectedFromNote) {
                // Remove the selected text from the note content
                const updatedContent = getContentWithSelectedTextRemoved(selectedOption);
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
              ref={customTextInputRef}
              type="text"
              id="customText"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => {
                // Stop propagation of 'j' and 'k' keys to prevent vim bindings from intercepting
                if (e.key === 'j' || e.key === 'k') {
                  console.log('[AddTextModal] customText input - stopping propagation (NOT preventing default) - allowing character to be typed', e.key);
                  // DON'T prevent default - we want the character to be typed!
                  // Just stop propagation to prevent vim handler from seeing it
                  e.stopPropagation();
                  e.stopImmediatePropagation();
                  return true; // Allow default behavior
                }
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  
                  if (customText.trim() && customUrl.trim()) {
                    
                    
                    // Check if the custom text was selected from the note
                    const selectedOption = getSelectedTextOption(customText);
                    const wasSelectedFromNote = Boolean(selectedOption);
                    
                    if (wasSelectedFromNote) {
                      // Remove the selected text from the note content
                      const updatedContent = getContentWithSelectedTextRemoved(selectedOption);
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
              ref={customUrlInputRef}
              type="url"
              id="customUrl"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              onKeyDown={(e) => {
                // Stop propagation of 'j' and 'k' keys to prevent vim bindings from intercepting
                if (e.key === 'j' || e.key === 'k') {
                  console.log('[AddTextModal] customUrl input - stopping propagation (NOT preventing default) - allowing character to be typed', e.key);
                  // DON'T prevent default - we want the character to be typed!
                  // Just stop propagation to prevent vim handler from seeing it
                  e.stopPropagation();
                  e.stopImmediatePropagation();
                  return true; // Allow default behavior
                }
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  
                  if (customText.trim() && customUrl.trim()) {
                    
                    
                    // Check if the custom text was selected from the note
                    const selectedOption = getSelectedTextOption(customText);
                    const wasSelectedFromNote = Boolean(selectedOption);
                    
                    if (wasSelectedFromNote) {
                      // Remove the selected text from the note content
                      const updatedContent = getContentWithSelectedTextRemoved(selectedOption);
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
              Select Title from Note
            </label>
            {availableTextOptions.length > 0 ? (
              <div className="space-y-2">
                <select
                  value=""
                  onChange={(e) => handleDropdownSelection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose title from note...</option>
                  {availableTextOptions.map((option) => (
                    <option key={option.id} value={option.value}>
                      {option.text.length > 50 ? option.text.substring(0, 50) + '...' : option.text}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-gray-500">
                  {availableTextOptions.length} title option{availableTextOptions.length !== 1 ? 's' : ''} available from note
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">
                No title options available from note
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            {isEditing && onRemove && (
              <button
                type="button"
                onClick={() => { onRemove(noteId, customUrl.trim()); onClose(); }}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
              >
                Remove custom text
              </button>
            )}
            <div className="flex gap-3 ml-auto">
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
          </div>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default AddTextModal; 
