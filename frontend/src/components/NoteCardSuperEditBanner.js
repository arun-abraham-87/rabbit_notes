import React from 'react';
export default function NoteCardSuperEditBanner({ isVisible }) {
  if (!isVisible) return null;
  return (
    <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
      Press Enter to enter Super Edit Mode
    </div>
  );
} 