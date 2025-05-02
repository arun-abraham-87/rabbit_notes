import React from 'react';
import { UserIcon, BriefcaseIcon } from '@heroicons/react/24/solid';
import { parseNoteContent } from '../utils/TextUtils';

const WorkstreamPeopleView = ({ notes, searchQuery, allNotes: allNotesProp }) => {
  const allNotes = allNotesProp || notes;
  // Get workstream information for a note
  const getWorkstreams = (content) => {
    const lines = content.split('\n');
    return lines
      .filter(line => line.startsWith('meta::link::'))
      .map(line => {
        const linkedNoteId = line.split('::')[2];
        const workstreamNote = allNotes.find(note => note.id === linkedNoteId && note.content.includes('meta::workstream'));
        if (workstreamNote) {
          const firstLine = workstreamNote.content.split('\n')[0];
          return {
            id: workstreamNote.id,
            name: firstLine
          };
        }
        return null;
      })
      .filter(Boolean); // Remove undefined entries
  };

  // Get person information
  const getPersonInfo = (content) => {
    const lines = content.split('\n');
    const name = lines[0];
    const role = lines.find(line => line.startsWith('meta::person_role::'))?.split('::')[2] || '';
    const email = lines.find(line => line.startsWith('meta::person_email::'))?.split('::')[2] || '';
    const phone = lines.find(line => line.startsWith('meta::person_phone::'))?.split('::')[2] || '';
    
    return { name, role, email, phone };
  };

  // Group people by workstreams
  const groupedPeople = notes.reduce((acc, personNote) => {
    const workstreams = getWorkstreams(personNote.content);
    
    if (workstreams.length === 0) {
      // Add to "No workstream" group
      if (!acc['no-workstream']) {
        acc['no-workstream'] = {
          name: 'No Workstream',
          people: []
        };
      }
      acc['no-workstream'].people.push(personNote);
    } else {
      // Add to each workstream group
      workstreams.forEach(workstream => {
        const workstreamId = workstream.id;
        if (!acc[workstreamId]) {
          acc[workstreamId] = {
            name: workstream.name,
            people: []
          };
        }
        acc[workstreamId].people.push(personNote);
      });
    }
    
    return acc;
  }, {});

  // Sort workstreams by name, but keep "No Workstream" at the end
  const sortedWorkstreams = Object.entries(groupedPeople).sort(([idA, a], [idB, b]) => {
    if (idA === 'no-workstream') return 1;
    if (idB === 'no-workstream') return -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-8">
      {sortedWorkstreams.map(([workstreamId, { name, people }]) => (
        <div key={workstreamId} className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 border-b pb-2">
            <BriefcaseIcon className="h-5 w-5 text-gray-500" />
            {name}
            <span className="text-sm font-normal text-gray-500">
              ({people.length} {people.length === 1 ? 'person' : 'people'})
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {people.map(note => {
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default WorkstreamPeopleView; 