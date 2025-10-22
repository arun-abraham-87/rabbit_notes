import React, { useState, useEffect } from 'react';

const Timelines = ({ notes }) => {
  const [timelineNotes, setTimelineNotes] = useState([]);

  useEffect(() => {
    if (notes) {
      // Filter notes that contain meta::timeline tag
      const filteredNotes = notes.filter(note => 
        note.content && note.content.includes('meta::timeline')
      );
      setTimelineNotes(filteredNotes);
    }
  }, [notes]);

  // Parse timeline data from note content
  const parseTimelineData = (content) => {
    const lines = content.split('\n');
    const timelineData = {};
    
    lines.forEach(line => {
      if (line.trim().startsWith('meta::timeline::')) {
        const timelineValue = line.trim().replace('meta::timeline::', '').trim();
        if (timelineValue) {
          timelineData.timeline = timelineValue;
        }
      }
    });
    
    return timelineData;
  };

  // Sort notes by timeline value
  const sortedTimelineNotes = timelineNotes.sort((a, b) => {
    const aData = parseTimelineData(a.content);
    const bData = parseTimelineData(b.content);
    
    if (!aData.timeline && !bData.timeline) return 0;
    if (!aData.timeline) return 1;
    if (!bData.timeline) return -1;
    
    return aData.timeline.localeCompare(bData.timeline);
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Timelines
          </h1>
          <p className="text-lg text-gray-600">
            {timelineNotes.length} timeline notes found out of {notes ? notes.length : 0} total notes
          </p>
        </div>

        {timelineNotes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-4">
              No timeline notes found
            </div>
            <p className="text-gray-400">
              Add <code className="bg-gray-200 px-2 py-1 rounded">meta::timeline::[value]</code> to notes to see them here
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedTimelineNotes.map((note) => {
              const timelineData = parseTimelineData(note.content);
              const contentWithoutMeta = note.content
                .split('\n')
                .filter(line => !line.trim().startsWith('meta::'))
                .join('\n')
                .trim();

              return (
                <div key={note.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {timelineData.timeline || 'No timeline value'}
                        </span>
                        <span className="text-sm text-gray-500">
                          Note ID: {note.id}
                        </span>
                      </div>
                      <div className="prose max-w-none">
                        <pre className="whitespace-pre-wrap text-gray-800 font-sans">
                          {contentWithoutMeta}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Timelines;
