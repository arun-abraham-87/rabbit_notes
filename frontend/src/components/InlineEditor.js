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
  
  // Wiki-link dropdown state (Obsidian-style [[ ]])
  const [showWikiLinkDropdown, setShowWikiLinkDropdown] = useState(false);
  const [wikiLinkSearch, setWikiLinkSearch] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
  const [selectedWikiLinkIndex, setSelectedWikiLinkIndex] = useState(0);
  const [triggerPosition, setTriggerPosition] = useState(null); // cursor position when [[ was typed
  
  // Filter all notes based on search for wiki-link suggestions
  const getWikiLinkNotes = (searchTerm = '') => {
    if (!searchTerm) return allNotes.slice(0, 10);
    
    const searchLower = searchTerm.toLowerCase();
    const filtered = allNotes
      .filter(note => {
        const firstLine = note.content.split('\n')[0]?.toLowerCase() || '';
        const noteId = note.id?.toString().toLowerCase() || '';
        // Match if search term appears in first line or note ID
        return firstLine.includes(searchLower) || noteId.includes(searchLower);
      })
      .slice(0, 10);
      
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
  
  // Close wiki-link dropdown
  const closeWikiLinkDropdown = () => {
    setShowWikiLinkDropdown(false);
    setWikiLinkSearch('');
    setSelectedWikiLinkIndex(0);
    setTriggerPosition(null);
  };
  
  // Insert selected note as wiki-link and create bidirectional links
  const insertWikiLinkNote = async (note, currentNoteId = null) => {
    if (!inputRef.current || triggerPosition === null) return;
    
    const textarea = inputRef.current;
    const currentCursor = textarea.selectionStart;
    
    // Get the first line of the note as the title
    const noteTitle = note.content.split('\n')[0]?.trim() || `Note ${note.id}`;
    
    // Create a wiki-link in Obsidian style: [[Note Title]]
    const linkText = `[[${noteTitle}]]`;
    
    // Find where the ]] is (should be after current cursor or search for it)
    const textAfterTrigger = displayText.substring(triggerPosition);
    const closingBracketsIndex = textAfterTrigger.indexOf(']]');
    
    if (closingBracketsIndex !== -1) {
      // Replace everything from [[ to ]] with the new link
      const beforeTrigger = displayText.substring(0, triggerPosition);
      const afterClosingBrackets = displayText.substring(triggerPosition + closingBracketsIndex + 2);
      const newText = beforeTrigger + linkText + afterClosingBrackets;
      
      setDisplayText(newText);
      closeWikiLinkDropdown();
      
      // Position cursor after the inserted link
      setTimeout(() => {
        const newCursorPosition = triggerPosition + linkText.length;
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      }, 0);
    } else {
      // Fallback: replace from trigger position to current cursor
      const beforeTrigger = displayText.substring(0, triggerPosition);
      const afterCursor = displayText.substring(currentCursor);
      const newText = beforeTrigger + linkText + afterCursor;
      
      setDisplayText(newText);
      closeWikiLinkDropdown();
      
      // Position cursor after the inserted link
      setTimeout(() => {
        const newCursorPosition = triggerPosition + linkText.length;
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      }, 0);
    }

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

  // Create new note and insert wiki-link
  const createNewNoteWithWikiLink = async (searchText, currentNoteId = null) => {
    if (!addNote || !inputRef.current || triggerPosition === null) return;
    
    try {
      // Create note content
      const noteContent = `${searchText}`;
      
      // Create the new note
      const newNote = await addNote(noteContent);
      
      if (newNote && newNote.id) {
        // Insert wiki-link to the newly created note with bidirectional linking
        await insertWikiLinkNote(newNote, currentNoteId);
      }
    } catch (error) {
      console.error('Error creating note with wiki-link:', error);
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
  const [urlPopupInputRef, setUrlPopupInputRef] = useState(null);

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

  // Handle focus when URL popup opens
  useEffect(() => {
    if (pendingUrl) {
      // Disable the main textarea temporarily
      if (inputRef.current) {
        inputRef.current.disabled = true;
      }
      
      return () => {
        // Re-enable the main textarea
        if (inputRef.current) {
          inputRef.current.disabled = false;
        }
      };
    }
  }, [pendingUrl]);

  // Compress image while maintaining dimensions
  const compressImage = (file, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Keep original dimensions
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image on canvas
        ctx.drawImage(img, 0, 0);
        
        // Convert to blob with compression
        canvas.toBlob(
          (blob) => resolve(blob),
          'image/jpeg', // Convert to JPEG for better compression
          quality
        );
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Upload image to server
  const uploadImage = async (file) => {
    const formData = new FormData();
    
    // Compress image first (except for GIFs to preserve animation)
    let fileToProcess = file;
    if (file.type !== 'image/gif') {
      console.log(`📊 Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      fileToProcess = await compressImage(file, 0.8);
      console.log(`📊 Compressed size: ${(fileToProcess.size / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // Ensure the file has a proper extension based on its MIME type
    let filename = file.name;
    if (!filename || !filename.includes('.')) {
      const mimeType = fileToProcess.type;
      let extension = '.jpg'; // Default to JPG for compressed images
      
      if (file.type === 'image/gif') extension = '.gif'; // Keep GIF as GIF
      else if (file.type === 'image/png' && file.type === fileToProcess.type) extension = '.png';
      else extension = '.jpg'; // Compressed images become JPG
      
      filename = `clipboard-image${extension}`;
    } else {
      // Update extension if we compressed to JPEG
      if (file.type !== 'image/gif' && !filename.toLowerCase().endsWith('.gif')) {
        filename = filename.replace(/\.[^/.]+$/, '.jpg');
      }
    }
    
    // Create a new File object with proper filename
    const finalFile = new File([fileToProcess], filename, { type: fileToProcess.type });
    
    formData.append('image', finalFile);

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
    
    
    // Handle wiki-link dropdown navigation
    if (showWikiLinkDropdown) {
      const wikiLinkNotes = getWikiLinkNotes(wikiLinkSearch);
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedWikiLinkIndex(prev => Math.min(prev + 1, wikiLinkNotes.length - 1));
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedWikiLinkIndex(prev => Math.max(prev - 1, 0));
        return;
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (wikiLinkNotes[selectedWikiLinkIndex]) {
          insertWikiLinkNote(wikiLinkNotes[selectedWikiLinkIndex], currentNoteId);
        } else if (wikiLinkNotes.length === 0 && wikiLinkSearch.trim()) {
          // Create new note if no results found
          createNewNoteWithWikiLink(wikiLinkSearch.trim(), currentNoteId);
        }
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeWikiLinkDropdown();
        return;
      } else if (e.key === 'Backspace') {
        // Check if we're at the beginning of the search term
        const currentCursor = inputRef.current?.selectionStart || 0;
        if (triggerPosition !== null && currentCursor <= triggerPosition + 2) {
          closeWikiLinkDropdown();
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
    // Insert the new text at the stored cursor position
    const before = displayText.slice(0, cursorPosition.start);
    const after = displayText.slice(cursorPosition.end);
    const newContent = before + newText + after;
    
    setDisplayText(newContent);
    setPendingUrl(null);
    setLabelInput('');
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
      <div className="w-full flex items-start gap-2" data-note-inline-editor="true">
        {/* Textarea container */}
        <div className="flex-1 relative">
      
      {pendingUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          data-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeUrlPopup(pendingUrl);
            }
          }}
        >
          <div 
            className="bg-white p-4 rounded shadow-lg w-80"
            data-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <label className="block text-sm mb-2">Link text:</label>
            <input
              ref={setUrlPopupInputRef}
              type="text"
              value={labelInput}
              onChange={e => setLabelInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
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
                  e.preventDefault();
                  e.stopPropagation();
                  // confirm bare URL
                  closeUrlPopup(pendingUrl);
                }
              }}
              className="w-full border px-2 py-1 rounded mb-4"
              autoFocus
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
          
          // Check for [[ trigger (Obsidian-style wiki-link)
          const cursorPos = e.target.selectionStart;
          const textBeforeCursor = newValue.substring(0, cursorPos);
          const textAfterCursor = newValue.substring(cursorPos);
          
          // Look for [[ pattern - when user types [[, automatically add ]] and place cursor between
          const lastTwoBrackets = textBeforeCursor.slice(-2);
          
          if (lastTwoBrackets === '[[' && !showWikiLinkDropdown) {
            // Automatically add ]] after [[ and place cursor between them
            const beforeTrigger = textBeforeCursor.slice(0, -2); // Everything before [[
            const newText = beforeTrigger + '[[]]' + textAfterCursor;
            
            // Calculate positions
            const triggerPos = cursorPos - 2; // Position of first [
            const cursorPosAfterInsert = cursorPos; // Cursor will be between [[ and ]]
            
            setDisplayText(newText);
            setTriggerPosition(triggerPos);
            setWikiLinkSearch('');
            setSelectedWikiLinkIndex(0);
            setShowWikiLinkDropdown(true);
            
            // Set dropdown position immediately
            const position = getCursorPosition();
            setDropdownPosition(position);
            
            // Position cursor between the brackets (after [[, before ]])
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.setSelectionRange(cursorPosAfterInsert, cursorPosAfterInsert);
              }
            }, 0);
          } else if (showWikiLinkDropdown && triggerPosition !== null) {
            // Update search term if dropdown is open
            // Get text between [[ and current cursor
            const textAfterTrigger = textBeforeCursor.substring(triggerPosition);
            // Find if there's a ]] before the cursor
            const closingBracketsIndex = textAfterTrigger.indexOf(']]');
            const relativeCursorPos = cursorPos - triggerPosition;
            
            if (closingBracketsIndex !== -1 && closingBracketsIndex < relativeCursorPos) {
              // If ]] is before cursor, close dropdown
              closeWikiLinkDropdown();
            } else if (textAfterTrigger.includes('\n')) {
              // Close dropdown if newline is typed
              closeWikiLinkDropdown();
            } else {
              // Get search text between [[ and cursor
              // textAfterTrigger starts with [[, so we skip those 2 chars
              const searchText = textAfterTrigger.substring(2, relativeCursorPos);
              setWikiLinkSearch(searchText);
              setSelectedWikiLinkIndex(0);
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
        className={`w-full border border-gray-300 pl-2 pr-2 py-1 rounded text-sm resize-none ${inputClass}`}
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
      
        </div>
        
        {/* Action buttons outside textarea */}
        <div className="flex-shrink-0 flex items-center gap-1 mt-1">
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
          
          {/* Red X button for deleting the line */}
          <button
            onClick={onDelete}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors duration-150"
            title="Delete this line"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      
      {/* Wiki-link notes dropdown (Obsidian-style) */}
      {showWikiLinkDropdown && (
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
            const wikiLinkNotes = getWikiLinkNotes(wikiLinkSearch);
            if (wikiLinkNotes.length === 0) {
              return (
                <div className="p-2">
                  <div className="p-2 text-gray-500 text-sm">
                    No notes found
                  </div>
                  {wikiLinkSearch.trim() && (
                    <div
                      className="p-2 cursor-pointer text-sm bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 text-blue-700"
                      onClick={() => createNewNoteWithWikiLink(wikiLinkSearch.trim(), currentNoteId)}
                    >
                      <div className="font-medium">Create note</div>
                      <div className="text-xs text-blue-600">"{wikiLinkSearch.trim()}"</div>
                    </div>
                  )}
                </div>
              );
            }
            
            return wikiLinkNotes.map((note, index) => {
              const noteTitle = note.content.split('\n')[0]?.trim() || `Note ${note.id}`;
              const isSelected = index === selectedWikiLinkIndex;
              
              return (
                <div
                  key={note.id}
                  className={`p-2 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 ${
                    isSelected ? 'bg-blue-100' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => insertWikiLinkNote(note, currentNoteId)}
                  onMouseEnter={() => setSelectedWikiLinkIndex(index)}
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