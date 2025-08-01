import React, { useState, useEffect, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  CalendarIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CheckIcon,
  CodeBracketIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  ChevronRightIcon,
  BellIcon,
  FireIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { updateNoteById, loadNotes, loadTags, addNewNoteCommon, createNote, exportAllNotes } from '../utils/ApiUtils';
import { getAgeInStringFmt,  getDiffInDays } from '../utils/DateUtils';
import { checkNeedsReview } from '../utils/watchlistUtils';
import MeetingManager from './MeetingManager.js';
import EditEventModal from './EditEventModal';
import DeadlinePassedAlert from './DeadlinePassedAlert';
import CriticalTodosAlert from './CriticalTodosAlert';
import ReviewOverdueAlert from './ReviewOverdueAlert';
import UnacknowledgedMeetingsAlert from './UnacknowledgedMeetingsAlert';
import TrackerQuestionsAlert from './TrackerQuestionsAlert';
import UpcomingEventsAlert from './UpcomingEventsAlert'
import RemindersAlert from './RemindersAlert';
import UpcomingHolidaysAlert from './UpcomingHolidaysAlert';
import { deleteNoteById } from '../utils/ApiUtils';

const Alerts = {
  success: (message) => {
    try {
      // Clear all existing toasts first
      toast.dismiss();
      // Wait a bit before showing new toast
      setTimeout(() => {
        toast(
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
            <span>{message}</span>
          </div>,
          {
            className: 'bg-green-50 text-green-800',
            progressClassName: 'bg-green-500',
            icon: false,
            toastId: 'success',
            autoClose: 1500,
          }
        );
      }, 100);
    } catch (error) {
      console.warn('Failed to show success toast:', error);
    }
  },

  error: (message) => {
    try {
      // Clear all existing toasts first
      toast.dismiss();
      // Wait a bit before showing new toast
      setTimeout(() => {
        toast(
          <div className="flex items-center">
            <XMarkIcon className="h-5 w-5 text-red-500 mr-2" />
            <span>{message}</span>
          </div>,
          {
            className: 'bg-red-50 text-red-800',
            progressClassName: 'bg-red-500',
            icon: false,
            toastId: 'error',
            autoClose: 1500,
          }
        );
      }, 100);
    } catch (error) {
      console.warn('Failed to show error toast:', error);
    }
  },

  warning: (message) => {
    try {
      // Clear all existing toasts first
      toast.dismiss();
      // Wait a bit before showing new toast
      setTimeout(() => {
        toast(
          <div className="flex items-center">
            <ExclamationCircleIcon className="h-5 w-5 text-yellow-500 mr-2" />
            <span>{message}</span>
          </div>,
          {
            className: 'bg-yellow-50 text-yellow-800',
            progressClassName: 'bg-yellow-500',
            icon: false,
            toastId: 'warning',
            autoClose: 1500,
          }
        );
      }, 100);
    } catch (error) {
      console.warn('Failed to show warning toast:', error);
    }
  },

  info: (message) => {
    try {
      // Clear all existing toasts first
      toast.dismiss();
      // Wait a bit before showing new toast
      setTimeout(() => {
        toast(
          <div className="flex items-center">
            <InformationCircleIcon className="h-5 w-5 text-blue-500 mr-2" />
            <span>{message}</span>
          </div>,
          {
            className: 'bg-blue-50 text-blue-800',
            progressClassName: 'bg-blue-500',
            icon: false,
            toastId: 'info',
            autoClose: 1500,
          }
        );
      }, 100);
    } catch (error) {
      console.warn('Failed to show info toast:', error);
    }
  },
};

const UpcomingDeadlinesAlert = ({ notes, expanded: initialExpanded = true, addNote, setNotes }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [showPopup, setShowPopup] = useState(false);
  const [deadlines, setDeadlines] = useState([]);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [revealedDeadlines, setRevealedDeadlines] = useState({});
  const [deadlineIndicators, setDeadlineIndicators] = useState('');
  const [editingDeadline, setEditingDeadline] = useState(null);

  // Add escape key handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setShowPopup(false);
      }
    };

    if (showPopup) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [showPopup]);

  const handleEditDeadline = (deadline) => {
    const originalNote = notes.find(n => n.id === deadline.id);
    if (!originalNote) {
      console.error('Note not found:', deadline.id);
      return;
    }

    if (!originalNote.content) {
      console.error('Note has no content:', deadline.id);
      return;
    }

    try {
      setEditingDeadline(originalNote);
      setShowEditEventModal(true);
    } catch (error) {
      console.error('Error parsing deadline note:', error);
    }
  };

  // Add the typewriter animation style
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes typewriter {
        0% {
          opacity: 0;
        }
        5% {
          opacity: 1;
        }
        95% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }
      .typewriter-text {
        display: inline-block;
        font-weight: 600;
        color: rgb(239, 68, 68);
      }
      .typewriter-text span {
        display: inline-block;
        opacity: 0;
        animation: typewriter 3s infinite;
      }
      .typewriter-text span:nth-child(1) { animation-delay: 0s; }
      .typewriter-text span:nth-child(2) { animation-delay: 0.1s; }
      .typewriter-text span:nth-child(3) { animation-delay: 0.2s; }
      .typewriter-text span:nth-child(4) { animation-delay: 0.3s; }
      .typewriter-text span:nth-child(5) { animation-delay: 0.4s; }
      .typewriter-text span:nth-child(6) { animation-delay: 0.5s; }
      .typewriter-text span:nth-child(7) { animation-delay: 0.6s; }
      .typewriter-text span:nth-child(8) { animation-delay: 0.7s; }
      .typewriter-text span:nth-child(9) { animation-delay: 0.8s; }
      .typewriter-text span:nth-child(10) { animation-delay: 0.9s; }
      .typewriter-text span:nth-child(11) { animation-delay: 1s; }
      .typewriter-text span:nth-child(12) { animation-delay: 1.1s; }
      .typewriter-text span:nth-child(13) { animation-delay: 1.2s; }
      .typewriter-text span:nth-child(14) { animation-delay: 1.3s; }
      .typewriter-text span:nth-child(15) { animation-delay: 1.4s; }
      .typewriter-text span:nth-child(16) { animation-delay: 1.5s; }
      .typewriter-text span:nth-child(17) { animation-delay: 1.6s; }
      .typewriter-text span:nth-child(18) { animation-delay: 1.7s; }
      .typewriter-text span:nth-child(19) { animation-delay: 1.8s; }
      .typewriter-text span:nth-child(20) { animation-delay: 1.9s; }
    `;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  const renderAnimatedText = (text) => {
    if (!text) return null;
    // Replace spaces with non-breaking spaces to ensure they're preserved in the animation
    const processedText = text.replace(/ /g, '\u00A0');
    return (
      <div className="typewriter-text">
        {processedText.split('').map((char, index) => (
          <span key={index}>{char}</span>
        ))}
      </div>
    );
  };

  const getDaysUntilDeadline = (deadlineDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineDate);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleAddEvent = async (content) => {
    if (editingDeadline) {
      // Update existing deadline
      const note = notes.find(n => n.id === editingDeadline.id);
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
      const newNote = await createNote(content);
      setNotes([...notes, newNote]);
    }
    setShowEditEventModal(false);
    setEditingDeadline(null);
  }

  const handlePinEvent = async (deadline) => {
    try {
      // Get the current events from localStorage
      const stored = localStorage.getItem('tempEvents');
      const currentEvents = stored && stored !== '[]' ? JSON.parse(stored) : [];
      
      // Create a new event object
      const newEvent = {
        id: Date.now(),
        name: deadline.description,
        date: deadline.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        type: 'event',
        bgColor: '#ffffff'
      };
      
      // Add the new event to the existing events
      const updatedEvents = [...currentEvents, newEvent];
      
      // Save back to localStorage
      localStorage.setItem('tempEvents', JSON.stringify(updatedEvents));
      
      // Show success message
      Alerts.success('Event pinned to EventManager');
    } catch (error) {
      console.error('Error pinning event:', error);
      Alerts.error('Failed to pin event');
    }
  }
  
  useEffect(() => {
    const eventNotes = notes.filter(note => note && note.content && note.content.includes('meta::event_deadline'));
    const upcoming = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    let hasTodayDeadline = false;
    let hasTomorrowDeadline = false;
    let nextDeadlineDays = null;

    eventNotes.forEach(note => {
      if (!note || !note.content) return;
      
      const lines = note.content.split('\n');
      const description = lines[0]?.trim() || '';
      const eventDateLine = lines.find(line => line.startsWith('event_date:'));
      const eventDate = eventDateLine ? eventDateLine.replace('event_date:', '').trim() : null;
      const isHidden = note.content.includes('meta::event_hidden');
      
      if (eventDate) {
        const deadlineDate = new Date(eventDate);
        deadlineDate.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Only include deadlines that are today or in the future
        if (deadlineDate >= today) {
          // Check if deadline is today or tomorrow
          if (deadlineDate.getTime() === today.getTime()) {
            hasTodayDeadline = true;
          } else if (deadlineDate.getTime() === tomorrow.getTime()) {
            hasTomorrowDeadline = true;
          } else if (!nextDeadlineDays || deadlineDate < new Date(nextDeadlineDays.date)) {
            const diffTime = Math.abs(deadlineDate - today);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            nextDeadlineDays = { date: deadlineDate, days: diffDays };
          }

          upcoming.push({
            id: note.id,
            date: new Date(eventDate),
            description: description.replace('event_description:', '').trim(),
            isHidden
          });
        }
      }
    });

    // Set deadline indicators
    if (hasTodayDeadline && hasTomorrowDeadline) {
      setDeadlineIndicators('(Deadlines Today & Tomorrow)');
    } else if (hasTodayDeadline) {
      setDeadlineIndicators('(Deadline Today)');
    } else if (hasTomorrowDeadline) {
      setDeadlineIndicators('(Deadline Tomorrow)');
    } else if (nextDeadlineDays) {
      setDeadlineIndicators(`(Next Deadline in ${nextDeadlineDays.days} days)`);
    } else {
      setDeadlineIndicators('');
    }

    // Sort by date
    upcoming.sort((a, b) => a.date - b.date);
    setDeadlines(upcoming);
  }, [notes]);

  const toggleDeadlineVisibility = (deadlineId) => {
    setRevealedDeadlines(prev => ({
      ...prev,
      [deadlineId]: !prev[deadlineId]
    }));
  };

  if (deadlines.length === 0) return null;

  return (
    <>
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors duration-150 h-[88px] flex items-center" onClick={() => setShowPopup(true)}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <ClockIcon className="h-6 w-6 text-blue-500" />
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-blue-800">
                  Upcoming Deadlines ({deadlines.length})
                </h3>
                {deadlineIndicators && (
                  <div className="mt-1">
                    {deadlineIndicators.includes('Today') || deadlineIndicators.includes('Tomorrow') 
                      ? renderAnimatedText(deadlineIndicators)
                      : <span className="text-blue-600">{deadlineIndicators}</span>
                    }
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingDeadline(null);
                  setShowEditEventModal(true);
                }}
                className="px-3 py-1 text-blue-600 hover:text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors duration-150"
                title="Add new deadline"
              >
                <PlusIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
        {showPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Upcoming Deadlines</h2>
                <button
                  onClick={() => setShowPopup(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-4">
                {deadlines.map((deadline) => {
                  const daysUntil = getDaysUntilDeadline(deadline.date);
                  return (
                    <div 
                      key={deadline.id}
                      className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150 flex"
                    >
                      <div className="flex flex-col items-center justify-center min-w-[80px] bg-indigo-100 rounded-l-lg -m-4 mr-4">
                        <div className="text-3xl font-bold text-indigo-700">
                          {daysUntil}
                        </div>
                        <div className="text-sm text-indigo-600 font-medium">
                          {daysUntil === 1 ? 'day' : 'days'}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-lg font-medium text-gray-900">
                                {deadline.isHidden && !revealedDeadlines[deadline.id] ? 'XXXXXXXXX' : deadline.description}
                              </h4>
                              {deadline.isHidden && (
                                <button
                                  onClick={() => toggleDeadlineVisibility(deadline.id)}
                                  className="text-indigo-600 hover:text-indigo-800 focus:outline-none"
                                  title={revealedDeadlines[deadline.id] ? "Hide description" : "Reveal description"}
                                >
                                  <EyeIcon className="h-5 w-5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleEditDeadline(deadline)}
                                className="text-indigo-600 hover:text-indigo-800 focus:outline-none ml-2"
                                title="Edit deadline"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handlePinEvent(deadline)}
                                className="text-green-600 hover:text-green-800 focus:outline-none ml-2"
                                title="Pin Event"
                              >
                                <PlusIcon className="h-5 w-5" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                              <CalendarIcon className="h-4 w-4" />
                              <span>
                                {deadline.date.toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                              <span className="text-indigo-600 font-medium">
                                ({daysUntil} days until deadline)
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {showEditEventModal && (
        <EditEventModal
          isOpen={showEditEventModal}
          note={editingDeadline}
          isAddDeadline={!editingDeadline} // Pre-select deadline checkbox when adding new deadline
          onSave={async (content) => {
            if (editingDeadline) {
              try {
                // Update existing event
                const note = notes.find(n => n.id === editingDeadline.id);
                if (note) {
                  // Preserve the original meta tags
                  const originalLines = note.content.split('\n');
                  const metaTags = originalLines.filter(line => 
                    line.startsWith('meta::') && 
                    !line.startsWith('meta::event::')
                  );
                  
                  // Combine new content with preserved meta tags
                  const updatedContent = content + '\n' + metaTags.join('\n');
                  
                  // Update the note in the backend
                  await updateNoteById(editingDeadline.id, updatedContent);
                  
                  // Update the note in the local state
                  const updatedNote = { ...note, content: updatedContent };
                  setNotes(notes.map(n => n.id === note.id ? updatedNote : n));
                }
              } catch (error) {
                console.error('Error updating event:', error);
              }
            } else {
              // Add new event
              try {
                const newNote = {
                  id: Date.now().toString(),
                  content: content,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };
                await createNote(content);
                setNotes([...notes, newNote]);
              } catch (error) {
                console.error('Error creating event:', error);
              }
            }
            setShowEditEventModal(false);
            setEditingDeadline(null);
          }}
          onCancel={() => {
            setShowEditEventModal(false);
            setEditingDeadline(null);
          }}
          onSwitchToNormalEdit={() => {
            setShowEditEventModal(false);
            setEditingDeadline(null);
          }}
          onDelete={async () => {
            await deleteNoteById(editingDeadline.id);
            setNotes(notes.filter(n => n.id !== editingDeadline.id));
            setShowEditEventModal(false);
            setEditingDeadline(null);
          }}
          notes={notes}
        />
      )}
    </>
  );
};

const AlertsContainer = ({ children, notes, events, expanded: initialExpanded = true, setNotes }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [autoRefreshCountdown, setAutoRefreshCountdown] = useState(10);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const autoRefreshIntervalRef = useRef(null);

  // Calculate overdue notes
  const overdueNotes = notes.filter(note => {
    if (!note.content.includes('meta::watch')) return false;
    return checkNeedsReview(note.id);
  });

  // Auto refresh effect
  useEffect(() => {
    if (isAutoRefreshEnabled) {
      autoRefreshIntervalRef.current = setInterval(() => {
        setAutoRefreshCountdown(prev => {
          if (prev <= 1) {
            loadNotes('', new Date().toISOString().split('T')[0])
              .then(data => {
                if (data && data.notes) {
                  setNotes(data.notes);
                }
              })
              .catch(error => {
                console.error('Error refreshing alerts:', error);
              });
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setAutoRefreshCountdown(10);
    }

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [isAutoRefreshEnabled, setNotes]);

  const getUnacknowledgedOccurrences = () => {
    return events.flatMap(event => {
      if (!event || !event.dateTime) return [];
      
      const { dateTime, recurrence } = event;
      const eventDate = new Date(dateTime);
      const now = new Date();
      const currentYear = now.getFullYear();
      const occurrences = [];

      if (recurrence === 'none') {
        if (eventDate.getFullYear() === currentYear) {
          occurrences.push({ date: eventDate, event });
        }
      } else {
        let occurrence = new Date(eventDate);
        while (occurrence.getFullYear() <= currentYear) {
          if (occurrence.getFullYear() === currentYear) {
            occurrences.push({ date: new Date(occurrence), event });
          }

          if (recurrence === 'daily') {
            occurrence.setDate(occurrence.getDate() + 1);
          } else if (recurrence === 'weekly') {
            occurrence.setDate(occurrence.getDate() + 7);
          } else if (recurrence === 'monthly') {
            occurrence.setMonth(occurrence.getMonth() + 1);
          } else if (recurrence === 'yearly') {
            occurrence.setFullYear(occurrence.getFullYear() + 1);
          }
        }
      }

      return occurrences;
    }).filter(occurrence => {
      const april2025 = new Date('2025-04-01');
      const now = new Date();
      const year = occurrence.date.getFullYear();
      const metaTag = `meta::acknowledged::${year}`;
      
      return occurrence.date >= april2025 && 
             occurrence.date <= now && 
             !occurrence.event.content.includes(metaTag);
    });
  };

  const unacknowledgedEvents = getUnacknowledgedOccurrences();
  const unacknowledgedMeetings = notes.filter(note => 
    note.content.includes('meta::meeting::') && 
    !note.content.includes('meta::acknowledged::') &&
    !note.content.includes('meta::meeting_acknowledge::')
  );

  const handleDismissUnacknowledgedMeeting = async (noteId) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    // Add the acknowledged tag with timestamp
    const ackLine = `meta::meeting_acknowledge::${new Date().toISOString()}`;
    const updatedContent = `${note.content}\n${ackLine}`;
    
    try {
      await updateNoteById(noteId, updatedContent);
      // Update the notes state to reflect the change
      setNotes(notes.map(n => n.id === noteId ? { ...n, content: updatedContent } : n));
    } catch (error) {
      console.error('Error acknowledging meeting:', error);
    }
  };

  const totalAlerts = unacknowledgedEvents.length + 
                     unacknowledgedMeetings.length +
                     overdueNotes.length;

  const handleTitleClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleReviewOverdueClick = (e) => {
    e.stopPropagation();
    window.location.href = '/#/watch';
  };

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6 w-full">
      {isExpanded && (
        <div className="divide-y divide-gray-100 p-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

const BackupAlert = ({ notes, expanded: initialExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Add null check for notes
  if (!notes || !Array.isArray(notes)) return null;

  const backupNotes = notes.filter(note => note && note.content && note.content.includes('meta::notes_backup_date::'));
  if (backupNotes.length === 0) return null;

  // Find the most recent backup date
  const lastBackupDate = backupNotes.reduce((latest, note) => {
    if (!note || !note.content) return latest;
    const backupDateMatch = note.content.match(/meta::notes_backup_date::([^T]+)T/);
    if (!backupDateMatch) return latest;
    const backupDate = new Date(backupDateMatch[1]);
    return !latest || backupDate > latest ? backupDate : latest;
  }, null);

  if (!lastBackupDate) return null;

  const now = new Date();
  const diffDays = getDiffInDays(now, lastBackupDate);
  if (diffDays <= 1) return null;

  const startBackup = async () => {
    setIsBackingUp(true);
    try {
      await exportAllNotes();
    } catch (error) {
      console.error('Backup failed:', error);
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="bg-red-50 px-6 py-4 border-b border-red-100 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
            <h3 className="ml-3 text-base font-semibold text-red-800">
              Backup Overdue ({diffDays} days)
            </h3>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-red-600 hover:text-red-700 focus:outline-none"
            aria-label={isExpanded ? "Collapse backup alert" : "Expand backup alert"}
          >
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5" />
            ) : (
              <ChevronDownIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <CalendarIcon className="h-4 w-4" />
            <span>Last backup: {lastBackupDate.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-red-600 mb-4">
            <ExclamationCircleIcon className="h-4 w-4" />
            <span>Backup is overdue by {diffDays} days</span>
          </div>
          {isBackingUp ? (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              <span>Backing up...</span>
            </div>
          ) : (
            <button
              onClick={startBackup}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
            >
              Start Backup
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const TodayEventsBar = ({ events }) => {
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      const lastAcknowledged = localStorage.getItem('todayEventsLastAcknowledged');
      if (!lastAcknowledged) return false;
      
      const lastAckTime = new Date(lastAcknowledged);
      const now = new Date();
      const hoursSinceLastAck = (now - lastAckTime) / (1000 * 60 * 60);
      
      // If it's been more than 4 hours since last acknowledgment, show the bar again
      return hoursSinceLastAck < 4;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return false;
    }
  });

  const handleDismiss = () => {
    try {
      localStorage.setItem('todayEventsLastAcknowledged', new Date().toISOString());
      setIsDismissed(true);
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  };

  const getTodayEvents = () => {
    if (!events || !Array.isArray(events)) return [];
    
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    return events.filter(event => {
      if (!event || !event.content) return false;
      
      try {
        const lines = event.content.split('\n');
        const eventDateLine = lines.find(line => line.startsWith('event_date:'));
        if (!eventDateLine) return false;
        
        const eventDateStr = eventDateLine.replace('event_date:', '').trim();
        if (!eventDateStr) return false;
        
        const eventDate = new Date(eventDateStr);
        if (isNaN(eventDate.getTime())) return false;
        
        // Check if month and date match today, regardless of year
        return eventDate.getMonth() === todayMonth && eventDate.getDate() === todayDate;
      } catch (error) {
        console.error('Error processing event:', error);
        return false;
      }
    });
  };

  const todayEvents = getTodayEvents();
  if (todayEvents.length === 0 || isDismissed) return null;

  return (
    <div className="bg-green-50 border-b border-green-100">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap">
          <div className="w-0 flex-1 flex items-center">
            <span className="flex p-2 rounded-lg bg-green-100">
              <SparklesIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
            </span>
            <p className="ml-3 font-medium text-green-800 truncate">
              <span className="md:hidden">Exciting! {todayEvents.length} event{todayEvents.length > 1 ? 's' : ''} today!</span>
              <span className="hidden md:inline">Exciting! You have {todayEvents.length} event{todayEvents.length > 1 ? 's' : ''} happening today!</span>
            </p>
          </div>
          <div className="order-3 mt-2 flex-shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto flex items-center gap-2">
            <a
              href="/#/events"
              className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200"
            >
              Check it out
            </a>
            <button
              onClick={handleDismiss}
              className="flex items-center justify-center p-2 text-green-700 hover:text-green-800 hover:bg-green-200 rounded-md transition-colors duration-150"
              title="Dismiss for 4 hours"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AlertsProvider = ({ children, notes, expanded = true, events, setNotes }) => {
  const [EventAlertsComponent, setEventAlertsComponent] = useState(null);

  useEffect(() => {
    import('./EventAlerts').then(module => {
      setEventAlertsComponent(() => module.default);
    });
  }, []);

  const handleDismissUnacknowledgedMeeting = async (noteId) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    // Add the acknowledged tag with timestamp
    const ackLine = `meta::meeting_acknowledge::${new Date().toISOString()}`;
    const updatedContent = `${note.content}\n${ackLine}`;
    
    try {
      await updateNoteById(noteId, updatedContent);
      // Update the notes state to reflect the change
      setNotes(notes.map(n => n.id === noteId ? { ...n, content: updatedContent } : n));
    } catch (error) {
      console.error('Error acknowledging meeting:', error);
    }
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <div className="space-y-4 w-full">
        <TodayEventsBar events={events} />
        <BackupAlert notes={notes} expanded={true} />
        <RemindersAlert allNotes={notes} expanded={true} setNotes={setNotes} />
        <div className="flex gap-4">
          <div className="w-1/3">
            <UpcomingDeadlinesAlert 
              notes={notes} 
              expanded={true} 
              addNote={addNewNoteCommon}
              setNotes={setNotes}
            />
          </div>
          <div className="w-1/3">
            <UpcomingEventsAlert 
              notes={notes} 
              expanded={false} 
              setNotes={setNotes}
            />
          </div>
          <div className="w-1/3">
            <UpcomingHolidaysAlert 
              notes={notes} 
              expanded={false} 
              setNotes={setNotes}
            />
          </div>
        </div>
        <MeetingManager 
          allNotes={notes}
          setNotes={setNotes}
          searchQuery=''
          currentDate=''
        />
        <AlertsContainer 
          expanded={true}
          notes={notes} 
          events={events}
          setNotes={setNotes}
        >
          {EventAlertsComponent && (
            <EventAlertsComponent 
              events={events}
              expanded={true}
              onAcknowledgeEvent={async (eventId, year) => {
                try {
                  const event = events.find(e => e.id === eventId);
                  if (!event) return;
                  
                  const metaTag = `meta::acknowledged::${year}`;
                  if (event.content.includes(metaTag)) {
                    return; // Already acknowledged
                  }
                  
                  const updatedContent = event.content.trim() + `\n${metaTag}`;
                  await updateNoteById(eventId, updatedContent);
                  
                  // Update the events state to reflect the change
                  const updatedEvents = events.map(e => 
                    e.id === eventId ? { ...e, content: updatedContent } : e
                  );
                  // Note: We can't update events directly here, but the acknowledgment will be reflected
                  // when the component re-renders with fresh data
                } catch (error) {
                  console.error('Error acknowledging event:', error);
                }
              }}
            />
          )}
          <div className="w-full" data-section="review-overdue">
            <ReviewOverdueAlert notes={notes} expanded={true} setNotes={setNotes} />
          </div>
          <UnacknowledgedMeetingsAlert 
            notes={notes} 
            expanded={true}
            onDismiss={handleDismissUnacknowledgedMeeting}
          />
        </AlertsContainer>
      </div>
      {children}
    </>
  );
};

export { Alerts, AlertsProvider }; 