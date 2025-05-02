import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, MinusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { updateNoteById } from '../utils/ApiUtils';

const AddPeopleModal = ({ isOpen, onClose, onAdd, onEdit, allNotes = [], personNote = null }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [workstreamSearchTerm, setWorkstreamSearchTerm] = useState('');
  const [selectedWorkstreams, setSelectedWorkstreams] = useState([]);
  const [teamSearchTerm, setTeamSearchTerm] = useState('');
  const [selectedTeams, setSelectedTeams] = useState([]);

  // Prefill fields if editing
  useEffect(() => {
    if (personNote) {
      const lines = personNote.content.split('\n');
      setName(lines[0] || '');
      setRole(lines.find(line => line.startsWith('meta::person_role::'))?.split('::')[2] || '');
      setEmail(lines.find(line => line.startsWith('meta::person_email::'))?.split('::')[2] || '');
      setPhone(lines.find(line => line.startsWith('meta::person_phone::'))?.split('::')[2] || '');
      // Linked workstreams and teams
      const linkedIds = lines.filter(line => line.startsWith('meta::link::')).map(line => line.split('::')[2]);
      setSelectedWorkstreams(
        allNotes.filter(n => n.content.includes('meta::workstream') && linkedIds.includes(n.id)).map(n => n.id)
      );
      setSelectedTeams(
        allNotes.filter(n => n.content.includes('meta::team') && linkedIds.includes(n.id)).map(n => n.id)
      );
    } else {
      setName(''); setRole(''); setEmail(''); setPhone('');
      setSelectedWorkstreams([]); setSelectedTeams([]);
      setWorkstreamSearchTerm(''); setTeamSearchTerm('');
    }
  }, [personNote, isOpen, allNotes]);

  // Filter workstream notes based on search term
  const filteredWorkstreams = allNotes.filter(note => {
    if (!note.content.includes('meta::workstream')) return false;
    if (!workstreamSearchTerm.trim()) return true;
    
    const searchLower = workstreamSearchTerm.toLowerCase();
    const contentLower = note.content.toLowerCase();
    
    // Search in first line (title) with higher priority
    const firstLine = contentLower.split('\n')[0];
    if (firstLine.includes(searchLower)) return true;
    
    // Search in non-meta lines
    const nonMetaLines = contentLower
      .split('\n')
      .filter(line => !line.startsWith('meta::'));
    return nonMetaLines.some(line => line.includes(searchLower));
  });

  // Filter team notes based on search term
  const filteredTeams = allNotes.filter(note => {
    if (!note.content.includes('meta::team')) return false;
    if (!teamSearchTerm.trim()) return true;
    
    const searchLower = teamSearchTerm.toLowerCase();
    const contentLower = note.content.toLowerCase();
    
    // Search in first line (title) with higher priority
    const firstLine = contentLower.split('\n')[0];
    if (firstLine.includes(searchLower)) return true;
    
    // Search in non-meta lines
    const nonMetaLines = contentLower
      .split('\n')
      .filter(line => !line.startsWith('meta::'));
    return nonMetaLines.some(line => line.includes(searchLower));
  });

  const handleSubmit = async () => {
    if (!name.trim()) return;
    
    let content = `${name.trim()}\nmeta::person::${personNote ? personNote.content.split('\n').find(line => line.startsWith('meta::person::'))?.split('::')[2] : new Date().toISOString()}`;
    
    // Add role if provided
    if (role.trim()) {
      content += `\nmeta::person_role::${role.trim()}`;
    }

    // Add email if provided
    if (email.trim()) {
      content += `\nmeta::person_email::${email.trim()}`;
    }

    // Add phone if provided
    if (phone.trim()) {
      content += `\nmeta::person_phone::${phone.trim()}`;
    }

    // Add links to workstreams
    selectedWorkstreams.forEach(workstreamId => {
      content += `\nmeta::link::${workstreamId}`;
    });

    // Add links to teams
    selectedTeams.forEach(teamId => {
      content += `\nmeta::link::${teamId}`;
    });

    try {
      if (personNote) {
        // Edit mode
        await onEdit(personNote.id, content);
      } else {
        // Add mode
        const newPersonNote = await onAdd(content);
        
        // Then, update each selected team note to include a link back to the person
        await Promise.all(selectedTeams.map(async teamId => {
          const teamNote = allNotes.find(note => note.id === teamId);
          if (teamNote) {
            const updatedContent = `${teamNote.content}\nmeta::link::${newPersonNote.id}`;
            await updateNoteById(teamId, updatedContent);
          }
        }));
      }
      // Reset form
      setName('');
      setRole('');
      setEmail('');
      setPhone('');
      setSelectedWorkstreams([]);
      setSelectedTeams([]);
      setWorkstreamSearchTerm('');
      setTeamSearchTerm('');
      onClose();
    } catch (error) {
      console.error('Error saving person:', error);
    }
  };

  const toggleWorkstream = (workstreamId) => {
    setSelectedWorkstreams(prev =>
      prev.includes(workstreamId)
        ? prev.filter(id => id !== workstreamId)
        : [...prev, workstreamId]
    );
  };

  const toggleTeam = (teamId) => {
    setSelectedTeams(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{personNote ? 'Edit Person' : 'Add Person'}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter person's name"
            />
          </div>

          {/* Role Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter role (optional)"
            />
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter email (optional)"
            />
          </div>

          {/* Phone Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter phone (optional)"
            />
          </div>

          {/* Teams */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teams
            </label>
            <div className="relative">
              <input
                type="text"
                value={teamSearchTerm}
                onChange={(e) => setTeamSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search teams..."
              />
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
              {filteredTeams.map(team => {
                const isSelected = selectedTeams.includes(team.id);
                const firstLine = team.content.split('\n')[0];
                return (
                  <div
                    key={team.id}
                    onClick={() => toggleTeam(team.id)}
                    className={`p-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span className="text-sm">{firstLine}</span>
                    {isSelected && (
                      <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                );
              })}
              {filteredTeams.length === 0 && (
                <div className="p-2 text-sm text-gray-500 text-center">
                  No teams found
                </div>
              )}
            </div>
          </div>

          {/* Workstreams */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Workstreams
            </label>
            <div className="relative">
              <input
                type="text"
                value={workstreamSearchTerm}
                onChange={(e) => setWorkstreamSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search workstreams..."
              />
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
              {filteredWorkstreams.map(workstream => {
                const isSelected = selectedWorkstreams.includes(workstream.id);
                const firstLine = workstream.content.split('\n')[0];
                return (
                  <div
                    key={workstream.id}
                    onClick={() => toggleWorkstream(workstream.id)}
                    className={`p-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span className="text-sm">{firstLine}</span>
                    {isSelected && (
                      <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                );
              })}
              {filteredWorkstreams.length === 0 && (
                <div className="p-2 text-sm text-gray-500 text-center">
                  No workstreams found
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            disabled={!name.trim()}
          >
            {personNote ? 'Save Changes' : 'Add Person'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPeopleModal; 