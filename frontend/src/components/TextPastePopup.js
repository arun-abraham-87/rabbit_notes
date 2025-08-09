import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { XMarkIcon, EyeIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/solid';
import { buildSuggestionsFromNotes } from '../utils/NotesUtils';

// API Base URL for consistent API calls
const API_BASE_URL = 'http://localhost:5001/api';

const TextPastePopup = ({
  isOpen,
  onClose,
  newNoteText,
  setNewNoteText,
  pasteText,
  selectedPriority,
  setSelectedPriority,
  isWatchSelected,
  setIsWatchSelected,
  isSensitiveSelected,
  setIsSensitiveSelected,
  onSave,
  objList = [], // Add objList prop for tag suggestions
  allNotes = [], // Add allNotes prop for people and workstreams
}) => {
  const textareaRef = useRef(null);
  
  // Add state for tag suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredTags, setFilteredTags] = useState([]);
  const [selectedTagIndex, setSelectedTagIndex] = useState(-1);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [throttleRef] = useState({ current: null });
  
  // Image handling state
  const [pastedImage, setPastedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Build merged suggestions from objList and allNotes (people and workstreams)
  const mergedObjList = useMemo(() =>
    buildSuggestionsFromNotes(allNotes, objList),
    [allNotes, objList]
  );

  // Auto focus and clear textarea when popup opens
  useEffect(() => {
    if (isOpen) {
      setNewNoteText('');
      setPastedImage(null);
      setImagePreview(null);
      
      // Check for image in clipboard when popup opens
              const checkClipboardForImage = async () => {
        try {
          const clipboardItems = await navigator.clipboard.read();
          for (const item of clipboardItems) {
            for (const type of item.types) {
              if (type.startsWith('image/')) {
                const blob = await item.getType(type);
                
                // Create a proper File object with extension from MIME type
                let extension = '.png'; // Default
                if (type === 'image/jpeg') extension = '.jpg';
                else if (type === 'image/png') extension = '.png';
                else if (type === 'image/gif') extension = '.gif';
                else if (type === 'image/webp') extension = '.webp';
                
                const file = new File([blob], `clipboard-image${extension}`, { type });
                
                setPastedImage(file);
                setImagePreview(URL.createObjectURL(file));
                console.log('📸 Auto-loaded image from clipboard');
                return; // Found image, exit
              }
            }
          }
        } catch (error) {
          console.log('Could not read clipboard for images:', error);
        }
      };
      
      // Check for clipboard image after a brief delay
      setTimeout(() => {
        checkClipboardForImage();
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, setNewNoteText]);

  // Handle text change with tag suggestions
  const handleTextChange = (e) => {
    const value = e.target.value;
    setNewNoteText(value);

    // Handle tag suggestions
    if (value.trim().length === 0) {
      setShowSuggestions(false);
      return;
    }

    const match = value.trim().match(/(\S+)$/);
    if (match) {
      const filterText = match[1].toLowerCase();

      clearTimeout(throttleRef.current);
      throttleRef.current = setTimeout(() => {
        const filtered = mergedObjList.filter((tag) =>
          tag && tag.text && tag.text.toLowerCase().includes(filterText)
        );

        if (filtered.length > 0) {
          const textarea = textareaRef.current;
          if (textarea) {
            // Get the textarea's position
            const rect = textarea.getBoundingClientRect();
            
            // Calculate cursor position using textarea properties
            const textBeforeCursor = value.substring(0, textarea.selectionStart);
            const lines = textBeforeCursor.split('\n');
            const currentLineIndex = lines.length - 1;
            const currentLine = lines[currentLineIndex];
            
            // Estimate character width (approximate)
            const charWidth = 8; // Approximate character width
            const cursorX = rect.left + (currentLine.length * charWidth) + 20; // Add padding
            
            // Calculate vertical position
            const lineHeight = 20; // Approximate line height
            const cursorY = rect.top + (currentLineIndex * lineHeight) + lineHeight + 10;
            
            setCursorPosition({ x: cursorX, y: cursorY });
            setFilteredTags(filtered.map(tag => tag.text));
            setShowSuggestions(true);
          }
        } else {
          setShowSuggestions(false);
        }
      }, 150);
    } else {
      setShowSuggestions(false);
    }
  };

  // Handle tag selection
  const handleSelectTag = (tag) => {
    const lastSpaceIndex = newNoteText.lastIndexOf(" ");
    const updatedText =
      (lastSpaceIndex === -1 ? "" : newNoteText.slice(0, lastSpaceIndex + 1)) +
      `${tag} `;
    setNewNoteText(updatedText);
    setShowSuggestions(false);
    setSelectedTagIndex(-1);
    
    // Focus back to textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Handle image paste
  const handlePaste = (e) => {
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
          break;
        }
      }
    }
  };

  // Handle file input change
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setPastedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

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

  // Remove selected image
  const removeImage = () => {
    setPastedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle save with image upload
  const handleSave = useCallback(async () => {
    try {
      setIsUploadingImage(true);

      // Upload image if one is selected
      if (pastedImage) {
        const response = await uploadImage(pastedImage);
        const { imageId } = response;
        
        // Add only the meta tag (no markdown line)
        const imageMetaTag = `meta::image::${imageId}`;
        const updatedText = newNoteText + 
          (newNoteText ? '\n' : '') + 
          imageMetaTag;
        
        // Update state for UI display
        setNewNoteText(updatedText);
        
        // Call onSave with the updated content directly
        onSave(updatedText);
        setIsUploadingImage(false);
      } else {
        // No image, just call onSave directly
        onSave();
        setIsUploadingImage(false);
      }
    } catch (error) {
      console.error('Error saving note with image:', error);
      alert('Failed to upload image. Please try again.');
      setIsUploadingImage(false);
    }
  }, [pastedImage, newNoteText, onSave]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      // Handle suggestion navigation
      if (showSuggestions) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedTagIndex((prev) =>
            prev < filteredTags.length - 1 ? prev + 1 : 0
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedTagIndex((prev) =>
            prev > 0 ? prev - 1 : filteredTags.length - 1
          );
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (selectedTagIndex >= 0) {
            handleSelectTag(filteredTags[selectedTagIndex]);
          } else if (filteredTags.length > 0) {
            handleSelectTag(filteredTags[0]);
          }
        } else if (e.key === "Tab") {
          e.preventDefault();
          if (filteredTags.length > 0) {
            handleSelectTag(filteredTags[0]);
          }
        } else if (e.key === "Escape") {
          setShowSuggestions(false);
        }
      } else {
        // Handle Cmd+Enter (or Ctrl+Enter) to save
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          handleSave();
          return;
        }

        // Handle Escape to close
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onSave, onClose, showSuggestions, filteredTags, selectedTagIndex, handleSave]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg p-6 w-full max-w-2xl ${
        selectedPriority === 'critical' ? 'ring-4 ring-red-500' :
        selectedPriority === 'high' ? 'ring-2 ring-orange-500' :
        selectedPriority === 'medium' ? 'ring-2 ring-yellow-500' :
        selectedPriority === 'low' ? 'ring-2 ring-green-500' :
        'ring-1 ring-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Create New Note</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">New Note Content</label>
            <textarea
              ref={textareaRef}
              value={newNoteText}
              onChange={handleTextChange}
              onPaste={handlePaste}
              className="w-full h-32 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Type your note here... (Press Cmd+Enter to save, or paste images)"
            />
            {/* Tag suggestions popup */}
            {showSuggestions && (
              <div
                className="fixed bg-white border-2 border-purple-500 rounded-lg shadow-lg p-2 z-[9999] max-h-40 overflow-y-auto no-scrollbar text-sm w-52"
                style={{
                  left: cursorPosition.x,
                  top: cursorPosition.y,
                  minHeight: '40px'
                }}
              >
                {filteredTags.length === 0 ? (
                  <div className="p-2 text-gray-500">No matching tags</div>
                ) : (
                  filteredTags.map((tag, index) => (
                    <div
                      key={tag}
                      onClick={() => handleSelectTag(tag)}
                      className={`p-2 cursor-pointer hover:bg-purple-100 ${
                        selectedTagIndex === index ? "bg-purple-200" : ""
                      }`}
                    >
                      {tag}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clipboard Content (Reference Only)</label>
            <div className="w-full h-32 p-2 border border-gray-300 rounded-lg bg-gray-50 overflow-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-600">{pasteText}</pre>
            </div>
          </div>
          
          {/* Image section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Image</label>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md"
                title="Select image file"
              >
                <PhotoIcon className="h-4 w-4" />
                Choose File
              </button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {imagePreview && (
              <div className="relative border border-gray-300 rounded-lg p-2 bg-gray-50">
                <img
                  src={imagePreview}
                  alt="Pasted image preview"
                  className="max-w-full max-h-48 object-contain rounded"
                />
                <button
                  onClick={removeImage}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  title="Remove image"
                >
                  <TrashIcon className="h-3 w-3" />
                </button>
                <div className="mt-2 text-xs text-gray-600">
                  {pastedImage?.name || 'Pasted image'} ({pastedImage ? Math.round(pastedImage.size / 1024) : 0} KB)
                </div>
              </div>
            )}
            
            {!imagePreview && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500 text-sm">
                Paste an image here or click "Choose File" to select one
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsWatchSelected(!isWatchSelected)}
                className={`p-1 rounded-md ${isWatchSelected ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                title="Watch"
              >
                <EyeIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setIsSensitiveSelected(!isSensitiveSelected)}
                className={`px-2 py-1 rounded-md text-xs font-medium ${isSensitiveSelected ? 'bg-red-100 text-red-600 border border-red-300' : 'text-gray-400 hover:text-red-600 hover:bg-red-50 border border-gray-300'}`}
                title="Mark as Sensitive"
              >
                Sensitive
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Priority:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setSelectedPriority(selectedPriority === 'critical' ? null : 'critical')}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${selectedPriority === 'critical' ? 'bg-red-600 ring-2 ring-red-300 text-white' : 'bg-red-200 hover:bg-red-300 text-red-700'}`}
                  title="Critical"
                >
                  C
                </button>
                <button
                  onClick={() => setSelectedPriority(selectedPriority === 'high' ? null : 'high')}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${selectedPriority === 'high' ? 'bg-orange-600 ring-2 ring-orange-300 text-white' : 'bg-orange-200 hover:bg-orange-300 text-orange-700'}`}
                  title="High"
                >
                  H
                </button>
                <button
                  onClick={() => setSelectedPriority(selectedPriority === 'medium' ? null : 'medium')}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${selectedPriority === 'medium' ? 'bg-yellow-600 ring-2 ring-yellow-300 text-white' : 'bg-yellow-200 hover:bg-yellow-300 text-yellow-700'}`}
                  title="Medium"
                >
                  M
                </button>
                <button
                  onClick={() => setSelectedPriority(selectedPriority === 'low' ? null : 'low')}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${selectedPriority === 'low' ? 'bg-green-600 ring-2 ring-green-300 text-white' : 'bg-green-200 hover:bg-green-300 text-green-700'}`}
                  title="Low"
                >
                  L
                </button>
              </div>
            </div>
          </div>
          {(selectedPriority || isWatchSelected || isSensitiveSelected || pastedImage) && (
            <div className="text-sm text-gray-600 italic space-y-1">
              {selectedPriority && (
                <div>Marked as todo - priority {selectedPriority}</div>
              )}
              {isWatchSelected && (
                <div>Added to watch list</div>
              )}
              {isSensitiveSelected && (
                <div>Marked as sensitive</div>
              )}
              {pastedImage && (
                <div>Image will be tagged for easy search</div>
              )}
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isUploadingImage}
            className={`px-4 py-2 rounded-lg text-white ${
              isUploadingImage 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isUploadingImage ? 'Uploading...' : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TextPastePopup; 