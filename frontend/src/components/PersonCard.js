import React, { useState, useEffect } from 'react';
import { UserIcon, XMarkIcon, CodeBracketIcon, PencilIcon, PhotoIcon } from '@heroicons/react/24/solid';
import { parseNoteContent } from '../utils/TextUtils';
import { getAgeInStringFmt } from '../utils/DateUtils';
import { updateNoteById } from '../utils/ApiUtils';

const PersonCard = ({ note, onShowRaw, onEdit, onRemoveTag, onUpdate }) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const API_BASE_URL = 'http://localhost:5001';

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showImageModal) {
          setShowImageModal(false);
          setSelectedImage(null);
        }
        if (showImageUpload) {
          setShowImageUpload(false);
          setIsDragging(false);
          setUploading(false);
        }
      }
    };

    if (showImageModal || showImageUpload) {
      window.addEventListener('keydown', handleEscape);
      return () => {
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showImageModal, showImageUpload]);

  // Upload image function
  const uploadImage = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_BASE_URL}/api/images`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      const imageUrl = `${API_BASE_URL}${data.imageUrl}`;
      
      // Update the person's note with the new photo
      const lines = note.content.split('\n');
      const photoLines = lines.filter(line => line.startsWith('meta::photo::'));
      
      // Add the new photo URL to the content
      let updatedContent = note.content;
      if (!photoLines.some(line => line.includes(imageUrl))) {
        updatedContent += `\nmeta::photo::${imageUrl}`;
      }
      
      // Update the note via API
      await updateNoteById(note.id, updatedContent);
      
      // Call onUpdate callback to update parent state
      if (onUpdate) {
        onUpdate({ ...note, content: updatedContent });
      }
      
      setShowImageUpload(false);
      setUploading(false);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
      setUploading(false);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      uploadImage(imageFile);
    } else {
      alert('Please drop a valid image file');
    }
  };

  // Handle paste
  useEffect(() => {
    if (!showImageUpload) return;

    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await uploadImage(file);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [showImageUpload]);

  // Handle file input change
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };
  const getPersonInfo = (content) => {
    const lines = content.split('\n');
    const name = lines[0];
    const tags = lines
      .filter(line => line.startsWith('meta::tag::'))
      .map(line => line.split('::')[2]);
    
    // Get meta info
    const metaInfo = lines
      .filter(line => line.startsWith('meta::info::'))
      .map(line => {
        const [_, __, name, type, value] = line.split('::');
        return { name, type, value };
      });

    // Get photos
    const photos = lines
      .filter(line => line.startsWith('meta::photo::'))
      .map(line => line.replace('meta::photo::', '').trim());

    return { name, tags, metaInfo, photos };
  };

  const { name, tags, metaInfo, photos } = getPersonInfo(note.content);

  const renderMetaValue = (info) => {
    if (info.type === 'date') {
      const age = getAgeInStringFmt(info.value);
      return `${info.value} (${age})`;
    }
    return info.value;
  };

  return (
    <div className="bg-white rounded-lg border p-6 shadow-sm flex flex-col hover:shadow-md transition-shadow h-full">
      <div className="flex items-start gap-3 flex-grow">
        <div className="flex-shrink-0">
          {photos && photos.length > 0 ? (
            <button
              type="button"
              className="block h-32 w-32 rounded-full overflow-hidden border-2 border-indigo-200 bg-indigo-100 flex items-center justify-center hover:border-indigo-400 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              title="View photo"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(photos[0]);
                setShowImageModal(true);
              }}
            >
              <img
                src={photos[0]}
                alt={name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) {
                    e.target.nextSibling.style.display = 'flex';
                  }
                }}
              />
              <div className="hidden h-32 w-32 bg-indigo-100 items-center justify-center">
                <UserIcon className="h-16 w-16 text-indigo-600" />
              </div>
            </button>
          ) : (
            <button
              type="button"
              className="h-32 w-32 rounded-full bg-indigo-100 flex items-center justify-center hover:bg-indigo-200 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 border-2 border-dashed border-indigo-300 hover:border-indigo-400"
              title="Click to upload photo"
              onClick={(e) => {
                e.stopPropagation();
                setShowImageUpload(true);
              }}
            >
              <UserIcon className="h-16 w-16 text-indigo-600" />
            </button>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-gray-900 break-words">
            {parseNoteContent({ content: name, searchQuery: "" }).map((element, idx) => (
              <React.Fragment key={idx}>{element}</React.Fragment>
            ))}
          </h3>
        
          {/* Meta Info Section */}
          {metaInfo.length > 0 && (
            <div className="mt-2 space-y-1">
              {metaInfo.map((info, index) => (
                <p key={index} className="text-xs text-gray-500">
                  {info.name}: {renderMetaValue(info)}
                </p>
              ))}
            </div>
          )}
          
          {/* Additional Photos Section (skip first photo as it's shown as headshot) */}
          {photos && photos.length > 1 && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                {photos.slice(1).map((photo, index) => (
                  <button
                    key={index + 1}
                    type="button"
                    className="relative group focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded"
                    title={photo}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(photo);
                      setShowImageModal(true);
                    }}
                  >
                    <img
                      src={photo}
                      alt={`Photo ${index + 2}`}
                      className="h-16 w-16 object-cover rounded border border-gray-200 hover:border-indigo-400 transition-colors"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'flex';
                        }
                      }}
                    />
                    <div className="hidden h-16 w-16 bg-gray-100 border border-gray-200 rounded items-center justify-center">
                      <PhotoIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 flex flex-col gap-1">
          <button
            className="p-1 rounded hover:bg-gray-100"
            title="Show raw note"
            onClick={() => onShowRaw(note.content)}
          >
            <CodeBracketIcon className="h-5 w-5 text-gray-400 hover:text-indigo-600" />
          </button>
          <button
            className="p-1 rounded hover:bg-gray-100"
            title="Edit person"
            onClick={() => onEdit(note)}
          >
            <PencilIcon className="h-5 w-5 text-gray-400 hover:text-indigo-600" />
          </button>
        </div>
      </div>
      {tags && tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
            >
              {tag}
              <button
                onClick={() => onRemoveTag(note.id, tag)}
                className="ml-1 text-indigo-600 hover:text-indigo-800"
                title="Remove tag"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowImageModal(false);
            setSelectedImage(null);
          }}
        >
          <div className="relative max-w-7xl max-h-full">
            <button
              onClick={() => {
                setShowImageModal(false);
                setSelectedImage(null);
              }}
              className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2 z-10 transition-colors"
              title="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <img
              src={selectedImage}
              alt="Full size photo"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        </div>
      )}

      {/* Image Upload Popup */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            className={`bg-white rounded-lg p-6 w-full max-w-md mx-4 ${
              isDragging ? 'border-4 border-indigo-500 border-dashed' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload Photo</h3>
              <button
                onClick={() => {
                  setShowImageUpload(false);
                  setIsDragging(false);
                  setUploading(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {uploading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-4 text-sm text-gray-600">Uploading image...</p>
              </div>
            ) : (
              <>
                <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <PhotoIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drag and drop an image here, or click to select
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    Or press Ctrl+V (Cmd+V on Mac) to paste from clipboard
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                    id="image-upload-input-person"
                  />
                  <label
                    htmlFor="image-upload-input-person"
                    className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 cursor-pointer text-sm font-medium"
                  >
                    Select Image
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-4 text-center">
                  Supported formats: JPG, PNG, GIF, WebP
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonCard; 