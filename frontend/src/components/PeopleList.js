import React, { useState, useMemo } from 'react';
import { UserIcon, ViewColumnsIcon, Squares2X2Icon, FunnelIcon, XMarkIcon, UsersIcon } from '@heroicons/react/24/solid';
import { CodeBracketIcon } from '@heroicons/react/24/outline';
import { parseNoteContent } from '../utils/TextUtils';
import WorkstreamPeopleView from './WorkstreamPeopleView';
import TeamPeopleView from './TeamPeopleView';

const PeopleList = ({ notes, searchQuery, allNotes: allNotesProp }) => {
  const [viewMode, setViewMode] = useState('grid');
  const [selectedWorkstreams, setSelectedWorkstreams] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [rawNoteModal, setRawNoteModal] = useState({ open: false, content: '' });

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

  if (filteredNotes.length === 0) return null;

  const getPersonInfo = (content) => {
    const lines = content.split('\n');
    const name = lines[0];
    const role = lines.find(line => line.startsWith('meta::person_role::'))?.split('::')[2] || '';
    const email = lines.find(line => line.startsWith('meta::person_email::'))?.split('::')[2] || '';
    const phone = lines.find(line => line.startsWith('meta::person_phone::'))?.split('::')[2] || '';
    
    return { name, role, email, phone };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Squares2X2Icon className="h-5 w-5" />
            <span>Grid</span>
          </button>
          <button
            onClick={() => setViewMode('workstream')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              viewMode === 'workstream'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ViewColumnsIcon className="h-5 w-5" />
            <span>By Workstream</span>
          </button>
          <button
            onClick={() => setViewMode('team')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              viewMode === 'team'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <UsersIcon className="h-5 w-5" />
            <span>By Team</span>
          </button>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            showFilters ? 'bg-gray-200' : 'hover:bg-gray-100'
          }`}
        >
          <FunnelIcon className="h-5 w-5" />
          <span>Filters</span>
          {(selectedWorkstreams.length > 0 || selectedRoles.length > 0) && (
            <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
              {selectedWorkstreams.length + selectedRoles.length}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700">Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div>
            <input
              type="text"
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              placeholder="Search people..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
                      ? 'bg-blue-100 text-blue-700'
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
                      ? 'bg-blue-100 text-blue-700'
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
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {viewMode === 'workstream' ? (
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
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <UserIcon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
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
                        className="text-sm text-blue-600 hover:text-blue-800 truncate block"
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
                    <CodeBracketIcon className="h-5 w-5 text-gray-400 hover:text-blue-600" />
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
              <CodeBracketIcon className="h-5 w-5 text-blue-600" /> Raw Note
            </h2>
            <pre className="bg-gray-100 rounded p-4 text-xs overflow-x-auto whitespace-pre-wrap max-h-96">
              {rawNoteModal.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeopleList; 