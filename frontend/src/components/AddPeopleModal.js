import React, { useState, useEffect, useMemo, useRef } from 'react';
import { XMarkIcon, PlusIcon, PhotoIcon } from '@heroicons/react/24/solid';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { getDateInDDMMYYYYFormat } from '../utils/DateUtils';

const API_BASE_URL = 'http://localhost:5001';



const AddPeopleModal = ({ isOpen, onClose, onAdd, onEdit, allNotes = [], personNote = null, onDelete, pastedImageFile = null }) => {
  const nameInputRef = useRef(null);
  const [name, setName] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tagList, setTagList] = useState([]);
  const [tagError, setTagError] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [infoTypes, setInfoTypes] = useState([]);
  const [infoValues, setInfoValues] = useState({});
  const [infoTypeTypes, setInfoTypeTypes] = useState({});
  const [newInfoType, setNewInfoType] = useState('');
  const [newInfoTypeType, setNewInfoTypeType] = useState('text');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [photoInput, setPhotoInput] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Get all unique info types from all notes
  const suggestedInfoTypes = useMemo(() => {
    const typeSet = new Set();
    allNotes.forEach(note => {
      const infoLines = note.content
        .split('\n')
        .filter(line => line.startsWith('meta::info::'))
        .map(line => {
          const parts = line.split('::');
          return {
            name: parts[2],
            type: parts[3] || 'text' // Default to text if type not specified
          };
        });
      infoLines.forEach(({ name, type }) => typeSet.add(JSON.stringify({ name, type })));
    });
    return Array.from(typeSet).map(item => JSON.parse(item)).sort((a, b) => a.name.localeCompare(b.name));
  }, [allNotes]);

  // Prefill fields if editing
  useEffect(() => {
    if (personNote) {
      const lines = personNote.content.split('\n');
      setName(lines[0] || '');
      // Get tags from meta::tag lines
      const tagLines = lines.filter(line => line.startsWith('meta::tag::'));
      setTagList(tagLines.map(line => line.split('::')[2]));

      // Get info types and values
      const infoLines = lines.filter(line => line.startsWith('meta::info::'));
      const types = new Set();
      const values = {};
      const typeTypes = {};
      infoLines.forEach(line => {
        const [_, __, type, typeType, value] = line.split('::');
        types.add(type);
        values[type] = value;
        typeTypes[type] = typeType || 'text';
      });
      setInfoTypes(Array.from(types));
      setInfoValues(values);
      setInfoTypeTypes(typeTypes);
      
      // Get photos from meta::photo lines
      const photoLines = lines.filter(line => line.startsWith('meta::photo::'));
      setPhotos(photoLines.map(line => line.replace('meta::photo::', '').trim()));
    } else {
      setName('');
      setTagList([]);
      setTagInput('');
      setInfoTypes([]);
      setInfoValues({});
      setInfoTypeTypes({});
      setPhotos([]);
      setPhotoInput('');
    }
    setTagError('');
    setTagFilter('');
    setNewInfoType('');
    setNewInfoTypeType('text');
  }, [personNote, isOpen]);

  // Get all unique tags from all notes
  const existingTags = useMemo(() => {
    const tagSet = new Set();
    allNotes
      .filter(note => note.content.includes('meta::person::'))
      .forEach(note => {
        const tagLines = note.content
          .split('\n')
          .filter(line => line.startsWith('meta::tag::'))
          .map(line => line.split('::')[2]);
        tagLines.forEach(tag => tagSet.add(tag));
      });
    return Array.from(tagSet).sort();
  }, [allNotes]);

  // Filter existing tags based on input
  const filteredExistingTags = useMemo(() => {
    if (!tagFilter) return existingTags;
    return existingTags.filter(tag =>
      tag.toLowerCase().includes(tagFilter.toLowerCase())
    );
  }, [existingTags, tagFilter]);

  const validateTag = (tag) => {
    if (!tag.trim()) return false;

    // Check for special characters
    const specialCharRegex = /[^a-zA-Z0-9\s-_]/;
    if (specialCharRegex.test(tag)) {
      setTagError('Tags can only contain letters, numbers, spaces, hyphens, and underscores');
      return false;
    }

    // Check for duplicates
    if (tagList.includes(tag.trim())) {
      setTagError('This tag already exists');
      return false;
    }

    setTagError('');
    return true;
  };

  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
    setTagError('');
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const newTag = tagInput.trim();

      if (newTag && validateTag(newTag)) {
        setTagList([...tagList, newTag]);
        setTagInput('');
      }
    } else if (e.key === 'Backspace' && !tagInput && tagList.length > 0) {
      // Remove last tag when backspace is pressed and input is empty
      setTagList(tagList.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove) => {
    setTagList(tagList.filter(tag => tag !== tagToRemove));
  };

  const handleAddInfoType = (type, typeType = 'text') => {
    if (type && !infoTypes.includes(type)) {
      setInfoTypes([...infoTypes, type]);
      // Set default value based on type
      let defaultValue = '';
      if (typeType === 'date') {
        defaultValue = getDateInDDMMYYYYFormat(new Date());
      }
      setInfoValues({ ...infoValues, [type]: defaultValue });
      setInfoTypeTypes({ ...infoTypeTypes, [type]: typeType });
      setNewInfoType('');
      setNewInfoTypeType('text');
    }
  };

  const handleRemoveInfoType = (typeToRemove) => {
    setInfoTypes(infoTypes.filter(type => type !== typeToRemove));
    const newValues = { ...infoValues };
    const newTypeTypes = { ...infoTypeTypes };
    delete newValues[typeToRemove];
    delete newTypeTypes[typeToRemove];
    setInfoValues(newValues);
    setInfoTypeTypes(newTypeTypes);
  };

  const handleAddPhoto = () => {
    const photoUrl = photoInput.trim();
    if (photoUrl && !photos.includes(photoUrl)) {
      // Validate URL
      try {
        new URL(photoUrl);
        setPhotos([...photos, photoUrl]);
        setPhotoInput('');
      } catch (e) {
        // If not a valid URL, still allow it (might be a local path or other format)
        setPhotos([...photos, photoUrl]);
        setPhotoInput('');
      }
    }
  };

  const handleRemovePhoto = (photoToRemove) => {
    setPhotos(photos.filter(photo => photo !== photoToRemove));
  };

  const handlePhotoInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPhoto();
    }
  };

  // Upload image function
  const uploadImage = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return Promise.reject(new Error('Invalid file type'));
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
        const errorText = await response.text();
        console.error('Upload failed:', response.status, errorText);
        throw new Error(`Failed to upload image: ${response.status}`);
      }

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', jsonError);
        console.log('Response text:', responseText);
        throw new Error('Failed to parse server response');
      }

      if (!data || !data.imageUrl) {
        console.error('Invalid response data:', data);
        throw new Error('Invalid response from server');
      }

      const imageUrl = `${API_BASE_URL}${data.imageUrl}`;
      
      // Add the uploaded image URL to photos
      setPhotos(prev => {
        if (!prev.includes(imageUrl)) {
          return [...prev, imageUrl];
        }
        return prev;
      });
      
      setShowImageUpload(false);
      setUploading(false);
      return Promise.resolve(imageUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploading(false);
      // Only show alert if not called from auto-upload (pasted image)
      if (!pastedImageFile) {
        alert('Failed to upload image. Please try again.');
      }
      return Promise.reject(error);
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
            // Upload the pasted image
            if (!file.type.startsWith('image/')) {
              alert('Please paste a valid image file');
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
              
              // Add the uploaded image URL to photos
              setPhotos(prev => {
                if (!prev.includes(imageUrl)) {
                  return [...prev, imageUrl];
                }
                return prev;
              });
              
              setShowImageUpload(false);
              setUploading(false);
            } catch (error) {
              console.error('Error uploading image:', error);
              alert('Failed to upload image. Please try again.');
              setUploading(false);
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [showImageUpload, photos]);

  // Handle file input change
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };

  // Auto-upload pasted image when modal opens
  useEffect(() => {
    if (isOpen && pastedImageFile && !personNote) {
      // Upload the pasted image
      const uploadAndFocus = async () => {
        try {
          await uploadImage(pastedImageFile);
          // Focus the name input after image is uploaded
          setTimeout(() => {
            if (nameInputRef.current) {
              nameInputRef.current.focus();
            }
          }, 100);
        } catch (error) {
          // Error is already handled in uploadImage function
          console.error('Failed to upload pasted image:', error);
        }
      };
      uploadAndFocus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pastedImageFile, personNote]);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    let content = `${name.trim()}\nmeta::person::${personNote ? personNote.content.split('\n').find(line => line.startsWith('meta::person::'))?.split('::')[2] : new Date().toISOString()}`;

    // Add tags
    tagList.forEach(tag => {
      content += `\nmeta::tag::${tag}`;
    });

    // Add info types and values
    infoTypes.forEach(type => {
      if (infoValues[type]?.trim()) {
        const typeType = infoTypeTypes[type];
        let value = infoValues[type].trim();
        content += `\nmeta::info::${type}::${typeType}::${value}`;
      }
    });

    // Add photos
    photos.forEach(photo => {
      if (photo.trim()) {
        content += `\nmeta::photo::${photo.trim()}`;
      }
    });

    try {
      if (personNote) {
        await onEdit(personNote.id, content);
      } else {
        if (onAdd) {
          await onAdd(content);
        }
      }
      // Reset form
      setName('');
      setTagList([]);
      setTagInput('');
      setTagError('');
      setTagFilter('');
      setInfoTypes([]);
      setInfoValues({});
      setInfoTypeTypes({});
      setNewInfoType('');
      setNewInfoTypeType('text');
      setPhotos([]);
      setPhotoInput('');
      onClose();
    } catch (error) {
      console.error('Error saving person:', error);
      throw error;
    }
  };

  const renderInfoTypeInput = (type) => {
    const typeType = infoTypeTypes[type];
    switch (typeType) {
      case 'integer':
        return (
          <input
            type="number"
            value={infoValues[type] || ''}
            onChange={(e) => setInfoValues({ ...infoValues, [type]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={`Enter ${type.toLowerCase()}`}
          />
        );
      case 'date':
        return (
          <input
            type="text"
            value={infoValues[type] || ''}
            onChange={(e) => {
              // Allow only numbers and forward slashes
              const value = e.target.value.replace(/[^0-9/]/g, '');
              // Format as dd/mm/yyyy
              if (value.length === 2 && !value.includes('/')) {
                setInfoValues({ ...infoValues, [type]: value + '/' });
              } else if (value.length === 5 && value.split('/').length === 2) {
                setInfoValues({ ...infoValues, [type]: value + '/' });
              } else {
                setInfoValues({ ...infoValues, [type]: value });
              }
            }}
            placeholder="dd/mm/yyyy"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );
      default:
        return (
          <input
            type="text"
            value={infoValues[type] || ''}
            onChange={(e) => setInfoValues({ ...infoValues, [type]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={`Enter ${type.toLowerCase()}`}
          />
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{personNote ? 'Edit Person' : 'Add Person'}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter person's name"
            />
          </div>

          {/* Info Types Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Additional Information
              </label>
            </div>

            {/* New Info Type Input */}
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newInfoType}
                  onChange={(e) => setNewInfoType(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newInfoType.trim()) {
                      handleAddInfoType(newInfoType.trim(), newInfoTypeType);
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new info type"
                />
                <select
                  value={newInfoTypeType}
                  onChange={(e) => setNewInfoTypeType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="text">Text</option>
                  <option value="integer">Integer</option>
                  <option value="date">Date</option>
                </select>
                <button
                  onClick={() => handleAddInfoType(newInfoType.trim(), newInfoTypeType)}
                  disabled={!newInfoType.trim()}
                  className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Suggested Info Types */}
            {suggestedInfoTypes.length > 0 && (
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-2">
                  Suggested Info Types
                </label>
                <div className="flex flex-wrap gap-2">
                  {suggestedInfoTypes
                    .filter(({ name }) => !infoTypes.includes(name))
                    .map(({ name, type }) => (
                      <button
                        key={name}
                        onClick={() => handleAddInfoType(name, type)}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        {name} ({type})
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Info Type Inputs */}
            <div className="space-y-3">
              {infoTypes.map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">
                      {type} ({infoTypeTypes[type]})
                    </label>
                    {renderInfoTypeInput(type)}
                  </div>
                  <button
                    onClick={() => handleRemoveInfoType(type)}
                    className="mt-6 text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tags Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className={`min-h-[42px] w-full px-3 py-2 border rounded-md focus-within:ring-2 focus-within:ring-blue-500 ${tagError ? 'border-red-500' : 'border-gray-300'
              }`}>
              <div className="flex flex-wrap gap-2">
                {tagList.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-indigo-600 hover:text-indigo-800"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={handleTagInputKeyDown}
                  className="flex-1 min-w-[120px] outline-none bg-transparent"
                  placeholder={tagList.length === 0 ? "Type and press space or enter to add tags" : ""}
                />
              </div>
            </div>
            <div className="mt-1 flex flex-col gap-1">
              {tagError && (
                <p className="text-sm text-red-500">
                  {tagError}
                </p>
              )}
              <p className="text-xs text-gray-400">
                Press space or enter to add a tag. Backspace to remove the last tag.
              </p>
            </div>

            {/* Existing Tags */}
            {existingTags.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">Existing tags:</p>
                  <div className="relative w-32">
                    <input
                      type="text"
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      placeholder="Filter tags..."
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {tagFilter && (
                      <button
                        onClick={() => setTagFilter('')}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filteredExistingTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        if (!tagList.includes(tag)) {
                          setTagList([...tagList, tag]);
                        }
                      }}
                      disabled={tagList.includes(tag)}
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-colors ${tagList.includes(tag)
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                {filteredExistingTags.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2">No matching tags found</p>
                )}
              </div>
            )}
          </div>

          {/* Photos Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Photos
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={photoInput}
                onChange={(e) => setPhotoInput(e.target.value)}
                onKeyDown={handlePhotoInputKeyDown}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter photo URL and press Enter"
              />
              <button
                onClick={handleAddPhoto}
                disabled={!photoInput.trim()}
                className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <PhotoIcon className="h-4 w-4" />
                Add
              </button>
              <button
                onClick={() => setShowImageUpload(true)}
                className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 flex items-center gap-1"
                title="Upload image (drag & drop or paste)"
              >
                <PhotoIcon className="h-4 w-4" />
                Upload
              </button>
            </div>
            {photos.length > 0 && (
              <div className="space-y-2">
                {photos.map((photo, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="h-12 w-12 object-cover rounded"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="hidden h-12 w-12 bg-gray-200 rounded items-center justify-center">
                      <PhotoIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <a
                        href={photo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 truncate block"
                        title={photo}
                      >
                        {photo}
                      </a>
                    </div>
                    <button
                      onClick={() => handleRemovePhoto(photo)}
                      className="text-gray-400 hover:text-gray-600"
                      title="Remove photo"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Enter photo URLs (one per line). Press Enter to add.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          {personNote && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!name.trim() || !!tagError}
          >
            {personNote ? 'Save Changes' : 'Add Person'}
          </button>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete(personNote.id);
          onClose();
        }}
        title="Delete Person"
        message="Are you sure you want to delete this person? This action cannot be undone."
      />

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
              <h3 className="text-lg font-semibold text-gray-900">Upload Image</h3>
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
                    id="image-upload-input"
                  />
                  <label
                    htmlFor="image-upload-input"
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

export default AddPeopleModal; 