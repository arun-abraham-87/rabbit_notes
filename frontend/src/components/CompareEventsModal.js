import React, { useState, useMemo } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getDateInDDMMYYYYFormatWithAgeInParentheses } from '../utils/DateUtils';

const CompareEventsModal = ({ isOpen, onClose, events }) => {
  const [leftSearch, setLeftSearch] = useState('');
  const [rightSearch, setRightSearch] = useState('');
  const [selectedLeftEvent, setSelectedLeftEvent] = useState(null);
  const [selectedRightEvent, setSelectedRightEvent] = useState(null);

  // Function to extract event details from note content
  const getEventDetails = (content) => {
    const lines = content.split('\n');
    const descriptionLine = lines.find(line => line.startsWith('event_description:'));
    const description = descriptionLine ? descriptionLine.replace('event_description:', '').trim() : '';
    const eventDateLine = lines.find(line => line.startsWith('event_date:'));
    const dateTime = eventDateLine ? eventDateLine.replace('event_date:', '').trim() : '';
    return { description, dateTime };
  };

  // Filter events based on search query
  const filteredLeftEvents = useMemo(() => {
    return events.filter(event => {
      const { description } = getEventDetails(event.content);
      return description.toLowerCase().includes(leftSearch.toLowerCase());
    });
  }, [events, leftSearch]);

  const filteredRightEvents = useMemo(() => {
    return events.filter(event => {
      const { description } = getEventDetails(event.content);
      return description.toLowerCase().includes(rightSearch.toLowerCase());
    });
  }, [events, rightSearch]);

  // Calculate age difference between events
  const getAgeDifference = (leftDate, rightDate) => {
    if (!leftDate || !rightDate) return '';
    
    const left = new Date(leftDate);
    const right = new Date(rightDate);
    const diffInYears = (right - left) / (1000 * 60 * 60 * 24 * 365.25);
    
    if (diffInYears > 0) {
      return `${diffInYears.toFixed(1)} years ahead`;
    } else if (diffInYears < 0) {
      return `${Math.abs(diffInYears).toFixed(1)} years behind`;
    } else {
      return 'Same time';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-11/12 max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Compare Events</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* Left Section */}
          <div className="flex-1 flex flex-col">
            <input
              type="text"
              placeholder="Search events..."
              value={leftSearch}
              onChange={(e) => setLeftSearch(e.target.value)}
              className="mb-4 p-2 border rounded"
            />
            <div className="overflow-y-auto flex-1">
              {filteredLeftEvents.map(event => {
                const { description, dateTime } = getEventDetails(event.content);
                return (
                  <div
                    key={event.id}
                    className="p-3 border rounded mb-2 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedLeftEvent(event)}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={selectedLeftEvent?.id === event.id}
                        onChange={() => setSelectedLeftEvent(event)}
                        className="h-4 w-4"
                      />
                      <div>
                        <div className="font-medium">{description}</div>
                        <div className="text-sm text-gray-500">
                          {getDateInDDMMYYYYFormatWithAgeInParentheses(dateTime)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Section */}
          <div className="flex-1 flex flex-col">
            <input
              type="text"
              placeholder="Search events..."
              value={rightSearch}
              onChange={(e) => setRightSearch(e.target.value)}
              className="mb-4 p-2 border rounded"
            />
            <div className="overflow-y-auto flex-1">
              {filteredRightEvents.map(event => {
                const { description, dateTime } = getEventDetails(event.content);
                const ageDiff = selectedLeftEvent
                  ? getAgeDifference(
                      getEventDetails(selectedLeftEvent.content).dateTime,
                      dateTime
                    )
                  : '';
                
                return (
                  <div
                    key={event.id}
                    className="p-3 border rounded mb-2 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedRightEvent(event)}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={selectedRightEvent?.id === event.id}
                        onChange={() => setSelectedRightEvent(event)}
                        className="h-4 w-4"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{description}</div>
                        <div className="text-sm text-gray-500">
                          {getDateInDDMMYYYYFormatWithAgeInParentheses(dateTime)}
                        </div>
                        {selectedLeftEvent && (
                          <div className="text-sm text-indigo-600 mt-1">
                            {ageDiff}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompareEventsModal; 