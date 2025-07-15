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

  const handleSetColor = (color) => {
    if (noteId == null || lineIndex == null) return;
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    const arr = note.content.split('\n');
    const text = arr[lineIndex];
    
    // Remove existing color meta info
    let cleanText = text
      .replace(/<span style="color: [^"]+">([^<]+)<\/span>/g, '$1')  // Remove HTML spans
      .replace(/\[color:([^:]+):([^\]]+)\]/g, '$2')  // Remove old color markers
      .replace(/@\$%\^[^@]+@\$%\^/g, '');  // Remove existing new format color markers
    
    // Add new color meta info if color is not 'default'
    arr[lineIndex] = color === 'default' ? cleanText : `${cleanText}@$%^${color}@$%^`;
    
    updateNote(noteId, arr.join('\n'));
    setShowColorSubmenu(false);
  };

  if (noteId == null || lineIndex == null) return null;
  const note = notes.find((n) => n.id === noteId);
  if (!note) return null;

  const colorOptions = [
    { color: '#DC2626', label: 'Red' },
    { color: '#2563EB', label: 'Blue' },
    { color: '#059669', label: 'Green' },
    { color: '#7C3AED', label: 'Purple' },
    { color: '#EA580C', label: 'Orange' }
  ];

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
            console.log({ noteId, lineIndex });
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
            let text = arr[lineIndex];
            let hasChanges;

            do {
              hasChanges = false;
              let newText = text;

              // Remove new format color markers
              if (newText.match(/@\$%\^[^@]+@\$%\^/)) {
                newText = newText.replace(/@\$%\^[^@]+@\$%\^/, '');
                hasChanges = true;
              }

              // Remove old format color markers
              if (newText.match(/^\[color:#[0-9A-Fa-f]{6}:([^\]]+)\]$/)) {
                newText = newText.replace(/^\[color:#[0-9A-Fa-f]{6}:([^\]]+)\]$/, '$1');
                hasChanges = true;
              }

              // Remove heading markers
              if (newText.startsWith('###') && newText.endsWith('###')) {
                newText = newText.slice(3, -3);
                hasChanges = true;
              } else if (newText.startsWith('##') && newText.endsWith('##')) {
                newText = newText.slice(2, -2);
                hasChanges = true;
              }

              // Remove bold markers
              if (newText.startsWith('**') && newText.endsWith('**')) {
                newText = newText.slice(2, -2);
                hasChanges = true;
              }

              // Remove meta links
              if (newText.startsWith('meta::link::')) {
                newText = '';
                hasChanges = true;
              }

              newText = newText.trim();
              if (newText !== text) {
                hasChanges = true;
                text = newText;
              }
            } while (hasChanges);

            arr[lineIndex] = text;
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
              .replace(/^###|###$/g, '')  // Remove H1 markers first
              .replace(/^##|##$/g, '')    // Remove H2 markers
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
              .replace(/^###|###$/g, '')  // Remove H1 markers first
              .replace(/^##|##$/g, '')    // Remove H2 markers
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
            let lineText = arr[lineIndex];
            console.log('Original lineText:', lineText);
            
            // Handle H1 and H2 markers first
            let isH1 = false;
            let isH2 = false;
            let cleanText = lineText;
            
            if (lineText.startsWith('###') && lineText.endsWith('###')) {
              isH1 = true;
              cleanText = lineText.slice(3, -3);
            } else if (lineText.startsWith('##') && lineText.endsWith('##')) {
              isH2 = true;
              cleanText = lineText.slice(2, -2);
            }
            
            // Handle markdown links
            cleanText = cleanText.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, text, url) => {
              const sent = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
              return `[${sent}](${url})`;
            });
            
            // Split into words and capitalize each word
            const words = cleanText.split(' ');
            console.log('Words array:', words);
            const capitalizedWords = words.map((word, index) => {
              if (word.length === 0) return word;
              const capitalized = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
              console.log(`Word ${index}: "${word}" -> "${capitalized}"`);
              return capitalized;
            });
            
            let result = capitalizedWords.join(' ');
            console.log('Final result:', result);
            
            // Add back the markers if they were present
            if (isH1) {
              result = `###${result}###`;
            } else if (isH2) {
              result = `##${result}##`;
            }
            
            arr[lineIndex] = result;
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
        
        {/* Color options as squares */}
        <div className="col-span-2 flex justify-center gap-1 py-1">
          {colorOptions.map((option) => (
            <button
              key={option.color}
              className="w-6 h-6 rounded shadow hover:shadow-lg transition-shadow"
              style={{ backgroundColor: option.color }}
              title={option.label}
              onClick={() => handleSetColor(option.color)}
            />
          ))}
          <button
            className="w-6 h-6 rounded shadow hover:shadow-lg transition-shadow bg-white border border-gray-300 relative"
            title="Default"
            onClick={() => handleSetColor('default')}
          >
            <span className="absolute inset-0 flex items-center justify-center text-red-500 font-bold text-xs">×</span>
          </button>
        </div>
        <div className="col-span-2 border-t-2 my-1"></div>

        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          onClick={() => {
            const arr = note.content.split('\n');
            arr.splice(lineIndex, 0, ' ');
            updateNote(noteId, arr.join('\n'));
          }}
        >
          Insert ↑
        </button>
        <button
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
          onClick={() => {
            const arr = note.content.split('\n');
            arr.splice(lineIndex + 1, 0, ' ');
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
          Merge ↑
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