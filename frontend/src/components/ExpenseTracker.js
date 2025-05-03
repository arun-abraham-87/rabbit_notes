import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { loadAllNotes } from '../utils/ApiUtils';

const ExpenseTracker = () => {
  console.log('ExpenseTracker component mounted');
  
  const [expenses, setExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: 'Food',
    date: new Date().toISOString().split('T')[0]
  });
  const [editingId, setEditingId] = useState(null);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [categoryTotals, setCategoryTotals] = useState({});
  const [loading, setLoading] = useState(true);

  const categories = ['Food', 'Transportation', 'Entertainment', 'Bills', 'Shopping', 'Other'];
  console.log('Initialized with categories:', categories);

  // Load expenses from notes
  useEffect(() => {
    console.log('Starting to fetch expenses from notes');
    const fetchExpenses = async () => {
      try {
        console.log('Calling loadAllNotes()');
        const response = await loadAllNotes();
        console.log('Received notes response:', response);

        const expenseNotes = response.notes.filter(note => 
          note.content.includes('meta::expense') && !note.content.includes('meta::expense_source_type')
        );
        console.log('Found expense notes:', expenseNotes.length);

        // Create a map of all notes for quick lookup
        const notesMap = new Map(response.notes.map(note => [note.id, note]));
        console.log('Created notes map with size:', notesMap.size);

        const parsedExpenses = expenseNotes.flatMap(note => {
          console.log('Processing note:', note.id);
          
          // Get linked notes
          const linkedNotes = note.content
            .split('\n')
            .filter(line => line.includes('meta::link::'))
            .map(line => {
              const linkId = line.split('::')[2];
              return notesMap.get(linkId);
            })
            .filter(linkedNote => linkedNote);
          console.log('Found linked notes:', linkedNotes.length);

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

          // Split the content by newlines and filter out meta lines
          const lines = note.content.split('\n').filter(line => 
            line.trim() && !line.includes('meta::')
          );
          console.log('Expense lines in note:', lines);

          return lines.map((expenseLine, index) => {
            console.log(`Processing line ${index + 1}:`, expenseLine);
            
            // Split the expense line by spaces
            const parts = expenseLine.trim().split(/\s+/);
            console.log('Split expense line parts:', parts);
            
            if (parts.length < 3) {
              console.log('Invalid expense format in line:', expenseLine);
              return null;
            }

            // First part is date, second is amount, rest is description
            const date = parts[0];
            const amount = parseFloat(parts[1]);
            const description = parts.slice(2).join(' ');
            console.log('Parsed expense data:', { date, amount, description });

            // Find category from the description or default to 'Other'
            const category = categories.find(cat => 
              description.toLowerCase().includes(cat.toLowerCase())
            ) || 'Other';
            console.log('Determined category:', category);

            return {
              id: `${note.id}-${index}`, // Unique ID for each expense line
              date,
              amount,
              description,
              category,
              noteId: note.id, // Keep reference to source note
              sourceType: expenseSourceType, // Add expense source type
              sourceName: expenseSourceName // Add expense source name
            };
          }).filter(expense => expense !== null);
        });

        console.log('Final parsed expenses:', parsedExpenses);
        setExpenses(parsedExpenses);
        calculateTotals(parsedExpenses);
      } catch (error) {
        console.error('Error loading expenses:', error);
      } finally {
        console.log('Finished loading expenses');
        setLoading(false);
      }
    };

    fetchExpenses();
  }, []);

  const calculateTotals = (expenseList) => {
    console.log('Calculating totals for expenses:', expenseList);
    
    // Calculate total expenses
    const total = expenseList.reduce((sum, expense) => sum + expense.amount, 0);
    console.log('Total expenses:', total);
    setTotalExpenses(total);

    // Calculate category totals
    const categoryTotals = {};
    expenseList.forEach(expense => {
      const category = expense.category;
      categoryTotals[category] = (categoryTotals[category] || 0) + expense.amount;
    });
    console.log('Category totals:', categoryTotals);
    setCategoryTotals(categoryTotals);
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

  if (loading) {
    console.log('Rendering loading state');
    return (
      <div className="p-4 w-full">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  console.log('Rendering main component with expenses:', expenses);
  return (
    <div className="p-4 w-full">
      <h1 className="text-2xl font-bold mb-6">Expense Tracker</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Total Expenses</h2>
          <p className="text-2xl font-bold text-red-600">${totalExpenses.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Category Breakdown</h2>
          <div className="space-y-1">
            {Object.entries(categoryTotals).map(([category, total]) => (
              <div key={category} className="flex justify-between">
                <span>{category}:</span>
                <span className="font-medium">${total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add/Edit Expense Form */}
      <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              name="description"
              value={newExpense.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter expense description"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              name="amount"
              value={newExpense.amount}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              step="0.01"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="category"
              value={newExpense.category}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              name="date"
              value={newExpense.date}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {editingId ? 'Update Expense' : 'Add Expense'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setNewExpense({
                  description: '',
                  amount: '',
                  category: 'Food',
                  date: new Date().toISOString().split('T')[0]
                });
              }}
              className="ml-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Expenses List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.map(expense => {
              console.log('Rendering expense row:', expense);
              return (
                <tr key={expense.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {expense.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {expense.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {expense.sourceType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {expense.sourceName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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