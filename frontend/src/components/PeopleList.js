import React, { useState, useMemo } from 'react';
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
  const [deleteModal, setDeleteModal] = useState({ open: false, noteId: null, personName: '' });


  // Get all unique tags from person allNotes
  const allTags = useMemo(() => {
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

  // Filter person allNotes based on selected filters
  const filteredallNotes = useMemo(() => {
    let filtered = allNotes.filter(note => note.content.includes('meta::person::'));

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
  }, [allNotes, selectedTags, localSearchQuery]);

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
    return allNotes.filter(note => {
      if (!note.content.includes('meta::person::')) return false;
      return !note.content.split('\n').some(line => line.startsWith('meta::tag::'));
    }).length;
  }, [allNotes]);

  const clearFilters = () => {
    setSelectedTags([]);
    setLocalSearchQuery('');
  };

  if (!allNotes || allNotes.length === 0) {
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
  const totalPeople = allNotes.filter(note => note.content.includes('meta::person::')).length;
  const totalTags = allTags.length;

  // Handler for editing a person
  const handleEditPerson = async (id, content) => {
    await updateNoteById(id, content);
    setAllNotes(allNotes.map(note => note.id === id ? { ...note, content } : note));
    setEditPersonModal({ open: false, personNote: null });
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

      setAllNotes([...allNotes, response.content]);
      return response;
    } catch (error) {
      console.error('Error adding person:', error);
      throw error;
    }
  };

  // Handler for closing the add person modal
  const handleCloseAddModal = () => {
    setAddPersonModal({ open: false });
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
        />
      )}


    </div>
  );
};

export default PeopleList; 