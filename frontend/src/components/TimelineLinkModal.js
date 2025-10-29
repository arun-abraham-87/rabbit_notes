import React, { useState, useEffect } from 'react';
import { XMarkIcon, LinkIcon } from '@heroicons/react/24/outline';

const TimelineLinkModal = ({ isOpen, onClose, event, allNotes }) => {
  const [selectedTimeline, setSelectedTimeline] = useState('');
  const [timelines, setTimelines] = useState([]);

  useEffect(() => {
    if (isOpen && allNotes) {
      // Filter notes that contain meta::timeline tag
      const timelineNotes = allNotes.filter(note => 
        note.content && note.content.includes('meta::timeline')
      );
      
      // Extract timeline titles (first line of each note)
      const timelineList = timelineNotes.map(note => {
        const lines = note.content.split('\n');
        const firstLine = lines.find(line => 
          line.trim() && !line.trim().startsWith('meta::') && line.trim() !== 'Closed'
        );
        return {
          id: note.id,
          title: firstLine || 'Untitled Timeline',
          content: note.content
        };
      });
      
      setTimelines(timelineList);
    }
  }, [isOpen, allNotes]);

  const handleLink = () => {
    if (selectedTimeline) {
      // TODO: Implement linking logic here
      console.log('Linking event to timeline:', selectedTimeline);
      console.log('Event:', event);
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedTimeline('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Link to Timeline</h3>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event
            </label>
            <div className="p-3 bg-gray-50 rounded-md border">
              <p className="text-sm text-gray-900 font-medium">{event?.description}</p>
              <p className="text-xs text-gray-500 mt-1">
                {event?.dateTime ? new Date(event.dateTime).toLocaleDateString() : 'No date'}
              </p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Timeline
            </label>
            <select
              value={selectedTimeline}
              onChange={(e) => setSelectedTimeline(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Choose a timeline...</option>
              {timelines.map(timeline => (
                <option key={timeline.id} value={timeline.id}>
                  {timeline.title}
                </option>
              ))}
            </select>
          </div>
          
          {timelines.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">
                No timelines found. Create a timeline by adding <code className="bg-gray-200 px-1 rounded">meta::timeline</code> to a note.
              </p>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            onClick={handleLink}
            disabled={!selectedTimeline}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <LinkIcon className="h-4 w-4" />
            Link
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimelineLinkModal;
