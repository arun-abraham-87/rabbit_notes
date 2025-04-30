import React from 'react';

const WatchList = ({ allNotes }) => {
  const watchlistNotes = allNotes.filter(note => note.tags?.includes('meta::watch'));

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Watchlist</h1>
        {watchlistNotes.length === 0 ? (
          <p className="text-gray-600">No notes tagged with meta::watch found.</p>
        ) : (
          <p className="text-gray-600">Found {watchlistNotes.length} notes in watchlist.</p>
        )}
      </div>
    </div>
  );
};

export default WatchList; 