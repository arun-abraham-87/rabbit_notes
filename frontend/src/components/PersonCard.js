import React from 'react';
import { UserIcon, XMarkIcon, CodeBracketIcon, PencilIcon, PhotoIcon } from '@heroicons/react/24/solid';
import { parseNoteContent } from '../utils/TextUtils';
import { getAgeInStringFmt } from '../utils/DateUtils';

const PersonCard = ({ note, onShowRaw, onEdit, onRemoveTag }) => {
  const getPersonInfo = (content) => {
    const lines = content.split('\n');
    const name = lines[0];
    const tags = lines
      .filter(line => line.startsWith('meta::tag::'))
      .map(line => line.split('::')[2]);
    
    // Get meta info
    const metaInfo = lines
      .filter(line => line.startsWith('meta::info::'))
      .map(line => {
        const [_, __, name, type, value] = line.split('::');
        return { name, type, value };
      });

    // Get photos
    const photos = lines
      .filter(line => line.startsWith('meta::photo::'))
      .map(line => line.replace('meta::photo::', '').trim());

    return { name, tags, metaInfo, photos };
  };

  const { name, tags, metaInfo, photos } = getPersonInfo(note.content);

  const renderMetaValue = (info) => {
    if (info.type === 'date') {
      const age = getAgeInStringFmt(info.value);
      return `${info.value} (${age})`;
    }
    return info.value;
  };

  return (
    <div className="bg-white rounded-lg border p-6 shadow-sm flex flex-col hover:shadow-md transition-shadow h-full">
      <div className="flex items-start gap-3 flex-grow">
        <div className="flex-shrink-0">
          {photos && photos.length > 0 ? (
            <a
              href={photos[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="block h-32 w-32 rounded-full overflow-hidden border-2 border-indigo-200 bg-indigo-100 flex items-center justify-center hover:border-indigo-400 transition-colors"
              title="View photo"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={photos[0]}
                alt={name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) {
                    e.target.nextSibling.style.display = 'flex';
                  }
                }}
              />
              <div className="hidden h-32 w-32 bg-indigo-100 items-center justify-center">
                <UserIcon className="h-16 w-16 text-indigo-600" />
              </div>
            </a>
          ) : (
            <div className="h-32 w-32 rounded-full bg-indigo-100 flex items-center justify-center">
              <UserIcon className="h-16 w-16 text-indigo-600" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-gray-900 break-words">
            {parseNoteContent({ content: name, searchQuery: "" }).map((element, idx) => (
              <React.Fragment key={idx}>{element}</React.Fragment>
            ))}
          </h3>
        
          {/* Meta Info Section */}
          {metaInfo.length > 0 && (
            <div className="mt-2 space-y-1">
              {metaInfo.map((info, index) => (
                <p key={index} className="text-xs text-gray-500">
                  {info.name}: {renderMetaValue(info)}
                </p>
              ))}
            </div>
          )}
          
          {/* Additional Photos Section (skip first photo as it's shown as headshot) */}
          {photos && photos.length > 1 && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                {photos.slice(1).map((photo, index) => (
                  <a
                    key={index + 1}
                    href={photo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group"
                    title={photo}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img
                      src={photo}
                      alt={`Photo ${index + 2}`}
                      className="h-16 w-16 object-cover rounded border border-gray-200 hover:border-indigo-400 transition-colors"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'flex';
                        }
                      }}
                    />
                    <div className="hidden h-16 w-16 bg-gray-100 border border-gray-200 rounded items-center justify-center">
                      <PhotoIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 flex flex-col gap-1">
          <button
            className="p-1 rounded hover:bg-gray-100"
            title="Show raw note"
            onClick={() => onShowRaw(note.content)}
          >
            <CodeBracketIcon className="h-5 w-5 text-gray-400 hover:text-indigo-600" />
          </button>
          <button
            className="p-1 rounded hover:bg-gray-100"
            title="Edit person"
            onClick={() => onEdit(note)}
          >
            <PencilIcon className="h-5 w-5 text-gray-400 hover:text-indigo-600" />
          </button>
        </div>
      </div>
      {tags && tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
            >
              {tag}
              <button
                onClick={() => onRemoveTag(note.id, tag)}
                className="ml-1 text-indigo-600 hover:text-indigo-800"
                title="Remove tag"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default PersonCard; 