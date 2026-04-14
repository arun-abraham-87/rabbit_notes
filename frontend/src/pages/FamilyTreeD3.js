import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PlusIcon, XMarkIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/solid';
import * as d3 from 'd3';
import AddPeopleModal from '../components/AddPeopleModal';
import { createNote, updateNoteById, deleteNoteById } from '../utils/ApiUtils';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

const FamilyTreeD3 = ({ allNotes, setAllNotes }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [addPeopleModal, setAddPeopleModal] = useState({ open: false, personNote: null });
  const [editPersonModal, setEditPersonModal] = useState({ open: false, personNote: null });
  const [deletePersonModal, setDeletePersonModal] = useState({ open: false, personNote: null });
  const [hoveredPersonId, setHoveredPersonId] = useState(null);
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const svgRef = useRef(null);

  // Get all people notes
  const peopleNotes = useMemo(() => {
    return allNotes.filter(note => note.content && note.content.includes('meta::person::'));
  }, [allNotes]);

  // Build forest (multiple trees) for all people
  const buildD3Hierarchy = (personId, visited = new Set()) => {
    if (visited.has(personId)) return null;
    visited.add(personId);

    const note = peopleNotes.find(n => n.id === personId);
    if (!note) return null;

    const info = parsePersonInfo(note);
    const node = {
      id: personId,
      name: info.name,
      note: note,
      children: []
    };

    // Find children
    info.relationships.forEach(rel => {
      if (rel.type === 'father_of' || rel.type === 'mother_of') {
        const child = buildD3Hierarchy(rel.personId, visited);
        if (child) node.children.push(child);
      }
    });

    // Also find children via reverse relationships
    peopleNotes.forEach(otherNote => {
      if (otherNote.id === personId) return;
      const otherInfo = parsePersonInfo(otherNote);
      const hasChildRel = otherInfo.relationships.some(
        r => (r.type === 'child_of' || r.type === 'son_of' || r.type === 'daughter_of') && r.personId === personId
      );
      if (hasChildRel && !visited.has(otherNote.id)) {
        const child = buildD3Hierarchy(otherNote.id, new Set(visited));
        if (child) node.children.push(child);
      }
    });

    return node;
  };

  // Build all family trees
  const allTrees = useMemo(() => {
    const trees = [];
    const processed = new Set();

    peopleNotes.forEach(note => {
      if (processed.has(note.id)) return;
      const rootId = findTreeRoot(note.id, peopleNotes);
      if (processed.has(rootId)) return;

      const root = buildD3Hierarchy(rootId);
      if (root) {
        trees.push(root);
        markTreeAsProcessed(rootId, peopleNotes, processed);
      }
    });

    return trees;
  }, [peopleNotes]);

  // Filter tree for search
  const visibleNodeIds = useMemo(() => {
    if (!searchQuery) return null;

    const visible = new Set();

    const findAndCollect = (node) => {
      if (node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        visible.add(node.id);
        // Add all ancestors
        addAncestors(node.id, visible);
        // Add all descendants
        addDescendants(node, visible);
      }
      if (node.children) {
        node.children.forEach(findAndCollect);
      }
    };

    const addAncestors = (personId, set) => {
      const note = peopleNotes.find(n => n.id === personId);
      if (!note) return;
      const info = parsePersonInfo(note);
      info.relationships.forEach(rel => {
        if (rel.type === 'child_of' || rel.type === 'son_of' || rel.type === 'daughter_of') {
          set.add(rel.personId);
          addAncestors(rel.personId, set);
        }
      });
    };

    const addDescendants = (node, set) => {
      set.add(node.id);
      if (node.children) {
        node.children.forEach(child => addDescendants(child, set));
      }
    };

    allTrees.forEach(tree => findAndCollect(tree));
    return visible.size > 0 ? visible : null;
  }, [searchQuery, allTrees, peopleNotes]);

  // Render trees with D3
  useEffect(() => {
    if (!allTrees || allTrees.length === 0 || !svgRef.current) return;

    const trees = visibleNodeIds
      ? allTrees.map(t => filterTree(t, visibleNodeIds)).filter(t => t !== null)
      : allTrees;

    if (!trees || trees.length === 0) return;

    const width = 1200;
    const treeHeight = 600;
    const totalHeight = trees.length * (treeHeight + 100);

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', totalHeight)
      .style('border', '1px solid #e5e7eb')
      .style('background', '#fafafa');

    // Render each tree
    trees.forEach((tree, treeIndex) => {
      // Create D3 tree layout for this tree
      const d3Tree = d3.tree().size([width, treeHeight - 100]);
      const root = d3.hierarchy(tree);
      d3Tree(root);

      const g = svg.append('g')
        .attr('transform', `translate(0, ${treeIndex * (treeHeight + 100) + 50})`);

      // Draw links
      g.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', d3.linkVertical()
          .x(d => d.x)
          .y(d => d.y))
        .style('stroke', '#d1d5db')
        .style('stroke-width', 2)
        .style('fill', 'none');

      // Draw nodes
      const nodes = g.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x},${d.y})`);

      nodes.append('rect')
        .attr('width', 180)
        .attr('height', 80)
        .attr('x', -90)
        .attr('y', -40)
        .style('fill', d => hoveredPersonId === d.data.id ? '#e0e7ff' : '#ffffff')
        .style('stroke', d => selectedPersonId === d.data.id ? '#4f46e5' : '#d1d5db')
        .style('stroke-width', d => selectedPersonId === d.data.id ? 2 : 1)
        .style('rx', 8)
        .style('cursor', 'pointer')
        .on('click', function(event, d) { setSelectedPersonId(d.data.id); })
        .on('mouseenter', function(event, d) { setHoveredPersonId(d.data.id); })
        .on('mouseleave', function(event, d) { setHoveredPersonId(null); });

      nodes.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-15')
        .style('font-weight', 600)
        .style('font-size', '14px')
        .text(d => d.data.name);

      // Edit button group
      const editGroup = nodes.append('g')
        .attr('transform', 'translate(75, -20)');

      editGroup.append('circle')
        .attr('r', 15)
        .style('fill', '#f3f4f6')
        .style('stroke', '#d1d5db')
        .style('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('click', function(event, d) {
          setEditPersonModal({ open: true, personNote: d.data.note });
        });

      editGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.3em')
        .style('font-size', '12px')
        .style('cursor', 'pointer')
        .text('✎')
        .on('click', function(event, d) {
          setEditPersonModal({ open: true, personNote: d.data.note });
        });

      // Delete button group
      const deleteGroup = nodes.append('g')
        .attr('transform', 'translate(-75, -20)');

      deleteGroup.append('circle')
        .attr('r', 15)
        .style('fill', '#fee2e2')
        .style('stroke', '#fca5a5')
        .style('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('click', function(event, d) {
          setDeletePersonModal({ open: true, personNote: d.data.note });
        });

      deleteGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.3em')
        .style('font-size', '12px')
        .style('cursor', 'pointer')
        .text('🗑')
        .on('click', function(event, d) {
          setDeletePersonModal({ open: true, personNote: d.data.note });
        });
    });
  }, [allTrees, hoveredPersonId, selectedPersonId, visibleNodeIds]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Family Tree</h1>
          <button
            onClick={() => setAddPeopleModal({ open: true, personNote: null })}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            <PlusIcon className="h-5 w-5" />
            Add Person
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search person..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Tree Canvas */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100">
        <svg ref={svgRef} style={{ minWidth: '100%', minHeight: '100%' }} />
      </div>

      {/* Modals */}
      <AddPeopleModal
        isOpen={addPeopleModal.open}
        onClose={() => setAddPeopleModal({ open: false, personNote: null })}
        currentPersonNote={addPeopleModal.personNote}
        allNotes={allNotes}
        onAdd={async (currentPerson, relationshipType, personId, personName) => {
          // Handle add logic
        }}
      />
    </div>
  );
};

// Helper functions
function parsePersonInfo(note) {
  const lines = note.content.split('\n');
  const name = lines[0];
  const relationships = [];
  const photos = [];

  lines.forEach(line => {
    if (line.startsWith('meta::relation::')) {
      const parts = line.replace('meta::relation::', '').split('::');
      if (parts.length === 2) {
        relationships.push({ type: parts[0], personId: parts[1] });
      }
    }
    if (line.startsWith('meta::photo::')) {
      photos.push(line.replace('meta::photo::', ''));
    }
  });

  return { name, relationships, photos };
}

function findTreeRoot(personId, peopleNotes) {
  const note = peopleNotes.find(n => n.id === personId);
  if (!note) return personId;

  const info = parsePersonInfo(note);
  const hasParent = info.relationships.some(
    r => r.type === 'child_of' || r.type === 'son_of' || r.type === 'daughter_of'
  );

  if (!hasParent) return personId;

  const parentId = info.relationships.find(
    r => r.type === 'child_of' || r.type === 'son_of' || r.type === 'daughter_of'
  )?.personId;

  if (parentId) return findTreeRoot(parentId, peopleNotes);
  return personId;
}

function markTreeAsProcessed(personId, peopleNotes, processed) {
  if (processed.has(personId)) return;
  processed.add(personId);

  const note = peopleNotes.find(n => n.id === personId);
  if (!note) return;

  const info = parsePersonInfo(note);
  info.relationships.forEach(rel => {
    markTreeAsProcessed(rel.personId, peopleNotes, processed);
  });
}

function filterTree(node, visibleIds) {
  if (!visibleIds.has(node.id)) return null;

  return {
    ...node,
    children: node.children
      .map(child => filterTree(child, visibleIds))
      .filter(child => child !== null)
  };
}

export default FamilyTreeD3;
