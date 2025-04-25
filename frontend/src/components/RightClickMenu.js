import React, { useState } from 'react';

export default function RightClickMenu({
  noteId,
  lineIndex,
  pos,
  notes,
  updateNote,
  setRightClickText,
  setEditedLineContent,
  setEditingLine,
  setShowCopyToast
}) {
  const [showColorSubmenu, setShowColorSubmenu] = useState(false);

  const handleCopyLine = (text) => {
    let copyText = text;
    const linkMatch = text.match(/\[.*?\]\((.*?)\)/);
    if (linkMatch) {
      copyText = linkMatch[1];
    } else {
      const urlMatch = text.match(/https?:\/\/[^\s)]+/);
      if (urlMatch) {
        copyText = urlMatch[0];
      }
    }
    navigator.clipboard.writeText(copyText).then(() => {
      setShowCopyToast(true);
      setRightClickText('copied');
      setTimeout(() => setShowCopyToast(false), 1500);
    });
  };

  const colorOptions = [
    { label: 'Default', value: 'default' },
    { label: 'Red', value: '#DC2626' },
    { label: 'Blue', value: '#2563EB' },
    { label: 'Green', value: '#059669' },
    { label: 'Purple', value: '#7C3AED' },
    { label: 'Orange', value: '#EA580C' },
    { label: 'Gray', value: '#4B5563' }
  ];

  const handleSetColor = (color) => {
    if (noteId == null || lineIndex == null) return;
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    const arr = note.content.split('\n');
    const text = arr[lineIndex];
    
    // Remove existing color spans if any
    let cleanText = text.replace(/<span style="color: [^"]+">|<\/span>/g, '');
    
    // Add new color span if color is not 'default'
    arr[lineIndex] = color === 'default' ? cleanText : `<span style="color: ${color}">${cleanText}</span>`;
    
    updateNote(noteId, arr.join('\n'));
    setShowColorSubmenu(false);
  };

  if (noteId == null || lineIndex == null) return null;
  const note = notes.find((n) => n.id === noteId);
  if (!note) return null;

  return (
    <div
      style={{ position: 'fixed', top: `${pos.y}px`, left: `${pos.x}px` }}
      className="z-50 bg-white border border-gray-300 rounded shadow-md px-2 py-1"
      onMouseLeave={() => setShowColorSubmenu(false)}
    >
      <div className="grid grid-cols-2 gap-1">
        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          onClick={() => {
            const arr = note.content.split('\n');
            setEditedLineContent(arr[lineIndex]);
            setEditingLine({ noteId, lineIndex });
          }}
        >
          Edit
        </button>
        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          onClick={() => {
            const arr = note.content.split('\n');
            arr.splice(lineIndex, 1);
            updateNote(noteId, arr.join('\n'));
          }}
        >
          Delete
        </button>
        <div className="col-span-2 border-t-2 my-1"></div>
        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          onClick={() => handleCopyLine(note.content.split('\n')[lineIndex])}
        >
          Copy
        </button>
        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          onClick={() => {
            const arr = note.content.split('\n');
            const trimmed = arr[lineIndex].trim();
            const isH1 = trimmed.startsWith('###') && trimmed.endsWith('###');
            const isH2 = trimmed.startsWith('##') && trimmed.endsWith('##');
            if (isH1 || isH2) arr[lineIndex] = isH1 ? trimmed.slice(3, -3) : trimmed.slice(2, -2);
            updateNote(noteId, arr.join('\n'));
          }}
        >
          Remove Fmting
        </button>
        <div className="col-span-2 border-t-2 my-1"></div>
        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          onClick={() => {
            const arr = note.content.split('\n');
            const h1Text = arr[lineIndex].trim()
              .replace(/^###|###$/g, '')
              .replace(/^##|##$/g, '')
              .trim();
            arr[lineIndex] = `###${h1Text}###`;
            updateNote(noteId, arr.join('\n'));
          }}
        >
          H1
        </button>
        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          onClick={() => {
            const arr = note.content.split('\n');
            const h2Text = arr[lineIndex].trim()
              .replace(/^###|###$/g, '')
              .replace(/^##|##$/g, '')
              .trim();
            arr[lineIndex] = `##${h2Text}##`;
            updateNote(noteId, arr.join('\n'));
          }}
        >
          H2
        </button>
        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          onClick={() => {
            const arr = note.content.split('\n');
            const upperLine = arr[lineIndex].replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, text, url) => `[${text.toUpperCase()}](${url})`);
            arr[lineIndex] = upperLine.toUpperCase();
            updateNote(noteId, arr.join('\n'));
          }}
        >
          AA
        </button>
        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          onClick={() => {
            const arr = note.content.split('\n');
            const sentLine = arr[lineIndex].replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, text, url) => {
              const sent = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
              return `[${sent}](${url})`;
            }).split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            arr[lineIndex] = sentLine;
            updateNote(noteId, arr.join('\n'));
          }}
        >
          Aa
        </button>
        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          onClick={() => {
            const arr = note.content.split('\n');
            let boldLine = arr[lineIndex];
            arr[lineIndex] = boldLine.startsWith('**') && boldLine.endsWith('**') ? boldLine.slice(2, -2) : `**${boldLine}**`;
            updateNote(noteId, arr.join('\n'));
          }}
        >
          Bold
        </button>
        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          onClick={() => {
            const arr = note.content.split('\n');
            let italLine = arr[lineIndex];
            arr[lineIndex] = italLine.startsWith('*') && italLine.endsWith('*') && !italLine.startsWith('**') ? italLine.slice(1, -1) : `*${italLine}*`;
            updateNote(noteId, arr.join('\n'));
          }}
        >
          Italics
        </button>
        <div className="col-span-2 border-t-2 my-1"></div>
        
        {/* Color options */}
        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          style={{ color: '#DC2626' }}
          onClick={() => handleSetColor('#DC2626')}
        >
          Red
        </button>
        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          style={{ color: '#2563EB' }}
          onClick={() => handleSetColor('#2563EB')}
        >
          Blue
        </button>
        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          style={{ color: '#059669' }}
          onClick={() => handleSetColor('#059669')}
        >
          Green
        </button>
        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          style={{ color: '#7C3AED' }}
          onClick={() => handleSetColor('#7C3AED')}
        >
          Purple
        </button>
        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          style={{ color: '#EA580C' }}
          onClick={() => handleSetColor('#EA580C')}
        >
          Orange
        </button>
        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          onClick={() => handleSetColor('default')}
        >
          Default
        </button>
        <div className="col-span-2 border-t-2 my-1"></div>

        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          onClick={() => {
            const arr = note.content.split('\n');
            arr.splice(lineIndex, 0, '');
            updateNote(noteId, arr.join('\n'));
          }}
        >
          Insert ↑
        </button>
        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          onClick={() => {
            const arr = note.content.split('\n');
            arr.splice(lineIndex + 1, 0, '');
            updateNote(noteId, arr.join('\n'));
          }}
        >
          Insert ↓
        </button>
        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          onClick={() => {
            const arr = note.content.split('\n');
            if (lineIndex > 0) {
              arr[lineIndex - 1] += ' ' + arr[lineIndex];
              arr.splice(lineIndex, 1);
              updateNote(noteId, arr.join('\n'));
            }
          }}
        >
          Merge down ↑
        </button>
        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          onClick={() => {
            const arr = note.content.split('\n');
            if (lineIndex < arr.length - 1) {
              arr[lineIndex] += ' ' + arr[lineIndex + 1];
              arr.splice(lineIndex + 1, 1);
              updateNote(noteId, arr.join('\n'));
            }
          }}
        >
          Merge ↓
        </button>
        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          onClick={() => {
            const arr = note.content.split('\n');
            if (lineIndex > 0) [arr[lineIndex - 1], arr[lineIndex]] = [arr[lineIndex], arr[lineIndex - 1]];
            updateNote(noteId, arr.join('\n'));
          }}
        >
          Move ↑
        </button>
        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          onClick={() => {
            const arr = note.content.split('\n');
            if (lineIndex < arr.length - 1) [arr[lineIndex + 1], arr[lineIndex]] = [arr[lineIndex], arr[lineIndex + 1]];
            updateNote(noteId, arr.join('\n'));
          }}
        >
          Move ↓
        </button>
      </div>
    </div>
  );
} 