import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/solid';
import { loadTags, addNewTag, deleteTag, editTag, loadWorkstreams, deleteWorkstream, loadAllNotes } from '../utils/ApiUtils';
import { loadNotes } from '../utils/ApiUtils';
import { addNewNoteCommon } from '../utils/ApiUtils';
import { extractMetaTags } from '../utils/MetaTagUtils';
import moment from 'moment';

const TagListing = () => {
  const navigate = useNavigate();
  const [tagSearch, setTagSearch] = useState('');
  const [editingTag, setEditingTag] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workstreams, setWorkstreams] = useState([]);
  const [isLoadingWorkstreams, setIsLoadingWorkstreams] = useState(true);
  const [workstreamsError, setWorkstreamsError] = useState(null);
  const [workstreamSearch, setWorkstreamSearch] = useState('');
  const [isCreatingWorkstream, setIsCreatingWorkstream] = useState(false);
  const [workstreamCreateError, setWorkstreamCreateError] = useState(null);
  
  // Meta tags state
  const [metaTags, setMetaTags] = useState([]);
  const [isLoadingMetaTags, setIsLoadingMetaTags] = useState(true);
  const [metaTagsError, setMetaTagsError] = useState(null);
  const [metaTagsSearch, setMetaTagsSearch] = useState('');
  const [metaTagsSortBy, setMetaTagsSortBy] = useState('alphabetical'); // 'alphabetical', 'count-asc', 'count-desc'

  // Load tags on component mount
  useEffect(() => {
    loadTagsList();
    loadWorkstreamsList();
    loadMetaTagsList();
  }, []);

  const loadTagsList = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedTags = await loadTags();
      
      
      
      if (Array.isArray(fetchedTags)) {
        setTags(fetchedTags);
      } else {
        console.error('Unexpected tags format:', fetchedTags);
        setTags([]);
      }
    } catch (err) {
      setError('Failed to load tags. Please try again.');
      console.error('Error loading tags:', err);
      setTags([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWorkstreamsList = async () => {
    try {
      setIsLoadingWorkstreams(true);
      setWorkstreamsError(null);
      const fetchedWorkstreams = await loadWorkstreams();
      if (Array.isArray(fetchedWorkstreams)) {
        setWorkstreams(fetchedWorkstreams);
      } else {
        console.error('Unexpected workstreams format:', fetchedWorkstreams);
        setWorkstreams([]);
      }
    } catch (err) {
      setWorkstreamsError('Failed to load workstreams. Please try again.');
      setWorkstreams([]);
      console.error('Error loading workstreams:', err);
    } finally {
      setIsLoadingWorkstreams(false);
    }
  };

  const loadMetaTagsList = async () => {
    try {
      setIsLoadingMetaTags(true);
      setMetaTagsError(null);
      const response = await loadAllNotes('', null);
      const allNotes = response.notes || [];
      
      // Count how many notes have each meta tag type
      const metaTagCounts = new Map();
      
      allNotes.forEach(note => {
        if (note.content) {
          const lines = note.content.split('\n');
          const noteMetaTags = new Set(); // Track unique tags per note to avoid double counting
          
          lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('meta::')) {
              // Remove 'meta::' prefix
              const afterMeta = trimmedLine.substring(6);
              // Find the first occurrence of '::' or ':' to get the tag type
              const colonIndex = afterMeta.indexOf('::');
              const singleColonIndex = afterMeta.indexOf(':');
              
              let tagType;
              if (colonIndex !== -1) {
                // If there's a '::', extract everything before it
                tagType = afterMeta.substring(0, colonIndex);
              } else if (singleColonIndex !== -1) {
                // If there's only a ':', extract everything before it
                tagType = afterMeta.substring(0, singleColonIndex);
              } else {
                // If no colon at all, take the whole string
                tagType = afterMeta;
              }
              
              if (tagType) {
                noteMetaTags.add(tagType);
              }
            }
          });
          
          // Count each unique tag type for this note
          noteMetaTags.forEach(tagType => {
            metaTagCounts.set(tagType, (metaTagCounts.get(tagType) || 0) + 1);
          });
        }
      });
      
      // Convert to array of objects with tag type and count, then sort
      const metaTagsArray = Array.from(metaTagCounts.entries())
        .map(([tagType, count]) => ({ tagType, count }))
        .sort((a, b) => a.tagType.localeCompare(b.tagType));
      
      setMetaTags(metaTagsArray);
    } catch (err) {
      setMetaTagsError('Failed to load meta tags. Please try again.');
      console.error('Error loading meta tags:', err);
      setMetaTags([]);
    } finally {
      setIsLoadingMetaTags(false);
    }
  };

  const handleCreateTag = async () => {
    const newTag = tagSearch.trim();
    if (newTag && !tags.some(tag => tag.text === newTag)) {
      try {
        setError(null);
        await addNewTag(newTag);
        await loadTagsList();
        setTagSearch('');
      } catch (err) {
        setError('Failed to create tag. Please try again.');
        console.error('Error creating tag:', err);
      }
    }
  };

  const handleDeleteTag = async (tag) => {
    try {
      setError(null);
      await deleteTag(tag.id);
      await loadTagsList();
    } catch (err) {
      setError('Failed to delete tag. Please try again.');
      console.error('Error deleting tag:', err);
    }
  };

  const handleDeleteWorkstream = async (workstream) => {
    try {
      setWorkstreamsError(null);
      await deleteWorkstream(workstream.id);
      await loadWorkstreamsList();
    } catch (err) {
      setWorkstreamsError('Failed to delete workstream. Please try again.');
      console.error('Error deleting workstream:', err);
    }
  };

  const handleEditTag = (tag) => {
    setEditingTag(tag);
    setEditValue(tag.text);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (editValue.trim() && editValue !== editingTag.text) {
      try {
        setError(null);
        await editTag(editingTag.id, editValue.trim());
        await loadTagsList();
        setIsEditing(false);
        setEditingTag(null);
        setEditValue('');
      } catch (err) {
        setError('Failed to update tag. Please try again.');
        console.error('Error updating tag:', err);
      }
    }
  };

  const handleSearchKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleCreateTag();
    }
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditingTag(null);
      setEditValue('');
    }
  };

  const handleCreateWorkstream = async () => {
    const newWorkstream = workstreamSearch.trim();
    if (
      newWorkstream &&
      !workstreams.some(
        note => note.content.split('\n')[0].toLowerCase() === newWorkstream.toLowerCase()
      )
    ) {
      try {
        setWorkstreamCreateError(null);
        setIsCreatingWorkstream(true);
        // Create a new note with meta::workstream tag and the name as the first line
        const content = `${newWorkstream}\nmeta::workstream`;
        const now = moment().format('DD-MM-YYYY');
        await addNewNoteCommon(content, undefined, null);
        await loadWorkstreamsList();
        setWorkstreamSearch('');
      } catch (err) {
        setWorkstreamCreateError('Failed to create workstream. Please try again.');
        console.error('Error creating workstream:', err);
      } finally {
        setIsCreatingWorkstream(false);
      }
    }
  };

  const handleWorkstreamSearchKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleCreateWorkstream();
    }
  };

  const handleMetaTagClick = (tagType) => {
    // Navigate to notes page with meta::<tag_name> in search
    navigate('/notes', { 
      state: { 
        searchQuery: `meta::${tagType}`,
        clearFilters: true 
      } 
    });
  };

  const getSortedMetaTags = () => {
    const filteredTags = metaTags.filter(metaTag => 
      metaTag.tagType.toLowerCase().includes(metaTagsSearch.toLowerCase())
    );

    switch (metaTagsSortBy) {
      case 'alphabetical':
        return filteredTags.sort((a, b) => a.tagType.localeCompare(b.tagType));
      case 'count-asc':
        return filteredTags.sort((a, b) => a.count - b.count);
      case 'count-desc':
        return filteredTags.sort((a, b) => b.count - a.count);
      default:
        return filteredTags.sort((a, b) => a.tagType.localeCompare(b.tagType));
    }
  };

  if (isLoading) {
    return (
      <div className="w-full rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Tags</h2>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
          <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Search/Create Input */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search tags or press Cmd+Enter to create new tag..."
          value={tagSearch}
          onChange={(e) => setTagSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="w-full pl-10 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
        />
        {tagSearch && (
          <button
            onClick={() => setTagSearch('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Tags List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {tags
          .filter(tag => tag.text.toLowerCase().includes(tagSearch.toLowerCase()))
          .map((tag) => (
            <div
              key={tag.id}
              className="group flex items-center justify-between p-2 rounded-full border bg-gray-50 hover:bg-gray-100 transition-all duration-200"
            >
              {editingTag && editingTag.id === tag.id ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  className="flex-1 px-3 py-1 bg-white border rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-w-0"
                  autoFocus
                />
              ) : (
                <span className="text-gray-700 px-3 truncate">{tag.text}</span>
              )}
              
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pr-2">
                {editingTag && editingTag.id === tag.id ? (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      className="p-1 rounded-full hover:bg-green-100 text-green-600"
                      title="Save changes"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditingTag(null);
                        setEditValue('');
                      }}
                      className="p-1 rounded-full hover:bg-gray-200 text-gray-600"
                      title="Cancel"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleEditTag(tag)}
                      className="p-1 rounded-full hover:bg-blue-100 text-blue-600"
                      title="Edit tag"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTag(tag)}
                      className="p-1 rounded-full hover:bg-red-100 text-red-600"
                      title="Delete tag"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

        {/* Empty State */}
        {tags.filter(tag => tag.text.toLowerCase().includes(tagSearch.toLowerCase())).length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-500">
            {tagSearch ? (
              <p>No tags match your search</p>
            ) : (
              <p>No tags yet. Create one by typing and pressing Cmd+Enter</p>
            )}
          </div>
        )}
      </div>

      <h2 className="text-xl font-bold mb-4 mt-8">Workstreams</h2>
      {/* Workstream Error Message */}
      {workstreamCreateError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
          <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
          <span>{workstreamCreateError}</span>
        </div>
      )}
      {/* Workstream Search/Create Input */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search workstreams or press Cmd+Enter to create new workstream..."
          value={workstreamSearch}
          onChange={(e) => setWorkstreamSearch(e.target.value)}
          onKeyDown={handleWorkstreamSearchKeyDown}
          className="w-full pl-10 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
        />
        {workstreamSearch && (
          <button
            onClick={() => setWorkstreamSearch('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>
      {isLoadingWorkstreams ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      ) : workstreamsError ? (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
          <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
          <span>{workstreamsError}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {workstreams.filter(workstream => workstream.text.toLowerCase().includes(workstreamSearch.toLowerCase())).length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              {workstreamSearch ? (
                <p>No workstreams match your search</p>
              ) : (
                <p>No workstreams found. Create one by typing and pressing Cmd+Enter</p>
              )}
            </div>
          ) : (
            workstreams
              .filter(workstream => workstream.text.toLowerCase().includes(workstreamSearch.toLowerCase()))
              .map((workstream) => (
                <div
                  key={workstream.id}
                  className="group flex items-center justify-between p-2 rounded-full border bg-purple-50 hover:bg-purple-100 transition-all duration-200"
                >
                  <span className="text-purple-700 px-3 truncate font-medium">{workstream.text}</span>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pr-2">
                    <button
                      onClick={() => handleDeleteWorkstream(workstream)}
                      className="p-1 rounded-full hover:bg-red-100 text-red-600"
                      title="Delete workstream"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      <h2 className="text-xl font-bold mb-4 mt-8">Meta Tags</h2>
      {/* Meta Tags Error Message */}
      {metaTagsError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
          <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
          <span>{metaTagsError}</span>
        </div>
      )}
      
      {/* Meta Tags Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search meta tags..."
            value={metaTagsSearch}
            onChange={(e) => setMetaTagsSearch(e.target.value)}
            className="w-full pl-10 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200"
          />
          {metaTagsSearch && (
            <button
              onClick={() => setMetaTagsSearch('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        
        {/* Sort Dropdown */}
        <div className="flex-shrink-0">
          <select
            value={metaTagsSortBy}
            onChange={(e) => setMetaTagsSortBy(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 bg-white"
          >
            <option value="alphabetical">Alphabetical</option>
            <option value="count-asc">Count (Low to High)</option>
            <option value="count-desc">Count (High to Low)</option>
          </select>
        </div>
      </div>
      {isLoadingMetaTags ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {getSortedMetaTags().length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              {metaTagsSearch ? (
                <p>No meta tags match your search</p>
              ) : (
                <p>No meta tags found in notes</p>
              )}
            </div>
          ) : (
            getSortedMetaTags().map((metaTag) => (
              <div
                key={metaTag.tagType}
                className="group flex items-center justify-between p-2 rounded-full border bg-green-50 hover:bg-green-200 hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => handleMetaTagClick(metaTag.tagType)}
                title={`Click to search for notes with meta::${metaTag.tagType}`}
              >
                <span className="text-green-700 px-3 truncate font-mono text-sm">
                  {metaTag.tagType} ({metaTag.count})
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TagListing;