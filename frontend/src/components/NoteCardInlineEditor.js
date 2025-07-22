import React from 'react';
import InlineEditor from './InlineEditor';

export default function NoteCardInlineEditor({
  visible,
  text,
  setText,
  onSave,
  onCancel,
  onDelete,
  wasOpenedFromSuperEdit,
  lineIndex
}) {
  if (!visible) return null;
  return (
    <div className="w-full px-4 py-2">
      <InlineEditor
        text={text}
        setText={setText}
        onSave={onSave}
        onCancel={onCancel}
        onDelete={onDelete}
        wasOpenedFromSuperEdit={wasOpenedFromSuperEdit}
        lineIndex={lineIndex}
      />
    </div>
  );
} 