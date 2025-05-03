import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { loadAllNotes, updateNoteById } from '../utils/ApiUtils';

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
  const [typeTotals, setTypeTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingExpense, setEditingExpense] = useState(null);
  const [allNotes, setAllNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expenseTypeMap, setExpenseTypeMap] = useState(new Map());

  const categories = ['Food', 'Transportation', 'Entertainment', 'Bills', 'Shopping', 'Other'];
  //console.log('Initialized with categories:', categories);

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

        const expenseNotes = response.notes.filter(note => 
          note.content.includes('meta::expense') && !note.content.includes('meta::expense_type')
          && !note.content.includes('meta::expense_source_type')
          && !note.content.includes('meta::expense_source_name')
        );
        //console.log('Found expense notes:', expenseNotes.length);

        // Create a map of all notes for quick lookup
        const notesMap = new Map(response.notes.map(note => [note.id, note]));
        //console.log('Created notes map with size:', notesMap.size);

        const parsedExpenses = expenseNotes.flatMap(note => {
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
            if (description.includes('Credit Card')) {
              console.log('===============================================');
              console.log('Credit Card expense:', description);
              console.log('===============================================');
            }
            return {
              id: `${note.id}-${index}`,
              date,
              amount,
              description,
              type,
              noteId: note.id
            };
          }).filter(expense => expense !== null);
        });

        //console.log('Final parsed expenses:', parsedExpenses);
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

  // Filter expenses when type or search query changes
  useEffect(() => {
    //console.log('Filtering expenses with type:', selectedType, 'and search:', searchQuery);
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
      
      return typeMatch && searchMatch;
    });
    //console.log('Filtered expenses:', filtered.length);
    setFilteredExpenses(filtered);
    calculateTotals(filtered);
  }, [selectedType, searchQuery, expenses]);

  const calculateTotals = (expenseList) => {
    //console.log('Calculating totals for expenses:', expenseList);
    
    // Calculate total expenses
    const total = expenseList.reduce((sum, expense) => sum + expense.amount, 0);
    //console.log('Total expenses:', total);
    setTotalExpenses(total);

    // Calculate type totals
    const typeTotals = {};
    expenseList.forEach(expense => {
      const type = expense.type;
      typeTotals[type] = (typeTotals[type] || 0) + expense.amount;
    });
    //console.log('Type totals:', typeTotals);
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

  const handleTypeChange = async (expenseId, newType, lineIndex) => {
    console.log('handleTypeChange called with:', { expenseId, newType, lineIndex });
    
    // Find the expense to get its noteId
    const expense = expenses.find(e => e.id === expenseId);
    console.log('Found expense:', expense);
    if (!expense) {
      console.error('Expense not found:', expenseId);
      return;
    }

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
    const originalNote = allNotes.find(note => note.id === expense.noteId);
    console.log('Found original note:', originalNote);
    if (!originalNote) {
      console.error('Original note not found:', expense.noteId);
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
        noteId: expense.noteId,
        content: updatedContent
      });
      await updateNoteById(expense.noteId, updatedContent);
      console.log('Note updated successfully');
      
      // Update allNotes state with the modified note
      setAllNotes(prevNotes => {
        const newNotes = prevNotes.map(note => 
          note.id === expense.noteId 
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
      const expenseNotes = refreshResponse.notes.filter(note => 
        note.content.includes('meta::expense') && !note.content.includes('meta::expense_type')
        && !note.content.includes('meta::expense_source_type')
        && !note.content.includes('meta::expense_source_name')
      );
      console.log('Filtered expense notes:', expenseNotes.length);
      
      const notesMap = new Map(refreshResponse.notes.map(note => [note.id, note]));
      console.log('Created notes map with size:', notesMap.size);
      
      const parsedExpenses = expenseNotes.flatMap(note => {
        const lines = note.content.split('\n').filter(line => 
          line.trim() && !line.includes('meta::')
        );
        console.log(`Processing note ${note.id} with ${lines.length} lines`);
        
        return lines.map((expenseLine, index) => {
          const typeMatch = expenseLine.match(/meta_line::expense_type::([^\s]+)/);
          let type = 'Unassigned';
          
          if (typeMatch) {
            const typeNoteId = typeMatch[1];
            const typeNote = notesMap.get(typeNoteId);
            if (typeNote) {
              const typeLine = typeNote.content.split('\n').find(line => !line.includes('meta::'));
              type = typeLine?.trim() || 'Unassigned';
            }
          }
          
          // Get base content without meta_line tags
          const cleanLine = expenseLine.replace(/meta_line::[^:]+::[^\s]+\s*/g, '').trim();
          const parts = cleanLine.split(/\s+/);
          
          if (parts.length < 3) return null;

          const date = parts[0];
          const amount = parseFloat(parts[1]);
          const description = parts.slice(2).join(' ');
          if (description.includes('Credit Card')) {
            console.log('===============================================');
            console.log('Credit Card expense:', description);
            console.log('===============================================');
          }
          return {
            id: `${note.id}-${index}`,
            date,
            amount,
            description,
            type,
            noteId: note.id
          };
        }).filter(expense => expense !== null);
      });

      console.log('Setting new expenses:', parsedExpenses.length);
      setExpenses(parsedExpenses);
      setFilteredExpenses(parsedExpenses);
      calculateTotals(parsedExpenses);
      
    } catch (error) {
      console.error('Error updating note:', error);
      console.error('Error details:', {
        expenseId,
        newType,
        noteId: expense.noteId,
        lineIndex: parseInt(expenseId.split('-')[1]),
        originalContent: originalNote.content,
        updatedContent: lines.join('\n')
      });
      // Optionally show an error message to the user
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
    <div className="p-4 w-full">
      <h1 className="text-2xl font-bold mb-6">Expense Tracker</h1>

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
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by description, type, source..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Total Expenses</h2>
          <p className="text-2xl font-bold text-red-600">${totalExpenses.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Type Breakdown</h2>
          <div className="space-y-1">
            {Object.entries(typeTotals).map(([type, total]) => (
              <div key={type} className="flex justify-between">
                <span>{type}:</span>
                <span className="font-medium">${total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/12">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-4/12">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/12">Source Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/12">Source Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredExpenses.map((expense, index) => {
              //console.log('Rendering expense row:', expense);
              return (
                <tr key={expense.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-1/12">
                    {expense.date}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 w-2/12">
                    <div className="truncate max-w-xs">{expense.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-4/12">
                    <select
                      value={expense.type || 'Unassigned'}
                      onChange={(e) => handleTypeChange(expense.id, e.target.value, index)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {expenseTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-2/12">
                    {expense.sourceType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-2/12">
                    {expense.sourceName}
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