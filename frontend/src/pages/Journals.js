import React from 'react';
import JournalEditor from '../components/JournalEditor';

const Journals = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Daily Journal</h1>
            <p className="mt-2 text-sm text-gray-600">
              Record your thoughts, reflections, and experiences
            </p>
          </div>
          <JournalEditor />
        </div>
      </div>
    </div>
  );
};

export default Journals; 