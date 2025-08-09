// src/components/InlineEditor.js
import React, { useRef, useEffect, useState } from 'react';
import { DevModeInfo } from '../utils/DevUtils';
import { TrashIcon } from '@heroicons/react/24/outline';

// API Base URL for image uploads
const API_BASE_URL = 'http://localhost:5001/api';

/**
 * Reusable inline‑edit UI: a textarea with Save / Cancel.
 *
 * Props
 * -----
 * text            – current text (string)
 * setText         – setter for the text in the parent state
 * onSave          – fn(newText)  called on Save or "Cmd+Enter"
 * onCancel        – fn()         called on Cancel click or "Escape"
 * onDelete        – fn()         called on Delete button click
 * inputClass      – extra Tailwind classes for the textarea (optional)
 */
const InlineEditor = ({ text, setText, onSave, onCancel, onDelete, inputClass = '', isSuperEditMode = false, wasOpenedFromSuperEdit = false, lineIndex = null, settings = {}, allNotes = [], addNote = null, updateNote = null, currentNoteId = null }) => {
  
  const inputRef = useRef(null);
  const [headerType, setHeaderType] = useState(null); // 'h1', 'h2', or null
  const [displayText, setDisplayText] = useState('');
  
  // Track if this is the initial mount
  const [isInitialMount, setIsInitialMount] = useState(true);
  
  // Workstream notes dropdown state
  const [showWorkstreamDropdown, setShowWorkstreamDropdown] = useState(false);
  const [workstreamSearch, setWorkstreamSearch] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
  const [selectedWorkstreamIndex, setSelectedWorkstreamIndex] = useState(0);
  const [triggerPosition, setTriggerPosition] = useState(null); // cursor position when [[ was typed
  
  // Filter workstream notes based on search
  const getWorkstreamNotes = (searchTerm = '') => {
    const workstreamNotes = allNotes.filter(note => 
      note.content.split('\n').some(line => 
        line.trim().startsWith('meta::workstream')
      )
    );
    
    if (!searchTerm) return workstreamNotes.slice(0, 5);
    
    const searchLower = searchTerm.toLowerCase();
    const filtered = workstreamNotes
      .filter(note => {
        const firstLine = note.content.split('\n')[0]?.toLowerCase() || '';
        return firstLine.includes(searchLower);
      })
      .slice(0, 5);
      
    return filtered;
  };
  
  // Get cursor position in the textarea
  const getCursorPosition = () => {
    if (!inputRef.current) return { x: 0, y: 0 };
    
    const textarea = inputRef.current;
    const rect = textarea.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(textarea);
    
    // For simplicity, position dropdown at the bottom-left of the textarea
    // This ensures it's always visible and near the input area
    const x = rect.left;
    const y = rect.bottom + window.scrollY;
    
    console.log('Simple positioning - x:', x, 'y:', y);
    console.log('Textarea rect:', rect);
    
    return { x, y };
  };
  
  // Close workstream dropdown
  const closeWorkstreamDropdown = () => {
    setShowWorkstreamDropdown(false);
    setWorkstreamSearch('');
    setSelectedWorkstreamIndex(0);
    setTriggerPosition(null);
  };
  
  // Insert selected workstream note as hyperlink and create bidirectional links
  const insertWorkstreamNote = async (note, currentNoteId = null) => {
    if (!inputRef.current || triggerPosition === null) return;
    
    const textarea = inputRef.current;
    const currentCursor = textarea.selectionStart;
    
    // Get the first line of the note as the title
    const noteTitle = note.content.split('\n')[0]?.trim() || `Note ${note.id}`;
    
    // Create a navigation link that filters by note ID in /notes
    const linkText = `[${noteTitle}](#/notes?note=${note.id})`;
    
    // Replace the [[ and search text with the link
    const beforeTrigger = displayText.substring(0, triggerPosition);
    const afterCursor = displayText.substring(currentCursor);
    const newText = beforeTrigger + linkText + afterCursor;
    
    setDisplayText(newText);
    closeWorkstreamDropdown();
    
    // Position cursor after the inserted link
    setTimeout(() => {
      const newCursorPosition = triggerPosition + linkText.length;
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);

    // Create bidirectional links if we have the current note context and updateNote function
    if (currentNoteId && updateNote) {
      try {
        // Helper function to add link tag to note content
        const addLinkTag = (content, targetId) => {
          const lines = content.split('\n').map(l => l.trimEnd());
          const linkTag = `meta::link::${targetId}`;
          if (!lines.includes(linkTag)) {
            lines.push(linkTag);
          }
          return lines.join('\n');
        };

        // Find the current note and target note
        const currentNote = allNotes.find(n => n.id === currentNoteId);
        const targetNote = note;

        if (currentNote && targetNote) {
          console.log('Creating bidirectional links between:', currentNote.id, 'and', targetNote.id);
          
          // Add link from current note to target note
          const updatedCurrentContent = addLinkTag(currentNote.content, targetNote.id);
          await updateNote(currentNote.id, updatedCurrentContent);

          // Add link from target note to current note
          const updatedTargetContent = addLinkTag(targetNote.content, currentNote.id);
          await updateNote(targetNote.id, updatedTargetContent);
          
          console.log('Bidirectional links created successfully');
        }
      } catch (error) {
        console.error('Error creating bidirectional links:', error);
      }
    }
  };

  // Create new workstream note and insert link
  const createWorkstreamNote = async (searchText, currentNoteId = null) => {
    if (!addNote || !inputRef.current || triggerPosition === null) return;
    
    try {
      // Create note content with workstream tag
      const noteContent = `${searchText}\nmeta::workstream::`;
      
      // Create the new note
      const newNote = await addNote(noteContent);
      
      if (newNote && newNote.id) {
        // Insert link to the newly created note with bidirectional linking
        await insertWorkstreamNote(newNote, currentNoteId);
      }
    } catch (error) {
      console.error('Error creating workstream note:', error);
    }
  };
  
  useEffect(() => {
    if (inputRef.current && isInitialMount) {
      inputRef.current.focus();
      // Only position cursor at the end on initial mount
      const textLength = displayText.length;
      inputRef.current.setSelectionRange(textLength, textLength);
      setIsInitialMount(false);
    }
  }, [displayText, isInitialMount]);

  // Detect if text is H1 (###) or H2 (##) and strip hash symbols for editing
  useEffect(() => {
    const trimmedText = text.trim();
    let newDisplayText = text;
    let newHeaderType = null;
    
    if (trimmedText.startsWith('###') && trimmedText.endsWith('###')) {
      newHeaderType = 'h1';
      newDisplayText = trimmedText.substring(3, trimmedText.length - 3); // Remove '###' prefix and '###' suffix
    } else if (trimmedText.startsWith('##') && trimmedText.endsWith('##')) {
      newHeaderType = 'h2';
      newDisplayText = trimmedText.substring(2, trimmedText.length - 2); // Remove '##' prefix and '##' suffix
    } else if (trimmedText.startsWith('### ')) {
      newHeaderType = 'h1';
      newDisplayText = trimmedText.substring(4); // Remove '### ' prefix only
    } else if (trimmedText.startsWith('## ')) {
      newHeaderType = 'h2';
      newDisplayText = trimmedText.substring(3); // Remove '## ' prefix only
    } else {
      newHeaderType = null;
      newDisplayText = text;
    }
    
    setHeaderType(newHeaderType);
    setDisplayText(newDisplayText);
  }, [text]);

  // State for custom label popup on paste
  const [pendingUrl, setPendingUrl] = useState(null);
  const [labelInput, setLabelInput] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ start: 0, end: 0 });

  // Image handling state
  const [pastedImage, setPastedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Cleanup image preview URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Upload image to server
  const uploadImage = async (file) => {
    const formData = new FormData();
    
    // Ensure the file has a proper extension based on its MIME type
    let filename = file.name;
    if (!filename || !filename.includes('.')) {
      const mimeType = file.type;
      let extension = '.png'; // Default to PNG
      
      if (mimeType === 'image/jpeg') extension = '.jpg';
      else if (mimeType === 'image/png') extension = '.png';
      else if (mimeType === 'image/gif') extension = '.gif';
      else if (mimeType === 'image/webp') extension = '.webp';
      
      filename = `clipboard-image${extension}`;
    }
    
    // Create a new File object with proper filename if needed
    const fileToUpload = filename !== file.name 
      ? new File([file], filename, { type: file.type })
      : file;
    
    formData.append('image', fileToUpload);

    try {
      const response = await fetch(`${API_BASE_URL}/images`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      return {
        imageUrl: data.imageUrl,
        imageId: data.imageId
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handlePaste = (e) => {
    // Check for images first
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            // Create a proper File object with extension from MIME type
            let extension = '.png'; // Default
            if (item.type === 'image/jpeg') extension = '.jpg';
            else if (item.type === 'image/png') extension = '.png';
            else if (item.type === 'image/gif') extension = '.gif';
            else if (item.type === 'image/webp') extension = '.webp';
            
            const file = new File([blob], `clipboard-image${extension}`, { type: item.type });
            
            setPastedImage(file);
            setImagePreview(URL.createObjectURL(file));
          }
          return;
        }
      }
    }

    // Handle text paste (existing logic)
    const pasteText = e.clipboardData.getData('text');
    const urlPattern = /^https?:\/\/[^\s]+$/;
    if (urlPattern.test(pasteText)) {
      e.preventDefault();
      
      // Get cursor position
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      // Show custom label popup with cursor position info
      setPendingUrl(pasteText);
      setLabelInput('');
      
      // Store cursor position for later use
      setCursorPosition({ start, end });
    }
  };

  const handleKeyDown = (e) => {
    
    
    // Handle workstream dropdown navigation
    if (showWorkstreamDropdown) {
      const workstreamNotes = getWorkstreamNotes(workstreamSearch);
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedWorkstreamIndex(prev => Math.min(prev + 1, workstreamNotes.length - 1));
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedWorkstreamIndex(prev => Math.max(prev - 1, 0));
        return;
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (workstreamNotes[selectedWorkstreamIndex]) {
          insertWorkstreamNote(workstreamNotes[selectedWorkstreamIndex], currentNoteId);
        } else if (workstreamNotes.length === 0 && workstreamSearch.trim()) {
          // Create new workstream note if no results found
          createWorkstreamNote(workstreamSearch.trim(), currentNoteId);
        }
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeWorkstreamDropdown();
        return;
      } else if (e.key === 'Backspace') {
        // Check if we're at the beginning of the search term
        const currentCursor = inputRef.current?.selectionStart || 0;
        if (triggerPosition !== null && currentCursor <= triggerPosition + 2) {
          closeWorkstreamDropdown();
        }
      }
    }
    
    // Handle Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
      return;
    }

    // Handle Cmd+Enter (or Ctrl+Enter) to save
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault(); // Prevent the event from bubbling up
      e.stopPropagation(); // Stop propagation to prevent global handler
      handleSave();
      return;
    }

    // Handle Cmd+K (or Ctrl+K) to save
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      e.stopPropagation();
      handleSave();
      return;
    }

    // Handle regular Enter - create new line or save based on mode
    if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      
      
      
      if (isSuperEditMode || wasOpenedFromSuperEdit) {
        // In superedit mode or opened from superedit mode, Enter saves the line
        
        handleSave();
        return;
      } else {
        // In normal mode, Enter creates a new line
        
        const newText = displayText + '\n';
        setDisplayText(newText);
        // Trigger resize after the newline is added
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
          }
        }, 0);
        return;
      }
    }

    // For all other keys, ensure they are not prevented from typing
    // Only prevent default for specific shortcuts, not regular typing
    if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.length === 1) {
      // This is a regular character key, allow it to type normally
      
      // Don't prevent default or stop propagation for regular typing
      return;
    }

    // For any other keys that we don't specifically handle, don't prevent default
    // This ensures that arrow keys, backspace, delete, etc. work normally
    
  };

  // Function to handle saving with proper header formatting
  const handleSave = async () => {
    try {
      setIsUploadingImage(true);
      let finalText = displayText;
      
      // Add header symbols back if it was a header
      if (headerType === 'h1') {
        finalText = '###' + displayText + '###';
      } else if (headerType === 'h2') {
        finalText = '##' + displayText + '##';
      }
      
      // Handle image upload if image is pasted
      if (pastedImage) {
        const response = await uploadImage(pastedImage);
        const { imageId } = response;
        
        // Add only the meta tag (no markdown line)
        const imageMetaTag = `meta::image::${imageId}`;
        finalText = finalText + 
          (finalText ? '\n' : '') + 
          imageMetaTag;
        
        console.log('✅ [InlineEditor] Image uploaded and added to text');
      }
      
      onSave(finalText);
      
      // Clear image state after successful save
      setPastedImage(null);
      setImagePreview(null);
      setIsUploadingImage(false);
      
      // If this was opened from superedit mode, trigger a return to superedit
      if (wasOpenedFromSuperEdit) {
        // Dispatch a custom event to signal return to superedit mode
        const event = new CustomEvent('returnToSuperEdit', {
          detail: { lineIndex: lineIndex } // Pass the actual line index
        });
        
        document.dispatchEvent(event);
      }
    } catch (error) {
      console.error('❌ [InlineEditor] Error saving with image:', error);
      alert('Failed to upload image. Please try again.');
      setIsUploadingImage(false);
    }
  };

  const closeUrlPopup = (newText) => {
    // Insert the new text at the cursor position
    const before = displayText.slice(0, cursorPosition.start);
    const after = displayText.slice(cursorPosition.end);
    const newContent = before + newText + after;
    
    setDisplayText(newContent);
    setPendingUrl(null);
    setCursorPosition({ start: 0, end: 0 });
    
    // Return focus to the main input after a short delay to ensure the DOM has updated
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        // Set cursor position after the inserted text
        const newCursorPos = cursorPosition.start + newText.length;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Debug logging for developer mode
  
  
  return (
    <DevModeInfo 
      componentName="InlineEditor" 
      isDevMode={settings?.developerMode || false}
    >
      <div className="w-full relative" data-note-inline-editor="true">
      {/* Red X button for deleting the line */}
      <button
        onClick={onDelete}
        className="absolute left-1 top-1/2 transform -translate-y-1/2 z-10 w-5 h-5 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors duration-150"
        title="Delete this line"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      
      {pendingUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow-lg w-80">
            <label className="block text-sm mb-2">Link text:</label>
            <input
              type="text"
              value={labelInput}
              onChange={e => setLabelInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  // confirm with custom or hostname
                  let label = labelInput.trim();
                  if (!label) {
                    try {
                      label = new URL(pendingUrl).hostname.replace(/^www\./, '');
                    } catch {
                      label = pendingUrl;
                    }
                  }
                  closeUrlPopup(`[${label}](${pendingUrl})`);
                } else if (e.key === 'Escape') {
                  // confirm bare URL
                  closeUrlPopup(pendingUrl);
                }
              }}
              autoFocus
              className="w-full border px-2 py-1 rounded mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  const label = labelInput.trim() || (() => {
                    try { return new URL(pendingUrl).hostname.replace(/^www\./,''); }
                    catch { return pendingUrl; }
                  })();
                  closeUrlPopup(`[${label}](${pendingUrl})`);
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
              >
                OK
              </button>
              <button
                onClick={() => closeUrlPopup(pendingUrl)}
                className="px-3 py-1 bg-gray-300 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <textarea
        ref={inputRef}
        value={displayText}
        onChange={(e) => {
          const newValue = e.target.value;
          setDisplayText(newValue);
          
          // Check for [[ trigger
          const cursorPos = e.target.selectionStart;
          const textBeforeCursor = newValue.substring(0, cursorPos);
          
          // Look for [[ pattern
          const lastTwoBrackets = textBeforeCursor.slice(-2);
          console.log('=== DROPDOWN DEBUG ===');
          console.log('lastTwoBrackets:', lastTwoBrackets);
          console.log('showWorkstreamDropdown:', showWorkstreamDropdown);
          console.log('Should trigger dropdown:', lastTwoBrackets === '[[' && !showWorkstreamDropdown);
          
          if (lastTwoBrackets === '[[' && !showWorkstreamDropdown) {
            console.log('Triggering dropdown!');
            setTriggerPosition(cursorPos - 2);
            setWorkstreamSearch('');
            setSelectedWorkstreamIndex(0);
            setShowWorkstreamDropdown(true);
            
            // Set dropdown position immediately
            const position = getCursorPosition();
            console.log('Dropdown position:', position);
            setDropdownPosition(position);
          } else if (showWorkstreamDropdown && triggerPosition !== null) {
            // Update search term if dropdown is open
            const searchText = textBeforeCursor.substring(triggerPosition + 2);
            if (searchText.includes(']') || searchText.includes('\n')) {
              // Close dropdown if ] or newline is typed
              closeWorkstreamDropdown();
            } else {
              setWorkstreamSearch(searchText);
              setSelectedWorkstreamIndex(0);
            }
          }
        }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onClick={(e) => {
          
          e.stopPropagation();
        }}
        onFocus={(e) => {
          
          // Prevent any immediate blur events
          setTimeout(() => {
            if (inputRef.current && document.activeElement !== inputRef.current) {
              
              inputRef.current.focus();
            }
          }, 0);
        }}
        onBlur={(e) => {
          
          
          
          
          
          // Check if the blur is happening immediately after focus
          
          
          // If blur happens too quickly after focus, try to prevent it
          if (e.relatedTarget && e.relatedTarget.tagName !== 'TEXTAREA') {
            
            setTimeout(() => {
              if (inputRef.current && document.activeElement !== inputRef.current) {
                
                inputRef.current.focus();
              }
            }, 10);
          }
        }}
        onInput={(e) => {
          
          // Auto-resize the textarea
          e.target.style.height = 'auto';
          e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
        }}
        onKeyPress={(e) => {
          
        }}
        onKeyUp={(e) => {
          
        }}
        className={`w-full border border-gray-300 pl-8 pr-16 py-1 rounded text-sm resize-none ${inputClass}`}
        rows={1}
        style={{
          resize: 'none',
          overflow: 'hidden',
          pointerEvents: 'auto',
          userSelect: 'text'
        }}
        autoComplete="off"
        spellCheck="false"
      />
      
      {/* Image Preview Section */}
      {imagePreview && (
        <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-16 h-16 object-cover rounded border border-gray-300"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-medium text-gray-700 mb-1">Image Ready</h4>
                  <p className="text-xs text-gray-500">
                    Will upload when saved
                  </p>
                </div>
                <button
                  onClick={() => {
                    setPastedImage(null);
                    setImagePreview(null);
                  }}
                  className="flex items-center justify-center w-6 h-6 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors duration-150"
                  title="Remove image"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Floating buttons at the end of text */}
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center pointer-events-none">
        <div className="flex items-center gap-1 pointer-events-auto">
          <button
            onClick={handleSave}
            disabled={isUploadingImage}
            className={`px-1.5 py-0.5 text-xs font-medium text-white rounded focus:outline-none focus:ring-1 transition-colors duration-150 shadow-sm ${
              isUploadingImage 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 focus:ring-green-400'
            }`}
          >
            {isUploadingImage ? 'Uploading...' : 'Save'}
          </button>

          <button
            onClick={() => {
              // Clear image state on cancel
              setPastedImage(null);
              setImagePreview(null);
              setIsUploadingImage(false);
              onCancel();
            }}
            className="px-1.5 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-400 transition-colors duration-150 shadow-sm"
          >
            Cancel
          </button>
        </div>
      </div>
      
      {/* Workstream notes dropdown */}
      {showWorkstreamDropdown && (
        <div
          className="fixed bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-w-xs"
          style={{
            left: dropdownPosition.x,
            top: dropdownPosition.y + 5,
            maxHeight: '200px',
            overflowY: 'auto',
            minWidth: '200px'
          }}
        >
          {(() => {
            console.log('Dropdown is rendering! showWorkstreamDropdown:', showWorkstreamDropdown);
            console.log('dropdownPosition:', dropdownPosition);
            console.log('workstreamSearch:', workstreamSearch);
            const workstreamNotes = getWorkstreamNotes(workstreamSearch);
            if (workstreamNotes.length === 0) {
              return (
                <div className="p-2">
                  <div className="p-2 text-gray-500 text-sm">
                    No workstream notes found
                  </div>
                  {workstreamSearch.trim() && (
                    <div
                      className="p-2 cursor-pointer text-sm bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 text-blue-700"
                      onClick={() => createWorkstreamNote(workstreamSearch.trim(), currentNoteId)}
                    >
                      <div className="font-medium">Create workstream</div>
                      <div className="text-xs text-blue-600">"{workstreamSearch.trim()}"</div>
                    </div>
                  )}
                </div>
              );
            }
            
            return workstreamNotes.map((note, index) => {
              const noteTitle = note.content.split('\n')[0]?.trim() || `Note ${note.id}`;
              const isSelected = index === selectedWorkstreamIndex;
              
              return (
                <div
                  key={note.id}
                  className={`p-2 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 ${
                    isSelected ? 'bg-blue-100' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => insertWorkstreamNote(note, currentNoteId)}
                  onMouseEnter={() => setSelectedWorkstreamIndex(index)}
                >
                  <div className="truncate">
                    {noteTitle.length > 30 ? noteTitle.substring(0, 30) + '...' : noteTitle}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
    </DevModeInfo>
  );
};

export default InlineEditor;