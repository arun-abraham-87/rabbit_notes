import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { loadAllNotes, updateNoteById } from '../utils/ApiUtils';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';

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
  const [typeTotals, setTypeTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingExpense, setEditingExpense] = useState(null);
  const [allNotes, setAllNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expenseTypeMap, setExpenseTypeMap] = useState(new Map());
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
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

  const categories = ['Food', 'Transportation', 'Entertainment', 'Bills', 'Shopping', 'Other'];
  //console.log('Initialized with categories:', categories);

  const parseExpenses = (notes, typeMap) => {
    const expenseNotes = notes.filter(note => 
      note.content.includes('meta::expense') && 
      !note.content.includes('meta::expense_type') &&
      !note.content.includes('meta::expense_source_type') &&
      !note.content.includes('meta::expense_source_name')
    );

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
          isOnceOff
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

  const sortExpenses = (expenses) => {
    if (!sortConfig.key) return expenses;

    return [...expenses].sort((a, b) => {
      if (sortConfig.key === 'amount') {
        return sortConfig.direction === 'asc' 
          ? a.amount - b.amount 
          : b.amount - a.amount;
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

  // Filter expenses when type, search query, or unassigned filter changes
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
      
      // Unassigned filter
      const unassignedMatch = !showUnassignedOnly || expense.type === 'Unassigned';
      
      return typeMatch && searchMatch && unassignedMatch;
    });

    const sortedAndFiltered = sortExpenses(filtered);
    setFilteredExpenses(sortedAndFiltered);
    calculateTotals(sortedAndFiltered);
  }, [selectedType, searchQuery, showUnassignedOnly, expenses, sortConfig]);

  const calculateTotals = (expenseList) => {
    // Calculate total expenses, excluded amount, and once-off total
    let total = 0;
    let excluded = 0;
    let onceOff = 0;
    
    expenseList.forEach(expense => {
      if (expense.isExcluded) {
        excluded += expense.amount;
      } else if (expense.isOnceOff) {
        onceOff += expense.amount;
      } else {
        total += expense.amount;
      }
    });
    
    setTotalExpenses(total);
    setExcludedFromBudget(excluded);
    setOnceOffTotal(onceOff);

    // Calculate type totals (excluding excluded and once-off expenses)
    const typeTotals = {};
    expenseList.forEach(expense => {
      if (!expense.isExcluded && !expense.isOnceOff) {
        const type = expense.type;
        typeTotals[type] = (typeTotals[type] || 0) + expense.amount;
      }
    });
    setTypeTotals(typeTotals);
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
      
      // Create the new line with all tags
      const newMetaTags = [
        ...existingMetaTags,
        `meta_line::expense_type::${typeNoteId}`
      ];
      console.log('New meta tags:', newMetaTags);
      
      // Combine everything with proper spacing
      const updatedLine = [baseContent, ...newMetaTags].join(' ');
      console.log('Updated line:', updatedLine);
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
          `meta_line::expense_type::${typeNoteId}`
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
    const rect = event.target.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left - 300,
      y: rect.top
    });
    setHoveredType(type);
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
    <div className="p-4 w-full">
      <h1 className="text-2xl font-bold mb-6">Expense Tracker</h1>

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
              Update Selected
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-6">
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
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showUnassignedOnly}
              onChange={(e) => setShowUnassignedOnly(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Show Unassigned Only</span>
          </label>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Budget Summary</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
              <p className="text-2xl font-bold text-red-600">${Math.abs(totalExpenses).toFixed(2)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Excluded from Budget</h3>
              <p className="text-2xl font-bold text-gray-600">${Math.abs(excludedFromBudget).toFixed(2)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Once Off Expenses</h3>
              <p className="text-2xl font-bold text-blue-600">${Math.abs(onceOffTotal).toFixed(2)}</p>
            </div>
          </div>
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
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 
          className="text-lg font-semibold mb-2 cursor-pointer hover:text-blue-600"
          onClick={() => setTypeBreakdownSort(prev => prev === 'desc' ? 'asc' : 'desc')}
        >
          Type Breakdown {typeBreakdownSort === 'desc' ? '↓' : '↑'}
        </h2>
        <div className="space-y-1">
          {Object.entries(typeTotals)
            .sort(([, a], [, b]) => {
              const amountA = Math.abs(a);
              const amountB = Math.abs(b);
              return typeBreakdownSort === 'desc' ? amountB - amountA : amountA - amountB;
            })
            .map(([type, total]) => (
              <div key={type} className="flex justify-between">
                <span>{type}:</span>
                <span 
                  className="font-medium cursor-help"
                  onMouseEnter={(e) => handleAmountHover(e, type)}
                  onMouseLeave={() => setHoveredType(null)}
                >
                  ${Math.abs(total).toFixed(2)}
                </span>
              </div>
            ))}
          <div className="border-t border-gray-200 pt-1 mt-1">
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span>${Math.abs(Object.values(typeTotals).reduce((sum, total) => sum + total, 0)).toFixed(2)}</span>
            </div>
          </div>
        </div>
        {hoveredType && (
          <div 
            className="absolute bg-white p-3 rounded-lg shadow-lg border border-gray-200 z-10 w-[300px]"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: 'translateY(-50%)'
            }}
          >
            <div className="text-sm">
              <div className="font-semibold mb-1">{hoveredType} Details:</div>
              <div className="space-y-1">
                {filteredExpenses
                  .filter(expense => expense.type === hoveredType && !expense.isExcluded && !expense.isOnceOff)
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">Exclude</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">Once Off</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('amount')}>
                Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredExpenses.map((expense, index) => {
              //console.log('Rendering expense row:', expense);
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <input
                      type="checkbox"
                      checked={expense.isExcluded}
                      onChange={(e) => handleExcludeFromBudget(expense.id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <input
                      type="checkbox"
                      checked={expense.isOnceOff}
                      onChange={(e) => handleOnceOff(expense.id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 w-1/12">
                    ${expense.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleEdit(expense)}
                      className="text-blue-600 hover:text-blue-900 mr-2"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExpenseTracker; 