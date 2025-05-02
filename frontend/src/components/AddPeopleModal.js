import React, { useState } from 'react';
import { XMarkIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/solid';

const AddPeopleModal = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [workstreams, setWorkstreams] = useState(['']);
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;

    // Filter out empty workstreams
    const filteredWorkstreams = workstreams.filter(w => w.trim());
    
    // Create the content with meta tags
    let content = `${name.trim()}\nmeta::person::${new Date().toISOString()}`;
    
    // Add role if provided
    if (role.trim()) {
      content += `\nmeta::person_role::${role.trim()}`;
    }

    // Add email if provided
    if (email.trim()) {
      content += `\nmeta::person_email::${email.trim()}`;
    }

    // Add phone if provided
    if (phone.trim()) {
      content += `\nmeta::person_phone::${phone.trim()}`;
    }

    // Add workstreams
    if (filteredWorkstreams.length > 0) {
      content += `\nmeta::person_workstreams::${filteredWorkstreams.join(',')}`;
    }

    onAdd(content);
    
    // Reset form
    setName('');
    setWorkstreams(['']);
    setRole('');
    setEmail('');
    setPhone('');
  };

  const addWorkstream = () => {
    setWorkstreams([...workstreams, '']);
  };

  const removeWorkstream = (index) => {
    setWorkstreams(workstreams.filter((_, i) => i !== index));
  };

  const updateWorkstream = (index, value) => {
    const newWorkstreams = [...workstreams];
    newWorkstreams[index] = value;
    setWorkstreams(newWorkstreams);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Add Person</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter person's name"
            />
          </div>

          {/* Role Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter role (optional)"
            />
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter email (optional)"
            />
          </div>

          {/* Phone Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter phone (optional)"
            />
          </div>

          {/* Workstreams */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Workstreams
            </label>
            <div className="space-y-2">
              {workstreams.map((workstream, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={workstream}
                    onChange={(e) => updateWorkstream(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter workstream"
                  />
                  {workstreams.length > 1 && (
                    <button
                      onClick={() => removeWorkstream(index)}
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <MinusIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addWorkstream}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Add Workstream</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            disabled={!name.trim()}
          >
            Add Person
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPeopleModal; 