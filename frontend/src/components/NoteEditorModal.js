import React, { useState, useEffect, useRef, useCallback } from 'react';
import { addCadenceLineToNote } from '../utils/CadenceHelpUtils';
import {
  XMarkIcon,
  CheckCircleIcon,
  EyeIcon,
  FlagIcon,
  BellIcon,
  PhotoIcon,
  TrashIcon
} from '@heroicons/react/24/solid';
import { useNoteEditor } from '../contexts/NoteEditorContext';
import NoteEditor from './NoteEditor';
import { getSettings, defaultSettings, loadTags } from '../utils/ApiUtils';
import moment from 'moment';
import { reorderMetaTags } from '../utils/MetaTagUtils';
import { DevModeInfo } from '../utils/DevUtils';

// API Base URL for consistent API calls
const API_BASE_URL = 'http://localhost:5001/api';

const NoteEditorModal = ({ addNote, updateNote, customNote = 'None' }) => {
  const { isOpen, initialContent, mode, noteId, metaTags, closeEditor } = useNoteEditor();
  
  const [settings, setSettings] = useState({});
  const [objList, setObjList] = useState([]);
  const [selectedMetaTags, setSelectedMetaTags] = useState([]);
  const [showPriorityOptions, setShowPriorityOptions] = useState(metaTags?.some(tag => tag.startsWith('meta::todo')) || false);
  
  // Image handling state
  const [pastedImage, setPastedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Move fetchTags and refreshTags to top level
  const fetchTags = async () => {
    try {
      const tags = await loadTags();
      setObjList(tags || []);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };
  const refreshTags = fetchTags;

  // Image handling functions
  // Handle image paste from NoteEditor
  const handleImagePasteFromEditor = useCallback((blob) => {
    console.log('🎯 [NoteEditorModal] handleImagePasteFromEditor called');
    console.log('   - Blob received:', blob);
    console.log('   - Blob type:', blob?.type);
    console.log('   - Blob size:', blob?.size);
    
    try {
      console.log('🖼️ [NoteEditorModal] Creating proper File object with extension...');
      
      // Create a proper File object with extension from MIME type
      let extension = '.png'; // Default
      if (blob.type === 'image/jpeg') extension = '.jpg';
      else if (blob.type === 'image/png') extension = '.png';
      else if (blob.type === 'image/gif') extension = '.gif';
      else if (blob.type === 'image/webp') extension = '.webp';
      
      const file = new File([blob], `clipboard-image${extension}`, { type: blob.type });
      
      console.log('🖼️ [NoteEditorModal] Setting pasted image state...');
      setPastedImage(file);
      
      console.log('🖼️ [NoteEditorModal] Creating image preview URL...');
      const previewUrl = URL.createObjectURL(file);
      console.log('   - Preview URL created:', previewUrl);
      setImagePreview(previewUrl);
      
      console.log('✅ [NoteEditorModal] Image state set successfully');
    } catch (error) {
      console.error('❌ [NoteEditorModal] Error setting image state:', error);
    }
  }, []);

  // Image paste handler ready for use

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setPastedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setPastedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeEditor();
      }
    };

    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeEditor]);

  // Focus the modal when it opens and reset image state
  useEffect(() => {
    if (isOpen) {
      const modalContainer = document.querySelector('[data-modal="true"]');
      if (modalContainer) {
        setTimeout(() => {
          modalContainer.focus();
        }, 0);
      }
    } else {
      // Reset image state when modal closes
      setPastedImage(null);
      setImagePreview(null);
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  // Prevent focus from leaving the modal
  useEffect(() => {
    if (!isOpen) return;

    const handleFocusTrap = (e) => {
      const modalContainer = document.querySelector('[data-modal="true"]');
      if (modalContainer && !modalContainer.contains(e.target)) {
        modalContainer.focus();
      }
    };

    document.addEventListener('focusin', handleFocusTrap);
    return () => {
      document.removeEventListener('focusin', handleFocusTrap);
    };
  }, [isOpen]);

  // Load settings and tags on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await getSettings();
        const mergedSettings = { ...defaultSettings, ...savedSettings };
        setSettings(mergedSettings);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
    fetchTags();
  }, []);

  // Update selectedMetaTags when metaTags from context changes
  useEffect(() => {
    if (metaTags && metaTags.length > 0) {
      setSelectedMetaTags(metaTags);
    } else {
      setSelectedMetaTags([]);
    }
    setShowPriorityOptions(metaTags?.some(tag => tag.startsWith('meta::todo')) || false);
  }, [metaTags]);


  const handleMetaTagClick = (tagType) => {
    const formattedDate = moment().format('YYYY-MM-DD HH:mm:ss');
    let newTags = [...selectedMetaTags];

    switch (tagType) {
      case 'todo':
        // Toggle todo tag
        if (newTags.some(tag => tag.startsWith('meta::todo'))) {
          // Remove todo and all priority tags
          newTags = newTags.filter(tag =>
            !tag.startsWith('meta::todo') &&
            !tag.startsWith('meta::critical') &&
            !tag.startsWith('meta::high') &&
            !tag.startsWith('meta::medium') &&
            !tag.startsWith('meta::low')
          );
          setShowPriorityOptions(false);
        } else {
          newTags.push(`meta::todo::${formattedDate}`);
          setShowPriorityOptions(true);
        }
        break;
      case 'critical':
      case 'high':
      case 'medium':
      case 'low':
        // Toggle priority tag
        const priorityTag = `meta::${tagType}`;
        if (newTags.includes(priorityTag)) {
          // Remove just this priority tag
          newTags = newTags.filter(tag => tag !== priorityTag);
        } else {
          // Remove any existing priority tags and add the new one
          newTags = newTags.filter(tag =>
            !tag.startsWith('meta::critical') &&
            !tag.startsWith('meta::high') &&
            !tag.startsWith('meta::medium') &&
            !tag.startsWith('meta::low')
          );
          newTags.push(priorityTag);
        }
        setShowPriorityOptions(true);
        break;
      case 'watch':
        // Toggle watch tag
        if (newTags.some(tag => tag.startsWith('meta::watch'))) {
          newTags = newTags.filter(tag => !tag.startsWith('meta::watch'));
        } else {
          newTags.push(`meta::watch::${formattedDate}`);
        }
        setShowPriorityOptions(false);
        break;
      case 'reminder':
        if (newTags.some(tag => tag.startsWith('meta::watch'))) {
          newTags = newTags.filter(tag => !tag.startsWith('meta::watch'));
        } else {
          newTags.push(`meta::watch::${formattedDate}`);
        }
        setShowPriorityOptions(false);
        // Toggle watch tag
        if (newTags.some(tag => tag.startsWith('meta::reminder'))) {
          newTags = newTags.filter(tag => !tag.startsWith('meta::reminder'));
        } else {
          newTags.push(`meta::reminder`);
        }
        setShowPriorityOptions(false);
        break;
      case 'sensitive':
        // Toggle sensitive tag
        if (newTags.some(tag => tag.startsWith('meta::sensitive'))) {
          newTags = newTags.filter(tag => !tag.startsWith('meta::sensitive'));
        } else {
          newTags.push(`meta::sensitive::`);
        }
        setShowPriorityOptions(false);
        break;
      default:
        return;
    }

    setSelectedMetaTags(newTags);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-blue-600';
      default:
        return 'text-gray-500';
    }
  };

  const handleSave = async (noteContent) => {
    try {
      setIsUploadingImage(true);
      
      let finalNoteContent = noteContent;
      
      // Upload image if one is selected
      if (pastedImage) {
        const response = await uploadImage(pastedImage);
        const { imageUrl, imageId } = response;
        
        // Add image markdown and meta tag to the note content
        const imageMarkdown = `![Image](${imageUrl})`;
        const imageMetaTag = `meta::image::${imageId}`;
        finalNoteContent = noteContent + 
          (noteContent ? '\n\n' : '') + 
          imageMarkdown + 
          '\n' + 
          imageMetaTag;
      }
      
      // Ensure content ends with a newline
      const contentWithNewline = finalNoteContent.endsWith('\n') ? finalNoteContent : finalNoteContent + '\n';
      // Append meta tags with newlines
      const finalContent = selectedMetaTags.length > 0
        ? contentWithNewline + selectedMetaTags.join('\n') + '\n'
        : contentWithNewline;

      // Reorder meta tags to ensure they appear at the bottom
      const reorderedContent = reorderMetaTags(finalContent);
      
      // If we have a noteId, update the existing note, otherwise add a new note
      if (noteId) {
        updateNote(noteId, reorderedContent);
        if (selectedMetaTags.some(tag => tag.startsWith('meta::watch'))) {
          addCadenceLineToNote(noteId, {}, true);
        }
      } else {
        addNote(reorderedContent);
      }
      
      closeEditor();
      setIsUploadingImage(false);
    } catch (error) {
      console.error('Error saving note with image:', error);
      alert('Failed to upload image. Please try again.');
      setIsUploadingImage(false);
    }
  };

  const handleAddNote = async (noteContent) => {
    try {
      setIsUploadingImage(true);
      
      let finalNoteContent = noteContent;
      
      // Upload image if one is selected
      if (pastedImage) {
        const response = await uploadImage(pastedImage);
        const { imageUrl, imageId } = response;
        
        // Add image markdown and meta tag to the note content
        const imageMarkdown = `![Image](${imageUrl})`;
        const imageMetaTag = `meta::image::${imageId}`;
        finalNoteContent = noteContent + 
          (noteContent ? '\n\n' : '') + 
          imageMarkdown + 
          '\n' + 
          imageMetaTag;
      }
      
      // Ensure content ends with a newline
      const contentWithNewline = finalNoteContent.endsWith('\n') ? finalNoteContent : finalNoteContent + '\n';
      // Append meta tags with newlines
      const finalContent = selectedMetaTags.length > 0
        ? contentWithNewline + selectedMetaTags.join('\n') + '\n'
        : contentWithNewline;
      
      // Reorder meta tags to ensure they appear at the bottom
      const reorderedContent = reorderMetaTags(finalContent);
      addNote(reorderedContent);
      closeEditor();
      setIsUploadingImage(false);
    } catch (error) {
      console.error('Error adding note with image:', error);
      alert('Failed to upload image. Please try again.');
      setIsUploadingImage(false);
    }
  };

  // Debug logging for developer mode
  
  
  if (!isOpen) return null;

  return (
    <DevModeInfo 
      componentName="NoteEditorModal" 
      isDevMode={settings?.developerMode || false}
    >
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        data-modal="true"
        tabIndex={-1}
        onFocus={() => {}}
        onClick={(e) => {
          // Focus the modal container when clicked
          if (e.target === e.currentTarget) {
            e.currentTarget.focus();
          }
        }}
      >
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">{mode === 'edit' ? 'Edit Note' : 'New Note'}</h2>
          <button
            onClick={closeEditor}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <NoteEditor
          isAddMode={mode === 'add' || (mode === 'edit' && !noteId)}
          isModal={true}
          note={mode === 'edit' && noteId ? { id: noteId, content: initialContent } : null}
          initialMode={mode === 'edit' ? 'edit' : 'view'}
          initialTextMode={false}
          onSave={handleSave}
          addNote={handleAddNote}
          onCancel={() => {
            setSelectedMetaTags([]);
            setShowPriorityOptions(false);
            closeEditor();
          }}
          text={initialContent}
          objList={objList}
          settings={settings}
          refreshTags={refreshTags}
          onImagePaste={handleImagePasteFromEditor}
        />

        
        {/* Image Upload Section */}
        <div className="mt-4 p-4 border-t border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-all duration-150 text-sm font-medium"
                disabled={isUploadingImage}
              >
                <PhotoIcon className="h-4 w-4" />
                {isUploadingImage ? 'Uploading...' : 'Add Image'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <span className="text-sm text-gray-500">or paste image with Ctrl+V</span>
            </div>
          </div>
          
          {/* Image Preview */}
          {imagePreview && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Image Ready to Upload</h4>
                      <p className="text-xs text-gray-500">
                        This image will be uploaded when you save the note.
                      </p>
                    </div>
                    <button
                      onClick={removeImage}
                      className="flex items-center gap-1 px-3 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors duration-150 text-sm"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-center gap-4 mt-4 p-2 border-t border-gray-200">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleMetaTagClick('todo')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${selectedMetaTags.some(tag => tag.startsWith('meta::todo')) ? 'bg-green-100 text-green-700 border border-green-300' : 'text-gray-600 hover:text-green-600 hover:bg-green-50 border border-gray-300'
                  }`}
                title="Mark as Todo"
              >
                Todo
              </button>
              {showPriorityOptions && (
                <>
                  <button
                    onClick={() => handleMetaTagClick('critical')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${selectedMetaTags.includes('meta::critical') ? 'bg-red-100 text-red-700 border border-red-300' : 'text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-300'
                      }`}
                    title="Critical Priority"
                  >
                    Critical
                  </button>
                  <button
                    onClick={() => handleMetaTagClick('high')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${selectedMetaTags.includes('meta::high') ? 'bg-orange-100 text-orange-700 border border-orange-300' : 'text-orange-600 hover:text-orange-700 hover:bg-orange-50 border border-orange-300'
                      }`}
                    title="High Priority"
                  >
                    High
                  </button>
                  <button
                    onClick={() => handleMetaTagClick('medium')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${selectedMetaTags.includes('meta::medium') ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' : 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 border border-yellow-300'
                      }`}
                    title="Medium Priority"
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => handleMetaTagClick('low')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${selectedMetaTags.includes('meta::low') ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-300'
                      }`}
                    title="Low Priority"
                  >
                    Low
                  </button>
                </>
              )}
            </div>
            <button
              onClick={() => handleMetaTagClick('watch')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${selectedMetaTags.some(tag => tag.startsWith('meta::watch')) ? 'bg-purple-100 text-purple-700 border border-purple-300' : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50 border border-gray-300'
                }`}
              title="Add to Watch List"
            >
              Watch
            </button>
            <button
              onClick={() => handleMetaTagClick('reminder')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${selectedMetaTags.some(tag => tag.startsWith('meta::reminder')) ? 'bg-purple-100 text-purple-700 border border-purple-300' : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50 border border-gray-300'
                }`}
              title="Add to reminder List"
            >
              Reminder
            </button>
            <button
              onClick={() => handleMetaTagClick('sensitive')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${selectedMetaTags.some(tag => tag.startsWith('meta::sensitive')) ? 'bg-red-100 text-red-700 border border-red-300' : 'text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-300'
                }`}
              title="Mark as Sensitive"
            >
              Sensitive
            </button>
          </div>

          {(selectedMetaTags.length > 0 || pastedImage) && (
            <div className="mt-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
              Will add:
              {selectedMetaTags.map((tag, index) => (
                <div key={index} className="font-mono mt-1">{tag}</div>
              ))}
              {pastedImage && (
                <div className="font-mono mt-1 text-blue-600">meta::image::&lt;uuid&gt;</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </DevModeInfo>
  );
};

export default NoteEditorModal;