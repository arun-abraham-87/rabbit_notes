import React from 'react';
import { UserIcon } from '@heroicons/react/24/solid';
import { parseNoteContent } from '../utils/TextUtils';

const PeopleList = ({ notes, searchQuery }) => {
  // Filter for person notes
  const peopleNotes = notes.filter(note => note.content.includes('meta::person::'));

  if (peopleNotes.length === 0) return null;

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
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <UserIcon className="h-5 w-5 text-gray-500" />
        People
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {peopleNotes.map(note => {
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
  );
};

export default PeopleList; 