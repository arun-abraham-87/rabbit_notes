import React, { useState, useEffect } from 'react';
import { loadAllNotes, updateNoteById } from '../utils/ApiUtils';
import { XMarkIcon } from '@heroicons/react/24/outline';

const Budget = ({ onClose }) => {
  const [budgetItems, setBudgetItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', amount: '' });
  const [loading, setLoading] = useState(true);
  const [budgetNote, setBudgetNote] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [textAreaContent, setTextAreaContent] = useState('');

  // Load budget items from the note
  useEffect(() => {
    const fetchBudgetItems = async () => {
      try {
        const response = await loadAllNotes();
        const budgetNote = response.notes.find(note => note.content.includes('meta::budget'));
        
        if (budgetNote) {
          setBudgetNote(budgetNote);
          const items = budgetNote.content
            .split('\n')
            .filter(line => line.trim() && !line.includes('meta::'))
            .map(line => {
              const [name, amount] = line.split(':').map(item => item.trim());
              return {
                id: Date.now() + Math.random(), // Generate unique ID
                name,
                amount: parseFloat(amount) || 0
              };
            });
          setBudgetItems(items);
          setTextAreaContent(items.map(item => `${item.name}: ${item.amount}`).join('\n'));
        }
      } catch (error) {
        console.error('Error loading budget items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBudgetItems();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  // Calculate total budget from text area content
  const calculateTotalFromText = (content) => {
    const lines = content.split('\n').filter(line => line.trim());
    return lines.reduce((sum, line) => {
      const [_, amount] = line.split(':').map(item => item.trim());
      return sum + (parseFloat(amount) || 0);
    }, 0);
  };

  const handleTextAreaChange = (e) => {
    const newContent = e.target.value;
    setTextAreaContent(newContent);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newItem.name || !newItem.amount) return;

    // Add the new item to the text area content
    const newLine = `${newItem.name}: ${newItem.amount}`;
    const updatedContent = textAreaContent 
      ? `${textAreaContent}\n${newLine}`
      : newLine;
    
    setTextAreaContent(updatedContent);
    
    // Update the budget items state
    const newItems = [...budgetItems, { ...newItem, id: Date.now() }];
    setBudgetItems(newItems);
    
    // Reset the form
    setNewItem({ name: '', amount: '' });

    // Save to the note
    try {
      const content = [
        'meta::budget',
        ...newItems.map(item => `${item.name}: ${item.amount}`)
      ].join('\n');

      await updateNoteById(budgetNote.id, content);
      setBudgetNote(prev => ({ ...prev, content }));
    } catch (error) {
      console.error('Error saving budget items:', error);
    }
  };

  const handleSaveTextArea = async () => {
    try {
      const lines = textAreaContent.split('\n').filter(line => line.trim());
      const items = lines.map(line => {
        const [name, amount] = line.split(':').map(item => item.trim());
        return {
          id: Date.now() + Math.random(),
          name,
          amount: parseFloat(amount) || 0
        };
      });

      // Create the new content with meta tag and budget items
      const content = [
        'meta::budget',
        ...items.map(item => `${item.name}: ${item.amount}`)
      ].join('\n');

      // Update the note
      await updateNoteById(budgetNote.id, content);
      
      // Update local state
      setBudgetItems(items);
      setBudgetNote(prev => ({ ...prev, content }));
      setEditMode(false);
    } catch (error) {
      console.error('Error saving budget items:', error);
    }
  };

  const handleCancelEdit = () => {
    setTextAreaContent(budgetItems.map(item => `${item.name}: ${item.amount}`).join('\n'));
    setEditMode(false);
  };

  // Calculate total budget
  const totalBudget = budgetItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Budget Management</h1>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-4">
          {/* Add new budget item form */}
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget Item</label>
                <input
                  type="text"
                  name="name"
                  value={newItem.name}
                  onChange={handleInputChange}
                  placeholder="Enter budget item name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  name="amount"
                  value={newItem.amount}
                  onChange={handleInputChange}
                  placeholder="Enter amount"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add Item
                </button>
              </div>
            </div>
          </form>

          {/* Budget items text area */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">Budget Items</h2>
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveTextArea}
                    className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <textarea
              value={textAreaContent}
              onChange={handleTextAreaChange}
              readOnly={!editMode}
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter budget items in format: Item Name: Amount"
            />
          </div>

          {/* Total Budget */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total Budget</span>
              <div className="flex flex-col items-end">
                <span className="text-2xl font-bold text-blue-600">
                  ${calculateTotalFromText(textAreaContent).toFixed(2)}
                </span>
                {editMode && (
                  <span className="text-sm text-gray-500 mt-1">
                    Changes will be saved when you click Save
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Budget; 