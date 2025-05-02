import React, { useState, useMemo } from 'react';
import { UserIcon, ViewColumnsIcon, Squares2X2Icon, FunnelIcon, XMarkIcon, UsersIcon, MagnifyingGlassIcon, PencilIcon } from '@heroicons/react/24/solid';
import { CodeBracketIcon } from '@heroicons/react/24/outline';
import { parseNoteContent } from '../utils/TextUtils';
import WorkstreamPeopleView from './WorkstreamPeopleView';
import TeamPeopleView from './TeamPeopleView';
import AddPeopleModal from './AddPeopleModal';
import { updateNoteById } from '../utils/ApiUtils';

const PeopleList = ({ notes, searchQuery, allNotes: allNotesProp, refreshNotes }) => {
  const [viewMode, setViewMode] = useState('grid');
  const [selectedWorkstreams, setSelectedWorkstreams] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [rawNoteModal, setRawNoteModal] = useState({ open: false, content: '' });
  const [editPersonModal, setEditPersonModal] = useState({ open: false, personNote: null });

  // Use allNotes if provided, otherwise fallback to notes
  const allNotes = allNotesProp || notes;

  // Get all workstreams from notes
  const workstreams = useMemo(() => {
    return notes
      .filter(note => note.content.includes('meta::workstream'))
      .map(note => ({
        id: note.id,
        name: note.content.split('\n')[0]
      }));
  }, [notes]);

  // Get all unique roles from person notes
  const roles = useMemo(() => {
    const roleSet = new Set();
    notes
      .filter(note => note.content.includes('meta::person::'))
      .forEach(note => {
        const roleMatch = note.content.match(/meta::person_role::([^\n]+)/);
        if (roleMatch) {
          roleSet.add(roleMatch[1]);
        }
      });
    return Array.from(roleSet);
  }, [notes]);

  // Filter person notes based on selected filters
  const filteredNotes = useMemo(() => {
    let filtered = notes.filter(note => note.content.includes('meta::person::'));

    // Apply workstream filter
    if (selectedWorkstreams.length > 0) {
      filtered = filtered.filter(note => {
        const linkedWorkstreams = note.content
          .split('\n')
          .filter(line => line.startsWith('meta::link::'))
          .map(line => line.split('::')[2]);
        return selectedWorkstreams.some(wsId => linkedWorkstreams.includes(wsId));
      });
    }

    // Apply role filter
    if (selectedRoles.length > 0) {
      filtered = filtered.filter(note => {
        const roleMatch = note.content.match(/meta::person_role::([^\n]+)/);
        return roleMatch && selectedRoles.includes(roleMatch[1]);
      });
    }

    // Apply local search filter
    if (localSearchQuery) {
      filtered = filtered.filter(note => 
        note.content.toLowerCase().includes(localSearchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [notes, selectedWorkstreams, selectedRoles, localSearchQuery]);

  const clearFilters = () => {
    setSelectedWorkstreams([]);
    setSelectedRoles([]);
    setLocalSearchQuery('');
  };

  if (!notes || notes.length === 0) {
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
  const totalPeople = notes.filter(note => note.content.includes('meta::person::')).length;
  const totalTeams = notes.filter(note => note.content.includes('meta::team')).length;
  const totalWorkstreams = notes.filter(note => note.content.includes('meta::workstream')).length;
  const totalRoles = roles.length;

  const getPersonInfo = (content) => {
    const lines = content.split('\n');
    const name = lines[0];
    const role = lines.find(line => line.startsWith('meta::person_role::'))?.split('::')[2] || '';
    const email = lines.find(line => line.startsWith('meta::person_email::'))?.split('::')[2] || '';
    const phone = lines.find(line => line.startsWith('meta::person_phone::'))?.split('::')[2] || '';
    return { name, role, email, phone };
  };

  // Handler for editing a person
  const handleEditPerson = async (id, content) => {
    await updateNoteById(id, content);
    setEditPersonModal({ open: false, personNote: null });
    if (typeof refreshNotes === 'function') {
      refreshNotes();
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">People</h1>
        <div className="flex items-center gap-2">
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
            onClick={() => setViewMode('workstream')}
            className={`p-2 rounded-lg transition-all duration-200 ${
              viewMode === 'workstream'
                ? 'bg-indigo-100 text-indigo-700'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="By Workstream"
          >
            <ViewColumnsIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('team')}
            className={`p-2 rounded-lg transition-all duration-200 ${
              viewMode === 'team'
                ? 'bg-indigo-100 text-indigo-700'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="By Team"
          >
            <UsersIcon className="h-5 w-5" />
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
      <div className="grid grid-cols-4 gap-4 bg-white rounded-xl border p-4 shadow-sm">
        <div className="flex flex-col items-center p-3 rounded-lg border transition-all duration-200">
          <div className="text-xs font-medium text-gray-500">Total</div>
          <div className="text-2xl font-bold text-gray-900">{totalPeople}</div>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border transition-all duration-200">
          <div className="text-xs font-medium text-indigo-600">Workstreams</div>
          <div className="text-2xl font-bold text-indigo-700">{totalWorkstreams}</div>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border transition-all duration-200">
          <div className="text-xs font-medium text-indigo-600">Teams</div>
          <div className="text-2xl font-bold text-indigo-700">{totalTeams}</div>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border transition-all duration-200">
          <div className="text-xs font-medium text-indigo-600">Roles</div>
          <div className="text-2xl font-bold text-indigo-700">{totalRoles}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Workstreams</h4>
          <div className="flex flex-wrap gap-2">
            {workstreams.map(ws => (
              <button
                key={ws.id}
                onClick={() => {
                  setSelectedWorkstreams(prev =>
                    prev.includes(ws.id)
                      ? prev.filter(id => id !== ws.id)
                      : [...prev, ws.id]
                  );
                }}
                className={`px-2 py-1 text-sm rounded-md ${
                  selectedWorkstreams.includes(ws.id)
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {ws.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Roles</h4>
          <div className="flex flex-wrap gap-2">
            {roles.map(role => (
              <button
                key={role}
                onClick={() => {
                  setSelectedRoles(prev =>
                    prev.includes(role)
                      ? prev.filter(r => r !== role)
                      : [...prev, role]
                  );
                }}
                className={`px-2 py-1 text-sm rounded-md ${
                  selectedRoles.includes(role)
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
        {(selectedWorkstreams.length > 0 || selectedRoles.length > 0) && (
          <button
            onClick={clearFilters}
            className="text-sm text-indigo-600 hover:text-indigo-800 ml-2"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* People List */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No people found</p>
        </div>
      ) : viewMode === 'workstream' ? (
        <WorkstreamPeopleView notes={filteredNotes} searchQuery={searchQuery} allNotes={allNotes} />
      ) : viewMode === 'team' ? (
        <TeamPeopleView notes={filteredNotes} searchQuery={searchQuery} allNotes={allNotes} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map(note => {
            const { name, role, email, phone } = getPersonInfo(note.content);
            return (
              <div
                key={note.id}
                className="bg-white rounded-lg border p-6 shadow-sm flex flex-col gap-2 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <UserIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-gray-900 truncate">
                      {parseNoteContent({ content: name, searchQuery }).map((element, idx) => (
                        <React.Fragment key={idx}>{element}</React.Fragment>
                      ))}
                    </h3>
                    {role && (
                      <p className="text-sm text-gray-500 truncate">{role}</p>
                    )}
                    {email && (
                      <a
                        href={`mailto:${email}`}
                        className="text-sm text-indigo-600 hover:text-indigo-800 truncate block"
                      >
                        {email}
                      </a>
                    )}
                    {phone && (
                      <a
                        href={`tel:${phone}`}
                        className="text-sm text-gray-600 hover:text-gray-800 truncate block"
                      >
                        {phone}
                      </a>
                    )}
                  </div>
                  <button
                    className="ml-2 p-1 rounded hover:bg-gray-100"
                    title="Show raw note"
                    onClick={() => setRawNoteModal({ open: true, content: note.content })}
                  >
                    <CodeBracketIcon className="h-5 w-5 text-gray-400 hover:text-indigo-600" />
                  </button>
                  <button
                    className="ml-1 p-1 rounded hover:bg-gray-100"
                    title="Edit person"
                    onClick={() => setEditPersonModal({ open: true, personNote: note })}
                  >
                    <PencilIcon className="h-5 w-5 text-gray-400 hover:text-indigo-600" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Raw Note Modal */}
      {rawNoteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setRawNoteModal({ open: false, content: '' })}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CodeBracketIcon className="h-5 w-5 text-indigo-600" /> Raw Note
            </h2>
            <pre className="bg-gray-100 rounded p-4 text-xs overflow-x-auto whitespace-pre-wrap max-h-96">
              {rawNoteModal.content}
            </pre>
          </div>
        </div>
      )}

      {/* Edit Person Modal */}
      {editPersonModal.open && (
        <AddPeopleModal
          isOpen={editPersonModal.open}
          onClose={() => setEditPersonModal({ open: false, personNote: null })}
          onEdit={handleEditPerson}
          allNotes={allNotes}
          personNote={editPersonModal.personNote}
        />
      )}
    </div>
  );
};

export default PeopleList; 