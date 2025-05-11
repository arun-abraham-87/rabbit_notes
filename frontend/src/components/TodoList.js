import React, { useState, useEffect } from 'react';
import { createNote, updateNoteById, deleteNoteById } from '../utils/ApiUtils';
import {
  PencilIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  FunnelIcon,
  ListBulletIcon,
  Squares2X2Icon,
  EllipsisHorizontalIcon,
  ChartBarIcon,
  CodeBracketIcon
} from '@heroicons/react/24/solid';
import { parseNoteContent } from '../utils/TextUtils';
import { getCurrentISOTime, getDateFromString, getDateInDDMMYYYYFormat, getAgeInDays, isSameAsTodaysDate , isSameAsYesterday} from '../utils/DateUtils';
import TodoStats from './TodoStats';
import { useNoteEditor } from '../contexts/NoteEditorContext';

const TodoList = ({ allNotes, setAllNotes, updateNote }) => {
  const [todos, setTodos] = useState([]);
  const { openEditor } = useNoteEditor();
  const [searchQuery, setSearchQuery] = useState('');
  const [priorities, setPriorities] = useState({});
  const [priorityFilter, setPriorityFilter] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState('priority');
  const [showFilters, setShowFilters] = useState(true);
  const [showHeaders, setShowHeaders] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showToday, setShowToday] = useState(false);
  const [showYesterday, setShowYesterday] = useState(false);
  const [showHasDeadline, setShowHasDeadline] = useState(false);
  const [showRawNotes, setShowRawNotes] = useState({});
  const [expandedNotes, setExpandedNotes] = useState({});
  const [showPriorityPopup, setShowPriorityPopup] = useState(false);
  const [pendingTodoContent, setPendingTodoContent] = useState('');

  const getFilteredTodos = () => {
    const filteredTodos = (allNotes || [])
      .filter((todo) => {
        if (!todo || !todo.content) {
          return false;
        }

        const matchesSearch = todo.content.toLowerCase().includes(searchQuery.toLowerCase());
        const tagMatch = todo.content.match(/meta::(high|medium|low|critical)/i);
        const tag = tagMatch ? tagMatch[1].toLowerCase() : 'low';
        const assignedPriority = priorities[todo.id] || tag;
        const isMetaTodo = todo.content.includes('meta::todo');
        if (!isMetaTodo) {
          return false;
        }
        const isCompleted = todo.content.includes('meta::todo_completed');
        // Check if todo was added today or yesterday
        const isTodayOrYesterday = (() => {
          if (!showToday && !showYesterday) return true;
          const todoDateMatch = todo.content.match(/meta::todo::([^\n]+)/);
          if (todoDateMatch) {
            console.log('todoDateMatch',);
          }else{
            return false;
          }
          if (showToday && isSameAsTodaysDate(todoDateMatch[0].split('meta::todo::')[1])) return true;
          if (showYesterday && isSameAsYesterday(todoDateMatch[0].split('meta::todo::')[1])) return true;
          return false;
        })();
        if (tagMatch) {
          const priority = tagMatch[0].split('meta::')[1]
          if (priorityFilter && priorityFilter !== priority) {
            return false;
          }
        }
        // Check if todo has deadline
        const hasDeadline = !showHasDeadline || todo.content.includes('meta::end_date::');

        return matchesSearch && isMetaTodo && !isCompleted && isTodayOrYesterday && hasDeadline;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') {
          const getPriorityValue = (todo) => {
            const match = todo.content.match(/meta::(high|medium|low|critical)/i);
            const priority = match ? match[1].toLowerCase() : 'low';
            return priority === 'high' ? 3 : priority === 'medium' ? 2 : priority === 'critical' ? 4 : 1;
          };
          return getPriorityValue(b) - getPriorityValue(a);
        } else if (sortBy === 'date') {
          return getDateFromString(b.created_datetime) - getDateFromString(a.created_datetime);
        } else if (sortBy === 'age') {
          return getDateFromString(b.created_datetime) - getDateFromString(a.created_datetime);
        }
        return 0;
      });
    return filteredTodos;
  };

  useEffect(() => {
    setTodos(getFilteredTodos());
  }, [allNotes, searchQuery, priorityFilter, showToday, showYesterday, showHasDeadline]);



  // Function to clear all date filters
  const clearDateFilters = () => {
    setShowToday(false);
    setShowYesterday(false);
    setShowHasDeadline(false);
  };

  // Function to handle date filter selection
  const handleDateFilterClick = (filterType) => {
    clearDateFilters();
    switch (filterType) {
      case 'today':
        setShowToday(true);
        break;
      case 'yesterday':
        setShowYesterday(true);
        break;
      case 'hasDeadline':
        setShowHasDeadline(true);
        break;
    }
  };

  // Get overdue high priority todos
  const getOverdueHighPriorityTodos = () => {
    return todos.filter(todo => {
      const tagMatch = todo.content.match(/meta::(high|medium|low)/i);
      const priority = tagMatch ? tagMatch[1].toLowerCase() : 'low';
      const todoDateMatch = todo.content.match(/meta::todo::([^\n]+)/);
      const createdDate = todoDateMatch ? new Date(todoDateMatch[1]) : new Date(todo.created_datetime);
      const daysOld = (Date.now() - createdDate) / (1000 * 60 * 60 * 24);
      return priority === 'high' && daysOld > 2;
    });
  };

  const overdueTodos = getOverdueHighPriorityTodos();



  const getAgeClass = (createdDate) => {
    const ageInDays = getAgeInDays(createdDate);
    if (ageInDays > 2) return 'text-red-500';
    if (ageInDays > 1) return 'text-yellow-500';
    return 'text-green-500';
  };



  const getDeadlineInfo = (content) => {
    const deadlineMatch = content.match(/meta::end_date::([^\n]+)/);
    if (!deadlineMatch) return null;

    const now = new Date();
    const diffMs = getAgeInDays(deadlineMatch[1])
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    // Format the deadline date
    const formattedDate = getDateInDDMMYYYYFormat(deadlineMatch[1])

    // Calculate time remaining
    let timeRemaining;
    if (diffDays > 0) {
      timeRemaining = `${diffDays} day${diffDays !== 1 ? 's' : ''} left`;
    } else if (diffHours > 0) {
      timeRemaining = `${diffHours} hour${diffHours !== 1 ? 's' : ''} left`;
    } else if (diffMinutes > 0) {
      timeRemaining = `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} left`;
    } else {
      timeRemaining = 'Overdue';
    }

    // Determine color based on time remaining
    let colorClass;
    if (diffMs < 0) {
      colorClass = 'text-red-600';
    } else if (diffDays === 0) {
      colorClass = 'text-amber-600';
    } else if (diffDays <= 1) {
      colorClass = 'text-orange-600';
    } else {
      colorClass = 'text-emerald-600';
    }

    return {
      formattedDate,
      timeRemaining,
      colorClass,
      isOverdue: diffMs < 0
    };
  };

  const getPriorityAge = (content) => {
    const match = content.match(/meta::priority_age::(.+)/);
    if (!match) return null;

    const priorityDate = new Date(match[1]);
    const now = new Date();
    const diffMs = now - priorityDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes === 0 ? 'just now' : `${diffMinutes}m`;
      }
      return `${diffHours}h`;
    }
    return `${diffDays}d`;
  };

  const updateTodo = async (id, updatedContent, removeNote = false) => {
    if (removeNote) {
      const response = await deleteNoteById(id);
      setAllNotes(allNotes.filter((note) => note.id !== id));
    } else {
      const response = await updateNoteById(id, updatedContent);
      setAllNotes(allNotes.map((note) =>
        note.id === id ? { ...note, content: updatedContent } : note
      ));
    }
  };

  const onPriorityChange = (id, level) => {
    const note = todos.find((todo) => todo.id === id);
    if (note) {
      const currentDate = new Date().toISOString();
      const cleanedContent = note.content
        .split('\n')
        .filter(line =>
          !line.trim().startsWith('meta::high') &&
          !line.trim().startsWith('meta::medium') &&
          !line.trim().startsWith('meta::low') &&
          !line.trim().startsWith('meta::critical') &&
          !line.trim().startsWith('meta::priority_age::')
        )
        .join('\n')
        .trim();
      const updatedContent = `${cleanedContent}\nmeta::${level}\nmeta::priority_age::${currentDate}`;
      updateTodo(id, updatedContent);
    }
  };

  const handlePriorityClick = (id, level) => {
    setPriorities((prev) => ({ ...prev, [id]: level }));
    onPriorityChange(id, level);
  };

  const handleCompleteTodo = async (id) => {
    const note = todos.find((todo) => todo.id === id);
    if (note) {
      const lines = note.content.split('\n');
      const isCompleted = lines.some(line => line.trim().startsWith('meta::todo_completed'));

      if (isCompleted) {
        // Remove completed status
        const updatedContent = lines
          .filter(line => !line.trim().startsWith('meta::todo_completed'))
          .join('\n')
          .trim();
        await updateTodo(id, updatedContent, false);
        setAllNotes(allNotes.map((note) =>
          note.id === id ? { ...note, content: updatedContent } : note
        ));
      } else {
        // Add completed status with timestamp
        const timestamp = new Date().toISOString();
        const updatedContent = `${note.content}\nmeta::todo_completed`;
        await updateTodo(id, updatedContent, false);
        setAllNotes(allNotes.map((note) =>
          note.id === id ? { ...note, content: updatedContent } : note
        ));
      }
    }
  };






  // Group todos by priority
  const groupedTodos = todos.reduce((acc, todo) => {
    const tagMatch = todo.content.match(/meta::(high|medium|low|critical)/i);
    const priority = tagMatch ? tagMatch[1].toLowerCase() : 'low';
    if (!acc[priority]) {
      acc[priority] = [];
    }
    acc[priority].push(todo);
    return acc;
  }, {});

  // Sort todos within each priority group if date sorting is selected
  if (sortBy === 'date' || sortBy === 'age') {
    Object.keys(groupedTodos).forEach(priority => {
      groupedTodos[priority].sort((a, b) => {
        if (sortBy === 'date') {
          return getDateFromString(b.created_datetime) - getDateFromString(a.created_datetime);
        } else { // age
          return getDateFromString(a.created_datetime) - getDateFromString(b.created_datetime);
        }
      });
    });
  }

  // Priority order for display
  const priorityOrder = ['critical', 'high', 'medium', 'low'];

  // Priority header styles
  const priorityHeaderStyles = {
    critical: 'text-red-700 border-b-2 border-red-200',
    high: 'text-rose-700 border-b-2 border-rose-200',
    medium: 'text-amber-700 border-b-2 border-amber-200',
    low: 'text-emerald-700 border-b-2 border-emerald-200'
  };

  // Add new function to create todo
  const addTodo = async (content, priority = 'low') => {
    const currentTime = getCurrentISOTime();
    const todoContent = `${content}\nmeta::todo::${currentTime}\nmeta::${priority}\nmeta::priority_age::${currentTime}`;
    try {
      const response = await createNote(todoContent);
      setAllNotes([response, ...allNotes]);
      setSearchQuery(''); // Clear the search bar after creating todo
    } catch (error) {
      console.error('Failed to create todo:', error);
    }
  };

  // Add handler for Enter and Cmd+Enter
  const handleSearchKeyDown = (e) => {
    if (searchQuery.trim()) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        setPendingTodoContent(searchQuery.trim());
        setShowPriorityPopup(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        setPendingTodoContent(searchQuery.trim());
        setShowPriorityPopup(true);
      }
    }
  };

  const handlePrioritySelect = (priority) => {
    addTodo(pendingTodoContent, priority);
    setShowPriorityPopup(false);
    setPendingTodoContent('');
  };

  const renderTodoCard = (todo) => {
    const tagMatch = todo.content.match(/meta::(high|medium|low|critical)/i);
    const tag = tagMatch ? tagMatch[1].toLowerCase() : 'low';
    const currentPriority = priorities[todo.id] || tag;
    const isCompleted = todo.content.includes('meta::todo_completed');

    const todoDateMatch = todo.content.match(/meta::todo::([^\n]+)/);
    const createdDate = todoDateMatch ? todoDateMatch[1] : todo.created_datetime;
    const ageColorClass = getAgeClass(createdDate);
    const priorityAge = getPriorityAge(todo.content);
    const deadlineInfo = getDeadlineInfo(todo.content);

    // Calculate days open
    const created = new Date(createdDate);
    const now = new Date();
    const daysOpen = Math.floor((now - created) / (1000 * 60 * 60 * 24));

    const priorityColors = {
      critical: 'bg-rose-50 border-4 border-red-500',
      high: 'bg-rose-50',
      medium: 'bg-amber-50',
      low: 'bg-emerald-50'
    };

    // Get content without meta tags
    const content = todo.content
      .split('\n')
      .filter(line => !line.trim().startsWith('meta::'))
      .join('\n')
      .trim();

    // Split content into lines
    const contentLines = content.split('\n');
    const isLongNote = contentLines.length > 5;
    const isExpanded = expandedNotes[todo.id];
    const displayLines = isExpanded ? contentLines : contentLines.slice(0, 5);

    return (
      <div
        key={todo.id}
        className={`group relative ${viewMode === 'grid' ? 'h-[200px]' : 'min-h-[80px]'
          } flex flex-col rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 ${priorityColors[currentPriority]
          } ${isCompleted ? 'opacity-60' : ''}`}
      >
        {/* Header - Always show */}
        <div className={`flex items-center justify-between p-2 border-b ${'bg-white/50'
          }`}>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${ageColorClass}`}>
              {new Date(createdDate).toLocaleDateString()}
            </span>
            <span className="text-gray-300">•</span>
            <span className={`text-xs font-medium ${ageColorClass}`}>
              {daysOpen === 0 ? 'Opened today' : `Open for ${daysOpen} ${daysOpen === 1 ? 'day' : 'days'}`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                // Extract meta tags from the content
                const lines = todo.content.split('\n');
                const metaTags = lines.filter(line => line.trim().startsWith('meta::'));
                const content = lines.filter(line => !line.trim().startsWith('meta::')).join('\n').trim();

                // Open editor with both content and meta tags
                openEditor('edit', content, todo.id, metaTags);
              }}
              className={`p-1.5 rounded-full transition-all duration-200 ${'bg-white border border-gray-200 hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                }`}
              title="Edit note"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowRawNotes(prev => ({ ...prev, [todo.id]: !prev[todo.id] }))}
              className={`p-1.5 rounded-full transition-all duration-200 ${showRawNotes[todo.id]
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-white border border-gray-200 hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                }`}
              title={showRawNotes[todo.id] ? "Hide raw note" : "Show raw note"}
            >
              <CodeBracketIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePriorityClick(todo.id, 'critical')}
              className={`px-2 py-1 text-xs rounded font-medium transition-all duration-200 ${currentPriority === 'critical'
                ? 'bg-red-400 text-white'
                : 'bg-white border border-gray-200 hover:bg-red-100 text-gray-400 hover:text-red-600'
                }`}
              title="Critical priority"
            >
              Critical
            </button>
            <button
              onClick={() => handlePriorityClick(todo.id, 'high')}
              className={`px-2 py-1 text-xs rounded font-medium transition-all duration-200 ${currentPriority === 'high'
                ? 'bg-rose-200 text-rose-700'
                : 'bg-white border border-gray-200 hover:bg-rose-100 text-gray-400 hover:text-rose-600'
                }`}
              title="High priority"
            >
              High
            </button>
            <button
              onClick={() => handlePriorityClick(todo.id, 'medium')}
              className={`px-2 py-1 text-xs rounded font-medium transition-all duration-200 ${currentPriority === 'medium'
                ? 'bg-amber-200 text-amber-700'
                : 'bg-white border border-gray-200 hover:bg-amber-100 text-gray-400 hover:text-amber-600'
                }`}
              title="Medium priority"
            >
              Medium
            </button>
            <button
              onClick={() => handlePriorityClick(todo.id, 'low')}
              className={`px-2 py-1 text-xs rounded font-medium transition-all duration-200 ${currentPriority === 'low'
                ? 'bg-emerald-200 text-emerald-700'
                : 'bg-white border border-gray-200 hover:bg-emerald-100 text-gray-400 hover:text-emerald-600'
                }`}
              title="Low priority"
            >
              Low
            </button>
            <button
              onClick={() => handleCompleteTodo(todo.id)}
              className={`p-1.5 rounded-full transition-all duration-200 ${isCompleted
                ? 'bg-green-100 text-green-700'
                : 'bg-white border border-gray-200 hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                }`}
              title={isCompleted ? "Mark as incomplete" : "Mark as complete"}
            >
              {isCompleted ? (
                <CheckCircleIcon className="h-4 w-4" />
              ) : (
                <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 p-3 overflow-auto relative">
          <div className={`text-sm whitespace-pre-wrap ${'text-gray-800'
            }`}>
            {showRawNotes[todo.id] ? (
              <pre className="text-xs font-mono bg-gray-50 p-2 rounded overflow-x-auto">
                {todo.content}
              </pre>
            ) : (
              <>
                {deadlineInfo && (
                  <div className="mb-2 flex items-center gap-2">
                    <ClockIcon className={`h-4 w-4 ${deadlineInfo.colorClass}`} />
                    <span className={`text-sm font-medium ${deadlineInfo.colorClass}`}>
                      {deadlineInfo.formattedDate} • {deadlineInfo.timeRemaining}
                    </span>
                  </div>
                )}
                {displayLines.map((line, lineIndex) => {
                  // Check for headings first
                  const h1Match = line.match(/^###(.+)###$/);
                  const h2Match = line.match(/^##(.+)##$/);

                  if (h1Match) {
                    return (
                      <h1 key={`line-${lineIndex}`} className={`text-xl font-bold mb-2 ${'text-gray-900'
                        }`}>
                        {parseNoteContent({ content: h1Match[1].trim(), searchTerm: searchQuery })}
                      </h1>
                    );
                  }

                  if (h2Match) {
                    return (
                      <h2 key={`line-${lineIndex}`} className={`text-lg font-semibold mb-2 ${'text-gray-800'
                        }`}>
                        {parseNoteContent({ content: h2Match[1].trim(), searchTerm: searchQuery })}
                      </h2>
                    );
                  }

                  // Process regular lines with URLs and search highlighting
                  const urlRegex = /(https?:\/\/[^\s]+)/g;
                  const parts = line.split(urlRegex);

                  return (
                    <div key={`line-${lineIndex}`} className="mb-1">
                      {parts.map((part, i) => {
                        if (part.match(urlRegex)) {
                          try {
                            const url = new URL(part);
                            return (
                              <a
                                key={i}
                                href={part}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {url.hostname}
                              </a>
                            );
                          } catch {
                            return part;
                          }
                        }
                        return parseNoteContent({ content: part, searchTerm: searchQuery });
                      })}
                    </div>
                  );
                })}
                {isLongNote && (
                  <button
                    onClick={() => setExpandedNotes(prev => ({ ...prev, [todo.id]: !prev[todo.id] }))}
                    className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    {isExpanded ? 'Show less' : `Show ${contentLines.length - 5} more lines`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 h-full p-6">
      {showStats ? (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => setShowStats(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              <XMarkIcon className="h-4 w-4" />
              Close Stats
            </button>
          </div>
          <TodoStats todos={todos} />
        </>
      ) : (
        <>
          {overdueTodos.length > 0 && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-rose-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-rose-800">
                    Attention needed: {overdueTodos.length} high priority {overdueTodos.length === 1 ? 'todo' : 'todos'} older than 2 days
                  </h3>
                  <div className="mt-2 text-sm text-rose-700">
                    <ul className="list-disc pl-5 space-y-1">
                      {overdueTodos.map(todo => (
                        <li key={todo.id}>
                          {todo.content.split('\n').filter(line => !line.trim().startsWith('meta::')).join(' ').slice(0, 100)}
                          {todo.content.length > 100 ? '...' : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Header Controls */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-900">Todos</h1>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowStats(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-all duration-200"
                  title="View Statistics"
                >
                  <ChartBarIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowHeaders(prev => !prev)}
                  className={`p-2 rounded-lg transition-all duration-200 ${showHeaders ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  title={showHeaders ? 'Hide headers' : 'Show headers'}
                >
                  <EllipsisHorizontalIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
                  title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
                >
                  {viewMode === 'grid' ? (
                    <ListBulletIcon className="h-5 w-5 text-gray-600" />
                  ) : (
                    <Squares2X2Icon className="h-5 w-5 text-gray-600" />
                  )}
                </button>
                <button
                  onClick={() => setShowFilters(prev => !prev)}
                  className={`p-2 rounded-lg transition-all duration-200 ${showFilters ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  title="Toggle filters"
                >
                  <FunnelIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col gap-4 bg-white rounded-xl border p-4 shadow-sm">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search todos or press Cmd+Enter to create new todo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="block w-full pl-10 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>

              {showFilters && (
                <div className="flex flex-col gap-4 pt-4 border-t">
                  {/* Priority Stats */}
                  <div className="grid grid-cols-5 gap-4">
                    <button
                      onClick={() => setPriorityFilter(null)}
                      className={`flex flex-col items-center p-3 rounded-lg border transition-all duration-200 ${priorityFilter === null
                        ? 'ring-2 ring-indigo-500 ring-offset-2'
                        : 'hover:border-indigo-200 hover:shadow-sm'
                        }`}
                    >
                      <div className="text-xs font-medium text-gray-500">Total</div>
                    </button>
                    <button
                      onClick={() => setPriorityFilter('critical')}
                      className={`flex flex-col items-center p-3 rounded-lg border transition-all duration-200 ${priorityFilter === 'critical'
                        ? 'bg-rose-50 border-rose-200 ring-2 ring-red-500 ring-offset-2'
                        : 'hover:bg-rose-50/50 hover:border-rose-200 hover:shadow-sm'
                        }`}
                    >
                      <div className="text-xs font-medium text-red-600">Critical</div>
                    </button>
                    <button
                      onClick={() => setPriorityFilter('high')}
                      className={`flex flex-col items-center p-3 rounded-lg border transition-all duration-200 ${priorityFilter === 'high'
                        ? 'bg-rose-50 border-rose-200 ring-2 ring-rose-500 ring-offset-2'
                        : 'hover:bg-rose-50/50 hover:border-rose-200 hover:shadow-sm'
                        }`}
                    >
                      <div className="text-xs font-medium text-rose-600">High</div>
                    </button>
                    <button
                      onClick={() => setPriorityFilter('medium')}
                      className={`flex flex-col items-center p-3 rounded-lg border transition-all duration-200 ${priorityFilter === 'medium'
                        ? 'bg-amber-50 border-amber-200 ring-2 ring-amber-500 ring-offset-2'
                        : 'hover:bg-amber-50/50 hover:border-amber-200 hover:shadow-sm'
                        }`}
                    >
                      <div className="text-xs font-medium text-amber-600">Medium</div>
                    </button>
                    <button
                      onClick={() => setPriorityFilter('low')}
                      className={`flex flex-col items-center p-3 rounded-lg border transition-all duration-200 ${priorityFilter === 'low'
                        ? 'bg-emerald-50 border-emerald-200 ring-2 ring-emerald-500 ring-offset-2'
                        : 'hover:bg-emerald-50/50 hover:border-emerald-200 hover:shadow-sm'
                        }`}
                    >
                      <div className="text-xs font-medium text-emerald-600">Low</div>
                    </button>
                  </div>

                  {/* Sort Controls and Filters Row */}
                  <div className="flex items-center justify-between gap-4">
                    {/* Filters Group */}
                    <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Filters:</span>
                      <button
                        onClick={() => handleDateFilterClick('today')}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${showToday
                          ? 'bg-indigo-100 text-indigo-700 font-medium'
                          : 'hover:bg-gray-100 text-gray-600'
                          }`}
                      >
                        Today's Todos
                      </button>
                      <button
                        onClick={() => handleDateFilterClick('yesterday')}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${showYesterday
                          ? 'bg-indigo-100 text-indigo-700 font-medium'
                          : 'hover:bg-gray-100 text-gray-600'
                          }`}
                      >
                        Yesterday's Todos
                      </button>
                      <button
                        onClick={() => handleDateFilterClick('hasDeadline')}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${showHasDeadline
                          ? 'bg-indigo-100 text-indigo-700 font-medium'
                          : 'hover:bg-gray-100 text-gray-600'
                          }`}
                      >
                        Has Deadline
                      </button>
                      {(showToday || showYesterday || showHasDeadline) && (
                        <button
                          onClick={clearDateFilters}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Clear Date Filters
                        </button>
                      )}
                    </div>

                    {/* Sort Group */}
                    <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Sort by:</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSortBy('priority')}
                          className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${sortBy === 'priority'
                            ? 'bg-indigo-100 text-indigo-700 font-medium'
                            : 'hover:bg-gray-100 text-gray-600'
                            }`}
                        >
                          Priority
                        </button>
                        <button
                          onClick={() => setSortBy('date')}
                          className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${sortBy === 'date'
                            ? 'bg-indigo-100 text-indigo-700 font-medium'
                            : 'hover:bg-gray-100 text-gray-600'
                            }`}
                        >
                          Newest
                        </button>
                        <button
                          onClick={() => setSortBy('age')}
                          className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${sortBy === 'age'
                            ? 'bg-indigo-100 text-indigo-700 font-medium'
                            : 'hover:bg-gray-100 text-gray-600'
                            }`}
                        >
                          Oldest
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Todo Grid/List with Priority Sections */}
          <div className="space-y-6">
            {sortBy === 'priority' ? (
              // Grouped by priority view
              priorityOrder.map(priority => {
                const todos = groupedTodos[priority] || [];
                if (todos.length === 0) return null;

                return (
                  <div key={priority} className="space-y-3">
                    <div className={`flex items-center gap-2 py-2 ${priorityHeaderStyles[priority]}`}>
                      <h2 className="text-lg font-semibold capitalize">{priority} Priority</h2>
                      <span className="text-sm font-medium">({todos.length})</span>
                    </div>
                    <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
                      }`}>
                      {todos.map(renderTodoCard)}
                    </div>
                  </div>
                );
              })
            ) : (
              // Flat list view for date/age sorting
              <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
                }`}>
                {todos.map(renderTodoCard)}
              </div>
            )}
          </div>

          {/* Empty State */}
          {todos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircleIcon className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No todos found</h3>
              <p className="text-sm text-gray-500">
                {searchQuery
                  ? "No todos match your search criteria"
                  : "You're all caught up! Add a new todo to get started"}
              </p>
            </div>
          )}



          {/* Priority Selection Popup */}
          {showPriorityPopup && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 className="text-lg font-medium mb-4">Select Priority</h3>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handlePrioritySelect('critical')}
                    className="px-4 py-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-medium transition-all duration-200"
                  >
                    Critical
                  </button>
                  <button
                    onClick={() => handlePrioritySelect('high')}
                    className="px-4 py-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium transition-all duration-200"
                  >
                    High
                  </button>
                  <button
                    onClick={() => handlePrioritySelect('medium')}
                    className="px-4 py-3 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium transition-all duration-200"
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => handlePrioritySelect('low')}
                    className="px-4 py-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium transition-all duration-200"
                  >
                    Low
                  </button>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setShowPriorityPopup(false);
                      setPendingTodoContent('');
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TodoList;
