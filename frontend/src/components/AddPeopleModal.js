import React, { useState, useEffect, useMemo } from 'react';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/solid';
import { createNote, updateNoteById } from '../utils/ApiUtils';

// Helper function to format date as dd/mm/yyyy
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper function to parse dd/mm/yyyy to yyyy-mm-dd for input
const parseDate = (dateString) => {
  if (!dateString) return '';
  const [day, month, year] = dateString.split('/');
  return `${year}-${month}-${day}`;
};

const AddPeopleModal = ({ isOpen, onClose, onAdd, onEdit, allNotes = [], personNote = null }) => {
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
        // Format date values for display
        if (typeType === 'date') {
          values[type] = formatDate(value);
        } else {
          values[type] = value;
        }
        typeTypes[type] = typeType || 'text';
      });
      setInfoTypes(Array.from(types));
      setInfoValues(values);
      setInfoTypeTypes(typeTypes);
    } else {
      setName(''); 
      setTagList([]);
      setTagInput('');
      setInfoTypes([]);
      setInfoValues({});
      setInfoTypeTypes({});
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
        defaultValue = formatDate(new Date());
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
        // Convert date from dd/mm/yyyy to yyyy-mm-dd for storage
        if (typeType === 'date') {
          value = parseDate(value);
        }
        content += `\nmeta::info::${type}::${typeType}::${value}`;
      }
    });

    try {
      if (personNote) {
        await onEdit(personNote.id, content);
      } else {
        const newNote = await createNote(content);
        if (onAdd) {
          onAdd(newNote);
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
            <div className={`min-h-[42px] w-full px-3 py-2 border rounded-md focus-within:ring-2 focus-within:ring-blue-500 ${
              tagError ? 'border-red-500' : 'border-gray-300'
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
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-colors ${
                        tagList.includes(tag)
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
        </div>

        <div className="mt-6 flex justify-end gap-3">
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
    </div>
  );
};

export default AddPeopleModal; 