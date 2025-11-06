import React, { useState, useMemo, useEffect } from 'react';
import { UserIcon, ViewColumnsIcon, Squares2X2Icon, XMarkIcon, MagnifyingGlassIcon, PencilIcon, PlusIcon, TagIcon } from '@heroicons/react/24/solid';
import { CodeBracketIcon } from '@heroicons/react/24/outline';
import { parseNoteContent } from '../utils/TextUtils';
import AddPeopleModal from './AddPeopleModal';
import NoteView from './NoteView';
import PersonCard from './PersonCard';
import { updateNoteById, createNote, deleteNoteById, deleteNoteWithImages } from '../utils/ApiUtils';

const PeopleList = ({allNotes, setAllNotes}) => {

  const [viewMode, setViewMode] = useState('grid');
  const [selectedTags, setSelectedTags] = useState([]);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [rawNoteModal, setRawNoteModal] = useState({ open: false, content: '' });
  const [editPersonModal, setEditPersonModal] = useState({ open: false, personNote: null });
  const [addPersonModal, setAddPersonModal] = useState({ open: false });
  const [bulkAddModal, setBulkAddModal] = useState({ open: false });
  const [deleteModal, setDeleteModal] = useState({ open: false, noteId: null, personName: '' });
  const [pastedImageFile, setPastedImageFile] = useState(null);

  // Handle Cmd+V to paste image and open Add People modal
  useEffect(() => {
    const handlePaste = async (e) => {
      // Only handle if not in an input/textarea and Cmd+V or Ctrl+V
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        try {
          const clipboardItems = await navigator.clipboard.read();
          const imageItem = clipboardItems.find(item => 
            item.types.some(type => type.startsWith('image/'))
          );

          if (imageItem) {
            e.preventDefault();
            const imageType = imageItem.types.find(type => type.startsWith('image/'));
            const blob = await imageItem.getType(imageType);
            const file = new File([blob], 'pasted-image.png', { type: imageType });
            
            setPastedImageFile(file);
            setAddPersonModal({ open: true });
          }
        } catch (error) {
          // Clipboard API might not be available or user denied permission
          console.log('Could not read clipboard:', error);
        }
      }
    };

    window.addEventListener('keydown', handlePaste);
    return () => {
      window.removeEventListener('keydown', handlePaste);
    };
  }, []);

  // Deduplicate notes by ID - single source of truth
  const uniqueNotes = useMemo(() => {
    const uniqueNotesMap = new Map();
    allNotes.forEach(note => {
      if (note.id && !uniqueNotesMap.has(note.id)) {
        uniqueNotesMap.set(note.id, note);
      }
    });
    return Array.from(uniqueNotesMap.values());
  }, [allNotes]);

  // Get all unique tags from person notes
  const allTags = useMemo(() => {
    const tagSet = new Set();
    uniqueNotes
      .filter(note => note.content && note.content.includes('meta::person::'))
      .forEach(note => {
        const tagLines = note.content
          .split('\n')
          .filter(line => line.startsWith('meta::tag::'))
          .map(line => line.split('::')[2]);
        tagLines.forEach(tag => tagSet.add(tag));
      });
    return Array.from(tagSet).sort();
  }, [uniqueNotes]);

  // Filter person notes based on selected filters
  const filteredallNotes = useMemo(() => {
    let filtered = uniqueNotes.filter(note => note.content && note.content.includes('meta::person::'));

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(note => {
        // Special case for "No Tags" filter
        if (selectedTags.includes('no-tags')) {
          const hasTags = note.content
            .split('\n')
            .some(line => line.startsWith('meta::tag::'));
          return !hasTags;
        }

        // Regular tag filtering
        const noteTags = note.content
          .split('\n')
          .filter(line => line.startsWith('meta::tag::'))
          .map(line => line.split('::')[2]);
        return selectedTags.some(tag => noteTags.includes(tag));
      });
    }

    // Apply local search filter
    if (localSearchQuery) {
      filtered = filtered.filter(note => 
        note.content.toLowerCase().includes(localSearchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [uniqueNotes, selectedTags, localSearchQuery]);

  // Group allNotes by tags for tag view
  const allNotesByTag = useMemo(() => {
    const grouped = {};
    allTags.forEach(tag => {
      grouped[tag] = filteredallNotes.filter(note => {
        const noteTags = note.content
          .split('\n')
          .filter(line => line.startsWith('meta::tag::'))
          .map(line => line.split('::')[2]);
        return noteTags.includes(tag);
      });
    });
    return grouped;
  }, [filteredallNotes, allTags]);

  // Add a function to count people without tags
  const getPeopleWithoutTags = useMemo(() => {
    return uniqueNotes.filter(note => {
      if (!note.content || !note.content.includes('meta::person::')) return false;
      return !note.content.split('\n').some(line => line.startsWith('meta::tag::'));
    }).length;
  }, [uniqueNotes]);

  const clearFilters = () => {
    setSelectedTags([]);
    setLocalSearchQuery('');
  };

  if (!uniqueNotes || uniqueNotes.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">People</h1>
        <div className="text-center py-12">
          <p className="text-gray-500">No people found</p>
        </div>
      </div>
    );
  }

  // Summary counts
  const totalPeople = uniqueNotes.filter(note => note.content && note.content.includes('meta::person::')).length;
  const totalTags = allTags.length;

  // Handler for editing a person
  const handleEditPerson = async (id, content) => {
    await updateNoteById(id, content);
    setAllNotes(allNotes.map(note => note.id === id ? { ...note, content } : note));
    setEditPersonModal({ open: false, personNote: null });
  };

  // Handler for updating a person (e.g., when photo is uploaded)
  const handleUpdatePerson = (updatedNote) => {
    setAllNotes(allNotes.map(note => note.id === updatedNote.id ? updatedNote : note));
  };

  // Handler for deleting a person
  const handleDeletePerson = async (id) => {
    try {
      const noteToDelete = allNotes.find(note => note.id === id);
      if (noteToDelete) {
        await deleteNoteWithImages(id, noteToDelete.content);
      } else {
        await deleteNoteById(id);
      }
      setAllNotes(allNotes.filter(note => note.id !== id));
      setEditPersonModal({ open: false, personNote: null });
      setDeleteModal({ open: false, noteId: null, personName: '' });
    } catch (error) {
      console.error('Error deleting person:', error);
    }
  };



  // Handler for adding a new person
  const handleAddPerson = async (content) => {
    try {
      const response = await createNote(content);
      // response is the full note object, not { content: ... }
      setAllNotes([...allNotes, response]);
      return response;
    } catch (error) {
      console.error('Error adding person:', error);
      throw error;
    }
  };

  // Handler for bulk adding people
  const handleBulkAddPeople = async (namesText, tagsText) => {
    try {
      // Parse names (one per line, trim whitespace, filter empty lines)
      const names = namesText
        .split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);

      // Parse tags (comma-separated or one per line, trim whitespace, filter empty)
      const tags = tagsText
        .split(/[,\n]/)
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      if (names.length === 0) {
        throw new Error('Please enter at least one name');
      }

      // Create all people
      const createdPeople = [];
      for (const name of names) {
        let content = `${name}\nmeta::person::${new Date().toISOString()}`;
        
        // Add tags
        tags.forEach(tag => {
          content += `\nmeta::tag::${tag}`;
        });

        const response = await createNote(content);
        createdPeople.push(response);
      }

      // Update state with all created people
      setAllNotes([...allNotes, ...createdPeople]);
      
      return createdPeople;
    } catch (error) {
      console.error('Error bulk adding people:', error);
      throw error;
    }
  };

  // Handler for closing the add person modal
  const handleCloseAddModal = () => {
    setAddPersonModal({ open: false });
    setPastedImageFile(null);
  };

  // Handler for removing a tag from a person
  const handleRemoveTag = async (noteId, tagToRemove) => {
    try {
      const note = allNotes.find(n => n.id === noteId);
      if (!note) return;

      const lines = note.content.split('\n');
      const updatedLines = lines.filter(line => !line.startsWith(`meta::tag::${tagToRemove}`));
      const updatedContent = updatedLines.join('\n');

      await updateNoteById(noteId, updatedContent);
      setAllNotes(allNotes.map(n => n.id === noteId ? { ...n, content: updatedContent } : n));
    } catch (error) {
      console.error('Error removing tag:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">People</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddPersonModal({ open: true })}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add People</span>
          </button>
          <button
            onClick={() => setBulkAddModal({ open: true })}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Bulk Add</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all duration-200 ${
              viewMode === 'grid'
                ? 'bg-indigo-100 text-indigo-700'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="Grid View"
          >
            <Squares2X2Icon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('tags')}
            className={`p-2 rounded-lg transition-all duration-200 ${
              viewMode === 'tags'
                ? 'bg-indigo-100 text-indigo-700'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="By Tags"
          >
            <TagIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search people..."
          value={localSearchQuery}
          onChange={(e) => setLocalSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-8 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
        />
        {localSearchQuery && (
          <button
            onClick={() => setLocalSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 gap-4 bg-white rounded-xl border p-4 shadow-sm">
        <div className="flex flex-col items-center p-3 rounded-lg border transition-all duration-200">
          <div className="text-xs font-medium text-gray-500">Total</div>
          <div className="text-2xl font-bold text-gray-900">{totalPeople}</div>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border transition-all duration-200">
          <div className="text-xs font-medium text-indigo-600">Tags</div>
          <div className="text-2xl font-bold text-indigo-700">{totalTags}</div>
        </div>
      </div>

      {/* Untagged People Alert */}
      {getPeopleWithoutTags > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                {getPeopleWithoutTags} {getPeopleWithoutTags === 1 ? 'person' : 'people'} {getPeopleWithoutTags === 1 ? 'has' : 'have'} no tags assigned.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tags Filter */}
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => {
                  setSelectedTags(prev =>
                    prev.includes(tag)
                      ? prev.filter(t => t !== tag)
                      : [...prev, tag]
                  );
                }}
                className={`px-2 py-1 text-sm rounded-md ${
                  selectedTags.includes(tag)
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
            <button
              onClick={() => {
                setSelectedTags(prev =>
                  prev.includes('no-tags')
                    ? prev.filter(t => t !== 'no-tags')
                    : [...prev, 'no-tags']
                );
              }}
              className={`px-2 py-1 text-sm rounded-md flex items-center gap-1 ${
                selectedTags.includes('no-tags')
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>No Tags</span>
              {getPeopleWithoutTags > 0 && (
                <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full">
                  {getPeopleWithoutTags}
                </span>
              )}
            </button>
          </div>
        </div>
        {(selectedTags.length > 0 || localSearchQuery) && (
          <button
            onClick={clearFilters}
            className="text-sm text-indigo-600 hover:text-indigo-800 ml-2"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* People List */}
      {filteredallNotes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No people found</p>
        </div>
      ) : viewMode === 'tags' ? (
        <div className="space-y-6">
          {allTags.map(tag => {
            const tagallNotes = allNotesByTag[tag];
            if (tagallNotes.length === 0) return null;
            
            return (
              <div key={tag} className="bg-white rounded-lg border p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <TagIcon className="h-5 w-5 text-indigo-600" />
                  {tag}
                  <span className="text-sm text-gray-500">({tagallNotes.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tagallNotes.map(note => (
                    <PersonCard
                      key={note.id}
                      note={note}
                      onShowRaw={(content) => setRawNoteModal({ open: true, content })}
                      onEdit={(note) => setEditPersonModal({ open: true, personNote: note })}
                      onRemoveTag={handleRemoveTag}
                      onUpdate={handleUpdatePerson}
                      allNotes={uniqueNotes}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredallNotes.map(note => (
            <PersonCard
              key={note.id}
              note={note}
              onShowRaw={(content) => setRawNoteModal({ open: true, content })}
              onEdit={(note) => setEditPersonModal({ open: true, personNote: note })}
              onRemoveTag={handleRemoveTag}
              onDelete={handleDeletePerson}
              onUpdate={handleUpdatePerson}
              allNotes={uniqueNotes}
            />
          ))}
        </div>
      )}

      {/* Note View Modal */}
      <NoteView
        isOpen={rawNoteModal.open}
        content={rawNoteModal.content}
        onClose={() => setRawNoteModal({ open: false, content: '' })}
      />

      {/* Add Person Modal */}
      {addPersonModal.open && (
        <AddPeopleModal
          isOpen={addPersonModal.open}
          onClose={handleCloseAddModal}
          allNotes={allNotes}
          onAdd={handleAddPerson}
          pastedImageFile={pastedImageFile}
          setAllNotes={setAllNotes}
        />
      )}

      {/* Edit Person Modal */}
      {editPersonModal.open && (
        <AddPeopleModal
          isOpen={editPersonModal.open}
          onClose={() => {
            setEditPersonModal({ open: false, personNote: null });
          }}
          allNotes={allNotes}
          onEdit={handleEditPerson}
          onDelete={handleDeletePerson}
          personNote={editPersonModal.personNote}
          setAllNotes={setAllNotes}
        />
      )}

      {/* Bulk Add Modal */}
      {bulkAddModal.open && (
        <BulkAddPeopleModal
          isOpen={bulkAddModal.open}
          onClose={() => setBulkAddModal({ open: false })}
          onBulkAdd={handleBulkAddPeople}
          allNotes={uniqueNotes}
        />
      )}

    </div>
  );
};

// Bulk Add People Modal Component
const BulkAddPeopleModal = ({ isOpen, onClose, onBulkAdd, allNotes = [] }) => {
  const [namesText, setNamesText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  // Get all unique tags from all notes
  const existingTags = useMemo(() => {
    const tagSet = new Set();
    allNotes
      .filter(note => note.content && note.content.includes('meta::person::'))
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

  // Handle tag selection (toggle)
  const handleTagClick = (tag) => {
    // Parse current tags
    const currentTags = tagsText
      .split(/[,\n]/)
      .map(t => t.trim())
      .filter(t => t.length > 0);
    
    // Toggle tag: remove if present, add if not
    if (currentTags.includes(tag)) {
      // Remove tag
      const newTags = currentTags
        .filter(t => t !== tag)
        .join(', ');
      setTagsText(newTags);
    } else {
      // Add tag
      const newTags = currentTags.length > 0 
        ? `${tagsText}, ${tag}`
        : tag;
      setTagsText(newTags);
    }
  };

  const handleSubmit = async () => {
    if (!namesText.trim()) {
      setError('Please enter at least one name');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await onBulkAdd(namesText, tagsText);
      // Reset form
      setNamesText('');
      setTagsText('');
      setError('');
      onClose();
    } catch (error) {
      setError(error.message || 'Failed to add people. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNamesText('');
    setTagsText('');
    setTagFilter('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Bulk Add People</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Names Textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Names (one per line)
            </label>
            <textarea
              value={namesText}
              onChange={(e) => {
                setNamesText(e.target.value);
                setError('');
              }}
              placeholder="Enter names, one per line&#10;John Doe&#10;Jane Smith&#10;Bob Johnson"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={8}
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter one name per line. Empty lines will be ignored.
            </p>
          </div>

          {/* Tags Textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags (comma-separated or one per line)
            </label>
            <textarea
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="Enter tags separated by commas or one per line&#10;family, friends&#10;colleague"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={4}
            />
            <p className="mt-1 text-xs text-gray-500">
              Tags can be separated by commas or entered one per line. All tags will be applied to all people.
            </p>

            {/* Existing Tags */}
            {existingTags.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-700">Existing tags:</p>
                  <div className="relative w-32">
                    <input
                      type="text"
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      placeholder="Filter tags..."
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {filteredExistingTags.map((tag) => {
                    const currentTags = tagsText
                      .split(/[,\n]/)
                      .map(t => t.trim())
                      .filter(t => t.length > 0);
                    const isSelected = currentTags.includes(tag);
                    
                    return (
                      <button
                        key={tag}
                        onClick={() => handleTagClick(tag)}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title={isSelected ? 'Click to remove' : 'Click to add'}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                {filteredExistingTags.length === 0 && tagFilter && (
                  <p className="text-xs text-gray-400 mt-2">No tags found matching "{tagFilter}"</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !namesText.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <PlusIcon className="h-4 w-4" />
                <span>Add People</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PeopleList; 