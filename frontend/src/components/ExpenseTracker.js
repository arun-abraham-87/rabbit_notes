import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, PencilIcon, Cog6ToothIcon, ArrowUpTrayIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { loadAllNotes, updateNoteById } from '../utils/ApiUtils';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import Budget from './Budget';
import CSVEditor from './CSVEditor';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const ExpenseTracker = () => {
  //console.log('ExpenseTracker component mounted');
  
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState(['Unassigned']);
  const [selectedType, setSelectedType] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: 'Food',
    date: new Date().toISOString().split('T')[0]
  });
  const [editingId, setEditingId] = useState(null);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [excludedFromBudget, setExcludedFromBudget] = useState(0);
  const [onceOffTotal, setOnceOffTotal] = useState(0);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [typeTotals, setTypeTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingExpense, setEditingExpense] = useState(null);
  const [allNotes, setAllNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expenseTypeMap, setExpenseTypeMap] = useState(new Map());
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const [showOnceOff, setShowOnceOff] = useState(false);
  const [showHasTags, setShowHasTags] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState(new Set());
  const [bulkType, setBulkType] = useState('Unassigned');
  const [expenseLineMap, setExpenseLineMap] = useState(new Map());
  const [sortConfig, setSortConfig] = useState({
    key: 'amount',
    direction: 'desc'
  });
  const [typeBreakdownSort, setTypeBreakdownSort] = useState('desc');
  const [hoveredType, setHoveredType] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [chartType, setChartType] = useState('pie');
  const [hoveredTotal, setHoveredTotal] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showBudgetDetails, setShowBudgetDetails] = useState(true);
  const [budgetAllocations, setBudgetAllocations] = useState({});
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonths, setSelectedMonths] = useState(new Set([new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1]));

  // Add new state for load status
  const [loadStatus, setLoadStatus] = useState([]);

  const [statusPopup, setStatusPopup] = useState(null);
  const [tagPopup, setTagPopup] = useState(null);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [breakdownView, setBreakdownView] = useState('type'); // 'type' or 'tag'
  const [tagTotals, setTagTotals] = useState({});
  const [showBudget, setShowBudget] = useState(false);
  const [showDataLoader, setShowDataLoader] = useState(false);
  const [budgetNote, setBudgetNote] = useState(null);
  const [showBulkExclude, setShowBulkExclude] = useState(false);
  const [isLoadStatusCollapsed, setIsLoadStatusCollapsed] = useState(true);

  const categories = ['Food', 'Transportation', 'Entertainment', 'Bills', 'Shopping', 'Other'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const years = [2025, 2026, 2027];
  //console.log('Initialized with categories:', categories);

  const parseExpenses = (notes, typeMap) => {
    const expenseNotes = notes.filter(note => 
      note.content.includes('meta::expense') && 
      !note.content.includes('meta::expense_type') &&
      !note.content.includes('meta::expense_source_type') &&
      !note.content.includes('meta::expense_source_name')
    );

    // Parse budget allocations
    const budgetNote = notes.find(note => note.content.includes('meta::budget'));
    if (budgetNote) {
      const allocations = {};
      budgetNote.content.split('\n').forEach(line => {
        if (line.trim() && !line.includes('meta::')) {
          const [type, amount] = line.split(':').map(item => item.trim());
          allocations[type] = parseFloat(amount);
        }
      });
      setBudgetAllocations(allocations);
    }

    // Create a map of all notes for quick lookup
    const notesMap = new Map(notes.map(note => [note.id, note]));

    // Create a map to store expense lines
    const lineMap = new Map();

    const parsedExpenses = expenseNotes.flatMap(note => {
      // Get linked notes
      const linkedNotes = note.content
        .split('\n')
        .filter(line => line.includes('meta::link::'))
        .map(line => {
          const linkId = line.split('::')[2];
          return notesMap.get(linkId);
        })
        .filter(linkedNote => linkedNote);

      // Get expense source type from linked notes
      const expenseSourceType = linkedNotes
        .find(linkedNote => linkedNote.content.includes('meta::expense_source_type'))
        ?.content
        .split('\n')
        .find(line => !line.includes('meta::'))
        ?.trim() || '';

      // Get expense source name from linked notes
      const expenseSourceName = linkedNotes
        .find(linkedNote => linkedNote.content.includes('meta::expense_source_name'))
        ?.content
        .split('\n')
        .find(line => !line.includes('meta::'))
        ?.trim() || '';

      // Split the content by newlines and filter out meta:: lines
      const lines = note.content.split('\n').filter(line => 
        line.trim() && !line.includes('meta::')
      );

      return lines.map((expenseLine, index) => {
        // Check for meta_line::expense_type tag
        const typeMatch = expenseLine.match(/meta_line::expense_type::([^\s]+)/);
        let type = 'Unassigned';
        
        if (typeMatch) {
          const typeNoteId = typeMatch[1];
          type = typeMap.get(typeNoteId) || 'Unassigned';
        }
        
        // Split the expense line by spaces (excluding the meta tag)
        const cleanLine = expenseLine.replace(/meta_line::expense_type::[^\s]*\s*/, '');
        const parts = cleanLine.trim().split(/\s+/);
        
        if (parts.length < 3) return null;

        // First part is date, second is amount, rest is description
        const date = parts[0];
        const amount = parseFloat(parts[1]);
        const description = parts.slice(2).join(' ');

        const expenseId = `${note.id}-${index}`;
        
        // Store the line in the map
        lineMap.set(expenseId, {
          noteId: note.id,
          lineIndex: index,
          content: expenseLine
        });

        // Check for exclude_from_budget tag
        const isExcluded = expenseLine.includes('meta_line::exclude_from_budget');

        // Check for once_off tag
        const isOnceOff = expenseLine.includes('meta_line::once_off');

        // Check for income tag
        const isIncome = expenseLine.includes('meta_line::income');

        // Check for tags
        const tagsMatch = expenseLine.match(/meta_line_tags::([^\s]+)/);
        const tags = tagsMatch ? tagsMatch[1].split('||') : [];

        return {
          id: expenseId,
          date,
          amount,
          description,
          type,
          noteId: note.id,
          lineIndex: index,
          sourceType: expenseSourceType,
          sourceName: expenseSourceName,
          isExcluded,
          isOnceOff,
          isIncome,
          tags
        };
      }).filter(expense => expense !== null);
    });

    // Update the expense line map
    setExpenseLineMap(lineMap);

    return parsedExpenses;
  };

  // Load expenses from notes
  useEffect(() => {
    //console.log('Starting to fetch expenses from notes');
    const fetchExpenses = async () => {
      try {
        //console.log('Calling loadAllNotes()');
        const response = await loadAllNotes();
        //console.log('Received notes response:', response);
        setAllNotes(response.notes);

        // Create expense type map
        const typeMap = new Map();
        const typeNotes = response.notes.filter(note => 
          note.content.includes('meta::expense_type')
        );

        typeNotes.forEach(note => {
          const typeLine = note.content.split('\n').find(line => !line.includes('meta::'));
          if (typeLine) {
            typeMap.set(note.id, typeLine.trim());
          }
        });
        setExpenseTypeMap(typeMap);

        // Get unique expense types for dropdown
        const types = ['Unassigned', ...Array.from(typeMap.values())];
        setExpenseTypes(types);

        const parsedExpenses = parseExpenses(response.notes, typeMap);
        setExpenses(parsedExpenses);
        setFilteredExpenses(parsedExpenses);
        calculateTotals(parsedExpenses);
      } catch (error) {
        console.error('Error loading expenses:', error);
      } finally {
        //console.log('Finished loading expenses');
        setLoading(false);
      }
    };

    fetchExpenses();
  }, []);

  // Add useEffect to calculate load status
  useEffect(() => {
    const statusMap = new Map();
    
    filteredExpenses.forEach(expense => {
      const key = `${expense.sourceType}-${expense.sourceName}`;
      if (!statusMap.has(key)) {
        statusMap.set(key, {
          sourceType: expense.sourceType,
          sourceName: expense.sourceName,
          firstDate: expense.date,
          lastDate: expense.date,
          count: 1,
          debit: expense.amount < 0 ? Math.abs(expense.amount) : 0,
          credit: expense.amount > 0 ? Math.abs(expense.amount) : 0
        });
      } else {
        const status = statusMap.get(key);
        status.count++;
        if (expense.date < status.firstDate) {
          status.firstDate = expense.date;
        }
        if (expense.date > status.lastDate) {
          status.lastDate = expense.date;
        }
        if (expense.amount < 0) {
          status.debit += Math.abs(expense.amount);
        } else {
          status.credit += Math.abs(expense.amount);
        }
      }
    });

    setLoadStatus(Array.from(statusMap.values()));
  }, [filteredExpenses]);

  const sortExpenses = (expenses) => {
    if (!sortConfig.key) return expenses;

    return [...expenses].sort((a, b) => {
      if (sortConfig.key === 'amount') {
        return sortConfig.direction === 'asc' 
          ? Math.abs(a.amount) - Math.abs(b.amount) 
          : Math.abs(b.amount) - Math.abs(a.amount);
      } else if (sortConfig.key === 'date') {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return sortConfig.direction === 'asc'
          ? dateA - dateB
          : dateB - dateA;
      } else if (sortConfig.key === 'description') {
        return sortConfig.direction === 'asc'
          ? a.description.localeCompare(b.description)
          : b.description.localeCompare(a.description);
      }
      return 0;
    });
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter expenses when type, search query, unassigned filter, year, or month changes
  useEffect(() => {
    const filtered = expenses.filter(expense => {
      // Type filter
      const typeMatch = selectedType === 'All' || expense.type === selectedType;
      
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const searchMatch = !searchQuery || 
        expense.description.toLowerCase().includes(searchLower) ||
        expense.type.toLowerCase().includes(searchLower) ||
        expense.sourceType.toLowerCase().includes(searchLower) ||
        expense.sourceName.toLowerCase().includes(searchLower);
      
      // Status filters
      const unassignedMatch = !showUnassignedOnly || expense.type === 'Unassigned';
      const excludedMatch = !showExcluded || expense.isExcluded;
      const incomeMatch = !showIncome || expense.isIncome;
      const onceOffMatch = !showOnceOff || expense.isOnceOff;
      const hasTagsMatch = !showHasTags || (expense.tags && expense.tags.length > 0);

      // Date filter
      const [day, month, year] = expense.date.split('/').map(Number);
      const expenseDate = new Date(year, month - 1, day); // month is 0-based in JavaScript Date
      const yearMatch = expenseDate.getFullYear() === selectedYear;
      const monthMatch = selectedMonths.has(expenseDate.getMonth());
      
      return typeMatch && searchMatch && unassignedMatch && excludedMatch && 
             incomeMatch && onceOffMatch && yearMatch && monthMatch && hasTagsMatch;
    });

    const sortedAndFiltered = sortExpenses(filtered);
    setFilteredExpenses(sortedAndFiltered);
    calculateTotals(sortedAndFiltered);
  }, [selectedType, searchQuery, showUnassignedOnly, expenses, sortConfig, 
      selectedYear, selectedMonths, showExcluded, showIncome, showOnceOff, showHasTags]);

  const calculateTotals = (expenseList) => {
    // Calculate total expenses, excluded amount, once-off total, and income
    let total = 0;
    let excluded = 0;
    let onceOff = 0;
    let income = 0;
    
    expenseList.forEach(expense => {
      if (expense.isIncome) {
        income += Math.abs(expense.amount);
      } else if (expense.isExcluded) {
        excluded += Math.abs(expense.amount);
      } else if (expense.isOnceOff) {
        onceOff += Math.abs(expense.amount);
      } else {
        total += Math.abs(expense.amount);
      }
    });
    
    setTotalExpenses(total);
    setExcludedFromBudget(excluded);
    setOnceOffTotal(onceOff);
    setIncomeTotal(income);

    // Calculate type totals (excluding excluded, once-off, and income expenses)
    const typeTotals = {};
    const tagTotals = {};
    expenseList.forEach(expense => {
      if (!expense.isExcluded && !expense.isOnceOff && !expense.isIncome) {
        // Calculate type totals
        const type = expense.type;
        typeTotals[type] = (typeTotals[type] || 0) + Math.abs(expense.amount);

        // Calculate tag totals
        if (expense.tags && expense.tags.length > 0) {
          expense.tags.forEach(tag => {
            tagTotals[tag] = (tagTotals[tag] || 0) + Math.abs(expense.amount);
          });
        }
      }
    });
    setTypeTotals(typeTotals);
    setTagTotals(tagTotals);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewExpense(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) return;

    if (editingId) {
      // Update existing expense
      setExpenses(prev => prev.map(expense => 
        expense.id === editingId ? { ...newExpense, id: editingId } : expense
      ));
      setEditingId(null);
    } else {
      // Add new expense
      setExpenses(prev => [...prev, { ...newExpense, id: Date.now() }]);
    }

    // Reset form
    setNewExpense({
      description: '',
      amount: '',
      category: 'Food',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleEdit = (expense) => {
    setEditingId(expense.id);
    setNewExpense(expense);
  };

  const handleDelete = (id) => {
    setExpenses(prev => prev.filter(expense => expense.id !== id));
  };

  const handleTypeChange = async (expenseId, newType) => {
    console.log('handleTypeChange called with:', { expenseId, newType });
    
    // Get the line info from the expense line map
    const lineInfo = expenseLineMap.get(expenseId);
    if (!lineInfo) {
      console.error('Line info not found for expense:', expenseId);
      return;
    }

    const { noteId, lineIndex } = lineInfo;
    console.log('Found line info:', { noteId, lineIndex });

    // Find the type note that matches the selected type
    const typeNote = Array.from(expenseTypeMap.entries())
      .find(([_, type]) => type === newType);
    
    if (!typeNote) {
      console.error('Type note not found for type:', newType);
      return;
    }
    const [typeNoteId] = typeNote;
    console.log('Found type note:', typeNoteId);

    // Find the original note
    const originalNote = allNotes.find(note => note.id === noteId);
    console.log('Found original note:', originalNote);
    if (!originalNote) {
      console.error('Original note not found:', noteId);
      return;
    }

    // Split the note content into lines
    const lines = originalNote.content.split('\n');
    console.log('Processing line index:', lineIndex);
    console.log('Original lines:', lines);

    // Find the expense line and add/update the meta_line::expense_type tag
    const expenseLine = lines[lineIndex];
    console.log('Original expense line:', expenseLine);
    if (expenseLine) {
      // Get the base content (without any meta_line tags)
      const baseContent = expenseLine.replace(/meta_line::[^:]+::[^\s]+\s*/g, '').trim();
      console.log('Base content:', baseContent);
      
      // Extract all existing meta_line tags except expense_type
      const existingMetaTags = expenseLine.match(/meta_line::(?!expense_type)[^:]+::[^\s]+/g) || [];
      console.log('Existing meta tags:', existingMetaTags);
      
      // Check if the line has exclude_from_budget tag
      const hasExcludeTag = expenseLine.includes('meta_line::exclude_from_budget');
      
      // Create the new line with all tags
      const newMetaTags = [
        ...existingMetaTags,
        `meta_line::expense_type::${typeNoteId}`,
        ...(hasExcludeTag ? ['meta_line::exclude_from_budget'] : [])
      ];
      console.log('New meta tags:', newMetaTags);
      
      // Combine everything with proper spacing
      const updatedLine = [baseContent, ...newMetaTags].join(' ');
      lines[lineIndex] = updatedLine;
    }

    // Update the note with the modified content
    try {
      const updatedContent = lines.join('\n');
      console.log('Full updated content:', updatedContent);
      
      // Update the note content
      console.log('Calling updateNoteById with:', {
        noteId,
        content: updatedContent
      });
      await updateNoteById(noteId, updatedContent);
      console.log('Note updated successfully');
      
      // Update allNotes state with the modified note
      setAllNotes(prevNotes => {
        const newNotes = prevNotes.map(note => 
          note.id === noteId 
            ? { ...note, content: updatedContent }
            : note
        );
        console.log('Updated allNotes state');
        return newNotes;
      });
      
      // Update the local state
      setExpenses(prevExpenses => {
        const newExpenses = prevExpenses.map(exp => 
          exp.id === expenseId ? { ...exp, type: newType } : exp
        );
        console.log('Updated expenses state');
        return newExpenses;
      });

      // Refresh the expenses to ensure we have the latest data
      console.log('Refreshing all notes');
      const refreshResponse = await loadAllNotes();
      console.log('Refresh response:', refreshResponse);
      setAllNotes(refreshResponse.notes);
      
      // Re-parse expenses with the updated notes
      const parsedExpenses = parseExpenses(refreshResponse.notes, expenseTypeMap);
      setExpenses(parsedExpenses);
      setFilteredExpenses(parsedExpenses);
      calculateTotals(parsedExpenses);
      
    } catch (error) {
      console.error('Error updating note:', error);
      console.error('Error details:', {
        expenseId,
        newType,
        noteId,
        lineIndex,
        originalContent: originalNote.content,
        updatedContent: lines.join('\n')
      });
    }
  };

  const handleBulkTypeChange = async (newType) => {
    if (selectedExpenses.size === 0) return;

    try {
      console.log('Starting bulk update for type:', newType);
      console.log('Selected expenses:', Array.from(selectedExpenses));

      // Find the type note for the new type
      const typeNote = Array.from(expenseTypeMap.entries())
        .find(([_, type]) => type === newType);
      
      if (!typeNote) {
        console.error('Type note not found for type:', newType);
        return;
      }
      const [typeNoteId] = typeNote;
      console.log('Found type note ID:', typeNoteId);

      // Create a map of note updates
      const noteUpdates = new Map();

      // Process each selected expense
      for (const expenseId of selectedExpenses) {
        const lineInfo = expenseLineMap.get(expenseId);
        if (!lineInfo) {
          console.error('Line info not found for expense:', expenseId);
          continue;
        }

        const { noteId, lineIndex, content } = lineInfo;
        console.log('Processing expense:', { expenseId, noteId, lineIndex });

        // Get or create the note update entry
        if (!noteUpdates.has(noteId)) {
          const note = allNotes.find(n => n.id === noteId);
          if (!note) {
            console.error('Note not found:', noteId);
            continue;
          }
          noteUpdates.set(noteId, {
            content: note.content,
            lines: note.content.split('\n'),
            updatedLines: new Set()
          });
        }

        const noteUpdate = noteUpdates.get(noteId);
        const expenseLine = noteUpdate.lines[lineIndex];
        
        if (!expenseLine) {
          console.error('No line found at index:', lineIndex);
          continue;
        }

        console.log('Original line:', expenseLine);
        
        // Get the base content (without any meta_line tags)
        const baseContent = expenseLine.replace(/meta_line::[^:]+::[^\s]+\s*/g, '').trim();
        console.log('Base content:', baseContent);
        
        // Extract all existing meta_line tags except expense_type
        const existingMetaTags = expenseLine.match(/meta_line::(?!expense_type)[^:]+::[^\s]+/g) || [];
        console.log('Existing meta tags:', existingMetaTags);
        
        // Create the new line with all tags
        const newMetaTags = [
          ...existingMetaTags,
          ...(newType === 'Unassigned' ? [] : [`meta_line::expense_type::${typeNoteId}`])
        ];
        console.log('New meta tags:', newMetaTags);
        
        // Combine everything with proper spacing
        const updatedLine = [baseContent, ...newMetaTags].join(' ');
        console.log('Updated line:', updatedLine);
        
        if (updatedLine !== expenseLine) {
          noteUpdate.lines[lineIndex] = updatedLine;
          noteUpdate.updatedLines.add(lineIndex);
          console.log('Line marked for update at index:', lineIndex);
        }
      }

      // Update each note that has changes
      for (const [noteId, noteUpdate] of noteUpdates.entries()) {
        if (noteUpdate.updatedLines.size > 0) {
          console.log('Updating note:', noteId);
          console.log('Updated lines:', Array.from(noteUpdate.updatedLines));
          
          const updatedContent = noteUpdate.lines.join('\n');
          console.log('Updated content:', updatedContent);
          
          await updateNoteById(noteId, updatedContent);
          console.log('Note updated successfully');
          
          // Update allNotes state
          setAllNotes(prevNotes => 
            prevNotes.map(n => 
              n.id === noteId ? { ...n, content: updatedContent } : n
            )
          );
        } else {
          console.log('No changes to note:', noteId);
        }
      }

      // Clear selection
      setSelectedExpenses(new Set());

      // Refresh the expenses
      console.log('Refreshing expenses...');
      const refreshResponse = await loadAllNotes();
      setAllNotes(refreshResponse.notes);
      const parsedExpenses = parseExpenses(refreshResponse.notes, expenseTypeMap);
      setExpenses(parsedExpenses);
      setFilteredExpenses(parsedExpenses);
      calculateTotals(parsedExpenses);
      console.log('Bulk update completed successfully');

    } catch (error) {
      console.error('Error in bulk update:', error);
      console.error('Error details:', {
        selectedExpenses: Array.from(selectedExpenses),
        newType,
        error: error.message
      });
    }
  };

  const toggleExpenseSelection = (expenseId) => {
    setSelectedExpenses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(expenseId)) {
        newSet.delete(expenseId);
      } else {
        newSet.add(expenseId);
      }
      return newSet;
    });
  };

  const handleExcludeFromBudget = async (expenseId, exclude) => {
    console.log('handleExcludeFromBudget called with:', { expenseId, exclude });
    
    // Get the line info from the expense line map
    const lineInfo = expenseLineMap.get(expenseId);
    if (!lineInfo) {
      console.error('Line info not found for expense:', expenseId);
      return;
    }

    const { noteId, lineIndex } = lineInfo;
    console.log('Found line info:', { noteId, lineIndex });

    // Find the original note
    const originalNote = allNotes.find(note => note.id === noteId);
    if (!originalNote) {
      console.error('Original note not found:', noteId);
      return;
    }

    // Split the note content into lines
    const lines = originalNote.content.split('\n');
    const expenseLine = lines[lineIndex];
    
    if (expenseLine) {
      // Get the base content (without any meta_line tags)
      const baseContent = expenseLine.replace(/meta_line::[^:]+::[^\s]+\s*/g, '').trim();
      
      // Extract all existing meta_line tags except exclude_from_budget
      const existingMetaTags = expenseLine.match(/meta_line::(?!exclude_from_budget)[^:]+::[^\s]+/g) || [];
      
      // Create the new line with all tags
      const newMetaTags = [
        ...existingMetaTags,
        ...(exclude ? ['meta_line::exclude_from_budget'] : [])
      ];
      
      // Combine everything with proper spacing
      const updatedLine = [baseContent, ...newMetaTags].join(' ');
      lines[lineIndex] = updatedLine;

      try {
        const updatedContent = lines.join('\n');
        await updateNoteById(noteId, updatedContent);
        
        // Update allNotes state
        setAllNotes(prevNotes => 
          prevNotes.map(note => 
            note.id === noteId ? { ...note, content: updatedContent } : note
          )
        );

        // Update the local state
        setExpenses(prevExpenses => 
          prevExpenses.map(exp => 
            exp.id === expenseId ? { ...exp, isExcluded: exclude } : exp
          )
        );

        // Refresh the expenses
        const refreshResponse = await loadAllNotes();
        setAllNotes(refreshResponse.notes);
        const parsedExpenses = parseExpenses(refreshResponse.notes, expenseTypeMap);
        setExpenses(parsedExpenses);
        setFilteredExpenses(parsedExpenses);
        calculateTotals(parsedExpenses);
        
      } catch (error) {
        console.error('Error updating note:', error);
      }
    }
  };

  const handleOnceOff = async (expenseId, isOnceOff) => {
    console.log('handleOnceOff called with:', { expenseId, isOnceOff });
    
    // Get the line info from the expense line map
    const lineInfo = expenseLineMap.get(expenseId);
    if (!lineInfo) {
      console.error('Line info not found for expense:', expenseId);
      return;
    }

    const { noteId, lineIndex } = lineInfo;
    console.log('Found line info:', { noteId, lineIndex });

    // Find the original note
    const originalNote = allNotes.find(note => note.id === noteId);
    if (!originalNote) {
      console.error('Original note not found:', noteId);
      return;
    }

    // Split the note content into lines
    const lines = originalNote.content.split('\n');
    const expenseLine = lines[lineIndex];
    
    if (expenseLine) {
      // Get the base content (without any meta_line tags)
      const baseContent = expenseLine.replace(/meta_line::[^:]+::[^\s]+\s*/g, '').trim();
      
      // Extract all existing meta_line tags except once_off
      const existingMetaTags = expenseLine.match(/meta_line::(?!once_off)[^:]+::[^\s]+/g) || [];
      
      // Create the new line with all tags
      const newMetaTags = [
        ...existingMetaTags,
        ...(isOnceOff ? ['meta_line::once_off'] : [])
      ];
      
      // Combine everything with proper spacing
      const updatedLine = [baseContent, ...newMetaTags].join(' ');
      lines[lineIndex] = updatedLine;

      try {
        const updatedContent = lines.join('\n');
        await updateNoteById(noteId, updatedContent);
        
        // Update allNotes state
        setAllNotes(prevNotes => 
          prevNotes.map(note => 
            note.id === noteId ? { ...note, content: updatedContent } : note
          )
        );

        // Update the local state
        setExpenses(prevExpenses => 
          prevExpenses.map(exp => 
            exp.id === expenseId ? { ...exp, isOnceOff: isOnceOff } : exp
          )
        );

        // Refresh the expenses
        const refreshResponse = await loadAllNotes();
        setAllNotes(refreshResponse.notes);
        const parsedExpenses = parseExpenses(refreshResponse.notes, expenseTypeMap);
        setExpenses(parsedExpenses);
        setFilteredExpenses(parsedExpenses);
        calculateTotals(parsedExpenses);
        
      } catch (error) {
        console.error('Error updating note:', error);
      }
    }
  };

  const handleAmountHover = (event, type) => {
    setTooltipPosition({
      x: event.clientX + 10,
      y: event.clientY
    });
    setHoveredType(type);
  };

  const handleTotalHover = (event, type) => {
    setTooltipPosition({
      x: event.clientX + 10,
      y: event.clientY
    });
    setHoveredTotal(type);
  };

  const handleMouseMove = (event) => {
    if (hoveredType || hoveredTotal) {
      setTooltipPosition({
        x: event.clientX + 10,
        y: event.clientY
      });
    }
  };

  // Check for unassigned expenses
  const hasUnassignedExpenses = filteredExpenses.some(expense => expense.type === 'Unassigned');
  const unassignedCount = filteredExpenses.filter(expense => expense.type === 'Unassigned').length;

  const handleStatusClick = (event, expenseId) => {
    setStatusPopup({
      id: expenseId,
      x: event.clientX,
      y: event.clientY
    });
  };

  const handleStatusChange = async (expenseId, type, checked) => {
    // Get the line info from the expense line map
    const lineInfo = expenseLineMap.get(expenseId);
    if (!lineInfo) {
      console.error('Line info not found for expense:', expenseId);
      return;
    }

    const { noteId, lineIndex } = lineInfo;
    console.log('Found line info:', { noteId, lineIndex });

    // Find the original note
    const originalNote = allNotes.find(note => note.id === noteId);
    if (!originalNote) {
      console.error('Original note not found:', noteId);
      return;
    }

    // Split the note content into lines
    const lines = originalNote.content.split('\n');
    const expenseLine = lines[lineIndex];
    
    if (expenseLine) {
      // Get the base content (without any meta_line tags)
      const baseContent = expenseLine.replace(/meta_line::[^:]+::[^\s]+\s*/g, '').trim();
      
      // Extract all existing meta_line tags except the one we're changing
      const tagToRemove = type === 'excluded' ? 'exclude_from_budget' :
                         type === 'onceOff' ? 'once_off' :
                         type === 'income' ? 'income' : '';
      
      // Get all existing meta tags except expense_type
      const existingMetaTags = expenseLine.match(/meta_line::(?!expense_type)[^:]+::[^\s]+/g) || [];
      const filteredTags = existingMetaTags.filter(tag => !tag.includes(tagToRemove));
      
      // Create the new line with all tags
      const newMetaTags = [
        ...filteredTags,
        ...(checked ? [`meta_line::${tagToRemove}`] : [])
      ];
      
      // Combine everything with proper spacing
      const updatedLine = [baseContent, ...newMetaTags].join(' ');
      lines[lineIndex] = updatedLine;

      try {
        const updatedContent = lines.join('\n');
        await updateNoteById(noteId, updatedContent);
        
        // Update allNotes state
        setAllNotes(prevNotes => 
          prevNotes.map(note => 
            note.id === noteId ? { ...note, content: updatedContent } : note
          )
        );

        // Update the local state
        setExpenses(prevExpenses => 
          prevExpenses.map(exp => 
            exp.id === expenseId ? { 
              ...exp, 
              isExcluded: type === 'excluded' ? checked : exp.isExcluded,
              isOnceOff: type === 'onceOff' ? checked : exp.isOnceOff,
              isIncome: type === 'income' ? checked : exp.isIncome
            } : exp
          )
        );

        // Refresh the expenses
        const refreshResponse = await loadAllNotes();
        setAllNotes(refreshResponse.notes);
        const parsedExpenses = parseExpenses(refreshResponse.notes, expenseTypeMap);
        setExpenses(parsedExpenses);
        setFilteredExpenses(parsedExpenses);
        calculateTotals(parsedExpenses);
        
      } catch (error) {
        console.error('Error updating note:', error);
      }
    }
  };

  const handleTagClick = (event, expenseId) => {
    const expense = filteredExpenses.find(e => e.id === expenseId);
    setTagInput(expense.tags ? expense.tags.join(' ') : '');
    setTagPopup({
      id: expenseId,
      x: event.clientX,
      y: event.clientY
    });
    // Get all unique tags from all expenses
    const allTags = new Set();
    expenses.forEach(exp => {
      if (exp.tags) {
        exp.tags.forEach(tag => allTags.add(tag));
      }
    });
    setTagSuggestions(Array.from(allTags));
  };

  const handleTagInputChange = (e) => {
    const value = e.target.value;
    setTagInput(value);
    
    // Show suggestions if there's input
    setShowSuggestions(value.trim().length > 0);
    
    // Filter suggestions based on input
    const inputTags = value.split(' ').filter(tag => tag.trim());
    const lastTag = inputTags[inputTags.length - 1] || '';
    
    const allTags = new Set();
    expenses.forEach(exp => {
      if (exp.tags) {
        exp.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    const filteredSuggestions = Array.from(allTags)
      .filter(tag => 
        tag.toLowerCase().includes(lastTag.toLowerCase()) && 
        !inputTags.includes(tag)
      );
    
    setTagSuggestions(filteredSuggestions);
  };

  const addTagFromSuggestion = (tag) => {
    const currentTags = tagInput.split(' ').filter(t => t.trim());
    currentTags[currentTags.length - 1] = tag;
    setTagInput(currentTags.join(' ') + ' ');
    setShowSuggestions(false);
  };

  const handleTagChange = async (expenseId, newTags) => {
    // Get the line info from the expense line map
    const lineInfo = expenseLineMap.get(expenseId);
    if (!lineInfo) {
      console.error('Line info not found for expense:', expenseId);
      return;
    }

    const { noteId, lineIndex } = lineInfo;
    console.log('Found line info:', { noteId, lineIndex });

    // Find the original note
    const originalNote = allNotes.find(note => note.id === noteId);
    if (!originalNote) {
      console.error('Original note not found:', noteId);
      return;
    }

    // Split the note content into lines
    const lines = originalNote.content.split('\n');
    const expenseLine = lines[lineIndex];
    
    if (expenseLine) {
      // Get the base content (without any meta_line tags)
      const baseContent = expenseLine.replace(/meta_line::[^:]+::[^\s]+\s*/g, '').trim();
      
      // Extract all existing meta_line tags except tags
      const existingMetaTags = expenseLine.match(/meta_line::(?!tags)[^:]+::[^\s]+/g) || [];
      
      // Create the new line with all tags
      const newMetaTags = [
        ...existingMetaTags,
        ...(newTags.length > 0 ? [`meta_line_tags::${newTags.join('||')}`] : [])
      ];
      
      // Combine everything with proper spacing
      const updatedLine = [baseContent, ...newMetaTags].join(' ');
      lines[lineIndex] = updatedLine;

      try {
        const updatedContent = lines.join('\n');
        await updateNoteById(noteId, updatedContent);
        
        // Update allNotes state
        setAllNotes(prevNotes => 
          prevNotes.map(note => 
            note.id === noteId ? { ...note, content: updatedContent } : note
          )
        );

        // Update the local state
        setExpenses(prevExpenses => 
          prevExpenses.map(exp => 
            exp.id === expenseId ? { ...exp, tags: newTags } : exp
          )
        );

        // Refresh the expenses
        const refreshResponse = await loadAllNotes();
        setAllNotes(refreshResponse.notes);
        const parsedExpenses = parseExpenses(refreshResponse.notes, expenseTypeMap);
        setExpenses(parsedExpenses);
        setFilteredExpenses(parsedExpenses);
        calculateTotals(parsedExpenses);
        
      } catch (error) {
        console.error('Error updating note:', error);
      }
    }
  };

  const handleTagRemove = async (expenseId, tagToRemove) => {
    console.log('Starting tag removal for expense:', expenseId, 'tag:', tagToRemove);
    
    try {
      // Get the line info from the expense line map
      const lineInfo = expenseLineMap.get(expenseId);
      if (!lineInfo) {
        console.error('Line info not found for expense:', expenseId);
        return;
      }

      const { noteId, lineIndex } = lineInfo;
      console.log('Found line info:', { noteId, lineIndex });

      // Find the original note
      const originalNote = allNotes.find(note => note.id === noteId);
      if (!originalNote) {
        console.error('Original note not found:', noteId);
        return;
      }

      // Split the note content into lines
      const lines = originalNote.content.split('\n');
      const expenseLine = lines[lineIndex];
      
      if (!expenseLine) {
        console.error('Expense line not found at index:', lineIndex);
        return;
      }

      // Get the base content (without any meta_line tags)
      const baseContent = expenseLine.replace(/meta_line::[^:]+::[^\s]+\s*/g, '').trim();
      
      // Extract all existing meta_line tags except tags
      const existingMetaTags = expenseLine.match(/meta_line::(?!tags)[^:]+::[^\s]+/g) || [];
      
      // Get current tags and remove the specified tag
      const tagsMatch = expenseLine.match(/meta_line_tags::([^\s]+)/);
      const currentTags = tagsMatch ? tagsMatch[1].split('||') : [];
      const newTags = currentTags.filter(tag => tag !== tagToRemove);
      
      // Create the new line with all tags
      const newMetaTags = [
        ...existingMetaTags,
        ...(newTags.length > 0 ? [`meta_line_tags::${newTags.join('||')}`] : [])
      ];
      
      // Combine everything with proper spacing
      const updatedLine = [baseContent, ...newMetaTags].join(' ');
      lines[lineIndex] = updatedLine;

      // Update the note content
      const updatedContent = lines.join('\n');
      console.log('Updating note content:', updatedContent);

      // Save the updated note
      await updateNoteById(noteId, updatedContent);
      console.log('Note updated successfully');

      // Update the local state immediately
      const updatedNote = { ...originalNote, content: updatedContent };
      const updatedNotes = allNotes.map(note => 
        note.id === noteId ? updatedNote : note
      );
      setAllNotes(updatedNotes);

      // Update the expenses state
      const updatedExpenses = expenses.map(exp => 
        exp.id === expenseId ? { ...exp, tags: newTags } : exp
      );
      setExpenses(updatedExpenses);
      setFilteredExpenses(updatedExpenses);

      // Update tag input if we're in the tag popup
      if (tagPopup && tagPopup.id === expenseId) {
        setTagInput(newTags.join(' '));
      }

      // Refresh the expenses list
      const refreshResponse = await loadAllNotes();
      const parsedExpenses = parseExpenses(refreshResponse.notes, expenseTypeMap);
      
      // Update the expense line map
      const newLineMap = new Map();
      parsedExpenses.forEach(expense => {
        const { noteId, lineIndex } = expenseLineMap.get(expense.id) || {};
        if (noteId && lineIndex !== undefined) {
          newLineMap.set(expense.id, { noteId, lineIndex });
        }
      });
      setExpenseLineMap(newLineMap);

      // Update the states with the refreshed data
      setAllNotes(refreshResponse.notes);
      setExpenses(parsedExpenses);
      setFilteredExpenses(parsedExpenses);
      calculateTotals(parsedExpenses);

      console.log('Tag removal completed successfully');
    } catch (error) {
      console.error('Error in handleTagRemove:', error);
      console.error('Error details:', {
        expenseId,
        tagToRemove,
        error: error.message
      });
    }
  };

  // Add click handler to close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusPopup && !event.target.closest('.status-popup')) {
        setStatusPopup(null);
      }
      if (tagPopup && !event.target.closest('.tag-popup')) {
        setTagPopup(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [statusPopup, tagPopup]);

  const handleBulkExclude = async () => {
    if (selectedExpenses.size === 0) return;

    try {
      console.log('Starting bulk exclude for expenses:', Array.from(selectedExpenses));

      // Create a map of note updates
      const noteUpdates = new Map();

      // Process each selected expense
      for (const expenseId of selectedExpenses) {
        const lineInfo = expenseLineMap.get(expenseId);
        if (!lineInfo) {
          console.error('Line info not found for expense:', expenseId);
          continue;
        }

        const { noteId, lineIndex, content } = lineInfo;
        console.log('Processing expense:', { expenseId, noteId, lineIndex });

        // Get or create the note update entry
        if (!noteUpdates.has(noteId)) {
          const note = allNotes.find(n => n.id === noteId);
          if (!note) {
            console.error('Note not found:', noteId);
            continue;
          }
          noteUpdates.set(noteId, {
            content: note.content,
            lines: note.content.split('\n'),
            updatedLines: new Set()
          });
        }

        const noteUpdate = noteUpdates.get(noteId);
        const expenseLine = noteUpdate.lines[lineIndex];
        
        if (!expenseLine) {
          console.error('No line found at index:', lineIndex);
          continue;
        }

        console.log('Original line:', expenseLine);
        
        // Get the base content (without any meta_line tags)
        const baseContent = expenseLine.replace(/meta_line::[^:]+::[^\s]+\s*/g, '').trim();
        console.log('Base content:', baseContent);
        
        // Extract all existing meta_line tags except exclude_from_budget
        const existingMetaTags = expenseLine.match(/meta_line::(?!exclude_from_budget)[^:]+::[^\s]+/g) || [];
        console.log('Existing meta tags:', existingMetaTags);
        
        // Create the new line with all tags
        const newMetaTags = [
          ...existingMetaTags,
          'meta_line::exclude_from_budget'
        ];
        console.log('New meta tags:', newMetaTags);
        
        // Combine everything with proper spacing
        const updatedLine = [baseContent, ...newMetaTags].join(' ');
        console.log('Updated line:', updatedLine);
        
        if (updatedLine !== expenseLine) {
          noteUpdate.lines[lineIndex] = updatedLine;
          noteUpdate.updatedLines.add(lineIndex);
          console.log('Line marked for update at index:', lineIndex);
        }
      }

      // Update each note that has changes
      for (const [noteId, noteUpdate] of noteUpdates.entries()) {
        if (noteUpdate.updatedLines.size > 0) {
          console.log('Updating note:', noteId);
          console.log('Updated lines:', Array.from(noteUpdate.updatedLines));
          
          const updatedContent = noteUpdate.lines.join('\n');
          console.log('Updated content:', updatedContent);
          
          await updateNoteById(noteId, updatedContent);
          console.log('Note updated successfully');
          
          // Update allNotes state
          setAllNotes(prevNotes => 
            prevNotes.map(n => 
              n.id === noteId ? { ...n, content: updatedContent } : n
            )
          );
        } else {
          console.log('No changes to note:', noteId);
        }
      }

      // Clear selection
      setSelectedExpenses(new Set());
      setShowBulkExclude(false);

      // Refresh the expenses
      console.log('Refreshing expenses...');
      const refreshResponse = await loadAllNotes();
      setAllNotes(refreshResponse.notes);
      const parsedExpenses = parseExpenses(refreshResponse.notes, expenseTypeMap);
      setExpenses(parsedExpenses);
      setFilteredExpenses(parsedExpenses);
      calculateTotals(parsedExpenses);
      console.log('Bulk exclude completed successfully');

    } catch (error) {
      console.error('Error in bulk exclude:', error);
      console.error('Error details:', {
        selectedExpenses: Array.from(selectedExpenses),
        error: error.message
      });
    }
  };

  if (loading) {
    //console.log('Rendering loading state');
    return (
      <div className="p-4 w-full">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  //console.log('Rendering main component with expenses:', expenses);
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Expense Tracker</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDataLoader(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
            Data Loader
          </button>
          <button
            onClick={() => setShowBudget(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Cog6ToothIcon className="h-5 w-5" />
            Manage Budget
          </button>
        </div>
      </div>

      {/* Year and Month Selection */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-2">
          {years.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-4 py-2 rounded-md transition-colors ${
                selectedYear === year
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {months.map((month, index) => (
            <button
              key={month}
              onClick={() => {
                setSelectedMonths(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has(index)) {
                    newSet.delete(index);
                  } else {
                    newSet.add(index);
                  }
                  return newSet;
                });
              }}
              className={`px-4 py-2 rounded-md transition-colors ${
                selectedMonths.has(index)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {month}
            </button>
          ))}
          <button
            onClick={() => {
              const currentMonth = new Date().getMonth();
              const ytdMonths = new Set(Array.from({length: currentMonth + 1}, (_, i) => i));
              setSelectedMonths(ytdMonths);
            }}
            className="px-4 py-2 rounded-md transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            YTD
          </button>
        </div>
      </div>

      {/* Unassigned Expenses Alert */}
      {hasUnassignedExpenses && (
        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                There {unassignedCount === 1 ? 'is' : 'are'} {unassignedCount} unassigned {unassignedCount === 1 ? 'expense' : 'expenses'} in the current selection. Please assign types to {unassignedCount === 1 ? 'this expense' : 'these expenses'}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Controls */}
      {selectedExpenses.size > 0 && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">
              {selectedExpenses.size} expenses selected
            </span>
            <select
              value={bulkType}
              onChange={(e) => setBulkType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {expenseTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <button
              onClick={() => handleBulkTypeChange(bulkType)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Update Type
            </button>
            <button
              onClick={() => setShowBulkExclude(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Exclude from Budget
            </button>
          </div>
        </div>
      )}

      {/* Bulk Exclude Confirmation Modal */}
      {showBulkExclude && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
              <h2 className="text-xl font-semibold text-gray-900">Exclude Expenses</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to exclude {selectedExpenses.size} expenses from the budget? This will remove them from budget calculations but they will still be visible in the list.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowBulkExclude(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkExclude}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Exclude Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Types</option>
              {expenseTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Expenses</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by description, type, source..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedType('All');
                setSearchQuery('');
                setShowUnassignedOnly(false);
                setShowExcluded(false);
                setShowIncome(false);
                setShowOnceOff(false);
                setShowHasTags(false);
                setSelectedMonths(new Set([new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1]));
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Reset Filters
            </button>
          </div>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showUnassignedOnly}
              onChange={(e) => setShowUnassignedOnly(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Unassigned Only</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showExcluded}
              onChange={(e) => setShowExcluded(e.target.checked)}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Excluded Only</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showIncome}
              onChange={(e) => setShowIncome(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Income Only</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showOnceOff}
              onChange={(e) => setShowOnceOff(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Once Off Only</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showHasTags}
              onChange={(e) => setShowHasTags(e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Has Tags</span>
          </label>
        </div>
      </div>

      {/* Load Status Section */}
      <div className="mb-6">
        <button
          onClick={() => setIsLoadStatusCollapsed(!isLoadStatusCollapsed)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
        >
          <svg
            className={`w-4 h-4 transform transition-transform ${isLoadStatusCollapsed ? 'rotate-90' : '-rotate-90'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>{isLoadStatusCollapsed ? 'Show Load Status' : 'Hide Load Status'}</span>
        </button>
        
        <div className={`transition-all duration-300 ease-in-out ${isLoadStatusCollapsed ? 'max-h-0 overflow-hidden' : 'max-h-[2000px]'}`}>
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Load Status</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Transaction</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Transaction</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction Count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loadStatus.map((status, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{status.sourceType}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{status.sourceName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{status.firstDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{status.lastDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{status.count}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">${status.debit.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">${status.credit.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan="5" className="px-6 py-4 text-right text-sm text-gray-900">Total:</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      ${loadStatus.reduce((sum, status) => sum + status.debit, 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      ${loadStatus.reduce((sum, status) => sum + status.credit, 0).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Container */}
      <div className="mb-6">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
        >
          <svg
            className={`w-4 h-4 transform transition-transform ${isCollapsed ? 'rotate-90' : '-rotate-90'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>{isCollapsed ? 'Show Summary' : 'Hide Summary'}</span>
        </button>
        
        <div className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-0 overflow-hidden' : 'max-h-[2000px]'}`}>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2">Budget Summary</h2>
              <div 
                className="space-y-4"
                onMouseMove={handleMouseMove}
              >
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Income</h3>
                    <p 
                      className="text-2xl font-bold text-green-600 cursor-help"
                      onMouseEnter={(e) => handleTotalHover(e, 'income')}
                      onMouseLeave={() => setHoveredTotal(null)}
                    >
                      ${Math.abs(incomeTotal).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
                    <p className="text-2xl font-bold text-red-600">${Math.abs(totalExpenses).toFixed(2)}</p>
                    {incomeTotal > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {Math.round((Math.abs(totalExpenses) / incomeTotal) * 100)}% of income
                      </p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Savings</h3>
                    <p className={`text-2xl font-bold ${(incomeTotal - Math.abs(totalExpenses)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${(incomeTotal - Math.abs(totalExpenses)).toFixed(2)}
                    </p>
                    {incomeTotal > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {Math.round(((incomeTotal - Math.abs(totalExpenses)) / incomeTotal) * 100)}% of income
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Excluded from Budget</h3>
                  <p 
                    className="text-2xl font-bold text-gray-600 cursor-help"
                    onMouseEnter={(e) => handleTotalHover(e, 'excluded')}
                    onMouseLeave={() => setHoveredTotal(null)}
                  >
                    ${Math.abs(excludedFromBudget).toFixed(2)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Once Off Expenses</h3>
                  <p 
                    className="text-2xl font-bold text-blue-600 cursor-help"
                    onMouseEnter={(e) => handleTotalHover(e, 'onceOff')}
                    onMouseLeave={() => setHoveredTotal(null)}
                  >
                    ${Math.abs(onceOffTotal).toFixed(2)}
                  </p>
                </div>
              </div>
              {hoveredTotal && (
                <div 
                  className="fixed bg-white p-3 rounded-lg shadow-lg border border-gray-200 z-10 w-[300px]"
                  style={{
                    left: `${tooltipPosition.x}px`,
                    top: `${tooltipPosition.y}px`,
                    transform: 'translateY(-50%)'
                  }}
                >
                  <div className="text-sm">
                    <div className="font-semibold mb-1">
                      {hoveredTotal === 'income' ? 'Income' :
                       hoveredTotal === 'excluded' ? 'Excluded from Budget' : 'Once Off'} Details:
                    </div>
                    <div className="space-y-1">
                      {filteredExpenses
                        .filter(expense => 
                          hoveredTotal === 'income' ? expense.isIncome :
                          hoveredTotal === 'excluded' ? expense.isExcluded :
                          expense.isOnceOff
                        )
                        .map(expense => (
                          <div key={expense.id} className="flex justify-between">
                            <span className="text-gray-600 truncate">{expense.description}</span>
                            <span className="font-medium ml-2">${Math.abs(expense.amount).toFixed(2)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-2">
                <h2 
                  className="text-lg font-semibold cursor-pointer hover:text-blue-600"
                  onClick={() => setTypeBreakdownSort(prev => prev === 'desc' ? 'asc' : 'desc')}
                >
                  Type Distribution {typeBreakdownSort === 'desc' ? '↓' : '↑'}
                </h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Pie</span>
                  <button
                    onClick={() => setChartType(prev => prev === 'pie' ? 'bar' : 'pie')}
                    className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200"
                  >
                    <span
                      className={`${
                        chartType === 'bar' ? 'translate-x-6' : 'translate-x-1'
                      } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                    />
                  </button>
                  <span className="text-sm text-gray-600">Bar</span>
                </div>
              </div>
              <div className="h-64">
                {chartType === 'pie' ? (
                  <Pie
                    data={{
                      labels: Object.keys(typeTotals),
                      datasets: [{
                        data: Object.values(typeTotals).map(Math.abs),
                        backgroundColor: [
                          '#FF6384',
                          '#36A2EB',
                          '#FFCE56',
                          '#4BC0C0',
                          '#9966FF',
                          '#FF9F40',
                          '#8AC24A',
                          '#FF6B6B',
                          '#4A90E2',
                          '#7ED321'
                        ],
                        borderWidth: 1
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: {
                            boxWidth: 12,
                            padding: 15
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const value = Math.abs(context.raw);
                              const total = Math.abs(Object.values(typeTotals).reduce((sum, total) => sum + total, 0));
                              const percentage = ((value / total) * 100).toFixed(1);
                              return `${context.label}: $${value.toFixed(2)} (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <Bar
                    data={{
                      labels: Object.keys(typeTotals),
                      datasets: [{
                        label: 'Amount',
                        data: Object.values(typeTotals).map(Math.abs),
                        backgroundColor: [
                          '#FF6384',
                          '#36A2EB',
                          '#FFCE56',
                          '#4BC0C0',
                          '#9966FF',
                          '#FF9F40',
                          '#8AC24A',
                          '#FF6B6B',
                          '#4A90E2',
                          '#7ED321'
                        ],
                        borderWidth: 1
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const value = Math.abs(context.raw);
                              const total = Math.abs(Object.values(typeTotals).reduce((sum, total) => sum + total, 0));
                              const percentage = ((value / total) * 100).toFixed(1);
                              return `$${value.toFixed(2)} (${percentage}%)`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value) {
                              return '$' + value.toFixed(2);
                            }
                          }
                        }
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Type Breakdown Table */}
          <div 
            className="bg-white p-4 rounded-lg shadow mb-6"
            onMouseMove={handleMouseMove}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-4">
                <h2 
                  className="text-lg font-semibold cursor-pointer hover:text-blue-600"
                  onClick={() => setTypeBreakdownSort(prev => prev === 'desc' ? 'asc' : 'desc')}
                >
                  {breakdownView === 'type' ? 'Type Breakdown' : 'Tag Breakdown'} {typeBreakdownSort === 'desc' ? '↓' : '↑'}
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setBreakdownView('type')}
                    className={`px-3 py-1 rounded-md ${
                      breakdownView === 'type'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    By Type
                  </button>
                  <button
                    onClick={() => setBreakdownView('tag')}
                    className={`px-3 py-1 rounded-md ${
                      breakdownView === 'tag'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    By Tag
                  </button>
                </div>
              </div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showBudgetDetails}
                  onChange={(e) => setShowBudgetDetails(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Show Budget Details</span>
              </label>
            </div>
            <div className="space-y-1">
              {breakdownView === 'type' ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Spent</th>
                        {showBudgetDetails && (
                          <>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Allowance</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(typeTotals)
                        .sort(([, a], [, b]) => {
                          const amountA = Math.abs(a);
                          const amountB = Math.abs(b);
                          return typeBreakdownSort === 'desc' ? amountB - amountA : amountA - amountB;
                        })
                        .map(([type, total]) => {
                          const currentDate = new Date();
                          const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                          const remainingDays = lastDayOfMonth.getDate() - currentDate.getDate() + 1;
                          const budget = budgetAllocations[type] ?? 0;
                          const remainingBudget = budget - Math.abs(total);
                          const dailyAllowance = remainingBudget / remainingDays;
                          const progress = budget === 0 ? 0 : (Math.abs(total) / budget) * 100;

                          return (
                            <tr key={type} className="hover:bg-gray-50">
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                <div 
                                  className="cursor-help"
                                  onMouseEnter={(e) => handleAmountHover(e, type)}
                                  onMouseLeave={() => setHoveredType(null)}
                                >
                                  {type}
                                </div>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-medium">
                                ${Math.abs(total).toFixed(2)}
                              </td>
                              {showBudgetDetails && (
                                <>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-500">
                                    ${budget.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                                    <span className={remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}>
                                      ${remainingBudget.toFixed(2)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-500">
                                    ${dailyAllowance.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                      <div 
                                        className="h-2.5 rounded-full transition-all duration-300"
                                        style={{ 
                                          width: `${Math.min(progress, 100)}%`,
                                          backgroundColor: budget === 0 ? '#EF4444' : (Math.abs(total) > budget ? '#EF4444' : '#3B82F6')
                                        }}
                                      />
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      <tr className="bg-gray-50 font-bold">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">Total</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                          ${Math.abs(Object.values(typeTotals).reduce((sum, total) => sum + total, 0)).toFixed(2)}
                        </td>
                        {showBudgetDetails && (
                          <>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                              ${Object.values(budgetAllocations).reduce((sum, budget) => sum + budget, 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                              ${(Object.values(budgetAllocations).reduce((sum, budget) => sum + budget, 0) - 
                                 Math.abs(Object.values(typeTotals).reduce((sum, total) => sum + total, 0))).toFixed(2)}
                            </td>
                            <td colSpan="2"></td>
                          </>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tag</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(tagTotals)
                        .sort(([, a], [, b]) => {
                          const amountA = Math.abs(a);
                          const amountB = Math.abs(b);
                          return typeBreakdownSort === 'desc' ? amountB - amountA : amountA - amountB;
                        })
                        .map(([tag, total]) => (
                          <tr key={tag} className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{tag}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-medium">
                              ${Math.abs(total).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      <tr className="bg-gray-50 font-bold">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">Total</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                          ${Math.abs(Object.values(tagTotals).reduce((sum, total) => sum + total, 0)).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                <input
                  type="checkbox"
                  checked={selectedExpenses.size === filteredExpenses.length}
                  onChange={() => {
                    if (selectedExpenses.size === filteredExpenses.length) {
                      setSelectedExpenses(new Set());
                    } else {
                      setSelectedExpenses(new Set(filteredExpenses.map(e => e.id)));
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('date')}
              >
                Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/12 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('description')}
              >
                Description {sortConfig.key === 'description' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-4/12">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/12">Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('amount')}>
                Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredExpenses.map((expense, index) => {
              return (
                <tr key={expense.id} className={selectedExpenses.has(expense.id) ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-1/12">
                    <input
                      type="checkbox"
                      checked={selectedExpenses.has(expense.id)}
                      onChange={() => toggleExpenseSelection(expense.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-1/12">
                    {expense.date}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 w-2/12">
                    <div className="truncate max-w-xs">{expense.description}</div>
                    {expense.tags && expense.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {expense.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {tag}
                            <button
                              onClick={() => handleTagRemove(expense.id, tag)}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-4/12">
                    <select
                      value={expense.type || 'Unassigned'}
                      onChange={(e) => handleTypeChange(expense.id, e.target.value)}
                      className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        expense.type === 'Unassigned' ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      {expenseTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-2/12">
                    <div className="flex flex-col">
                      <span className="font-medium">{expense.sourceType}</span>
                      <span className="text-gray-500 text-xs">{expense.sourceName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-1/12">
                    <button
                      onClick={(e) => handleStatusClick(e, expense.id)}
                      className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 hover:bg-gray-50 ${
                        expense.isIncome ? 'border-green-500 bg-green-50' :
                        expense.isExcluded ? 'border-red-500 bg-red-50' :
                        expense.isOnceOff ? 'border-blue-500 bg-blue-50' :
                        'border-gray-300'
                      }`}
                    >
                      {expense.isIncome ? 'Income' :
                       expense.isExcluded ? 'Excluded' :
                       expense.isOnceOff ? 'Once Off' : 'Normal'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 w-1/12">
                    ${Math.abs(expense.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleTagClick(e, expense.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEdit(expense)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Status Popup */}
      {statusPopup && (
        <div
          className="status-popup fixed bg-white p-3 rounded-lg shadow-lg border border-gray-200 z-10"
          style={{
            left: `${statusPopup.x}px`,
            top: `${statusPopup.y}px`,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filteredExpenses.find(e => e.id === statusPopup.id)?.isExcluded || false}
                onChange={(e) => handleStatusChange(statusPopup.id, 'excluded', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Excluded</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filteredExpenses.find(e => e.id === statusPopup.id)?.isOnceOff || false}
                onChange={(e) => handleStatusChange(statusPopup.id, 'onceOff', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Once Off</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filteredExpenses.find(e => e.id === statusPopup.id)?.isIncome || false}
                onChange={(e) => handleStatusChange(statusPopup.id, 'income', e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Income</span>
            </label>
          </div>
        </div>
      )}

      {/* Tag Popup */}
      {tagPopup && (
        <div
          className="tag-popup fixed bg-white p-3 rounded-lg shadow-lg border border-gray-200 z-10"
          style={{
            left: `${tagPopup.x - 300}px`,
            top: `${tagPopup.y}px`,
            transform: 'translateY(-50%)',
            width: '300px'
          }}
        >
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 mb-2">
              {tagInput.split(' ').filter(tag => tag.trim()).map((tag, index) => (
                <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {tag}
                  <button
                    onClick={() => handleTagRemove(tagPopup.id, tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="relative">
              <input
                type="text"
                value={tagInput}
                onChange={handleTagInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const tags = tagInput.split(' ').filter(tag => tag.trim());
                    handleTagChange(tagPopup.id, tags);
                    setTagPopup(null);
                  }
                }}
                placeholder="Type tags and press Enter"
                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {showSuggestions && tagSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                  {tagSuggestions.map((tag, index) => (
                    <div
                      key={index}
                      onClick={() => addTagFromSuggestion(tag)}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                    >
                      {tag}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  const tags = tagInput.split(' ').filter(tag => tag.trim());
                  handleTagChange(tagPopup.id, tags);
                  setTagPopup(null);
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Save
              </button>
              <button
                onClick={() => setTagPopup(null)}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showBudget && <Budget onClose={() => setShowBudget(false)} />}

      {showDataLoader && (
        <CSVEditor 
          onClose={() => setShowDataLoader(false)} 
          noteId={budgetNote?.id} 
        />
      )}
    </div>
  );
};

export default ExpenseTracker; 