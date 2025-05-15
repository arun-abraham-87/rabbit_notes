import React, { useState, useMemo } from 'react';
import { XMarkIcon, CalendarIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import { getDateInDDMMYYYYFormatWithAgeInParentheses } from '../utils/DateUtils';

const CompareEventsModal = ({ isOpen, onClose, events }) => {
  const [leftSearch, setLeftSearch] = useState('');
  const [rightSearch, setRightSearch] = useState('');
  const [thirdSearch, setThirdSearch] = useState('');
  const [fourthSearch, setFourthSearch] = useState('');
  const [fifthSearch, setFifthSearch] = useState('');
  const [selectedLeftEvent, setSelectedLeftEvent] = useState(null);
  const [selectedRightEvent, setSelectedRightEvent] = useState(null);
  const [selectedThirdEvent, setSelectedThirdEvent] = useState(null);
  const [selectedFourthEvent, setSelectedFourthEvent] = useState(null);
  const [selectedFifthEvent, setSelectedFifthEvent] = useState(null);
  const [showOriginalDates, setShowOriginalDates] = useState(false);
  const [activePanels, setActivePanels] = useState([true, true, false, false, false]);

  // Function to extract event details from note content
  const getEventDetails = (content) => {
    const lines = content.split('\n');
    const descriptionLine = lines.find(line => line.startsWith('event_description:'));
    const description = descriptionLine ? descriptionLine.replace('event_description:', '').trim() : '';
    const eventDateLine = lines.find(line => line.startsWith('event_date:'));
    const dateTime = eventDateLine ? eventDateLine.replace('event_date:', '').trim() : '';
    const tagsLine = lines.find(line => line.startsWith('event_tags:'));
    const tags = tagsLine ? tagsLine.replace('event_tags:', '').trim().split(',').map(tag => tag.trim()) : [];
    return { description, dateTime, tags };
  };

  // Calculate age difference between events
  const getAgeDifference = (leftDate, rightDate) => {
    if (!leftDate || !rightDate) return '';
    
    const left = new Date(leftDate);
    const right = new Date(rightDate);
    
    // Calculate total days difference
    const diffTime = Math.abs(right - left);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Calculate years, months, and remaining days
    const years = Math.floor(diffDays / 365);
    const remainingDays = diffDays % 365;
    const months = Math.floor(remainingDays / 30);
    const days = remainingDays % 30;
    
    // Build the difference string
    let diffString = '';
    if (years > 0) {
      diffString += `${years} year${years > 1 ? 's' : ''}`;
    }
    if (months > 0) {
      if (diffString) diffString += ' ';
      diffString += `${months} month${months > 1 ? 's' : ''}`;
    }
    if (days > 0) {
      if (diffString) diffString += ' ';
      diffString += `${days} day${days > 1 ? 's' : ''}`;
    }
    
    // Add direction
    if (right > left) {
      return `Happened ${diffString} later`;
    } else if (right < left) {
      return `Happened ${diffString} before`;
    } else {
      return 'Same time';
    }
  };

  // Filter events based on search queries
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

  const filteredThirdEvents = useMemo(() => {
    return events.filter(event => {
      const { description } = getEventDetails(event.content);
      return description.toLowerCase().includes(thirdSearch.toLowerCase());
    });
  }, [events, thirdSearch]);

  const filteredFourthEvents = useMemo(() => {
    return events.filter(event => {
      const { description } = getEventDetails(event.content);
      return description.toLowerCase().includes(fourthSearch.toLowerCase());
    });
  }, [events, fourthSearch]);

  const filteredFifthEvents = useMemo(() => {
    return events.filter(event => {
      const { description } = getEventDetails(event.content);
      return description.toLowerCase().includes(fifthSearch.toLowerCase());
    });
  }, [events, fifthSearch]);

  const handleClearSelection = () => {
    setSelectedLeftEvent(null);
    setSelectedRightEvent(null);
    setSelectedThirdEvent(null);
    setSelectedFourthEvent(null);
    setSelectedFifthEvent(null);
  };

  const addPanel = () => {
    const newActivePanels = [...activePanels];
    const nextInactiveIndex = newActivePanels.findIndex(panel => !panel);
    if (nextInactiveIndex !== -1) {
      newActivePanels[nextInactiveIndex] = true;
      setActivePanels(newActivePanels);
    }
  };

  const removePanel = (index) => {
    const newActivePanels = [...activePanels];
    newActivePanels[index] = false;
    setActivePanels(newActivePanels);
    
    // Clear the selection for the removed panel
    switch(index) {
      case 2: setSelectedThirdEvent(null); break;
      case 3: setSelectedFourthEvent(null); break;
      case 4: setSelectedFifthEvent(null); break;
    }
  };

  const getPanelCount = () => activePanels.filter(Boolean).length;

  const renderPanel = (index, search, setSearch, selectedEvent, setSelectedEvent, filteredEvents) => {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 p-2 border rounded"
          />
          {index >= 2 && (
            <button
              onClick={() => removePanel(index)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="overflow-y-auto flex-1">
          {selectedEvent ? (
            <div className="space-y-4">
              <div className="p-3 border rounded bg-indigo-50 border-indigo-200">
                <div className="flex-1">
                  <div className="font-medium">{getEventDetails(selectedEvent.content).description}</div>
                  {showOriginalDates && (
                    <div className="text-sm text-gray-500">
                      {getDateInDDMMYYYYFormatWithAgeInParentheses(getEventDetails(selectedEvent.content).dateTime)}
                    </div>
                  )}
                  {getEventDetails(selectedEvent.content).tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {getEventDetails(selectedEvent.content).tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {selectedLeftEvent && (
                    <div className="text-sm text-indigo-600 mt-2">
                      {getAgeDifference(
                        getEventDetails(selectedLeftEvent.content).dateTime,
                        getEventDetails(selectedEvent.content).dateTime
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="w-full px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-md border border-gray-300"
              >
                Clear Selection
              </button>
            </div>
          ) : (
            filteredEvents.map(event => {
              const { description, dateTime, tags } = getEventDetails(event.content);
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
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="flex-1">
                    <div className="font-medium">{description}</div>
                    {showOriginalDates && (
                      <div className="text-sm text-gray-500">
                        {getDateInDDMMYYYYFormatWithAgeInParentheses(dateTime)}
                      </div>
                    )}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {selectedLeftEvent && (
                      <div className="text-sm text-indigo-600 mt-2">
                        {ageDiff}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-11/12 max-w-[90rem] max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Compare Events</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowOriginalDates(!showOriginalDates)}
              className={`px-3 py-1 text-sm font-medium rounded-md border flex items-center gap-2 ${
                showOriginalDates
                  ? 'text-indigo-600 border-indigo-300 bg-indigo-50'
                  : 'text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
              {showOriginalDates ? 'Hide Dates' : 'Show Dates'}
            </button>
            {getPanelCount() < 5 && (
              <button
                onClick={addPanel}
                className="px-3 py-1 text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 rounded-md flex items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Add Panel
              </button>
            )}
            <button
              onClick={handleClearSelection}
              className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-md border border-gray-300"
            >
              Clear Selection
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className={`grid gap-4 flex-1 overflow-hidden`} style={{ gridTemplateColumns: `repeat(${getPanelCount()}, 1fr)` }}>
          {activePanels[0] && renderPanel(0, leftSearch, setLeftSearch, selectedLeftEvent, setSelectedLeftEvent, filteredLeftEvents)}
          {activePanels[1] && renderPanel(1, rightSearch, setRightSearch, selectedRightEvent, setSelectedRightEvent, filteredRightEvents)}
          {activePanels[2] && renderPanel(2, thirdSearch, setThirdSearch, selectedThirdEvent, setSelectedThirdEvent, filteredThirdEvents)}
          {activePanels[3] && renderPanel(3, fourthSearch, setFourthSearch, selectedFourthEvent, setSelectedFourthEvent, filteredFourthEvents)}
          {activePanels[4] && renderPanel(4, fifthSearch, setFifthSearch, selectedFifthEvent, setSelectedFifthEvent, filteredFifthEvents)}
        </div>
      </div>
    </div>
  );
};

export default CompareEventsModal; 