import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDownIcon, ChevronUpIcon, BellIcon, CheckIcon, ClockIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import CadenceSelector from './CadenceSelector';
import { Alerts } from './Alerts';
import { findDueReminders, addCurrentDateToLocalStorage, getLastReviewObject, parseReviewCadenceMeta } from '../utils/CadenceHelpUtils';

// Color options for reminders
const REMINDER_COLORS = [
  { name: 'yellow', bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-800', hover: 'hover:bg-yellow-200' },
  { name: 'blue', bg: 'bg-blue-100', border: 'border-blue-200', text: 'text-blue-800', hover: 'hover:bg-blue-200' },
  { name: 'green', bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-800', hover: 'hover:bg-green-200' },
  { name: 'red', bg: 'bg-red-100', border: 'border-red-200', text: 'text-red-800', hover: 'hover:bg-red-200' },
  { name: 'purple', bg: 'bg-purple-100', border: 'border-purple-200', text: 'text-purple-800', hover: 'hover:bg-purple-200' }
];

const RemindersAlert = ({ allNotes, expanded: initialExpanded = true, setNotes, isRemindersOnlyMode = false }) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [expandedDetails, setExpandedDetails] = useState({});
  const [hoveredNote, setHoveredNote] = useState(null);
  const [showCadenceSelector, setShowCadenceSelector] = useState(null);
  const [reminderObjs, setReminderObjs] = useState([]);
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [focusedReminderIndex, setFocusedReminderIndex] = useState(-1);
  const [isWaitingForJump, setIsWaitingForJump] = useState(false);
  const [isWaitingForDoubleG, setIsWaitingForDoubleG] = useState(false);
  const [showRelativeNumbers, setShowRelativeNumbers] = useState(() => {
    const saved = localStorage.getItem('remindersRelativeNumbers');
    return saved ? JSON.parse(saved) : true;
  });
  const [expandedOptions, setExpandedOptions] = useState({});
  const [reminderColors, setReminderColors] = useState(() => {
    const saved = localStorage.getItem('reminderColors');
    return saved ? JSON.parse(saved) : {};
  });
  const [reminderGroups, setReminderGroups] = useState(() => {
    const saved = localStorage.getItem('reminderGroups');
    return saved ? JSON.parse(saved) : {};
  });
  const [showColorSelector, setShowColorSelector] = useState(null);
  const [showGroupInput, setShowGroupInput] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('');
  const [selectedColorFilter, setSelectedColorFilter] = useState('');
  const [selectedCadenceFilter, setSelectedCadenceFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [yellowMode, setYellowMode] = useState(() => {
    const saved = localStorage.getItem('remindersYellowMode');
    return saved ? JSON.parse(saved) : false;
  });
  const numberBufferRef = useRef('');
  const [showGroupDropdown, setShowGroupDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [groupByMode, setGroupByMode] = useState(() => {
    const saved = localStorage.getItem('remindersGroupByMode');
    return saved ? saved : 'color'; // 'color', 'title', or 'cadence'
  });

  // Function to get color for a specific reminder
  const getReminderColor = (noteId) => {
    if (yellowMode) {
      return 'yellow'; // Force yellow when yellow mode is enabled
    }
    return reminderColors[noteId] || 'yellow'; // Default to yellow
  };

  // Function to get color classes for a reminder
  const getReminderColorClasses = (noteId) => {
    const colorName = getReminderColor(noteId);
    const colorConfig = REMINDER_COLORS.find(c => c.name === colorName) || REMINDER_COLORS[0];
    return colorConfig;
  };

  // Function to handle color selection
  const handleColorSelect = (noteId, colorName) => {
    const newColors = { ...reminderColors, [noteId]: colorName };
    setReminderColors(newColors);
    localStorage.setItem('reminderColors', JSON.stringify(newColors));
    setShowColorSelector(null);
  };

  // Function to handle yellow mode toggle
  const handleYellowModeToggle = () => {
    const newYellowMode = !yellowMode;
    setYellowMode(newYellowMode);
    localStorage.setItem('remindersYellowMode', JSON.stringify(newYellowMode));
    
    // If enabling yellow mode, switch away from color grouping
    if (newYellowMode && groupByMode === 'color') {
      handleGroupByModeChange('title');
    }
  };

  // Function to handle group by mode change
  const handleGroupByModeChange = (newMode) => {
    setGroupByMode(newMode);
    localStorage.setItem('remindersGroupByMode', newMode);
  };

  // Function to determine cadence type from a note
  const getCadenceType = (note) => {
    const currentCadence = getCurrentCadence(note);
    if (!currentCadence) return 'No Cadence';
    
    // Handle new format
    if (typeof currentCadence === 'object') {
      const meta = currentCadence;
      
      if (meta.type === 'every-x-hours') {
        const hours = meta.hours || 0;
        const minutes = meta.minutes || 0;
        const totalHours = hours + (minutes / 60);
        
        if (totalHours < 24) return 'Hourly';
        if (totalHours === 24) return 'Daily';
        const days = Math.round(totalHours / 24);
        if (days < 7) return 'Daily';
        if (days < 30) return 'Weekly';
        if (days < 365) return 'Monthly';
        return 'Yearly';
      } else if (meta.type === 'daily') {
        return 'Daily';
      } else if (meta.type === 'weekly') {
        return 'Weekly';
      } else if (meta.type === 'monthly') {
        return 'Monthly';
      }
    }
    
    // Handle old format
    if (typeof currentCadence === 'string') {
      const match = currentCadence.match(/(\d+)([hd])/);
      if (!match) return 'Unknown';
      
      const [, amount, unit] = match;
      const num = parseInt(amount);
      
      if (unit === 'h') {
        if (num < 24) return 'Hourly';
        if (num === 24) return 'Daily';
        const days = Math.round(num / 24);
        if (days < 7) return 'Daily';
        if (days < 30) return 'Weekly';
        if (days < 365) return 'Monthly';
        return 'Yearly';
      } else if (unit === 'd') {
        if (num === 1) return 'Daily';
        if (num < 7) return 'Daily';
        if (num < 30) return 'Weekly';
        if (num < 365) return 'Monthly';
        return 'Yearly';
      }
    }
    
    return 'Unknown';
  };

  // Function to group reminders by color
  const groupRemindersByColor = (reminders) => {
    const grouped = {};
    reminders.forEach(reminder => {
      const color = getReminderColor(reminder.note.id);
      if (!grouped[color]) grouped[color] = [];
      grouped[color].push(reminder);
    });
    return grouped;
  };

  const groupRemindersByTitle = (reminders) => {
    const grouped = {};
    reminders.forEach(reminder => {
      const group = getReminderGroup(reminder.note.id) || 'No Group';
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(reminder);
    });
    return grouped;
  };

  const groupRemindersByCadence = (reminders) => {
    const grouped = {};
    reminders.forEach(reminder => {
      const cadenceType = getCadenceType(reminder.note);
      if (!grouped[cadenceType]) grouped[cadenceType] = [];
      grouped[cadenceType].push(reminder);
    });
    return grouped;
  };

  const getGroupedReminders = (reminders) => {
    if (groupByMode === 'color') return groupRemindersByColor(reminders);
    if (groupByMode === 'title') return groupRemindersByTitle(reminders);
    if (groupByMode === 'cadence') return groupRemindersByCadence(reminders);
    return groupRemindersByColor(reminders); // Default fallback
  };

  const getFlatRemindersList = () => {
    const filteredActiveReminders = applyAllFilters(reminderObjs);
    const filteredUpcomingReminders = applyAllFilters(upcomingReminders);
    return [...filteredActiveReminders, ...filteredUpcomingReminders];
  };

  const getReminderByIndex = (index) => {
    const flatList = getFlatRemindersList();
    return flatList[index];
  };

  const getReminderIndex = (reminderObj) => {
    const flatList = getFlatRemindersList();
    return flatList.findIndex(item => item.note.id === reminderObj.note.id);
  };

  // Function to get unique group names from reminders
  const getUniqueGroups = (reminders) => {
    const groups = new Set();
    reminders.forEach(reminder => {
      const group = getReminderGroup(reminder.note.id);
      if (group) {
        groups.add(group);
      }
    });
    return Array.from(groups).sort();
  };

  // Function to filter reminders by group
  const filterRemindersByGroup = (reminders, groupName) => {
    if (!groupName) return reminders;
    return reminders.filter(reminder => getReminderGroup(reminder.note.id) === groupName);
  };

  // Function to filter reminders by color
  const filterRemindersByColor = (reminders, colorName) => {
    if (!colorName) return reminders;
    return reminders.filter(reminder => getReminderColor(reminder.note.id) === colorName);
  };

  // Function to filter reminders by cadence
  const filterRemindersByCadence = (reminders, cadenceType) => {
    if (!cadenceType) return reminders;
    return reminders.filter(reminder => getCadenceType(reminder.note) === cadenceType);
  };

  // Function to apply color, group, and cadence filters
  const applyFilters = (reminders) => {
    let filtered = reminders;
    if (selectedColorFilter) {
      filtered = filterRemindersByColor(filtered, selectedColorFilter);
    }
    if (selectedGroupFilter) {
      filtered = filterRemindersByGroup(filtered, selectedGroupFilter);
    }
    if (selectedCadenceFilter) {
      filtered = filterRemindersByCadence(filtered, selectedCadenceFilter);
    }
    return filtered;
  };

  // Function to perform fuzzy search
  const fuzzySearch = (reminders, query) => {
    if (!query.trim()) return reminders;
    
    const searchTerm = query.toLowerCase();
    return reminders.filter(reminder => {
      const note = reminder.note;
      const content = note.content.toLowerCase();
      const group = getReminderGroup(note.id).toLowerCase();
      
      // Search in content
      if (content.includes(searchTerm)) return true;
      
      // Search in group name
      if (group.includes(searchTerm)) return true;
      
      // Search in individual lines
      const lines = note.content.split('\n');
      return lines.some(line => 
        line.toLowerCase().includes(searchTerm) && 
        !line.startsWith('meta::')
      );
    });
  };

  // Function to apply all filters (search + color + group + cadence)
  const applyAllFilters = (reminders) => {
    let filtered = reminders;
    
    // Apply search filter first
    if (searchQuery.trim()) {
      filtered = fuzzySearch(filtered, searchQuery);
    }
    
    // Apply color, group, and cadence filters
    if (selectedColorFilter) {
      filtered = filterRemindersByColor(filtered, selectedColorFilter);
    }
    if (selectedGroupFilter) {
      filtered = filterRemindersByGroup(filtered, selectedGroupFilter);
    }
    if (selectedCadenceFilter) {
      filtered = filterRemindersByCadence(filtered, selectedCadenceFilter);
    }
    
    return filtered;
  };

  // Function to handle group filter selection
  const handleGroupFilterSelect = (groupName) => {
    setSelectedGroupFilter(selectedGroupFilter === groupName ? '' : groupName);
  };

  // Function to handle color filter selection
  const handleColorFilterSelect = (colorName) => {
    setSelectedColorFilter(selectedColorFilter === colorName ? '' : colorName);
  };

  // Function to handle cadence filter selection
  const handleCadenceFilterSelect = (cadenceType) => {
    setSelectedCadenceFilter(selectedCadenceFilter === cadenceType ? '' : cadenceType);
  };

  // Function to get group name for a specific reminder
  const getReminderGroup = (noteId) => {
    return reminderGroups[noteId] || '';
  };

  // Function to handle group name change
  const handleGroupNameChange = (noteId, groupName) => {
    const newGroups = { ...reminderGroups, [noteId]: groupName };
    setReminderGroups(newGroups);
    localStorage.setItem('reminderGroups', JSON.stringify(newGroups));
    setShowGroupInput(null);
    setEditingGroupName('');
  };

  // Function to start editing group name
  const startEditGroupName = (noteId) => {
    setShowGroupInput(noteId);
    setEditingGroupName(getReminderGroup(noteId));
  };

  // Function to cancel group name editing
  const cancelEditGroupName = () => {
    setShowGroupInput(null);
    setEditingGroupName('');
  };

  const toggleGroupDropdown = (noteId, event) => {
    if (showGroupDropdown === noteId) {
      setShowGroupDropdown(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
      setShowGroupDropdown(noteId);
    }
  };

  const selectGroupFromDropdown = (noteId, groupName) => {
    handleGroupNameChange(noteId, groupName);
    setShowGroupDropdown(null);
  };

  useEffect(() => {
    const dueReminders = findDueReminders(allNotes);
    setReminderObjs(dueReminders);

    // Find upcoming reminders (not yet due)
    const upcoming = allNotes
      .filter(note => {
        const lastReview = getLastReviewObject(note);
        if (!lastReview) return false;
        
        const cadenceMatch = note.content.match(/meta::cadence::([^\n]+)/);
        if (!cadenceMatch) return false;
        
        const cadence = cadenceMatch[1];
        const nextReview = new Date(lastReview.date);
        
        // Parse cadence and add to nextReview
        const match = cadence.match(/(\d+)([hd])/);
        if (!match) return false;
        
        const [, amount, unit] = match;
        if (unit === 'h') {
          nextReview.setHours(nextReview.getHours() + parseInt(amount));
        } else if (unit === 'd') {
          nextReview.setDate(nextReview.getDate() + parseInt(amount));
        }
        
        return nextReview > new Date();
      })
      .map(note => ({
        note,
        nextReview: (() => {
          const lastReview = getLastReviewObject(note);
          const cadenceMatch = note.content.match(/meta::cadence::([^\n]+)/);
          const cadence = cadenceMatch[1];
          const nextReview = new Date(lastReview.date);
          
          const match = cadence.match(/(\d+)([hd])/);
          const [, amount, unit] = match;
          if (unit === 'h') {
            nextReview.setHours(nextReview.getHours() + parseInt(amount));
          } else if (unit === 'd') {
            nextReview.setDate(nextReview.getDate() + parseInt(amount));
          }
          
          return nextReview;
        })()
      }))
      .sort((a, b) => a.nextReview - b.nextReview);

    setUpcomingReminders(upcoming);
  }, [allNotes]);

  // Add keyboard navigation for reminders-only mode
  useEffect(() => {
    if (!isRemindersOnlyMode) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const flatReminders = getFlatRemindersList();
      const totalReminders = flatReminders.length;
      if (totalReminders === 0) return;

      // Handle number input for jump navigation (like 4j)
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        numberBufferRef.current += e.key;
        setIsWaitingForJump(true);
        
        // Set a timeout to clear the buffer if no 'j' is pressed
        setTimeout(() => {
          if (isWaitingForJump) {
            numberBufferRef.current = '';
            setIsWaitingForJump(false);
          }
        }, 2000);
        return;
      }

      // Handle 'j' key for relative movement down
      if (isWaitingForJump && e.key === 'j' && numberBufferRef.current.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const steps = parseInt(numberBufferRef.current);
        setFocusedReminderIndex(prev => {
          const newIndex = prev + steps;
          return newIndex < totalReminders ? newIndex : totalReminders - 1;
        });
        numberBufferRef.current = '';
        setIsWaitingForJump(false);
        return;
      }

      // Handle 'k' key for relative movement up
      if (isWaitingForJump && e.key === 'k' && numberBufferRef.current.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const steps = parseInt(numberBufferRef.current);
        setFocusedReminderIndex(prev => {
          const newIndex = prev - steps;
          return newIndex >= 0 ? newIndex : 0;
        });
        numberBufferRef.current = '';
        setIsWaitingForJump(false);
        return;
      }

      // Handle 'g' key (gg for first item)
      if (e.key === 'g') {
        e.preventDefault();
        e.stopPropagation();
        
        if (isWaitingForDoubleG) {
          // Double 'g' pressed - go to first item
          setFocusedReminderIndex(0);
          setIsWaitingForDoubleG(false);
        } else {
          // First 'g' pressed - wait for second 'g'
          setIsWaitingForDoubleG(true);
          setTimeout(() => {
            setIsWaitingForDoubleG(false);
          }, 300); // 300ms timeout for double 'g'
        }
        return;
      }

      // Handle 'G' key (last item)
      if (e.key === 'G') {
        e.preventDefault();
        e.stopPropagation();
        setFocusedReminderIndex(totalReminders - 1);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setFocusedReminderIndex(prev => 
          prev > 0 ? prev - 1 : totalReminders - 1
        );
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setFocusedReminderIndex(prev => 
          prev < totalReminders - 1 ? prev + 1 : 0
        );
      } else if (e.key === 's' && focusedReminderIndex >= 0) {
        e.preventDefault();
        e.stopPropagation();
        // Handle 's' key - snooze the focused reminder
        const focusedReminder = getReminderByIndex(focusedReminderIndex);
        if (focusedReminder) {
          // Snooze the focused reminder and move focus to next item
          handleDismissAndMoveFocus(focusedReminder.note);
        }
      } else if (e.key === 'ArrowRight' && focusedReminderIndex >= 0) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        // Handle right arrow - open cadence selector on focused reminder
        const allReminders = [...reminderObjs, ...upcomingReminders];
        const focusedReminder = allReminders[focusedReminderIndex];
        if (focusedReminder && showCadenceSelector !== focusedReminder.note.id) {
          // Open cadence selector for the focused reminder
          setShowCadenceSelector(focusedReminder.note.id);
        }
        return;
      } else if (e.key === 'ArrowLeft' && focusedReminderIndex >= 0) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        // Handle left arrow - close cadence selector
        setShowCadenceSelector(null);
        return;
      } else if (e.key === 'Enter' && focusedReminderIndex >= 0) {
        e.preventDefault();
        e.stopPropagation();
        // Handle Enter key - open link in the focused reminder
        const allReminders = [...reminderObjs, ...upcomingReminders];
        const focusedReminder = allReminders[focusedReminderIndex];
        if (focusedReminder) {
          // Extract URLs from the reminder content
          const content = focusedReminder.note.content;
          
          // Regex to match both markdown-style links [text](url) and plain URLs
          const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
          const plainUrlRegex = /(https?:\/\/[^\s)]+)/g;
          
          const links = [];
          
          // Extract markdown-style links first
          let match;
          while ((match = markdownLinkRegex.exec(content)) !== null) {
            links.push({
              url: match[2],
              text: match[1]
            });
          }
          
          // Extract plain URLs (excluding those already found in markdown links)
          const markdownUrls = links.map(link => link.url);
          while ((match = plainUrlRegex.exec(content)) !== null) {
            if (!markdownUrls.includes(match[1])) {
              links.push({
                url: match[1],
                text: match[1] // Use URL as text for plain URLs
              });
            }
          }
          
          if (links.length === 1) {
            // Open the single link
            window.open(links[0].url, '_blank');
          } else if (links.length > 1) {
            // Show popup with multiple links (similar to NotesList functionality)
            
            // For now, just open the first link
            window.open(links[0].url, '_blank');
          } else {
            
          }
        }
      } else if (e.key === 'l' && focusedReminderIndex >= 0) {
        e.preventDefault();
        e.stopPropagation();
        // Handle 'l' key - open link in the focused reminder
        const allReminders = [...reminderObjs, ...upcomingReminders];
        const focusedReminder = allReminders[focusedReminderIndex];
        if (focusedReminder) {
          // Extract URLs from the reminder content
          const content = focusedReminder.note.content;
          
          // Regex to match both markdown-style links [text](url) and plain URLs
          const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
          const plainUrlRegex = /(https?:\/\/[^\s)]+)/g;
          
          const links = [];
          
          // Extract markdown-style links first
          let match;
          while ((match = markdownLinkRegex.exec(content)) !== null) {
            links.push({
              url: match[2],
              text: match[1]
            });
          }
          
          // Extract plain URLs (excluding those already found in markdown links)
          const markdownUrls = links.map(link => link.url);
          while ((match = plainUrlRegex.exec(content)) !== null) {
            if (!markdownUrls.includes(match[1])) {
              links.push({
                url: match[1],
                text: match[1] // Use URL as text for plain URLs
              });
            }
          }
          
          if (links.length === 1) {
            // Open the single link
            window.open(links[0].url, '_blank');
          } else if (links.length > 1) {
            // Show popup with multiple links (similar to NotesList functionality)
            
            // For now, just open the first link
            window.open(links[0].url, '_blank');
          } else {
            
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isRemindersOnlyMode, reminderObjs.length, upcomingReminders.length, focusedReminderIndex, isWaitingForJump, isWaitingForDoubleG]);

  // Reset focused index when reminders change
  useEffect(() => {
    setFocusedReminderIndex(-1);
  }, [reminderObjs, upcomingReminders]);

  // Scroll to focused reminder when it changes
  useEffect(() => {
    if (isRemindersOnlyMode && focusedReminderIndex >= 0) {
      const allReminders = [...reminderObjs, ...upcomingReminders];
      const focusedReminder = allReminders[focusedReminderIndex];
      if (focusedReminder) {
        // Find the DOM element and scroll to it
        const reminderElement = document.querySelector(`[data-reminder-id="${focusedReminder.note.id}"]`);
        if (reminderElement) {
          reminderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [focusedReminderIndex, isRemindersOnlyMode, reminderObjs, upcomingReminders]);

  // Add the vibrating animation style for the bell icon
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes vibrate {
          0% { transform: rotate(0deg); }
          20% { transform: rotate(-15deg); }
          40% { transform: rotate(12deg); }
          60% { transform: rotate(-9deg); }
          80% { transform: rotate(6deg); }
          100% { transform: rotate(0deg); }
        }
        .bell-vibrate {
          animation: vibrate 0.3s ease-in-out infinite;
          transform-origin: top;
        }
      `;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showGroupDropdown && !event.target.closest('[data-group-dropdown]')) {
        setShowGroupDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showGroupDropdown]);

  const handleDismiss = async (note) => {
    try {
      addCurrentDateToLocalStorage(note.id);
      setReminderObjs(findDueReminders(allNotes));
    } catch (error) {
      console.error('Error dismissing reminder:', error);
      Alerts.error('Failed to dismiss reminder');
    }
  };

  const handleDismissAndMoveFocus = async (note) => {
    try {
      // Get current reminders before dismissing
      const allReminders = [...reminderObjs, ...upcomingReminders];
      const currentIndex = focusedReminderIndex;
      
      // Dismiss the reminder
      await handleDismiss(note);
      
      // After dismissing, get the updated reminders
      const updatedReminders = [...reminderObjs, ...upcomingReminders];
      const totalReminders = updatedReminders.length;
      
      if (totalReminders === 0) {
        // No reminders left, clear focus
        setFocusedReminderIndex(-1);
      } else if (currentIndex >= totalReminders) {
        // If we were at the last item, move to the new last item
        setFocusedReminderIndex(totalReminders - 1);
      } else {
        // Move to the next item (same index, but the list has shifted)
        setFocusedReminderIndex(currentIndex);
      }
    } catch (error) {
      console.error('Error dismissing reminder and moving focus:', error);
      Alerts.error('Failed to dismiss reminder');
    }
  };

  const handleEditNote = (noteId) => {
    // Navigate to notes page with search query to show only this specific note
    const searchQuery = `id:${noteId}`;
    navigate('/notes', { state: { searchQuery } });
  };

  const toggleOptions = (noteId) => {
    setExpandedOptions(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  };

  const toggleDetails = (noteId) => {
    setExpandedDetails(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  };

  const formatReminderContent = (content, isExpanded, toggleDetails) => {
    // Only count/display non-meta and non-blank lines
    const lines = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('meta::'));

    // Helper to render a line with URL logic
    const renderLine = (line, key) => {
      // Markdown link: [text](url)
      const markdownMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
      if (markdownMatch) {
        const text = markdownMatch[1];
        const url = markdownMatch[2];
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800"
          >
            {text}
          </a>
        );
      }
      // Plain URL
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urlMatch = line.match(urlRegex);
      if (urlMatch) {
        // Replace all URLs in the line with clickable links (host name as text)
        let lastIndex = 0;
        const parts = [];
        urlMatch.forEach((url, i) => {
          const index = line.indexOf(url, lastIndex);
          if (index > lastIndex) {
            parts.push(line.slice(lastIndex, index));
          }
          const host = url.replace(/^https?:\/\//, '').split('/')[0];
          parts.push(
            <a
              key={key + '-url-' + i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              {host}
            </a>
          );
          lastIndex = index + url.length;
        });
        if (lastIndex < line.length) {
          parts.push(line.slice(lastIndex));
        }
        return <span key={key}>{parts}</span>;
      }
      // No URL, render as plain text
      return <span key={key}>{line}</span>;
    };

    // Swap logic: if first line is a URL and second is plain text, swap for display
    let firstLine = lines[0] || '';
    let secondLine = lines[1] || '';
    const urlRegex = /^(https?:\/\/[^\s]+)$/;
    if (lines.length >= 2 && urlRegex.test(firstLine) && !urlRegex.test(secondLine)) {
      // Also check that second line is not a markdown link
      const markdownLinkRegex = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/;
      if (!markdownLinkRegex.test(secondLine)) {
        // Swap
        [firstLine, secondLine] = [secondLine, firstLine];
      }
    }
    const remainingLines = lines.slice(2);

    return (
      <>
        <div className="font-medium">{renderLine(firstLine, 'first')}</div>
        {secondLine && <div className="mt-1 text-gray-600">{renderLine(secondLine, 'second')}</div>}
        {lines.length > 2 && (
          <>
            {isExpanded ? (
              <div className="mt-2 text-gray-600">
                {remainingLines.map((line, index) => (
                  <div key={index}>{renderLine(line, 'rem-' + index)}</div>
                ))}
              </div>
            ) : null}
            <button
              onClick={toggleDetails}
              className="mt-1 text-sm text-blue-600 hover:text-blue-800"
            >
              {isExpanded ? 'Show less' : `Show more (${lines.length - 2} more line${lines.length - 2 > 1 ? 's' : ''})`}
            </button>
          </>
        )}
      </>
    );
  };



  const formatDate = (date) => {
    const now = new Date();
    const diff = date - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `in ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return 'soon';
    }
  };

  // Calculate relative position for vim navigation
  const getRelativePosition = (currentIndex, focusedIndex, totalItems) => {
    if (focusedIndex === -1) return null;
    const relativePos = Math.abs(currentIndex - focusedIndex);
    if (relativePos === 0) return '0';
    return `${relativePos}`;
  };

  // Calculate time since reminder became active (overdue time)
  const toggleRelativeNumbers = () => {
    const newValue = !showRelativeNumbers;
    setShowRelativeNumbers(newValue);
    localStorage.setItem('remindersRelativeNumbers', JSON.stringify(newValue));
  };

  const getTimeSinceActive = (note) => {
    const lastReview = getLastReviewObject(note);
    if (!lastReview) {
      
      return 'no review history';
    }
    
    // Get the cadence from the note
    const cadenceMatch = note.content.match(/meta::cadence::([^\n]+)/);
    if (!cadenceMatch) {
      
      return 'no cadence set';
    }
    
    const cadence = cadenceMatch[1];
    const lastReviewDate = new Date(lastReview.date);
    
    // Validate the date
    if (isNaN(lastReviewDate.getTime())) {
      
      return 'invalid date';
    }
    
    // Calculate when the next review should have been (last review + cadence)
    const nextReviewDate = new Date(lastReviewDate);
    const match = cadence.match(/(\d+)([hd])/);
    if (!match) {
      
      return 'invalid cadence';
    }
    
    const [, amount, unit] = match;
    if (unit === 'h') {
      nextReviewDate.setHours(nextReviewDate.getHours() + parseInt(amount));
    } else if (unit === 'd') {
      nextReviewDate.setDate(nextReviewDate.getDate() + parseInt(amount));
    }
    
    // Calculate how long it's been overdue (current time - when it should have been reviewed)
    const now = new Date();
    const overdueMs = now - nextReviewDate;
    
    if (overdueMs <= 0) {
      return 'not due yet';
    }
    
    const days = Math.floor(overdueMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((overdueMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h overdue`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m overdue`;
    } else if (minutes > 0) {
      return `${minutes}m overdue`;
    } else {
      return 'just overdue';
    }
  };

  // Function to get current cadence from a note
  const getCurrentCadence = (note) => {
    // First try the new format
    const meta = parseReviewCadenceMeta(note.content);
    if (meta) {
      return meta;
    }
    
    // Fallback to old format
    const cadenceMatch = note.content.match(/meta::cadence::([^\n]+)/);
    if (!cadenceMatch) return null;
    return cadenceMatch[1];
  };



  // Function to convert cadence to human-readable format
  const getHumanReadableCadence = (note) => {
    const currentCadence = getCurrentCadence(note);
    if (!currentCadence) return null;
    
    // Handle new format
    if (typeof currentCadence === 'object') {
      const meta = currentCadence;
      
      if (meta.type === 'every-x-hours') {
        const hours = meta.hours || 0;
        const minutes = meta.minutes || 0;
        const totalHours = hours + (minutes / 60);
        
        if (totalHours === 1) return 'Every hour';
        if (totalHours < 24) return `Every ${Math.round(totalHours)} hours`;
        if (totalHours === 24) return 'Daily';
        const days = Math.round(totalHours / 24);
        if (days === 1) return 'Daily';
        return `Every ${days} days`;
      } else if (meta.type === 'daily') {
        const time = meta.time || '09:00';
        const [hours, minutes] = time.split(':').map(Number);
        const hour = hours % 12 || 12;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        return `Daily at ${hour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      } else if (meta.type === 'weekly') {
        const time = meta.time || '09:00';
        const [hours, minutes] = time.split(':').map(Number);
        const hour = hours % 12 || 12;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const days = Array.isArray(meta.days) ? meta.days : [];
        const selectedDays = days.map(idx => dayNames[idx]).join(', ');
        return `Weekly on ${selectedDays || 'all days'} at ${hour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      } else if (meta.type === 'monthly') {
        const time = meta.time || '09:00';
        const [hours, minutes] = time.split(':').map(Number);
        const hour = hours % 12 || 12;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        return `Monthly on day ${meta.day || 1} at ${hour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      }
    }
    
    // Handle old format
    if (typeof currentCadence === 'string') {
      const match = currentCadence.match(/(\d+)([hd])/);
      if (!match) return currentCadence;
      
      const [, amount, unit] = match;
      const num = parseInt(amount);
      
      if (unit === 'h') {
        if (num === 1) return 'Every hour';
        return `Every ${num} hours`;
      } else if (unit === 'd') {
        if (num === 1) return 'Daily';
        return `Every ${num} days`;
      }
      
      return currentCadence;
    }
    
    return null;
  };

  // Portal-based dropdown to avoid overflow clipping
  const renderDropdownPortal = () => {
    if (!showGroupDropdown) return null;

    const dropdownContent = (
      <div 
        className="fixed z-50 w-32 bg-white border border-gray-300 rounded-md shadow-lg max-h-32 overflow-y-auto" 
        data-group-dropdown 
        style={{ 
          top: dropdownPosition.top,
          left: dropdownPosition.left
        }}
      >
        <div className="py-1">
          {getUniqueGroups(reminderObjs).length > 0 && (
            <>
              {getUniqueGroups(reminderObjs).map((groupName) => (
                <button
                  key={groupName}
                  onClick={() => selectGroupFromDropdown(showGroupDropdown, groupName)}
                  className="block w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 truncate"
                  title={groupName}
                >
                  {groupName}
                </button>
              ))}
              <div className="border-t border-gray-200 my-1"></div>
            </>
          )}
          <button
            onClick={() => {
              setShowGroupDropdown(null);
              startEditGroupName(showGroupDropdown);
            }}
            className="block w-full text-left px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 font-medium"
          >
            + New Group
          </button>
        </div>
      </div>
    );

    return ReactDOM.createPortal(dropdownContent, document.body);
  };

  if (reminderObjs.length === 0 && upcomingReminders.length === 0) return null;

  return (
    <>
      <div className="space-y-4 w-full">
        {/* Number buffer indicator */}
        {isRemindersOnlyMode && isWaitingForJump && (
          <div className="fixed top-4 right-4 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg z-50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Jump to:</span>
              <span className="text-lg font-bold">{numberBufferRef.current}</span>
              <span className="text-xs opacity-75">Press j/k</span>
            </div>
          </div>
        )}

        {/* Relative numbers toggle */}
        {isRemindersOnlyMode && (
          <div className="fixed top-24 left-4 bg-white border border-gray-300 rounded-lg shadow-lg z-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Numbers:</span>
              <button
                onClick={toggleRelativeNumbers}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  showRelativeNumbers ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    showRelativeNumbers ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}
        
        {/* Active Reminders Section */}
        {reminderObjs.length > 0 && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-1/10">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="block w-full pl-8 pr-6 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Yellow Mode Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleYellowModeToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 ${
                    yellowMode ? 'bg-yellow-500' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      yellowMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Color, Group, and Cadence Filter Buttons */}
              <div className="flex flex-wrap gap-1 flex-1">
                {!yellowMode && Object.entries(groupRemindersByColor(reminderObjs)).map(([colorName, colorReminders]) => {
                  const colorConfig = REMINDER_COLORS.find(c => c.name === colorName) || REMINDER_COLORS[0];
                  return (
                    <button
                      key={colorName}
                      onClick={() => handleColorFilterSelect(colorName)}
                      className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors duration-150 text-xs ${
                        selectedColorFilter === colorName
                          ? `${colorConfig.bg} ${colorConfig.border} ${colorConfig.text} ring-1 ring-blue-300`
                          : `${colorConfig.bg} ${colorConfig.border} ${colorConfig.text} hover:${colorConfig.hover}`
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${colorConfig.bg.replace('bg-', 'bg-').replace('-100', '-500')} border ${colorConfig.border}`}></div>
                      <span className="font-medium capitalize">
                        {colorName} ({colorReminders.length})
                      </span>
                    </button>
                  );
                })}
                {getUniqueGroups(reminderObjs).map((groupName) => (
                  <button
                    key={groupName}
                    onClick={() => handleGroupFilterSelect(groupName)}
                    className={`px-2 py-1 text-xs font-medium rounded border transition-colors duration-150 ${
                      selectedGroupFilter === groupName
                        ? 'bg-blue-100 text-blue-700 border-blue-300 ring-1 ring-blue-300'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {groupName} ({filterRemindersByGroup(reminderObjs, groupName).length})
                  </button>
                ))}
                {Object.entries(groupRemindersByCadence(reminderObjs)).map(([cadenceType, cadenceReminders]) => (
                  <button
                    key={cadenceType}
                    onClick={() => handleCadenceFilterSelect(cadenceType)}
                    className={`px-2 py-1 text-xs font-medium rounded border transition-colors duration-150 ${
                      selectedCadenceFilter === cadenceType
                        ? 'bg-purple-100 text-purple-700 border-purple-300 ring-1 ring-purple-300'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        cadenceType === 'Hourly' ? 'bg-blue-500' :
                        cadenceType === 'Daily' ? 'bg-green-500' :
                        cadenceType === 'Weekly' ? 'bg-yellow-500' :
                        cadenceType === 'Monthly' ? 'bg-orange-500' :
                        cadenceType === 'Yearly' ? 'bg-red-500' :
                        'bg-gray-500'
                      } border border-gray-300`}></div>
                      <span>{cadenceType} ({cadenceReminders.length})</span>
                    </div>
                  </button>
                ))}
              </div>

              {(selectedColorFilter || selectedGroupFilter || selectedCadenceFilter || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedColorFilter('');
                    setSelectedGroupFilter('');
                    setSelectedCadenceFilter('');
                    setSearchQuery('');
                  }}
                  className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-300 rounded hover:bg-gray-100 transition-colors duration-150"
                >
                  Clear All
                </button>
              )}
            </div>
            
            {/* Group By Buttons */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-medium text-gray-700">Group by:</span>
              {!yellowMode && (
                <button
                  onClick={() => handleGroupByModeChange('color')}
                  className={`px-3 py-1 text-xs font-medium rounded border transition-colors duration-150 ${
                    groupByMode === 'color'
                      ? 'bg-blue-100 text-blue-700 border-blue-300 ring-1 ring-blue-300'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  Color
                </button>
              )}
              <button
                onClick={() => handleGroupByModeChange('title')}
                className={`px-3 py-1 text-xs font-medium rounded border transition-colors duration-150 ${
                  groupByMode === 'title'
                    ? 'bg-blue-100 text-blue-700 border-blue-300 ring-1 ring-blue-300'
                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
              >
                Title
              </button>
              <button
                onClick={() => handleGroupByModeChange('cadence')}
                className={`px-3 py-1 text-xs font-medium rounded border transition-colors duration-150 ${
                  groupByMode === 'cadence'
                    ? 'bg-blue-100 text-blue-700 border-blue-300 ring-1 ring-blue-300'
                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
              >
                Cadence
              </button>
            </div>
            
            {/* Render Grouped Reminders */}
            {Object.entries(getGroupedReminders(applyAllFilters(reminderObjs))).map(([groupName, groupReminders]) => (
              <div key={groupName} className="space-y-3">
                {/* Group Header */}
                <div className="flex items-center gap-2">
                  {groupByMode === 'color' ? (
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${REMINDER_COLORS.find(c => c.name === groupName)?.bg.replace('bg-', 'bg-').replace('-100', '-500')} border ${REMINDER_COLORS.find(c => c.name === groupName)?.border}`}></div>
                      <span className="text-sm font-medium text-gray-700 capitalize">{groupName} ({groupReminders.length})</span>
                    </div>
                  ) : groupByMode === 'title' ? (
                    <span className="text-sm font-medium text-gray-700">{groupName} ({groupReminders.length})</span>
                  ) : groupByMode === 'cadence' ? (
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        groupName === 'Hourly' ? 'bg-blue-500' :
                        groupName === 'Daily' ? 'bg-green-500' :
                        groupName === 'Weekly' ? 'bg-yellow-500' :
                        groupName === 'Monthly' ? 'bg-orange-500' :
                        groupName === 'Yearly' ? 'bg-red-500' :
                        'bg-gray-500'
                      } border border-gray-300`}></div>
                      <span className="text-sm font-medium text-gray-700">{groupName} ({groupReminders.length})</span>
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-gray-700">{groupName} ({groupReminders.length})</span>
                  )}
                </div>
                
                {/* Group Reminders */}
                <div className="space-y-3 ml-4">
                  {groupReminders.map((reminderObj, index) => {
                    const note = reminderObj.note;
                    const isDetailsExpanded = expandedDetails[note.id];
                    const isHovered = hoveredNote === note.id;
                    const isFocused = isRemindersOnlyMode && focusedReminderIndex === getReminderIndex(reminderObj);
                    const contentLines = note.content
                      .split('\n')
                      .map(line => line.trim())
                      .filter(line => line.length > 0 && !line.startsWith('meta::'));
                    const hasMoreContent = contentLines.length > 2;
                    
                    // Get color for this reminder
                    const reminderColor = getReminderColor(note.id);
                    const colorConfig = REMINDER_COLORS.find(c => c.name === reminderColor) || REMINDER_COLORS[0];

                    return (
                      <div
                        key={note.id}
                        data-reminder-id={note.id}
                        className={`${colorConfig.bg} border shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-all duration-200 ${
                          isFocused 
                            ? `border-blue-500 ring-2 ring-blue-300 ${colorConfig.bg.replace('-100', '-50')} shadow-xl` 
                            : colorConfig.border
                        }`}
                        onMouseEnter={() => setHoveredNote(note.id)}
                        onMouseLeave={() => setHoveredNote(null)}
                        onClick={() => {
                          if (isRemindersOnlyMode) {
                            setFocusedReminderIndex(getReminderIndex(reminderObj));
                          }
                        }}
                      >
                        <div className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {/* Relative position indicator for vim navigation */}
                              {isRemindersOnlyMode && showRelativeNumbers && (
                                <div className="flex-shrink-0">
                                  <div className="text-xs font-mono font-bold text-gray-600 px-2 py-1 min-w-[2rem] text-center">
                                    {getRelativePosition(getReminderIndex(reminderObj), focusedReminderIndex, getFlatRemindersList().length)}
                                  </div>
                                </div>
                              )}
                              {hasMoreContent && (
                                <button
                                  onClick={() => toggleDetails(note.id)}
                                  className={`${colorConfig.text} hover:${colorConfig.text.replace('text-', 'text-').replace('-800', '-900')} focus:outline-none`}
                                >
                                  {isDetailsExpanded ? (
                                    <ChevronUpIcon className="h-5 w-5" />
                                  ) : (
                                    <ChevronDownIcon className="h-5 w-5" />
                                  )}
                                </button>
                              )}
                              {/* Bell icon with vibration animation */}
                              <BellIcon className={`h-5 w-5 ${colorConfig.text} bell-vibrate`} />
                              <div>
                                {formatReminderContent(note.content, isDetailsExpanded, () => toggleDetails(note.id))}
                              </div>
                              {/* Group Name - Inline with note content */}
                              <div className="flex items-center gap-2 ml-4 relative">
                                {showGroupInput === note.id ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={editingGroupName}
                                      onChange={(e) => setEditingGroupName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleGroupNameChange(note.id, editingGroupName);
                                        } else if (e.key === 'Escape') {
                                          cancelEditGroupName();
                                        }
                                      }}
                                      onBlur={() => handleGroupNameChange(note.id, editingGroupName)}
                                      className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      placeholder="Group name..."
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleGroupNameChange(note.id, editingGroupName)}
                                      className="px-1 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      onClick={cancelEditGroupName}
                                      className="px-1 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    {getReminderGroup(note.id) ? (
                                      <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-full">
                                        {getReminderGroup(note.id)}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-500 italic">No group</span>
                                    )}
                                    <button
                                      onClick={(event) => toggleGroupDropdown(note.id, event)}
                                      className="text-xs text-blue-600 hover:text-blue-800 underline ml-1"
                                    >
                                      {getReminderGroup(note.id) ? 'Edit' : 'Add'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {showCadenceSelector === note.id ? (
                                <CadenceSelector
                                  noteId={note.id}
                                  notes={allNotes}
                                  onCadenceChange={() => {
                                    setShowCadenceSelector(null);
                                    if (typeof setNotes === 'function') {
                                      setNotes([...allNotes]);
                                    }
                                  }}
                                />
                              ) : (
                                <>
                                  <div className="flex flex-col items-end mr-2">
                                    {getHumanReadableCadence(note) && (
                                      <div className="text-xs text-gray-400 mb-1">
                                        {getHumanReadableCadence(note)}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleDismiss(note)}
                                    className="px-3 py-1 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-150"
                                    title="Dismiss"
                                  >
                                    <CheckIcon className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => handleEditNote(note.id)}
                                    className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                                    title="Goto Note"
                                  >
                                    <PencilIcon className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => toggleOptions(note.id)}
                                    className="px-2 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 focus:outline-none transition-colors duration-150"
                                    title="More Options"
                                  >
                                    <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${expandedOptions[note.id] ? 'rotate-180' : ''}`} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* More Options Section */}
                          {expandedOptions[note.id] && !showCadenceSelector && (
                            <div className="px-6 py-3 border-t border-gray-200" style={{ backgroundColor: 'inherit' }}>
                              <div className="flex justify-between items-center">
                                {/* Color selector - hidden when yellow mode is enabled */}
                                {!yellowMode && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-600">Color:</span>
                                    <div className="flex gap-2">
                                      {REMINDER_COLORS.map((color) => (
                                        <button
                                          key={color.name}
                                          onClick={() => handleColorSelect(note.id, color.name)}
                                          className={`w-6 h-6 rounded-full border-2 transition-all duration-150 ${
                                            getReminderColor(note.id) === color.name 
                                              ? 'border-gray-600 scale-110' 
                                              : 'border-gray-300 hover:border-gray-400'
                                          } ${color.bg.replace('bg-', 'bg-').replace('-100', '-500')}`}
                                          title={color.name}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Other options */}
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => setShowCadenceSelector(note.id)}
                                    className="px-3 py-1 text-sm font-medium text-blue-700 hover:text-blue-800 underline focus:outline-none transition-colors duration-150"
                                    title="Set Cadence"
                                  >
                                    Set Cadence
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming Reminders Section */}
        {upcomingReminders.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <ClockIcon className="h-4 w-4" />
              Upcoming Reminders
            </h3>
            
            {/* Search Bar for Upcoming Reminders */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-1/10">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="block w-full pl-8 pr-6 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Yellow Mode Toggle for Upcoming Reminders */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleYellowModeToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 ${
                    yellowMode ? 'bg-yellow-500' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      yellowMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Color, Group, and Cadence Filter Buttons for Upcoming Reminders */}
              <div className="flex flex-wrap gap-1 flex-1">
                {getUniqueGroups(upcomingReminders.map(r => r.note)).map((groupName) => (
                  <button
                    key={groupName}
                    onClick={() => handleGroupFilterSelect(groupName)}
                    className={`px-2 py-1 text-xs font-medium rounded border transition-colors duration-150 ${
                      selectedGroupFilter === groupName
                        ? 'bg-blue-100 text-blue-700 border-blue-300 ring-1 ring-blue-300'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {groupName} ({filterRemindersByGroup(upcomingReminders.map(r => r.note), groupName).length})
                  </button>
                ))}
                {Object.entries(groupRemindersByCadence(upcomingReminders.map(r => r.note))).map(([cadenceType, cadenceReminders]) => (
                  <button
                    key={cadenceType}
                    onClick={() => handleCadenceFilterSelect(cadenceType)}
                    className={`px-2 py-1 text-xs font-medium rounded border transition-colors duration-150 ${
                      selectedCadenceFilter === cadenceType
                        ? 'bg-purple-100 text-purple-700 border-purple-300 ring-1 ring-purple-300'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        cadenceType === 'Hourly' ? 'bg-blue-500' :
                        cadenceType === 'Daily' ? 'bg-green-500' :
                        cadenceType === 'Weekly' ? 'bg-yellow-500' :
                        cadenceType === 'Monthly' ? 'bg-orange-500' :
                        cadenceType === 'Yearly' ? 'bg-red-500' :
                        'bg-gray-500'
                      } border border-gray-300`}></div>
                      <span>{cadenceType} ({cadenceReminders.length})</span>
                    </div>
                  </button>
                ))}
              </div>

              {(selectedColorFilter || selectedGroupFilter || selectedCadenceFilter || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedColorFilter('');
                    setSelectedGroupFilter('');
                    setSelectedCadenceFilter('');
                    setSearchQuery('');
                  }}
                  className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-300 rounded hover:bg-gray-100 transition-colors duration-150"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="space-y-3">
              {applyAllFilters(upcomingReminders.map(r => r.note)).map(({ note, nextReview }, index) => {
                const isDetailsExpanded = expandedDetails[note.id];
                const flatList = getFlatRemindersList();
                const activeRemindersCount = applyAllFilters(reminderObjs).length;
                const reminderIndex = activeRemindersCount + index;
                const isFocused = isRemindersOnlyMode && focusedReminderIndex === reminderIndex;
                const contentLines = note.content
                  .split('\n')
                  .map(line => line.trim())
                  .filter(line => line.length > 0 && !line.startsWith('meta::'));
                const hasMoreContent = contentLines.length > 2;
                
                // Get color for this reminder
                const reminderColor = getReminderColor(note.id);
                const colorConfig = REMINDER_COLORS.find(c => c.name === reminderColor) || REMINDER_COLORS[0];

                return (
                  <div
                    key={note.id}
                    data-reminder-id={note.id}
                    className={`${colorConfig.bg} border rounded-lg overflow-hidden hover:shadow-md transition-all duration-200 ${
                      isFocused 
                        ? `border-blue-500 ring-2 ring-blue-300 ${colorConfig.bg.replace('-100', '-50')} shadow-xl` 
                        : colorConfig.border
                    }`}
                    onClick={() => {
                      if (isRemindersOnlyMode) {
                        setFocusedReminderIndex(reminderIndex);
                      }
                    }}
                  >
                    <div className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Relative position indicator for vim navigation */}
                          {isRemindersOnlyMode && showRelativeNumbers && (
                            <div className="flex-shrink-0">
                              <div className="text-xs font-mono font-bold text-gray-600 px-2 py-1 min-w-[2rem] text-center">
                                {getRelativePosition(reminderIndex, focusedReminderIndex, flatList.length)}
                              </div>
                            </div>
                          )}
                          {hasMoreContent && (
                            <button
                              onClick={() => toggleDetails(note.id)}
                              className={`${colorConfig.text} hover:${colorConfig.text.replace('text-', 'text-').replace('-800', '-900')} focus:outline-none`}
                            >
                              {isDetailsExpanded ? (
                                <ChevronUpIcon className="h-5 w-5" />
                              ) : (
                                <ChevronDownIcon className="h-5 w-5" />
                              )}
                            </button>
                          )}
                          <div>
                            {formatReminderContent(note.content, isDetailsExpanded, () => toggleDetails(note.id))}
                            <div className="mt-1 text-sm text-gray-500">
                              {formatDate(nextReview)}
                            </div>
                          </div>
                          {/* Group Name - Inline with note content */}
                          <div className="flex items-center gap-2 ml-4">
                            {showGroupInput === note.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingGroupName}
                                  onChange={(e) => setEditingGroupName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleGroupNameChange(note.id, editingGroupName);
                                    } else if (e.key === 'Escape') {
                                      cancelEditGroupName();
                                    }
                                  }}
                                  onBlur={() => handleGroupNameChange(note.id, editingGroupName)}
                                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="Group name..."
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleGroupNameChange(note.id, editingGroupName)}
                                  className="px-1 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={cancelEditGroupName}
                                  className="px-1 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                {getReminderGroup(note.id) ? (
                                  <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-full">
                                    {getReminderGroup(note.id)}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-500 italic">No group</span>
                                )}
                                <button
                                  onClick={() => startEditGroupName(note.id)}
                                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  {getReminderGroup(note.id) ? 'Edit' : 'Add'} Group
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-end mr-2">
                            {getHumanReadableCadence(note) && (
                              <div className="text-xs text-gray-400 mb-1">
                                {getHumanReadableCadence(note)}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => toggleOptions(note.id)}
                            className="px-2 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 focus:outline-none transition-colors duration-150"
                            title="More Options"
                          >
                            <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${expandedOptions[note.id] ? 'rotate-180' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleEditNote(note.id)}
                            className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                            title="Goto Note"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      {/* More Options Section */}
                      {expandedOptions[note.id] && (
                        <div className="px-6 py-3 border-t border-gray-200" style={{ backgroundColor: 'inherit' }}>
                          <div className="flex justify-between items-center">
                            {/* Color selector - hidden when yellow mode is enabled */}
                            {!yellowMode && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-600">Color:</span>
                                <div className="flex gap-2">
                                  {REMINDER_COLORS.map((color) => (
                                    <button
                                      key={color.name}
                                      onClick={() => handleColorSelect(note.id, color.name)}
                                      className={`w-6 h-6 rounded-full border-2 transition-all duration-150 ${
                                        getReminderColor(note.id) === color.name 
                                          ? 'border-gray-600 scale-110' 
                                          : 'border-gray-300 hover:border-gray-400'
                                      } ${color.bg.replace('bg-', 'bg-').replace('-100', '-500')}`}
                                      title={color.name}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Other options */}
                            <div className="flex gap-3">
                              <button
                                onClick={() => setShowCadenceSelector(note.id)}
                                className="px-3 py-1 text-sm font-medium text-blue-700 hover:text-blue-800 underline focus:outline-none transition-colors duration-150"
                                title="Set Cadence"
                              >
                                Set Cadence
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {renderDropdownPortal()}
    </>
  );
};

export default RemindersAlert;