import React, { useState, useMemo } from 'react';
import { UserIcon, ViewColumnsIcon, Squares2X2Icon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { parseNoteContent } from '../utils/TextUtils';
import WorkstreamPeopleView from './WorkstreamPeopleView';

const PeopleList = ({ notes, searchQuery }) => {
  const [viewMode, setViewMode] = useState('grid');
  const [selectedWorkstreams, setSelectedWorkstreams] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <UserIcon className="h-5 w-5 text-gray-500" />
          People
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg ${
              showFilters || (selectedWorkstreams.length > 0 || selectedRoles.length > 0)
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
            title="Filters"
          >
            <FunnelIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${
              viewMode === 'grid' 
                ? 'bg-gray-100 text-gray-900' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
            title="Grid View"
          >
            <Squares2X2Icon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('workstream')}
            className={`p-2 rounded-lg ${
              viewMode === 'workstream' 
                ? 'bg-gray-100 text-gray-900' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
            title="Workstream View"
          >
            <ViewColumnsIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-900">Filters</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                placeholder="Search by name, email, or role..."
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workstreams
              </label>
              <div className="flex flex-wrap gap-2">
                {workstreams.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setSelectedWorkstreams(prev =>
                        prev.includes(ws.id)
                          ? prev.filter(id => id !== ws.id)
                          : [...prev, ws.id]
                      );
                    }}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedWorkstreams.includes(ws.id)
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {ws.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Roles
              </label>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      setSelectedRoles(prev =>
                        prev.includes(role)
                          ? prev.filter(r => r !== role)
                          : [...prev, role]
                      );
                    }}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedRoles.includes(role)
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'workstream' ? (
        <WorkstreamPeopleView notes={filteredNotes} searchQuery={searchQuery} />
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
                      {parseNoteContent({ content: name, searchQuery: localSearchQuery || searchQuery }).map((element, idx) => (
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PeopleList; 