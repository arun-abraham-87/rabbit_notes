import React, { useState, useMemo, useEffect } from 'react';
import { PlusIcon, XMarkIcon, MagnifyingGlassIcon, UserIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/solid';
import AddPeopleModal from '../components/AddPeopleModal';
import { createNote, updateNoteById, deleteNoteById } from '../utils/ApiUtils';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

const FamilyTree = ({ allNotes, setAllNotes }) => {
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [addPersonModal, setAddPersonModal] = useState({ open: false });
  const [editPersonModal, setEditPersonModal] = useState({ open: false, personNote: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTreeId, setSelectedTreeId] = useState(null);
  const [newTreeModal, setNewTreeModal] = useState({ open: false, name: '', rootPersonId: '' });
  const [deleteTreeModal, setDeleteTreeModal] = useState({ open: false, treeId: null, treeName: '' });
  const [editTreeModal, setEditTreeModal] = useState({ open: false, treeNote: null, name: '', rootPersonId: '' });

  // Get all family tree notes
  const familyTreeNotes = useMemo(() => {
    return allNotes.filter(note => note.content && note.content.includes('meta::family-tree::'));
  }, [allNotes]);

  // Get all people notes
  const peopleNotes = useMemo(() => {
    return allNotes.filter(note => note.content && note.content.includes('meta::person::'));
  }, [allNotes]);

  // Parse family tree info from note content
  const parseFamilyTreeInfo = (content) => {
    const lines = content.split('\n');
    const name = lines[0];
    const treeLine = lines.find(line => line.startsWith('meta::family-tree::'));
    const rootPersonId = treeLine ? treeLine.split('::')[2] : null;
    
    return { name, rootPersonId };
  };

  // Parse person info from note content
  const parsePersonInfo = (content) => {
    const lines = content.split('\n');
    const name = lines[0];
    const relationships = lines
      .filter(line => line.startsWith('meta::relationship::'))
      .map(line => {
        const parts = line.split('::');
        return {
          type: parts[2],
          personId: parts[3]
        };
      });
    const photos = lines
      .filter(line => line.startsWith('meta::photo::'))
      .map(line => line.replace('meta::photo::', '').trim());
    
    return { name, relationships, photos };
  };

  // Get selected tree info
  const selectedTree = useMemo(() => {
    if (!selectedTreeId) return null;
    const treeNote = familyTreeNotes.find(note => note.id === selectedTreeId);
    if (!treeNote) return null;
    return {
      note: treeNote,
      ...parseFamilyTreeInfo(treeNote.content)
    };
  }, [familyTreeNotes, selectedTreeId]);

  // Build family tree structure
  const buildFamilyTree = useMemo(() => {
    if (!selectedTree || !selectedTree.rootPersonId) return null;

    const personMap = new Map();
    peopleNotes.forEach(note => {
      const info = parsePersonInfo(note.content);
      personMap.set(note.id, {
        id: note.id,
        name: info.name,
        relationships: info.relationships,
        photos: info.photos,
        note: note
      });
    });

    // Build tree starting from root
    const buildNode = (personId, visited = new Set(), depth = 0) => {
      if (visited.has(personId)) return null; // Prevent cycles
      if (depth > 10) return null; // Prevent infinite recursion
      visited.add(personId);

      const person = personMap.get(personId);
      if (!person) return null;

      const node = {
        id: personId,
        name: person.name,
        photos: person.photos,
        note: person.note,
        children: [],
        parents: [],
        siblings: [],
        spouse: null
      };

      // Find children: relationships where this person is parent (father_of, mother_of)
      person.relationships.forEach(rel => {
        if (rel.type === 'father_of' || rel.type === 'mother_of') {
          const childNode = buildNode(rel.personId, new Set(visited), depth + 1);
          if (childNode) {
            node.children.push({ ...childNode, relationshipType: rel.type });
          }
        }
      });

      // Find parents: relationships where this person is child (child_of, son_of, daughter_of)
      person.relationships.forEach(rel => {
        if (rel.type === 'child_of' || rel.type === 'son_of' || rel.type === 'daughter_of') {
          const parentNode = buildNode(rel.personId, new Set(visited), depth + 1);
          if (parentNode) {
            node.parents.push({ ...parentNode, relationshipType: rel.type });
          }
        }
      });

      // Find siblings: relationships where this person is sibling (brother_of, sister_of)
      person.relationships.forEach(rel => {
        if (rel.type === 'brother_of' || rel.type === 'sister_of') {
          const siblingNode = buildNode(rel.personId, new Set(visited), depth + 1);
          if (siblingNode) {
            node.siblings.push({ ...siblingNode, relationshipType: rel.type });
          }
        }
      });

      // Find spouse: relationships where this person is spouse (spouse_of)
      person.relationships.forEach(rel => {
        if (rel.type === 'spouse_of') {
          const spouseNode = buildNode(rel.personId, new Set(visited), depth + 1);
          if (spouseNode) {
            node.spouse = { ...spouseNode, relationshipType: rel.type };
          }
        }
      });

      return node;
    };

    return buildNode(selectedTree.rootPersonId);
  }, [peopleNotes, selectedTree]);

  // Filter people for search
  const filteredPeople = useMemo(() => {
    if (!searchQuery) return peopleNotes;
    const query = searchQuery.toLowerCase();
    return peopleNotes.filter(note => {
      const info = parsePersonInfo(note.content);
      return info.name.toLowerCase().includes(query);
    });
  }, [peopleNotes, searchQuery]);

  // Set selected tree on mount if not set
  useEffect(() => {
    if (!selectedTreeId && familyTreeNotes.length > 0) {
      setSelectedTreeId(familyTreeNotes[0].id);
    }
  }, [familyTreeNotes, selectedTreeId]);

  // Handle adding a new person
  const handleAddPerson = async (content) => {
    try {
      const response = await createNote(content);
      setAllNotes([...allNotes, response]);
      return response;
    } catch (error) {
      console.error('Error adding person:', error);
      throw error;
    }
  };

  // Handle editing a person
  const handleEditPerson = async (id, content) => {
    await updateNoteById(id, content);
    setAllNotes(allNotes.map(note => note.id === id ? { ...note, content } : note));
    setEditPersonModal({ open: false, personNote: null });
  };

  // Handle creating a new family tree
  const handleCreateTree = async () => {
    if (!newTreeModal.name.trim() || !newTreeModal.rootPersonId) {
      return;
    }

    try {
      const content = `${newTreeModal.name.trim()}\nmeta::family-tree::${newTreeModal.rootPersonId}`;
      const response = await createNote(content);
      setAllNotes([...allNotes, response]);
      setSelectedTreeId(response.id);
      setNewTreeModal({ open: false, name: '', rootPersonId: '' });
    } catch (error) {
      console.error('Error creating family tree:', error);
    }
  };

  // Handle editing a family tree
  const handleEditTree = async (id, content) => {
    await updateNoteById(id, content);
    setAllNotes(allNotes.map(note => note.id === id ? { ...note, content } : note));
    setEditTreeModal({ open: false, treeNote: null });
  };

  // Handle deleting a family tree
  const handleDeleteTree = async (id) => {
    try {
      await deleteNoteById(id);
      setAllNotes(allNotes.filter(note => note.id !== id));
      if (selectedTreeId === id) {
        const remainingTrees = familyTreeNotes.filter(note => note.id !== id);
        setSelectedTreeId(remainingTrees.length > 0 ? remainingTrees[0].id : null);
      }
      setDeleteTreeModal({ open: false, treeId: null, treeName: '' });
    } catch (error) {
      console.error('Error deleting family tree:', error);
    }
  };

  // Render tree node
  const renderTreeNode = (node, level = 0) => {
    if (!node) return null;

    const isSelected = selectedPersonId === node.id;
    const hasPhoto = node.photos && node.photos.length > 0;

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Parents */}
        {level === 0 && node.parents && node.parents.length > 0 && (
          <div className="mb-4 flex items-start gap-4">
            {node.parents.map((parent, index) => (
              <div key={parent.id} className="flex flex-col items-center">
                {renderTreeNode(parent, level - 1)}
                {/* Connection line */}
                <div className="w-px h-4 bg-gray-300"></div>
              </div>
            ))}
          </div>
        )}

        {/* Person Card */}
        <div
          className={`relative bg-white rounded-lg border-2 p-3 shadow-md cursor-pointer transition-all hover:shadow-lg min-w-[150px] ${
            isSelected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'
          }`}
          onClick={() => setSelectedPersonId(node.id)}
        >
          {hasPhoto ? (
            <img
              src={node.photos[0]}
              alt={node.name}
              className="w-20 h-20 rounded-full object-cover mx-auto mb-2"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-2">
              <UserIcon className="h-10 w-10 text-gray-400" />
            </div>
          )}
          <div className="text-center">
            <p className="font-semibold text-sm text-gray-900 truncate">{node.name}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditPersonModal({ open: true, personNote: node.note });
            }}
            className="absolute top-1 right-1 p-1 text-gray-400 hover:text-indigo-600 rounded"
            title="Edit person"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Spouse */}
        {node.spouse && (
          <div className="mt-4 flex items-center gap-4">
            <div className="w-8 h-px bg-gray-300"></div>
            {renderTreeNode(node.spouse, level)}
          </div>
        )}

        {/* Children */}
        {node.children && node.children.length > 0 && (
          <div className="mt-4 flex items-start gap-4">
            {node.children.map((child, index) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* Connection line */}
                <div className="w-px h-4 bg-gray-300"></div>
                {renderTreeNode(child, level + 1)}
              </div>
            ))}
          </div>
        )}

        {/* Siblings */}
        {level === 0 && node.siblings && node.siblings.length > 0 && (
          <div className="mt-4 flex items-start gap-4">
            {node.siblings.map((sibling, index) => (
              <div key={sibling.id} className="flex flex-col items-center">
                {renderTreeNode(sibling, level + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Family Trees</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNewTreeModal({ open: true, name: '', rootPersonId: '' })}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>New Family Tree</span>
          </button>
          <button
            onClick={() => setAddPersonModal({ open: true })}
            className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add Person</span>
          </button>
        </div>
      </div>

      {/* Family Tree Selection */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Select Family Tree:</label>
          <select
            value={selectedTreeId || ''}
            onChange={(e) => setSelectedTreeId(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="">Select a family tree</option>
            {familyTreeNotes.map(note => {
              const info = parseFamilyTreeInfo(note.content);
              return (
                <option key={note.id} value={note.id}>
                  {info.name}
                </option>
              );
            })}
          </select>
          {selectedTree && (
            <>
              <button
                onClick={() => {
                  const info = parseFamilyTreeInfo(selectedTree.note.content);
                  setEditTreeModal({ open: true, treeNote: selectedTree.note, name: info.name, rootPersonId: info.rootPersonId || '' });
                }}
                className="px-3 py-2 text-sm text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                title="Edit family tree"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  const info = parseFamilyTreeInfo(selectedTree.note.content);
                  setDeleteTreeModal({ open: true, treeId: selectedTree.note.id, treeName: info.name });
                }}
                className="px-3 py-2 text-sm text-red-600 hover:text-red-800 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                title="Delete family tree"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search for People */}
      {selectedTree && (
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-8 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      {/* People List for Selection */}
      {searchQuery && selectedTree && (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-gray-900">Select Person</h3>
            <p className="text-sm text-gray-500">{filteredPeople.length} person(s) found</p>
          </div>
          {filteredPeople.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredPeople.map(note => {
                const info = parsePersonInfo(note.content);
                const hasPhoto = info.photos && info.photos.length > 0;
                return (
                  <div
                    key={note.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setSelectedPersonId(note.id);
                      setSearchQuery('');
                    }}
                  >
                    {hasPhoto ? (
                      <img
                        src={info.photos[0]}
                        alt={info.name}
                        className="w-16 h-16 rounded-full object-cover mx-auto mb-2"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-2">
                        <UserIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <p className="text-sm font-medium text-center text-gray-900 truncate">{info.name}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No people found matching "{searchQuery}"</p>
              <p className="text-sm mt-2">Try a different search or add a new person</p>
            </div>
          )}
        </div>
      )}

      {/* Family Tree Visualization */}
      {buildFamilyTree ? (
        <div className="bg-white rounded-lg border p-6 overflow-x-auto">
          <div className="flex justify-center">
            {renderTreeNode(buildFamilyTree)}
          </div>
        </div>
      ) : selectedTree ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <p className="text-gray-500">No root person set for this family tree. Edit the tree to set a root person.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border p-12 text-center">
          <p className="text-gray-500">Create a new family tree to get started</p>
        </div>
      )}

      {/* New Family Tree Modal */}
      {newTreeModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Create New Family Tree</h2>
              <button
                onClick={() => setNewTreeModal({ open: false, name: '', rootPersonId: '' })}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Family Tree Name *
                </label>
                <input
                  type="text"
                  value={newTreeModal.name}
                  onChange={(e) => setNewTreeModal({ ...newTreeModal, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter family tree name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Root Person *
                </label>
                <select
                  value={newTreeModal.rootPersonId}
                  onChange={(e) => setNewTreeModal({ ...newTreeModal, rootPersonId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select root person</option>
                  {peopleNotes.map(note => {
                    const info = parsePersonInfo(note.content);
                    return (
                      <option key={note.id} value={note.id}>
                        {info.name}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setNewTreeModal({ open: false, name: '', rootPersonId: '' })}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTree}
                disabled={!newTreeModal.name.trim() || !newTreeModal.rootPersonId}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Family Tree Modal */}
      {editTreeModal.open && editTreeModal.treeNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Edit Family Tree</h2>
              <button
                onClick={() => setEditTreeModal({ open: false, treeNote: null, name: '', rootPersonId: '' })}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Family Tree Name *
                </label>
                <input
                  type="text"
                  value={editTreeModal.name}
                  onChange={(e) => setEditTreeModal({ ...editTreeModal, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter family tree name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Root Person *
                </label>
                <select
                  value={editTreeModal.rootPersonId}
                  onChange={(e) => setEditTreeModal({ ...editTreeModal, rootPersonId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select root person</option>
                  {peopleNotes.map(note => {
                    const info = parsePersonInfo(note.content);
                    return (
                      <option key={note.id} value={note.id}>
                        {info.name}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditTreeModal({ open: false, treeNote: null, name: '', rootPersonId: '' })}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const content = `${editTreeModal.name.trim()}\nmeta::family-tree::${editTreeModal.rootPersonId}`;
                  handleEditTree(editTreeModal.treeNote.id, content);
                }}
                disabled={!editTreeModal.name.trim() || !editTreeModal.rootPersonId}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Person Modal */}
      {addPersonModal.open && (
        <AddPeopleModal
          isOpen={addPersonModal.open}
          onClose={() => setAddPersonModal({ open: false })}
          allNotes={allNotes}
          onAdd={handleAddPerson}
          setAllNotes={setAllNotes}
        />
      )}

      {/* Edit Person Modal */}
      {editPersonModal.open && (
        <AddPeopleModal
          isOpen={editPersonModal.open}
          onClose={() => setEditPersonModal({ open: false, personNote: null })}
          allNotes={allNotes}
          onEdit={handleEditPerson}
          personNote={editPersonModal.personNote}
          setAllNotes={setAllNotes}
        />
      )}

      {/* Delete Tree Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteTreeModal.open}
        onClose={() => setDeleteTreeModal({ open: false, treeId: null, treeName: '' })}
        onConfirm={() => handleDeleteTree(deleteTreeModal.treeId)}
        title="Delete Family Tree"
        message={`Are you sure you want to delete "${deleteTreeModal.treeName}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default FamilyTree;
