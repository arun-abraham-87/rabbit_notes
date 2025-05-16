import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  PencilIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import AddEventModal from './AddEventModal';
import { getAgeInStringFmt } from '../utils/DateUtils';

const UpcomingHolidaysAlert = ({ notes, expanded: initialExpanded = true, setNotes }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [showPopup, setShowPopup] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [revealedHolidays, setRevealedHolidays] = useState({});
  const [editingHoliday, setEditingHoliday] = useState(null);

  const handleEditHoliday = (holiday) => {
    const originalNote = notes.find(n => n.id === holiday.id);
    if (originalNote) {
      const lines = originalNote.content.split('\n');
      const description = lines.find(line => line.startsWith('event_description:'))?.replace('event_description:', '').trim() || '';
      const eventDate = lines.find(line => line.startsWith('event_date:'))?.replace('event_date:', '').trim() || '';

      setEditingHoliday({
        id: holiday.id,
        description,
        date: eventDate
      });
      setShowAddEventModal(true);
    }
  };

  const getDaysUntilHoliday = (holidayDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const holiday = new Date(holidayDate);
    holiday.setHours(0, 0, 0, 0);
    const diffTime = holiday - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleAddEvent = async (content) => {
    if (editingHoliday) {
      // Update existing holiday
      const note = notes.find(n => n.id === editingHoliday.id);
      if (note) {
        // Preserve the original meta tags
        const originalLines = note.content.split('\n');
        const metaTags = originalLines.filter(line => 
          line.startsWith('meta::') && 
          !line.startsWith('meta::event::')
        );
        
        // Combine new content with preserved meta tags
        const updatedContent = content + '\n' + metaTags.join('\n');
        
        // Update the note
        const updatedNote = { ...note, content: updatedContent };
        setNotes(notes.map(n => n.id === note.id ? updatedNote : n));
      }
    } else {
      // Add holiday tag to new event
      const contentWithHolidayTag = content + '\nevent_tags:holiday';
      const newNote = {
        id: Date.now().toString(),
        content: contentWithHolidayTag,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setNotes([...notes, newNote]);
    }
    setShowAddEventModal(false);
    setEditingHoliday(null);
  };

  useEffect(() => {
    const holidayNotes = notes.filter(note => {
      if (!note.content.includes('meta::event::')) return false;
      const lines = note.content.split('\n');
      const tagsLine = lines.find(line => line.startsWith('event_tags:'));
      if (!tagsLine) return false;
      const tags = tagsLine.replace('event_tags:', '').trim().split(',').map(tag => tag.trim());
      return tags.some(tag => tag.toLowerCase() === 'holiday'); // Convert to lowercase for comparison
    });

    const upcoming = holidayNotes.map(note => {
      const lines = note.content.split('\n');
      const description = lines.find(line => line.startsWith('event_description:'))?.replace('event_description:', '').trim() || '';
      const eventDate = lines.find(line => line.startsWith('event_date:'))?.replace('event_date:', '').trim();
      const isHidden = note.content.includes('meta::event_hidden');

      return {
        id: note.id,
        date: new Date(eventDate),
        description,
        isHidden
      };
    });

    // Sort by date
    upcoming.sort((a, b) => a.date - b.date);
    setHolidays(upcoming);
  }, [notes]);

  const toggleHolidayVisibility = (holidayId) => {
    setRevealedHolidays(prev => ({
      ...prev,
      [holidayId]: !prev[holidayId]
    }));
  };

  return (
    <>
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors duration-150 h-[88px] flex items-center" onClick={() => setShowPopup(true)}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <CalendarIcon className="h-6 w-6 text-blue-500" />
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-blue-800">
                  Upcoming Holidays ({holidays.length})
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddEventModal(true);
                }}
                className="px-3 py-1 text-blue-600 hover:text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors duration-150"
                title="Add Holiday"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        {showPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Upcoming Holidays</h2>
                <button
                  onClick={() => setShowPopup(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-4">
                {holidays.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Holidays Yet</h3>
                    <p className="text-gray-500 mb-4">Add your first holiday by clicking the + button above.</p>
                    <button
                      onClick={() => {
                        setShowPopup(false);
                        setShowAddEventModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150"
                    >
                      Add Holiday
                    </button>
                  </div>
                ) : (
                  holidays.map((holiday) => {
                    const daysUntil = getDaysUntilHoliday(holiday.date);
                    return (
                      <div 
                        key={holiday.id}
                        className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150 flex"
                      >
                        <div className="flex flex-col items-center justify-center min-w-[80px] bg-blue-100 rounded-l-lg -m-4 mr-4">
                          <div className="text-3xl font-bold text-blue-700">
                            {daysUntil}
                          </div>
                          <div className="text-sm text-blue-600 font-medium">
                            {daysUntil === 1 ? 'day' : 'days'}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-lg font-medium text-gray-900">
                                  {holiday.isHidden && !revealedHolidays[holiday.id] ? 'XXXXXXXXX' : holiday.description}
                                </h4>
                                {holiday.isHidden && (
                                  <button
                                    onClick={() => toggleHolidayVisibility(holiday.id)}
                                    className="text-blue-600 hover:text-blue-800 focus:outline-none"
                                    title={revealedHolidays[holiday.id] ? "Hide description" : "Reveal description"}
                                  >
                                    <EyeIcon className="h-5 w-5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEditHoliday(holiday)}
                                  className="text-blue-600 hover:text-blue-800 focus:outline-none ml-2"
                                  title="Edit holiday"
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </button>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                <ClockIcon className="h-4 w-4" />
                                <span>
                                  {holiday.date.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                <CalendarIcon className="h-4 w-4" />
                                <span>
                                  {holiday.date.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </span>
                                <span className="text-blue-600 font-medium">
                                  ({getAgeInStringFmt(holiday.date)})
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddEventModal && (
        <AddEventModal
          isOpen={showAddEventModal}
          onClose={() => {
            setShowAddEventModal(false);
            setEditingHoliday(null);
          }}
          onAdd={handleAddEvent}
          notes={notes}
          initialValues={editingHoliday}
        />
      )}
    </>
  );
};

export default UpcomingHolidaysAlert; 