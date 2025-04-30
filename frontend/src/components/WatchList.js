import React from 'react';
import CompressedNotesList from './CompressedNotesList';

const WatchList = ({ allNotes }) => {
  const watchlistNotes = allNotes.filter(note => 
    note.content.includes('meta::watch')
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Watchlist</h1>
        {watchlistNotes.length === 0 ? (
          <p className="text-gray-600">No notes tagged with meta::watch found.</p>
        ) : (
          <CompressedNotesList
            notes={watchlistNotes}
            searchQuery=""
            duplicatedUrlColors={{}}
            onEditNote={() => {}}
            onDeleteNote={() => {}}
            onPinNote={() => {}}
            onUnpinNote={() => {}}
            onWordClick={() => {}}
            settings={{}}
          />
        )}
      </div>
    </div>
  );
};

export default WatchList; 