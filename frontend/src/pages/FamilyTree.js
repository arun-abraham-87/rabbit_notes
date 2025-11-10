import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PlusIcon, XMarkIcon, MagnifyingGlassIcon, UserIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/solid';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState,
  MarkerType,
  Position,
  Handle
} from 'reactflow';
import 'reactflow/dist/style.css';
import AddPeopleModal from '../components/AddPeopleModal';
import { createNote, updateNoteById, deleteNoteById } from '../utils/ApiUtils';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

const nodeTypes = {
  personNode: PersonNode
};

// Add Relationship Modal Component
function AddRelationshipModal({ isOpen, onClose, currentPersonNote, allNotes, onAdd }) {
  const [relationshipType, setRelationshipType] = useState('');
  const [personName, setPersonName] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewPerson, setIsNewPerson] = useState(true);

  const relationshipTypes = [
    { value: 'father_of', label: 'Father of' },
    { value: 'mother_of', label: 'Mother of' },
    { value: 'brother_of', label: 'Brother of' },
    { value: 'sister_of', label: 'Sister of' },
    { value: 'spouse_of', label: 'Spouse of' },
    { value: 'child_of', label: 'Child of' },
    { value: 'son_of', label: 'Son of' },
    { value: 'daughter_of', label: 'Daughter of' },
  ];

  // Get all people for selection (excluding current person)
  const availablePeople = useMemo(() => {
    return allNotes
      .filter(note => note.content && note.content.includes('meta::person::'))
      .map(note => {
        const lines = note.content.split('\n');
        const name = lines[0];
        return { id: note.id, name };
      })
      .filter(person => !currentPersonNote || person.id !== currentPersonNote.id);
  }, [allNotes, currentPersonNote]);

  // Filter people based on search query
  const filteredPeople = useMemo(() => {
    if (!searchQuery) return availablePeople;
    const query = searchQuery.toLowerCase();
    return availablePeople.filter(person => person.name.toLowerCase().includes(query));
  }, [availablePeople, searchQuery]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!relationshipType) return;
    
    if (isNewPerson) {
      if (!personName.trim()) return;
      await onAdd(currentPersonNote, relationshipType, null, personName.trim());
    } else {
      if (!selectedPersonId) return;
      await onAdd(currentPersonNote, relationshipType, selectedPersonId, null);
    }
    
    // Reset form
    setRelationshipType('');
    setPersonName('');
    setSelectedPersonId('');
    setSearchQuery('');
    setIsNewPerson(true);
  };

  if (!isOpen) return null;

  const currentPersonName = currentPersonNote ? currentPersonNote.content.split('\n')[0] : '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Add Relationship</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Adding relationship for: <span className="font-semibold">{currentPersonName}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Relationship Type *
            </label>
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">Select relationship type</option>
              {relationshipTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Person
            </label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setIsNewPerson(true)}
                className={`flex-1 px-3 py-2 text-sm rounded-md ${
                  isNewPerson
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                New Person
              </button>
              <button
                type="button"
                onClick={() => setIsNewPerson(false)}
                className={`flex-1 px-3 py-2 text-sm rounded-md ${
                  !isNewPerson
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Existing Person
              </button>
            </div>

            {isNewPerson ? (
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Enter person name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            ) : (
              <div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for person..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                />
                {searchQuery && filteredPeople.length > 0 && (
                  <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                    {filteredPeople.map(person => (
                      <div
                        key={person.id}
                        onClick={() => {
                          setSelectedPersonId(person.id);
                          setSearchQuery(person.name);
                        }}
                        className={`px-3 py-2 cursor-pointer hover:bg-gray-50 ${
                          selectedPersonId === person.id ? 'bg-indigo-50' : ''
                        }`}
                      >
                        {person.name}
                      </div>
                    ))}
                  </div>
                )}
                {searchQuery && filteredPeople.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">No people found</p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!relationshipType || (isNewPerson ? !personName.trim() : !selectedPersonId)}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Relationship
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Custom Person Node Component
function PersonNode({ data }) {
  const { person, onEdit, onExpand, onAddRelationship, isExpanded, hasChildren, hasSpouse } = data;
  const hasPhoto = person.photos && person.photos.length > 0;

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 shadow-md p-3 min-w-[180px] relative">
      {/* Handle for incoming edges (from parents) - left side */}
      <Handle
        type="target"
        position={Position.Left}
      />
      
      {/* Handle for outgoing edges (to children) - right side */}
      <Handle
        type="source"
        position={Position.Right}
      />
      
      {/* Handle for spouse connections - bottom (source) */}
      <Handle
        type="source"
        position={Position.Bottom}
      />
      
      {/* Handle for spouse connections - top (target) */}
      <Handle
        type="target"
        position={Position.Top}
      />
      
      <div className="flex items-center gap-3">
        {hasPhoto ? (
          <img
            src={person.photos[0]}
            alt={person.name}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <UserIcon className="h-6 w-6 text-gray-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{person.name}</p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-2">
        <button
          onClick={onAddRelationship}
          className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-gray-100"
          title="Add relationship"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
        {(hasChildren || hasSpouse) && (
          <button
            onClick={onExpand}
            className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-gray-100"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
        )}
        <button
          onClick={onEdit}
          className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-gray-100"
          title="Edit person"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

const FamilyTree = ({ allNotes, setAllNotes }) => {
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [addPersonModal, setAddPersonModal] = useState({ open: false });
  const [editPersonModal, setEditPersonModal] = useState({ open: false, personNote: null });
  const [addRelationshipModal, setAddRelationshipModal] = useState({ open: false, personNote: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTreeId, setSelectedTreeId] = useState(null);
  const [newTreeModal, setNewTreeModal] = useState({ open: false, name: '', rootPersonId: '' });
  const [deleteTreeModal, setDeleteTreeModal] = useState({ open: false, treeId: null, treeName: '' });
  const [editTreeModal, setEditTreeModal] = useState({ open: false, treeNote: null, name: '', rootPersonId: '' });
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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

  // Helper function to format relationship type to readable label
  const formatRelationshipLabel = (relationshipType) => {
    const labels = {
      'spouse_of': 'Spouse',
      'father_of': 'Father',
      'mother_of': 'Mother',
      'child_of': 'Child',
      'son_of': 'Son',
      'daughter_of': 'Daughter',
      'brother_of': 'Brother',
      'sister_of': 'Sister'
    };
    return labels[relationshipType] || relationshipType;
  };

  // Helper function to collect all node IDs recursively from the tree structure
  const collectAllNodeIds = (node, visited = new Set()) => {
    if (!node || visited.has(node.id)) return visited;
    visited.add(node.id);
    
    // Add spouse
    if (node.spouse) {
      visited.add(node.spouse.id);
      // Recursively collect from spouse's tree
      collectAllNodeIds(node.spouse, visited);
    }
    
    // Add children
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        visited.add(child.id);
        collectAllNodeIds(child, visited);
      });
    }
    
    // Add parents
    if (node.parents && node.parents.length > 0) {
      node.parents.forEach(parent => {
        visited.add(parent.id);
        collectAllNodeIds(parent, visited);
      });
    }
    
    // Add siblings
    if (node.siblings && node.siblings.length > 0) {
      node.siblings.forEach(sibling => {
        visited.add(sibling.id);
        collectAllNodeIds(sibling, visited);
      });
    }
    
    return visited;
  };

  // Convert tree structure to React Flow nodes and edges
  useEffect(() => {
    if (!buildFamilyTree) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const flowNodes = [];
    const flowEdges = [];
    const processedNodes = new Set();
    const ySpacing = 150;
    const xSpacing = 300;

    // Build nodes and edges together (left to right)
    const buildFlowNodes = (node, x = 0, y = 0, visited = new Set(), level = 0, parentId = null) => {
      if (!node || visited.has(node.id)) return;
      visited.add(node.id);

      const isExpanded = expandedNodes.has(node.id);
      const hasChildren = node.children && node.children.length > 0;
      const hasSpouse = node.spouse !== null && !processedNodes.has(node.spouse.id);

      // Create node if not already processed
      if (!processedNodes.has(node.id)) {
        flowNodes.push({
          id: node.id,
          type: 'personNode',
          position: { x, y },
          data: {
            person: {
              name: node.name,
              photos: node.photos
            },
            onEdit: () => {
              setEditPersonModal({ open: true, personNote: node.note });
            },
            onAddRelationship: () => {
              setAddRelationshipModal({ open: true, personNote: node.note });
            },
            onExpand: () => {
              setExpandedNodes(prev => {
                const newSet = new Set(prev);
                if (newSet.has(node.id)) {
                  newSet.delete(node.id);
                } else {
                  newSet.add(node.id);
                }
                return newSet;
              });
            },
            isExpanded,
            hasChildren,
            hasSpouse
          }
        });
        processedNodes.add(node.id);
      }

      // Handle spouse (render below current node)
      if (hasSpouse && isExpanded) {
        const spouseX = x;
        const spouseY = y + 120; // Spouse below current node
        
        if (!processedNodes.has(node.spouse.id)) {
          flowNodes.push({
            id: node.spouse.id,
            type: 'personNode',
            position: { x: spouseX, y: spouseY },
            data: {
              person: {
                name: node.spouse.name,
                photos: node.spouse.photos
              },
              onEdit: () => {
                setEditPersonModal({ open: true, personNote: node.spouse.note });
              },
              onAddRelationship: () => {
                setAddRelationshipModal({ open: true, personNote: node.spouse.note });
              },
              onExpand: () => {
                setExpandedNodes(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has(node.spouse.id)) {
                    newSet.delete(node.spouse.id);
                  } else {
                    newSet.add(node.spouse.id);
                  }
                  return newSet;
                });
              },
              isExpanded: expandedNodes.has(node.spouse.id),
              hasChildren: node.spouse.children && node.spouse.children.length > 0,
              hasSpouse: true
            }
          });
          processedNodes.add(node.spouse.id);
        }

        // Create edge for spouse immediately after creating spouse node
        const spouseRelationshipType = node.spouse.relationshipType || 'spouse_of';
        flowEdges.push({
          id: `edge-spouse-${node.id}-${node.spouse.id}`,
          source: node.id,
          target: node.spouse.id,
          type: 'smoothstep',
          style: { stroke: '#4b5563', strokeWidth: 3 },
          animated: false,
          label: formatRelationshipLabel(spouseRelationshipType),
          labelStyle: { fill: '#4b5563', fontWeight: 600, fontSize: 12 },
          labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 },
          labelBgPadding: [4, 4],
          labelBgBorderRadius: 4
        });
      }

      // Handle children (render to the right)
      if (hasChildren && isExpanded) {
        const childrenCount = node.children.length;
        const childrenStartY = y - ((childrenCount - 1) * ySpacing) / 2;
        
        // If there's a spouse, adjust children position to be centered between both parents
        const childrenX = x + xSpacing;
        const childrenYOffset = hasSpouse ? 60 : 0; // Offset if spouse exists
        
        node.children.forEach((child, index) => {
          const childX = childrenX;
          const childY = childrenStartY + (index * ySpacing) + childrenYOffset;
          
          // Recursively build child nodes first
          buildFlowNodes(child, childX, childY, new Set(visited), level + 1, node.id);

          // Create edge for child immediately after child node is created
          // Check if child node exists in flowNodes
          const childNodeExists = flowNodes.some(n => n.id === child.id);
          if (childNodeExists) {
            const childRelationshipType = child.relationshipType || 'child_of';
            flowEdges.push({
              id: `edge-child-${node.id}-${child.id}`,
              source: node.id,
              target: child.id,
              type: 'smoothstep',
              style: { stroke: '#4b5563', strokeWidth: 3 },
              animated: false,
              label: formatRelationshipLabel(childRelationshipType),
              labelStyle: { fill: '#4b5563', fontWeight: 600, fontSize: 12 },
              labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 },
              labelBgPadding: [4, 4],
              labelBgBorderRadius: 4
            });
          }
        });
      }

      // Handle siblings (render at same level, to the right)
      if (node.siblings && node.siblings.length > 0 && level === 0 && isExpanded) {
        node.siblings.forEach((sibling, index) => {
          const siblingX = x;
          const siblingY = y + (index + 1) * 150;
          buildFlowNodes(sibling, siblingX, siblingY, new Set(visited), level, parentId);
        });
      }
    };

    // Build all nodes and edges
    buildFlowNodes(buildFamilyTree, 0, 0);

    // Verify all edge sources and targets exist in flowNodes
    const validEdges = flowEdges.filter(edge => {
      const sourceExists = flowNodes.some(n => n.id === edge.source);
      const targetExists = flowNodes.some(n => n.id === edge.target);
      if (!sourceExists || !targetExists) {
        console.warn(`Edge ${edge.id} has invalid source or target:`, {
          source: edge.source,
          target: edge.target,
          sourceExists,
          targetExists,
          allNodeIds: flowNodes.map(n => n.id)
        });
      }
      return sourceExists && targetExists;
    });

    console.log('Flow Nodes:', flowNodes.length, flowNodes.map(n => ({ id: n.id, name: n.data.person.name })));
    console.log('Flow Edges (all):', flowEdges.length, flowEdges.map(e => ({ id: e.id, source: e.source, target: e.target })));
    console.log('Valid Edges:', validEdges.length, validEdges.map(e => ({ id: e.id, source: e.source, target: e.target })));
    console.log('Expanded Nodes:', Array.from(expandedNodes));

    setNodes(flowNodes);
    setEdges(validEdges);
  }, [buildFamilyTree, expandedNodes]);

  // Filter people for search
  const filteredPeople = useMemo(() => {
    if (!searchQuery) return peopleNotes;
    const query = searchQuery.toLowerCase();
    return peopleNotes.filter(note => {
      const info = parsePersonInfo(note.content);
      return info.name.toLowerCase().includes(query);
    });
  }, [peopleNotes, searchQuery]);

  // Set selected tree on mount if not set and expand all nodes
  useEffect(() => {
    if (!selectedTreeId && familyTreeNotes.length > 0) {
      setSelectedTreeId(familyTreeNotes[0].id);
    }
  }, [familyTreeNotes, selectedTreeId]);

  // Expand all nodes when buildFamilyTree changes
  useEffect(() => {
    if (buildFamilyTree) {
      const allNodeIds = collectAllNodeIds(buildFamilyTree);
      setExpandedNodes(allNodeIds);
    }
  }, [buildFamilyTree]);

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
      // Expanded nodes will be set automatically by useEffect when buildFamilyTree changes
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

  // Handle adding a relationship
  const handleAddRelationship = async (currentPersonNote, relationshipType, otherPersonId, otherPersonName) => {
    try {
      let targetPersonId = otherPersonId;
      let newPerson = null;
      let newPersonCreated = false;
      
      // If no person ID provided, create a new person
      if (!targetPersonId && otherPersonName) {
        const newPersonContent = `${otherPersonName}\nmeta::person::`;
        newPerson = await createNote(newPersonContent);
        targetPersonId = newPerson.id;
        newPersonCreated = true;
        // Use functional update to ensure we have the latest state
        setAllNotes(prevNotes => [...prevNotes, newPerson]);
      }
      
      if (!targetPersonId) {
        console.error('No person ID or name provided');
        return;
      }
      
      // Get reverse relationship type
      const getReverseRelationship = (type) => {
        const reverseMap = {
          'father_of': 'child_of',
          'mother_of': 'child_of',
          'brother_of': 'brother_of',
          'sister_of': 'sister_of',
          'spouse_of': 'spouse_of',
          'child_of': null, // Need to determine if father_of or mother_of
          'son_of': null, // Need to determine if father_of or mother_of
          'daughter_of': null, // Need to determine if father_of or mother_of
        };
        return reverseMap[type];
      };
      
      // Add relationship to current person's note
      const currentPersonContent = currentPersonNote.content;
      const relationshipLine = `meta::relationship::${relationshipType}::${targetPersonId}`;
      
      // Check if relationship already exists
      if (!currentPersonContent.includes(relationshipLine)) {
        const updatedCurrentPersonContent = currentPersonContent + `\n${relationshipLine}`;
        await updateNoteById(currentPersonNote.id, updatedCurrentPersonContent);
        // Use functional update
        setAllNotes(prevNotes => prevNotes.map(note => 
          note.id === currentPersonNote.id 
            ? { ...note, content: updatedCurrentPersonContent }
            : note
        ));
      }
      
      // Add reverse relationship to other person's note
      // Use the newly created person object if available, otherwise find in state
      const otherPersonNote = newPerson || allNotes.find(note => note.id === targetPersonId);
      if (otherPersonNote) {
        let reverseType = getReverseRelationship(relationshipType);
        
        // For child_of, son_of, daughter_of, need to check if current person is male or female
        // For now, we'll use a simple heuristic or let the user specify
        if (!reverseType && (relationshipType === 'child_of' || relationshipType === 'son_of' || relationshipType === 'daughter_of')) {
          // Default to father_of for now - could be improved
          reverseType = 'father_of';
        }
        
        if (reverseType) {
          const reverseRelationshipLine = `meta::relationship::${reverseType}::${currentPersonNote.id}`;
          if (!otherPersonNote.content.includes(reverseRelationshipLine)) {
            const updatedOtherPersonContent = otherPersonNote.content + `\n${reverseRelationshipLine}`;
            await updateNoteById(targetPersonId, updatedOtherPersonContent);
            // Update state after API call completes
            setAllNotes(prevNotes => prevNotes.map(note => 
              note.id === targetPersonId 
                ? { ...note, content: updatedOtherPersonContent }
                : note
            ));
          }
        }
      }
      
      // If a new person was created, add it to expanded nodes so it shows up immediately
      if (newPersonCreated) {
        setExpandedNodes(prev => new Set([...prev, targetPersonId, currentPersonNote.id]));
      } else {
        // Ensure both persons are expanded
        setExpandedNodes(prev => new Set([...prev, currentPersonNote.id]));
      }
      
      setAddRelationshipModal({ open: false, personNote: null });
    } catch (error) {
      console.error('Error adding relationship:', error);
    }
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
            onChange={(e) => {
              setSelectedTreeId(e.target.value);
              // Expanded nodes will be set automatically by useEffect when buildFamilyTree changes
            }}
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

      {/* Family Tree Visualization with React Flow */}
      {buildFamilyTree ? (
        <div className="bg-white rounded-lg border p-6" style={{ height: '600px', width: '100%' }}>
          {nodes.length > 0 && (
            <ReactFlow
              key={`flow-${selectedTreeId}-${edges.length}`}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              nodesDraggable={true}
              nodesConnectable={false}
              edgesUpdatable={false}
              defaultEdgeOptions={{
                type: 'smoothstep',
                style: { stroke: '#4b5563', strokeWidth: 3 },
                animated: false
              }}
              connectionLineType="smoothstep"
              proOptions={{ hideAttribution: true }}
              deleteKeyCode={null}
              multiSelectionKeyCode={null}
            >
              <Background color="#e5e7eb" gap={16} />
              <Controls />
              <MiniMap 
                nodeColor={(node) => {
                  return '#3b82f6';
                }}
                maskColor="rgba(0, 0, 0, 0.1)"
              />
            </ReactFlow>
          )}
          {nodes.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>No nodes to display. Make sure the root node is expanded.</p>
            </div>
          )}
          {nodes.length > 0 && edges.length === 0 && (
            <div className="absolute top-2 right-2 bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800">
              <p>No edges found. Expand nodes to see connections.</p>
              <p>Nodes: {nodes.length}, Edges: {edges.length}</p>
            </div>
          )}
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

      {/* Add Relationship Modal */}
      {addRelationshipModal.open && addRelationshipModal.personNote && (
        <AddRelationshipModal
          isOpen={addRelationshipModal.open}
          onClose={() => setAddRelationshipModal({ open: false, personNote: null })}
          currentPersonNote={addRelationshipModal.personNote}
          allNotes={allNotes}
          onAdd={handleAddRelationship}
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
