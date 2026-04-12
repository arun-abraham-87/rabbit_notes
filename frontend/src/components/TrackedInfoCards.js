import React, { useMemo } from 'react';
import { InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { updateNoteById } from '../utils/ApiUtils';

const TrackedInfoCards = ({ notes, setNotes }) => {
  const navigate = useNavigate();

  const trackedInfo = useMemo(() => {
    if (!notes) return [];
    return notes
      .filter(note => {
        if (!note?.content) return false;
        const lines = note.content.split('\n');
        // Must be a life_info event note AND tracked
        const tagsLine = lines.find(l => l.startsWith('event_tags:'));
        const isInfo = tagsLine && tagsLine.toLowerCase().includes('life_info');
        const isTracked = lines.some(l => l.trim() === 'meta::info_tracked');
        return isInfo && isTracked;
      })
      .map(note => {
        const lines = note.content.split('\n');
        const get = prefix => lines.find(l => l.startsWith(prefix))?.slice(prefix.length).trim() || '';
        const title = get('event_description:');
        const content = get('event_notes:');
        return { id: note.id, title, content };
      })
      .filter(e => e.title);
  }, [notes]);

  const handleUntrack = async (e, id) => {
    e.stopPropagation();
    const note = (notes || []).find(n => n.id === id);
    if (!note) return;
    const updatedContent = note.content.split('\n')
      .filter(l => l.trim() !== 'meta::info_tracked')
      .join('\n');
    await updateNoteById(note.id, updatedContent);
    setNotes(prev => prev.map(n => n.id === id ? { ...n, content: updatedContent } : n));
  };

  if (trackedInfo.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <InformationCircleIcon className="h-5 w-5 text-indigo-500" />
        <h3 className="text-lg font-semibold text-gray-800">
          Tracked Info ({trackedInfo.length})
        </h3>
        <button
          onClick={() => navigate('/information')}
          className="ml-auto text-xs text-indigo-500 hover:underline"
        >
          Manage →
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {trackedInfo.map(item => (
          <div
            key={item.id}
            onClick={() => navigate('/information')}
            className="relative bg-white border border-indigo-100 rounded-lg px-4 py-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="font-medium text-sm text-gray-800 truncate pr-6">{item.title}</div>
            {item.content && (
              <div className="text-xs text-gray-500 mt-1 line-clamp-2 whitespace-pre-wrap">
                {item.content}
              </div>
            )}
            <button
              onClick={(e) => handleUntrack(e, item.id)}
              className="absolute top-2 right-2 p-0.5 text-indigo-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded"
              title="Untrack"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrackedInfoCards;
