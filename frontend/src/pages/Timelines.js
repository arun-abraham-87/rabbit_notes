import React from 'react';

const Timelines = ({ notes }) => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Welcome
          </h1>
          <p className="text-lg text-gray-600">
            Timelines page - {notes ? notes.length : 0} notes available
          </p>
        </div>
      </div>
    </div>
  );
};

export default Timelines;
