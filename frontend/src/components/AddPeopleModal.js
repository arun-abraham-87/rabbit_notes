import React, { useState, useEffect, useMemo } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { createNote, updateNoteById } from '../utils/ApiUtils';

const AddPeopleModal = ({ isOpen, onClose, onAdd, onEdit, allNotes = [], personNote = null }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tagList, setTagList] = useState([]);
  const [tagError, setTagError] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  // Prefill fields if editing
  useEffect(() => {
    if (personNote) {
      const lines = personNote.content.split('\n');
      setName(lines[0] || '');
      setRole(lines.find(line => line.startsWith('meta::person_role::'))?.split('::')[2] || '');
      setEmail(lines.find(line => line.startsWith('meta::person_email::'))?.split('::')[2] || '');
      setPhone(lines.find(line => line.startsWith('meta::person_phone::'))?.split('::')[2] || '');
      // Get tags from meta::tag lines
      const tagLines = lines.filter(line => line.startsWith('meta::tag::'));
      setTagList(tagLines.map(line => line.split('::')[2]));
    } else {
      setName(''); 
      setRole(''); 
      setEmail(''); 
      setPhone('');
      setTagList([]);
      setTagInput('');
    }
    setTagError('');
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

  const handleSubmit = async () => {
    if (!name.trim()) return;
    
    let content = `${name.trim()}\nmeta::person::${personNote ? personNote.content.split('\n').find(line => line.startsWith('meta::person::'))?.split('::')[2] : new Date().toISOString()}`;
    
    // Add role if provided
    if (role.trim()) {
      content += `\nmeta::person_role::${role.trim()}`;
    }

    // Add email if provided
    if (email.trim()) {
      content += `\nmeta::person_email::${email.trim()}`;
    }

    // Add phone if provided
    if (phone.trim()) {
      content += `\nmeta::person_phone::${phone.trim()}`;
    }

    // Add tags
    tagList.forEach(tag => {
      content += `\nmeta::tag::${tag}`;
    });

    try {
      if (personNote) {
        // Edit mode
        await onEdit(personNote.id, content);
      } else {
        // Add mode
        const newNote = await createNote(content);
        if (onAdd) {
          onAdd(newNote);
        }
      }
      // Reset form
      setName('');
      setRole('');
      setEmail('');
      setPhone('');
      setTagList([]);
      setTagInput('');
      setTagError('');
      setTagFilter('');
      onClose();
    } catch (error) {
      console.error('Error saving person:', error);
      throw error;
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

          {/* Role Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter role (optional)"
            />
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter email (optional)"
            />
          </div>

          {/* Phone Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter phone (optional)"
            />
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