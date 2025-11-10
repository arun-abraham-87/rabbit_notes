import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  const { person, onEdit, onExpand, onAddRelationship, onSelect, onHover, onHoverEnd, isExpanded, hasChildren, hasSpouse, hasParents, isRoot, isSelected, isHighlighted, isDimmed } = data;
  const hasPhoto = person.photos && person.photos.length > 0;

  const handleClick = (e) => {
    // Don't trigger selection if clicking on buttons
    if (e.target.closest('button')) {
      return;
    }
    if (onSelect) {
      onSelect(person.id);
    }
  };

  const handleMouseEnter = () => {
    if (onHover) {
      onHover(person.id);
    }
  };

  const handleMouseLeave = () => {
    if (onHoverEnd) {
      onHoverEnd();
    }
  };

  return (
    <div 
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`rounded-lg border-2 shadow-md p-2 min-w-[140px] relative flex flex-col items-center cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-gradient-to-br from-blue-100 to-blue-200 border-blue-500 shadow-xl scale-105 z-50'
          : isHighlighted
          ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 shadow-lg scale-[1.03] z-40'
          : isDimmed
          ? 'opacity-30 bg-white border-gray-200'
          : isRoot 
          ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-400 shadow-lg' 
          : 'bg-white border-gray-200'
      }`}
    >
      {/* Handle for incoming edges (from parents) - top */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
      />
      
      {/* Handle for outgoing edges (to children) - bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
      />
      
      {/* Handle for spouse connections - right (source) */}
      <Handle
        type="source"
        position={Position.Right}
        id="spouse"
      />
      
      {/* Handle for spouse connections - left (target) */}
      <Handle
        type="target"
        position={Position.Left}
        id="spouse"
      />
      
      {/* Large headshot */}
      <div className="relative mb-2">
        {hasPhoto ? (
          <img
            src={person.photos[0]}
            alt={person.name}
            className="w-24 h-24 rounded-full object-cover border-2 border-gray-300 shadow-sm"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300 shadow-sm">
            <UserIcon className="h-12 w-12 text-gray-400" />
          </div>
        )}
        {isRoot && (
          <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1 shadow-md">
            <svg className="w-4 h-4 text-yellow-900" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        )}
      </div>
      
      {/* Name label underneath */}
      <div className="w-full text-center mb-2">
        <p className="font-semibold text-sm text-gray-900 truncate px-1">{person.name}</p>
        {isRoot && (
          <p className="text-xs font-bold text-yellow-700 mt-0.5">ROOT</p>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="flex items-center justify-center gap-1 mt-auto">
        <button
          onClick={onAddRelationship}
          className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-gray-100"
          title="Add relationship"
        >
          <PlusIcon className="h-3.5 w-3.5" />
        </button>
        {(hasChildren || hasSpouse || data.hasParents) && (
          <button
            onClick={onExpand}
            className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-gray-100"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <PencilIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

const FamilyTree = ({ allNotes, setAllNotes }) => {
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [hoveredPersonId, setHoveredPersonId] = useState(null);
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
  const lastExpandedTreeIdRef = useRef(null);

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
      console.log(`[TREE BUILD START] Building node for personId=${personId}, depth=${depth}, visited=${Array.from(visited).join(',')}`);
      if (visited.has(personId)) {
        console.log(`[TREE BUILD] Person ${personId} already visited, returning null`);
        return null; // Prevent cycles
      }
      if (depth > 10) {
        console.log(`[TREE BUILD] Depth ${depth} > 10, returning null`);
        return null; // Prevent infinite recursion
      }
      visited.add(personId);

      const person = personMap.get(personId);
      if (!person) {
        console.log(`[TREE BUILD] Person ${personId} not found in personMap`);
        return null;
      }

      console.log(`[TREE BUILD] Building node for ${person.name} (${personId}), relationships:`, person.relationships.map(r => `${r.type}::${r.personId}`).join(', '));

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
            console.log(`[TREE BUILD] ${person.name} (${personId}) -> found child via direct: ${childNode.name} (${rel.personId}) as ${rel.type}`);
          }
        }
      });

      // Also find children by looking for reverse relationships
      // If someone has child_of, son_of, or daughter_of to this person, they are a child
      peopleNotes.forEach(note => {
        if (note.id === personId) return; // Skip self
        const otherPerson = personMap.get(note.id);
        if (!otherPerson) return;
        
        // Check if this other person has a child relationship to the current person
        otherPerson.relationships.forEach(rel => {
          if ((rel.type === 'child_of' || rel.type === 'son_of' || rel.type === 'daughter_of') && rel.personId === personId) {
            // This person is a child of the current person
            // Make sure we don't already have this person as a parent (avoid circular relationships)
            const isAlreadyParent = node.parents.some(p => p.id === note.id);
            if (!isAlreadyParent) {
              const childNode = buildNode(note.id, new Set(visited), depth + 1);
              if (childNode) {
                // Keep the original relationship type (daughter_of, son_of, child_of) for the label
                // The label will show "Daughter", "Son", or "Child" from the parent's perspective
                // Check if this child is already in the children array
                if (!node.children.some(c => c.id === childNode.id)) {
                node.children.push({ ...childNode, relationshipType: rel.type });
                  console.log(`[TREE BUILD] ${person.name} (${personId}) -> found child via reverse: ${childNode.name} (${note.id}) as ${rel.type}`);
              }
              }
            } else {
              console.log(`[TREE BUILD] ${person.name} (${personId}) -> skipping ${otherPerson.name} (${note.id}) as child because already parent`);
            }
          }
        });
      });

      // Find parents: relationships where this person is child (child_of, son_of, daughter_of)
      person.relationships.forEach(rel => {
        if (rel.type === 'child_of' || rel.type === 'son_of' || rel.type === 'daughter_of') {
          // Make sure this person is not already a child of the current person (avoid circular relationships)
          const isAlreadyChild = node.children.some(c => c.id === rel.personId);
          if (!isAlreadyChild) {
            const parentNode = buildNode(rel.personId, new Set(visited), depth + 1);
            if (parentNode) {
              node.parents.push({ ...parentNode, relationshipType: rel.type });
              console.log(`[TREE BUILD] ${person.name} (${personId}) -> found parent: ${parentNode.name} (${rel.personId}) as ${rel.type}`);
            }
          } else {
            console.log(`[TREE BUILD] ${person.name} (${personId}) -> skipping ${rel.personId} as parent because already child`);
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
      console.log(`[TREE BUILD] ${person.name} (${personId}) checking for spouse relationships...`);
      person.relationships.forEach(rel => {
        if (rel.type === 'spouse_of') {
          console.log(`[TREE BUILD] ${person.name} (${personId}) found spouse relationship: ${rel.type}::${rel.personId}`);
          const spouseNode = buildNode(rel.personId, new Set(visited), depth + 1);
          if (spouseNode) {
            node.spouse = { ...spouseNode, relationshipType: rel.type };
            console.log(`[TREE BUILD] ${person.name} (${personId}) -> set spouse: ${spouseNode.name} (${rel.personId})`);
          } else {
            console.log(`[TREE BUILD] ${person.name} (${personId}) -> spouse node build returned null for ${rel.personId}`);
          }
        }
      });
      
      if (!node.spouse) {
        console.log(`[TREE BUILD] ${person.name} (${personId}) has no spouse`);
      }

      console.log(`[TREE BUILD COMPLETE] ${person.name} (${personId}):`, {
        children: node.children.map(c => `${c.name} (${c.id}) [${c.relationshipType}]`).join(', '),
        parents: node.parents.map(p => `${p.name} (${p.id}) [${p.relationshipType}]`).join(', '),
        spouse: node.spouse ? `${node.spouse.name} (${node.spouse.id}) [${node.spouse.relationshipType}]` : 'none',
        siblings: node.siblings.map(s => `${s.name} (${s.id}) [${s.relationshipType}]`).join(', ') || 'none'
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

  // Expand all nodes when tree changes (separate effect to prevent loops)
  useEffect(() => {
    if (buildFamilyTree) {
      const currentTreeId = selectedTreeId || buildFamilyTree.id;
      if (lastExpandedTreeIdRef.current !== currentTreeId) {
        const allNodeIds = collectAllNodeIds(buildFamilyTree);
        console.log(`[EXPAND ALL] Expanding all nodes on load for tree ${currentTreeId}:`, Array.from(allNodeIds));
        setExpandedNodes(new Set(allNodeIds));
        lastExpandedTreeIdRef.current = currentTreeId;
      }
    }
  }, [buildFamilyTree, selectedTreeId]);

  // Function to generate unique colors for edges
  const generateEdgeColor = (index) => {
    // Use HSL color space to generate distinct colors
    // Vary hue from 0 to 360, keep saturation and lightness consistent for visibility
    const hue = (index * 137.508) % 360; // Golden angle approximation for better distribution
    const saturation = 60 + (index % 3) * 10; // Vary saturation between 60-80%
    const lightness = 45 + (index % 2) * 10; // Vary lightness between 45-55%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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
    let edgeIndex = 0; // Track edge index for unique colors
    const ySpacing = 300; // Vertical spacing (top to bottom) - increased to prevent edge overlap and give edges room to curve
    const nodeWidth = 220; // Approximate node width (min-w-[180px] + padding + border)
    const nodeHeight = 120; // Approximate node height (to account for edge routing)
    const xSpacing = nodeWidth + 300; // Horizontal spacing: node width + larger gap (520px total) - increased to prevent edge overlap
    const rootStartY = 400; // Start root person in the middle of the canvas

    // Helper function to check and adjust for horizontal overlaps
    const checkAndAdjustHorizontalOverlap = (x, y, excludeNodeId = null) => {
      const minDistance = nodeWidth + 50; // Minimum distance between nodes
      const yTolerance = 10; // Consider nodes at the same y level if within this tolerance
      
      // Find all nodes at the same y level
      const nodesAtSameY = flowNodes.filter(n => {
        if (excludeNodeId && n.id === excludeNodeId) return false;
        return Math.abs(n.position.y - y) < yTolerance;
      });
      
      // Check for overlaps and find the best position
      let adjustedX = x;
      let hasOverlap = true;
      
      while (hasOverlap) {
        hasOverlap = false;
        for (const existingNode of nodesAtSameY) {
          const distance = Math.abs(existingNode.position.x - adjustedX);
          if (distance < minDistance) {
            // Overlap detected, adjust position to the right
            adjustedX = existingNode.position.x + minDistance;
            hasOverlap = true;
            console.log(`[OVERLAP] Adjusting x from ${x} to ${adjustedX} to avoid overlap with ${existingNode.data.person.name} at (${existingNode.position.x}, ${existingNode.position.y})`);
            break; // Re-check all nodes with new position
          }
        }
      }
      
      if (adjustedX !== x) {
        console.log(`[OVERLAP] Final adjusted position: (${adjustedX}, ${y}) from original (${x}, ${y})`);
      }
      
      return adjustedX;
    };

    // Build nodes and edges together (top to bottom)
    const buildFlowNodes = (node, x = 0, y = rootStartY, visited = new Set(), level = 0, parentId = null, skipVisitedCheck = false) => {
      console.log(`[FLOW BUILD START] Building flow node for ${node.name} (${node.id}) at (${x}, ${y}), level=${level}, parentId=${parentId}, skipVisitedCheck=${skipVisitedCheck}`);
      if (!node) {
        console.log(`[FLOW BUILD] Node is null, returning`);
        return;
      }
      if (!skipVisitedCheck && visited.has(node.id)) {
        console.log(`[FLOW BUILD] Node ${node.name} (${node.id}) already visited, returning`);
        return;
      }
      if (!visited.has(node.id)) {
      visited.add(node.id);
      }

      // Check if this is a spouse node being processed (skipVisitedCheck=true means it's a spouse being processed for its children)
      const isSpouseBeingProcessed = skipVisitedCheck && processedNodes.has(node.id);
      // Always show all relationships - always expanded
      const isExpanded = true;
      const hasChildren = node.children && node.children.length > 0;
      const hasSpouse = node.spouse !== null && !processedNodes.has(node.spouse.id);
      const hasParents = node.parents && node.parents.length > 0;
      const isRoot = node.id === selectedTree.rootPersonId;
      
      console.log(`[FLOW BUILD] ${node.name} (${node.id}) state:`, {
        isExpanded,
        hasChildren,
        hasSpouse,
        hasParents,
        isRoot,
        spouse: node.spouse ? `${node.spouse.name} (${node.spouse.id})` : 'none',
        childrenCount: node.children ? node.children.length : 0,
        parentsCount: node.parents ? node.parents.length : 0
      });

      // Create node if not already processed
      if (!processedNodes.has(node.id)) {
        // Check and adjust for horizontal overlaps
        x = checkAndAdjustHorizontalOverlap(x, y, node.id);
        
        console.log(`[POSITION] Creating node: ${node.name} (${node.id}) at position (${x}, ${y}), level=${level}, isRoot=${isRoot}, hasParents=${hasParents}, hasChildren=${hasChildren}`);
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
            onSelect: (personId) => {
              setSelectedPersonId(personId === selectedPersonId ? null : personId);
            },
            onHover: (personId) => {
              setHoveredPersonId(personId);
            },
            onHoverEnd: () => {
              setHoveredPersonId(null);
            },
            isExpanded,
            hasChildren,
            hasSpouse,
            hasParents,
          isRoot,
            isSelected: false,
            isHighlighted: false,
            isDimmed: false
          }
        });
        processedNodes.add(node.id);
      } else {
        // Node already exists, log if position is different
        const existingNode = flowNodes.find(n => n.id === node.id);
        if (existingNode && (Math.abs(existingNode.position.x - x) > 10 || Math.abs(existingNode.position.y - y) > 10)) {
          console.log(`[POSITION] Node ${node.name} (${node.id}) already exists at (${existingNode.position.x}, ${existingNode.position.y}), skipping creation at (${x}, ${y})`);
        }
      }

      // Handle parents (render above - upstream)
      // Always show parents - all relationships are always visible
      if (hasParents) {
        const parentsCount = node.parents.length;
        const parentsStartX = x - ((parentsCount - 1) * xSpacing) / 2;
        const parentsY = y - ySpacing; // Parents above current node
        
        console.log(`[POSITION] ${node.name} (${node.id}) has ${parentsCount} parent(s), positioning above at y=${parentsY} (current y=${y})`);
        node.parents.forEach((parent, index) => {
          let parentX = parentsStartX + (index * xSpacing);
          const parentY = parentsY;
          
          // Check and adjust for horizontal overlaps before positioning parent
          if (!processedNodes.has(parent.id)) {
            parentX = checkAndAdjustHorizontalOverlap(parentX, parentY, parent.id);
          }
          
          console.log(`[POSITION] Building parent: ${parent.name} (${parent.id}) at (${parentX}, ${parentY}) for child ${node.name} (${node.id})`);
          // Recursively build parent nodes first
          buildFlowNodes(parent, parentX, parentY, new Set(visited), level - 1, node.id);

          // Create edge for parent immediately after parent node is created
          const parentNodeExists = flowNodes.some(n => n.id === parent.id);
          if (parentNodeExists) {
            // parent.relationshipType is from the child's perspective (e.g., 'daughter_of', 'son_of', 'child_of')
            // When creating an edge from parent to child, we want to show the relationship from parent's perspective
            // So 'daughter_of' should show as "Daughter", 'son_of' should show as "Son", etc.
            const childRelationshipType = parent.relationshipType || 'child_of';
            const edgeLabel = formatRelationshipLabel(childRelationshipType);
            const edgeColor = generateEdgeColor(edgeIndex++);
            console.log(`[EDGE] Creating parent edge: ${parent.name} (${parent.id}) -> ${node.name} (${node.id}), label="${edgeLabel}", type=${childRelationshipType}`);
            flowEdges.push({
              id: `edge-parent-${parent.id}-${node.id}`,
              source: parent.id,
              target: node.id,
              sourceHandle: 'bottom',
              targetHandle: 'top',
              type: 'bezier',
              style: { stroke: edgeColor, strokeWidth: 5 },
              animated: false,
              label: edgeLabel, // This will show "Daughter", "Son", or "Child"
              labelStyle: { fill: edgeColor, fontWeight: 600, fontSize: 12 },
              labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 },
              labelBgPadding: [4, 4],
              labelBgBorderRadius: 4
            });
          }
        });
      }

      // Handle spouse (render to the right - side by side, close together)
      // Always display spouse and its hierarchy if spouse has children or downstream relationships
      console.log(`[FLOW BUILD] ${node.name} (${node.id}) checking spouse: hasSpouse=${hasSpouse}, spouse=${node.spouse ? `${node.spouse.name} (${node.spouse.id})` : 'none'}`);
      if (hasSpouse) {
        const spouseHasChildren = node.spouse.children && node.spouse.children.length > 0;
        const spouseHasDownstream = spouseHasChildren; // Check if spouse has any downstream relationships
        
        // Always display spouse if it exists in relationships - spouse should always be visible
        const shouldDisplaySpouse = true; // Always show spouse if relationship exists
        
        if (shouldDisplaySpouse) {
          const spouseSpacing = nodeWidth + 20; // Spouses close together: node width + small gap (20px)
          let spouseX = x + spouseSpacing; // Spouse to the right, close
          const spouseY = y; // Same vertical level
          
          // Check and adjust for horizontal overlaps
          if (!processedNodes.has(node.spouse.id)) {
            spouseX = checkAndAdjustHorizontalOverlap(spouseX, spouseY, node.spouse.id);
          }
          
          console.log(`[FLOW BUILD] ${node.name} (${node.id}) positioning spouse ${node.spouse.name} (${node.spouse.id}) at (${spouseX}, ${spouseY}), current position (${x}, ${y}), spouseHasDownstream=${spouseHasDownstream}`);
          
          if (!processedNodes.has(node.spouse.id)) {
            console.log(`[FLOW BUILD] Spouse ${node.spouse.name} (${node.spouse.id}) not yet processed, creating node`);
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
                onSelect: (personId) => {
                  setSelectedPersonId(personId === selectedPersonId ? null : personId);
                },
                onHover: (personId) => {
                  setHoveredPersonId(personId);
                },
                onHoverEnd: () => {
                  setHoveredPersonId(null);
                },
                isExpanded: true, // Always expand spouse to show its relations
                hasChildren: node.spouse.children && node.spouse.children.length > 0,
                hasSpouse: true,
                hasParents: node.spouse.parents && node.spouse.parents.length > 0,
                isRoot: node.spouse.id === selectedTree.rootPersonId
              }
            });
            processedNodes.add(node.spouse.id);
            
            // Always process spouse's children and hierarchy - spouse's downward links should always be open
            // Recursively process spouse's children - skip visited check to allow processing children
            console.log(`[FLOW BUILD] Spouse ${node.spouse.name} (${node.spouse.id}) - processing children and hierarchy (spouse's downward links always open)`);
            // Skip visited check and don't create node again (it's already in processedNodes)
            // This will process the spouse's children and their hierarchy
            buildFlowNodes(node.spouse, spouseX, spouseY, visited, level, node.id, true);
          }

          // Create edge for spouse immediately after creating spouse node
          const spouseRelationshipType = node.spouse.relationshipType || 'spouse_of';
          const spouseEdgeColor = generateEdgeColor(edgeIndex++);
          console.log(`[FLOW BUILD] ${node.name} (${node.id}) creating spouse edge to ${node.spouse.name} (${node.spouse.id}), type=${spouseRelationshipType}`);
          flowEdges.push({
            id: `edge-spouse-${node.id}-${node.spouse.id}`,
            source: node.id,
            target: node.spouse.id,
            sourceHandle: 'spouse',
            targetHandle: 'spouse',
            type: 'bezier',
            style: { stroke: spouseEdgeColor, strokeWidth: 5 },
            animated: false,
            label: formatRelationshipLabel(spouseRelationshipType),
            labelStyle: { fill: spouseEdgeColor, fontWeight: 600, fontSize: 12 },
            labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 },
            labelBgPadding: [4, 4],
            labelBgBorderRadius: 4
          });
          console.log(`[FLOW BUILD] ${node.name} (${node.id}) created spouse edge: ${node.id} -> ${node.spouse.id}`);
        }
      }

      // Handle children (render below - downstream)
      // Always show children - all relationships are always visible
      console.log(`[FLOW BUILD] ${node.name} (${node.id}) checking children: hasChildren=${hasChildren}, childrenCount=${node.children ? node.children.length : 0}`);
      if (hasChildren) {
        const childrenCount = node.children.length;
        console.log(`[FLOW BUILD] ${node.name} (${node.id}) processing ${childrenCount} children:`, node.children.map(c => `${c.name} (${c.id})`).join(', '));
        
        // Check if this node has a spouse (in the tree structure, not just if not processed)
        const hasSpouseInTree = node.spouse !== null;
        let spouseX = null;
        
        console.log(`[FLOW BUILD] ${node.name} (${node.id}) hasSpouseInTree=${hasSpouseInTree}, spouse=${node.spouse ? `${node.spouse.name} (${node.spouse.id})` : 'none'}`);
        
        // If there's a spouse, find its position to center children between both parents
        if (hasSpouseInTree) {
          const spouseNode = flowNodes.find(n => n.id === node.spouse.id);
          if (spouseNode) {
            spouseX = spouseNode.position.x;
            console.log(`[FLOW BUILD] ${node.name} (${node.id}) found spouse ${node.spouse.name} (${node.spouse.id}) in flowNodes at x=${spouseX}, current x=${x}`);
          } else {
            // Spouse not yet created, calculate expected position (to the right)
            spouseX = x + xSpacing;
            console.log(`[FLOW BUILD] ${node.name} (${node.id}) spouse ${node.spouse.name} (${node.spouse.id}) not yet in flowNodes, expected at x=${spouseX}, current x=${x}`);
          }
        } else {
          console.log(`[FLOW BUILD] ${node.name} (${node.id}) has no spouse in tree structure`);
        }
        
        // Calculate children position: center between both parents if spouse exists, otherwise center on current node
        let childrenCenterX;
        if (hasSpouseInTree && spouseX !== null) {
          // Center between current node and spouse - this ensures children are positioned below both parents
          childrenCenterX = (x + spouseX) / 2;
          console.log(`[POSITION] ${node.name} (${node.id}) centering children between ${node.name} (x=${x}) and spouse (x=${spouseX}), center=${childrenCenterX}`);
        } else {
          // Center on current node
          childrenCenterX = x;
          console.log(`[POSITION] ${node.name} (${node.id}) centering children on current node (x=${x})`);
        }
        
        // Calculate children positions: center-aligned with specific pattern
        // - Even number of children: equally spaced on either side of center
        // - Odd number of children: middle child aligned with parent, others on either side
        let childPositions = [];
        if (childrenCount % 2 === 0) {
          // Even number: equally spaced on either side of center
          // For 2 children: positions at -xSpacing/2 and +xSpacing/2 from center
          // For 4 children: positions at -1.5*xSpacing, -0.5*xSpacing, +0.5*xSpacing, +1.5*xSpacing
          const halfCount = childrenCount / 2;
          for (let i = 0; i < childrenCount; i++) {
            const offset = (i - halfCount + 0.5) * xSpacing;
            childPositions.push(childrenCenterX + offset);
          }
        } else {
          // Odd number: middle child at center, others on either side
          // For 1 child: position at center
          // For 3 children: positions at -xSpacing, 0, +xSpacing from center
          // For 5 children: positions at -2*xSpacing, -xSpacing, 0, +xSpacing, +2*xSpacing
          const middleIndex = Math.floor(childrenCount / 2);
          for (let i = 0; i < childrenCount; i++) {
            const offset = (i - middleIndex) * xSpacing;
            childPositions.push(childrenCenterX + offset);
          }
        }
        
        console.log(`[POSITION] ${node.name} (${node.id}) calculated child positions (${childrenCount} children):`, childPositions.map((pos, idx) => `Child ${idx + 1}: x=${pos}`).join(', '));
        // Ensure children are always positioned below the parent(s) - use the maximum Y of both parents if spouse exists
        let parentY = y;
        if (hasSpouseInTree && spouseX !== null) {
          const spouseNode = flowNodes.find(n => n.id === node.spouse.id);
          if (spouseNode) {
            // Use the maximum Y of both parents to ensure children are below both
            parentY = Math.max(y, spouseNode.position.y);
            console.log(`[POSITION] ${node.name} (${node.id}) has spouse, using max Y: ${parentY} (current: ${y}, spouse: ${spouseNode.position.y})`);
          }
        }
        const childrenY = parentY + ySpacing; // Children below parent(s)
        
        console.log(`[POSITION] ${node.name} (${node.id}) final children positioning:`, {
          childrenCount,
          hasSpouseInTree,
          spouseX,
          childrenCenterX,
          childPositions,
          parentY,
          childrenY,
          x,
          y
        });
        node.children.forEach((child, index) => {
          const calculatedX = childPositions[index];
          console.log(`[FLOW BUILD] ${node.name} (${node.id}) processing child ${index + 1}/${childrenCount}: ${child.name} (${child.id}), relationshipType=${child.relationshipType}`);
          console.log(`[FLOW BUILD] ${node.name} (${node.id}) -> child ${child.name} (${child.id}) positioning context:`, {
            calculatedX,
            childrenY,
            parentY,
            y,
            hasSpouseInTree,
            spouseX,
            index
          });
          
          // Only position child if it hasn't been processed yet
          // This prevents duplicate positioning when both parents try to position the same child
          const childAlreadyProcessed = processedNodes.has(child.id);
          let childX, childY;
          
          console.log(`[FLOW BUILD] ${node.name} (${node.id}) -> child ${child.name} (${child.id}) already processed: ${childAlreadyProcessed}`);
          
          if (childAlreadyProcessed) {
            // Child already positioned, get its current position for edge creation
            const existingChildNode = flowNodes.find(n => n.id === child.id);
            if (existingChildNode) {
              childX = existingChildNode.position.x;
              childY = existingChildNode.position.y;
              console.log(`[FLOW BUILD] ${node.name} (${node.id}) -> child ${child.name} (${child.id}) already processed at (${childX}, ${childY}), skipping positioning`);
              console.log(`[FLOW BUILD] ${node.name} (${node.id}) -> WARNING: Child ${child.name} (${child.id}) already at y=${childY}, but calculated childrenY=${childrenY}. Parent y=${y}, parentY=${parentY}`);
            } else {
              // Child in processedNodes but not in flowNodes yet - this shouldn't happen, but handle it
              childX = calculatedX;
              childY = childrenY;
              console.log(`[FLOW BUILD] ${node.name} (${node.id}) -> child ${child.name} (${child.id}) in processedNodes but not in flowNodes, using calculated position (${childX}, ${childY})`);
            }
          } else {
            // Child not yet processed, use pre-calculated position
            childX = calculatedX;
            childY = childrenY;
            
            // Check if this child is also a child of another child (grandchild)
            // If so, position it below the grandparent's children, not at the same level
            // This handles cases where a child is both a child of the current node and a child of one of the current node's children
            // Check by examining the relationships directly
            const isGrandchild = node.children.some(otherChild => {
              if (otherChild.id === child.id) return false; // Skip self
              // Check if child is also a child of otherChild by checking relationships
              // Look for father_of, mother_of relationships from otherChild to child
              // or child_of, son_of, daughter_of relationships from child to otherChild
              const otherChildNote = peopleNotes.find(n => n.id === otherChild.id);
              const childNote = peopleNotes.find(n => n.id === child.id);
              if (!otherChildNote || !childNote) return false;
              
              const otherChildInfo = parsePersonInfo(otherChildNote.content);
              const childInfo = parsePersonInfo(childNote.content);
              
              // Check if otherChild has father_of or mother_of to child
              const otherChildIsParent = otherChildInfo.relationships.some(r => 
                (r.type === 'father_of' || r.type === 'mother_of') && r.personId === child.id
              );
              
              // Check if child has child_of, son_of, or daughter_of to otherChild
              const childIsChild = childInfo.relationships.some(r => 
                (r.type === 'child_of' || r.type === 'son_of' || r.type === 'daughter_of') && r.personId === otherChild.id
              );
              
              return otherChildIsParent || childIsChild;
            });
            
            if (isGrandchild) {
              // This child is also a grandchild, position it below the grandparent's children
              // Find the maximum Y of all children at this level
              const maxChildrenY = Math.max(...flowNodes
                .filter(n => {
                  // Find nodes that are children of the current node
                  return node.children.some(c => c.id === n.id);
                })
                .map(n => n.position.y), childrenY);
              childY = maxChildrenY + ySpacing;
              console.log(`[FLOW BUILD] ${node.name} (${node.id}) -> child ${child.name} (${child.id}) is also a grandchild, positioning below other children at y=${childY} (maxChildrenY=${maxChildrenY})`);
            }
            
            // Check and adjust for horizontal overlaps before positioning child
            if (!childAlreadyProcessed) {
              childX = checkAndAdjustHorizontalOverlap(childX, childY, child.id);
            }
            
            console.log(`[FLOW BUILD] ${node.name} (${node.id}) -> positioning child ${child.name} (${child.id}) at (${childX}, ${childY}), relationshipType=${child.relationshipType}, isGrandchild=${isGrandchild}`);
            console.log(`[FLOW BUILD] ${node.name} (${node.id}) -> child ${child.name} (${child.id}) will be at y=${childY}, which is ${childY - parentY}px below parent(s) (parentY=${parentY})`);
            // Recursively build child nodes first
            buildFlowNodes(child, childX, childY, new Set(visited), level + 1, node.id);
          }

          // Create edge for child - always create edge from parent to child
          // Check if child node exists in flowNodes
          const childNodeExists = flowNodes.some(n => n.id === child.id);
          console.log(`[FLOW BUILD] ${node.name} (${node.id}) -> child ${child.name} (${child.id}) exists in flowNodes: ${childNodeExists}`);
          
          if (childNodeExists) {
            // child.relationshipType can be:
            // - From parent's perspective: 'father_of', 'mother_of' (when parent has direct relationship)
            // - From child's perspective: 'daughter_of', 'son_of', 'child_of' (when found via reverse relationship)
            // For the label, we want to show from parent's perspective:
            // - 'father_of' -> "Father", 'mother_of' -> "Mother"
            // - 'daughter_of' -> "Daughter", 'son_of' -> "Son", 'child_of' -> "Child"
            const relationshipType = child.relationshipType || 'child_of';
            const edgeLabel = formatRelationshipLabel(relationshipType);
            const childEdgeColor = generateEdgeColor(edgeIndex++);
            console.log(`[FLOW BUILD] ${node.name} (${node.id}) -> creating child edge to ${child.name} (${child.id}), label="${edgeLabel}", type=${relationshipType}`);
            flowEdges.push({
              id: `edge-child-${node.id}-${child.id}`,
              source: node.id,
              target: child.id,
              sourceHandle: 'bottom',
              targetHandle: 'top',
              type: 'bezier',
              style: { stroke: childEdgeColor, strokeWidth: 5 },
              animated: false,
              label: edgeLabel, // This will show "Father", "Mother", "Daughter", "Son", or "Child"
              labelStyle: { fill: childEdgeColor, fontWeight: 600, fontSize: 12 },
              labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 },
              labelBgPadding: [4, 4],
              labelBgBorderRadius: 4
            });
            console.log(`[FLOW BUILD] ${node.name} (${node.id}) -> created child edge: ${node.id} -> ${child.id}`);
          } else {
            console.log(`[FLOW BUILD] ${node.name} (${node.id}) -> child ${child.name} (${child.id}) not in flowNodes yet, skipping edge creation`);
          }
        });
      }

      // Handle siblings (render at same level, side by side)
      // Always show siblings - all relationships are always visible
      if (node.siblings && node.siblings.length > 0) {
        node.siblings.forEach((sibling, index) => {
          let siblingX = x + (index + 1) * xSpacing;
          const siblingY = y; // Same vertical level
          
          // Check and adjust for horizontal overlaps before positioning sibling
          if (!processedNodes.has(sibling.id)) {
            siblingX = checkAndAdjustHorizontalOverlap(siblingX, siblingY, sibling.id);
          }
          
          buildFlowNodes(sibling, siblingX, siblingY, new Set(visited), level, parentId);
          
          // Create edge for sibling relationship
          const siblingNodeExists = flowNodes.some(n => n.id === sibling.id);
          // Check if edge already exists (to prevent duplicates since sibling relationships are bidirectional)
          const edgeAlreadyExists = flowEdges.some(e => 
            (e.source === node.id && e.target === sibling.id) || 
            (e.source === sibling.id && e.target === node.id)
          );
          
          if (siblingNodeExists && !edgeAlreadyExists) {
            const siblingRelationshipType = sibling.relationshipType || 'brother_of';
            const edgeLabel = formatRelationshipLabel(siblingRelationshipType);
            const siblingEdgeColor = generateEdgeColor(edgeIndex++);
            console.log(`[FLOW BUILD] ${node.name} (${node.id}) -> creating sibling edge to ${sibling.name} (${sibling.id}), label="${edgeLabel}", type=${siblingRelationshipType}`);
            flowEdges.push({
              id: `edge-sibling-${node.id}-${sibling.id}`,
              source: node.id,
              target: sibling.id,
              sourceHandle: 'spouse', // Use spouse handles for sibling connections (horizontal)
              targetHandle: 'spouse',
              type: 'bezier',
              style: { stroke: siblingEdgeColor, strokeWidth: 5 },
              animated: false,
              label: edgeLabel, // This will show "Brother" or "Sister"
              labelStyle: { fill: siblingEdgeColor, fontWeight: 600, fontSize: 12 },
              labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 },
              labelBgPadding: [4, 4],
              labelBgBorderRadius: 4
            });
            console.log(`[FLOW BUILD] ${node.name} (${node.id}) -> created sibling edge: ${node.id} -> ${sibling.id}`);
          } else if (edgeAlreadyExists) {
            console.log(`[FLOW BUILD] ${node.name} (${node.id}) -> sibling edge to ${sibling.name} (${sibling.id}) already exists, skipping`);
          }
        });
      }
    };

    // Build all nodes and edges starting from root person
    console.log(`[TREE START] ========================================`);
    console.log(`[TREE START] Building tree from root: ${buildFamilyTree.name} (${buildFamilyTree.id}), rootPersonId=${selectedTree.rootPersonId}`);
    console.log(`[TREE START] Root person has ${buildFamilyTree.children?.length || 0} children, ${buildFamilyTree.parents?.length || 0} parents`);
    if (buildFamilyTree.children && buildFamilyTree.children.length > 0) {
      console.log(`[TREE START] Root children:`, buildFamilyTree.children.map(c => `${c.name} (${c.id}) as ${c.relationshipType}`));
    }
    if (buildFamilyTree.parents && buildFamilyTree.parents.length > 0) {
      console.log(`[TREE START] Root parents:`, buildFamilyTree.parents.map(p => `${p.name} (${p.id}) as ${p.relationshipType}`));
    }
    if (buildFamilyTree.spouse) {
      console.log(`[TREE START] Root spouse: ${buildFamilyTree.spouse.name} (${buildFamilyTree.spouse.id})`);
    } else {
      console.log(`[TREE START] Root has no spouse`);
    }
    console.log(`[TREE START] ========================================`);
    buildFlowNodes(buildFamilyTree, 0, rootStartY);

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

    console.log(`[FLOW BUILD SUMMARY] ========================================`);
    console.log(`[FLOW BUILD SUMMARY] Flow Nodes (${flowNodes.length}):`, flowNodes.map(n => ({ 
      id: n.id, 
      name: n.data.person.name, 
      position: n.position,
      hasSpouse: n.data.hasSpouse,
      hasChildren: n.data.hasChildren,
      hasParents: n.data.hasParents,
      isRoot: n.data.isRoot
    })));
    console.log(`[FLOW BUILD SUMMARY] Flow Edges (all) (${flowEdges.length}):`, flowEdges.map(e => ({ 
      id: e.id, 
      source: e.source, 
      target: e.target,
      label: e.label,
      type: e.type
    })));
    console.log(`[FLOW BUILD SUMMARY] Valid Edges (${validEdges.length}):`, validEdges.map(e => ({ 
      id: e.id, 
      source: e.source, 
      target: e.target,
      label: e.label
    })));
    console.log(`[FLOW BUILD SUMMARY] Expanded Nodes:`, Array.from(expandedNodes));
    console.log(`[FLOW BUILD SUMMARY] ========================================`);

    setNodes(flowNodes);
    setEdges(validEdges);
  }, [buildFamilyTree, expandedNodes, selectedTree]);

  // Update nodes and edges with selection/hover state
  useEffect(() => {
    // Hover takes precedence over selection
    const activePersonId = hoveredPersonId || selectedPersonId;
    
    if (!activePersonId) {
      // No selection or hover - reset all nodes and edges to normal state
      setNodes(prevNodes => prevNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          isSelected: false,
          isHighlighted: false,
          isDimmed: false
        }
      })));
      setEdges(prevEdges => prevEdges.map(edge => ({
        ...edge,
        style: {
          ...edge.style,
          opacity: 1,
          strokeWidth: 5
        }
      })));
      return;
    }

    // Find immediate relationships (nodes connected via edges)
    setEdges(currentEdges => {
      const immediateRelationships = new Set([activePersonId]);
      const highlightedEdges = new Set();
      
      // Find all immediate relationships
      currentEdges.forEach(edge => {
        if (edge.source === activePersonId || edge.target === activePersonId) {
          immediateRelationships.add(edge.source);
          immediateRelationships.add(edge.target);
          highlightedEdges.add(edge.id);
        }
      });

      // Update nodes with selection/hover state
      setNodes(prevNodes => prevNodes.map(node => {
        const isSelected = node.id === activePersonId;
        const isHighlighted = immediateRelationships.has(node.id) && !isSelected;
        const isDimmed = !immediateRelationships.has(node.id);
        
              return {
                ...node,
          data: {
            ...node.data,
            isSelected,
            isHighlighted,
            isDimmed
          }
        };
      }));

      // Update edges with highlighting/dimming
      return currentEdges.map(edge => {
        const isHighlighted = highlightedEdges.has(edge.id);
        const isDimmed = !isHighlighted;
        
            return {
          ...edge,
          style: {
            ...edge.style,
            opacity: isDimmed ? 0.2 : 1,
            strokeWidth: isHighlighted ? 6 : (isDimmed ? 2 : 5)
          }
        };
      });
    });
  }, [selectedPersonId, hoveredPersonId]);

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
                type: 'bezier',
                style: { stroke: '#4b5563', strokeWidth: 5 },
                animated: false
              }}
              connectionLineType="bezier"
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

