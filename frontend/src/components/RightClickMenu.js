import React, { useState } from 'react';

export default function RightClickMenu({
  noteId,
  lineIndex,
  pos,
  notes,
  multiMoveNoteId,
  updateNote,
  showUndoToast,
  setRightClickText,
  setRightClickNoteId,
  setRightClickIndex,
  setEditedLineContent,
  setEditingLine,
  setShowCopyToast
}) {
  const [showColorSubmenu, setShowColorSubmenu] = useState(false);
  const [showMoveToSectionSubmenu, setShowMoveToSectionSubmenu] = useState(false);

  const note = notes.find(n => n.id === noteId);

  // Wrap updateNote to capture original content and show undo toast
  const editWithUndo = (newContent, label = 'Edit applied') => {
    const originalContent = note?.content;
    updateNote(noteId, newContent);
    if (originalContent !== undefined && showUndoToast) {
      showUndoToast(label, originalContent);
    }
  };
  
  // Calculate adjusted position to keep menu in viewport
  const menuRef = React.useRef(null);
  const [adjustedPos, setAdjustedPos] = React.useState(pos);

  React.useEffect(() => {
    if (menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      
      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Calculate adjusted position
      let adjustedX = pos.x;
      let adjustedY = pos.y;
      
      // Adjust horizontal position if menu would go off-screen
      if (adjustedX + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10;
      }
      if (adjustedX < 10) {
        adjustedX = 10;
      }
      
      // Adjust vertical position if menu would go off-screen
      if (adjustedY + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 10;
      }
      if (adjustedY < 10) {
        adjustedY = 10;
      }
      
      setAdjustedPos({ x: adjustedX, y: adjustedY });
    }
  }, [pos]);

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
    if (noteId == null || lineIndex == null || !note) return;

    const arr = note.content.split('\n');
    const text = arr[lineIndex];

    let cleanText = text
      .replace(/<span style="color: [^"]+">([^<]+)<\/span>/g, '$1')
      .replace(/\[color:([^:]+):([^\]]+)\]/g, '$2')
      .replace(/@\$%\^[^@]+@\$%\^/g, '')
      .replace(/^\{<[^}]+>\}/, '');

    arr[lineIndex] = color === 'default' ? cleanText : `{<${color}>}${cleanText}`;
    editWithUndo(arr.join('\n'), 'Color changed');
    setShowColorSubmenu(false);
  };

  if (noteId == null || lineIndex == null) return null;
  if (!note) return null;

  const noteLines = note.content.split('\n');
  const isBatchMultiSelectMode = multiMoveNoteId === noteId;
  const visibleLineEntries = noteLines
    .map((line, actualIndex) => ({ line, actualIndex }))
    .filter(({ line }) => !line.trim().startsWith('meta::'));

  const h2Sections = visibleLineEntries
    .map(({ line, actualIndex }, visibleIndex) => ({ line, actualIndex, visibleIndex }))
    .filter(({ line }) => {
      const trimmed = line.trim();
      return trimmed.startsWith('{#h2#}');
    })
    .map(({ line, actualIndex, visibleIndex }) => ({
      actualIndex,
      visibleIndex,
      label: line.trim().slice(6).trim() || 'Untitled section'
    }));

  const moveLineToSection = async (targetSectionActualIndex) => {
    const sourceEntry = visibleLineEntries[lineIndex];
    if (!sourceEntry) return;

    const updatedLines = [...noteLines];
    const [movedLine] = updatedLines.splice(sourceEntry.actualIndex, 1);
    if (typeof movedLine === 'undefined') return;

    let adjustedTargetIndex = targetSectionActualIndex;
    if (sourceEntry.actualIndex < targetSectionActualIndex) {
      adjustedTargetIndex -= 1;
    }

    let insertIndex = adjustedTargetIndex + 1;
    while (insertIndex < updatedLines.length) {
      const trimmed = updatedLines[insertIndex].trim();
      const isMeta = trimmed.startsWith('meta::');
      const isH1 = trimmed.startsWith('{#h1#}');
      const isH2 = trimmed.startsWith('{#h2#}');

      if (isMeta || isH1 || isH2) {
        break;
      }
      insertIndex += 1;
    }

    updatedLines.splice(insertIndex, 0, movedLine);
    editWithUndo(updatedLines.join('\n'), 'Moved to section');
    setShowMoveToSectionSubmenu(false);
    setRightClickText(null);
    setRightClickNoteId(null);
    setRightClickIndex(null);
  };

  const startMultiMoveToSection = () => {
    document.dispatchEvent(new CustomEvent('startMultiMoveToSection', {
      detail: { noteId, lineIndex }
    }));
    setShowMoveToSectionSubmenu(false);
    setRightClickText(null);
    setRightClickNoteId(null);
    setRightClickIndex(null);
  };

  const startGenericMultiSelect = () => {
    document.dispatchEvent(new CustomEvent('startMultiSelectFromContextMenu', {
      detail: { noteId, lineIndex }
    }));
    setRightClickText(null);
    setRightClickNoteId(null);
    setRightClickIndex(null);
  };

  const triggerBatchAction = (action, payload = {}) => {
    document.dispatchEvent(new CustomEvent('contextMultiSelectAction', {
      detail: { noteId, action, ...payload }
    }));
    setRightClickText(null);
    setRightClickNoteId(null);
    setRightClickIndex(null);
  };

  const primaryButtons = [
    {
      id: 'edit',
      label: 'Edit',
      onClick: () => {
        const arr = note.content.split('\n');
        setEditedLineContent(arr[lineIndex]);
        setEditingLine({ noteId, lineIndex });
      }
    },
    {
      id: 'delete',
      label: 'Delete',
      onClick: () => {
        const arr = note.content.split('\n');
        arr.splice(lineIndex, 1);
        editWithUndo(arr.join('\n'), 'Line deleted');
      }
    },
    {
      id: 'copy',
      label: 'Copy',
      onClick: () => handleCopyLine(note.content.split('\n')[lineIndex])
    },
    {
      id: 'remove-hashes',
      label: 'Remove #',
      onClick: () => {
        const arr = note.content.split('\n');
        const text = arr[lineIndex];
        // Remove # characters only outside of {...} blocks
        let result = '';
        let depth = 0;
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          if (ch === '{') { depth++; result += ch; }
          else if (ch === '}') { depth = Math.max(0, depth - 1); result += ch; }
          else if (ch === '#' && depth === 0) { /* skip */ }
          else { result += ch; }
        }
        arr[lineIndex] = result;
        editWithUndo(arr.join('\n'), 'Hashes removed');
      }
    },
    {
      id: 'remove-formatting',
      label: 'Remove Fmting',
      onClick: () => {
        const arr = note.content.split('\n');
        let text = arr[lineIndex];
        let hasChanges;

        do {
          hasChanges = false;
          let newText = text;

          // Remove new {<...>} color prefix
          if (newText.match(/^\{<[^}]+>\}/)) {
            newText = newText.replace(/^\{<[^}]+>\}/, '');
            hasChanges = true;
          }

          // Remove old @$%^ color markers (migration)
          if (newText.match(/@\$%\^[^@]+@\$%\^/)) {
            newText = newText.replace(/@\$%\^[^@]+@\$%\^/, '');
            hasChanges = true;
          }

          // Remove old [color:...] format color markers (migration)
          if (newText.match(/^\[color:#[0-9A-Fa-f]{6}:([^\]]+)\]$/)) {
            newText = newText.replace(/^\[color:#[0-9A-Fa-f]{6}:([^\]]+)\]$/, '$1');
            hasChanges = true;
          }

          // Remove heading markers
          if (newText.startsWith('{#h1#}')) {
            newText = newText.slice(6);
            hasChanges = true;
          } else if (newText.startsWith('{#h2#}')) {
            newText = newText.slice(6);
            hasChanges = true;
          }

          // Remove {#bold#} prefix
          if (newText.startsWith('{#bold#}')) {
            newText = newText.slice(8);
            hasChanges = true;
          }

          // Remove {#italics#} prefix
          if (newText.startsWith('{#italics#}')) {
            newText = newText.slice(11);
            hasChanges = true;
          }

          // Remove old ** bold markers (migration)
          if (newText.startsWith('**') && newText.endsWith('**')) {
            newText = newText.slice(2, -2);
            hasChanges = true;
          }

          // Remove old * italic markers (migration)
          if (newText.startsWith('*') && newText.endsWith('*') && !newText.startsWith('**')) {
            newText = newText.slice(1, -1);
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
        editWithUndo(arr.join('\n'), 'Formatting removed');
      }
    },
    {
      id: 'h1',
      label: 'H1',
      onClick: () => {
        const arr = note.content.split('\n');
        const h1Text = arr[lineIndex].trim()
          .replace('{#h1#}', '')  // Remove H1 markers first
          .replace('{#h2#}', '')  // Remove H2 markers
          .trim();
        arr[lineIndex] = `{#h1#}${h1Text}`;
        editWithUndo(arr.join('\n'), 'Set H1');
      }
    },
    {
      id: 'h2',
      label: 'H2',
      onClick: () => {
        const arr = note.content.split('\n');
        const h2Text = arr[lineIndex].trim()
          .replace('{#h1#}', '')  // Remove H1 markers first
          .replace('{#h2#}', '')  // Remove H2 markers
          .trim();
        arr[lineIndex] = `{#h2#}${h2Text}`;
        editWithUndo(arr.join('\n'), 'Set H2');
      }
    },
    {
      id: 'uppercase',
      label: 'AA',
      onClick: () => {
        const arr = note.content.split('\n');
        let lineText = arr[lineIndex];

        // Extract all leading formatting prefixes
        const prefixes = [];
        let rest = lineText;
        let found = true;
        while (found) {
          found = false;
          if (rest.startsWith('{#h1#}')) { prefixes.push('{#h1#}'); rest = rest.slice(6); found = true; }
          else if (rest.startsWith('{#h2#}')) { prefixes.push('{#h2#}'); rest = rest.slice(6); found = true; }
          if (rest.startsWith('{#bold#}')) { prefixes.push('{#bold#}'); rest = rest.slice(8); found = true; }
          if (rest.startsWith('{#italics#}')) { prefixes.push('{#italics#}'); rest = rest.slice(11); found = true; }
          const colorPfx = rest.match(/^\{<[^}]+>\}/);
          if (colorPfx) { prefixes.push(colorPfx[0]); rest = rest.slice(colorPfx[0].length); found = true; }
        }

        // Apply uppercase to text content only
        rest = rest.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, text, url) => `[${text.toUpperCase()}](${url})`);
        rest = rest.toUpperCase();

        arr[lineIndex] = prefixes.join('') + rest;
        editWithUndo(arr.join('\n'), 'Uppercase');
      }
    },
    {
      id: 'title-case',
      label: 'Aa',
      onClick: () => {
        const arr = note.content.split('\n');
        let lineText = arr[lineIndex];

        // Extract all leading formatting prefixes
        const prefixes = [];
        let rest = lineText;
        let found = true;
        while (found) {
          found = false;
          if (rest.startsWith('{#h1#}')) { prefixes.push('{#h1#}'); rest = rest.slice(6); found = true; }
          else if (rest.startsWith('{#h2#}')) { prefixes.push('{#h2#}'); rest = rest.slice(6); found = true; }
          if (rest.startsWith('{#bold#}')) { prefixes.push('{#bold#}'); rest = rest.slice(8); found = true; }
          if (rest.startsWith('{#italics#}')) { prefixes.push('{#italics#}'); rest = rest.slice(11); found = true; }
          const colorPfx = rest.match(/^\{<[^}]+>\}/);
          if (colorPfx) { prefixes.push(colorPfx[0]); rest = rest.slice(colorPfx[0].length); found = true; }
        }

        // Handle markdown links
        rest = rest.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, text, url) => {
          const sent = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
          return `[${sent}](${url})`;
        });

        // Split into words and capitalize each word
        const words = rest.split(' ');
        const capitalizedWords = words.map((word) => {
          if (word.length === 0) return word;
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        });

        arr[lineIndex] = prefixes.join('') + capitalizedWords.join(' ');
        editWithUndo(arr.join('\n'), 'Title case');
      }
    },
    {
      id: 'bold',
      label: 'Bold',
      onClick: () => {
        const arr = note.content.split('\n');
        let boldLine = arr[lineIndex];
        // Strip h1/h2 prefix to check for bold after it
        const h1h2Match = boldLine.match(/^(\{#h[12]#\})(.*)/s);
        if (h1h2Match) {
          const prefix = h1h2Match[1];
          const after = h1h2Match[2];
          arr[lineIndex] = after.startsWith('{#bold#}')
            ? `${prefix}${after.slice(8)}`
            : `${prefix}{#bold#}${after}`;
        } else {
          arr[lineIndex] = boldLine.startsWith('{#bold#}')
            ? boldLine.slice(8)
            : `{#bold#}${boldLine}`;
        }
        editWithUndo(arr.join('\n'), 'Bold toggled');
      }
    },
    {
      id: 'italics',
      label: 'Italics',
      onClick: () => {
        const arr = note.content.split('\n');
        let italLine = arr[lineIndex];
        // Strip h1/h2 prefix to check for italics after it
        const h1h2Match = italLine.match(/^(\{#h[12]#\})(.*)/s);
        if (h1h2Match) {
          const prefix = h1h2Match[1];
          const after = h1h2Match[2];
          arr[lineIndex] = after.startsWith('{#italics#}')
            ? `${prefix}${after.slice(11)}`
            : `${prefix}{#italics#}${after}`;
        } else {
          arr[lineIndex] = italLine.startsWith('{#italics#}')
            ? italLine.slice(11)
            : `{#italics#}${italLine}`;
        }
        editWithUndo(arr.join('\n'), 'Italics toggled');
      }
    },
    {
      id: 'merge-above',
      label: 'Merge ↑',
      onClick: () => {
        const arr = note.content.split('\n');
        if (lineIndex > 0) {
          arr[lineIndex - 1] += ' ' + arr[lineIndex];
          arr.splice(lineIndex, 1);
          editWithUndo(arr.join('\n'), 'Merged up');
        }
      }
    },
    {
      id: 'merge-below',
      label: 'Merge ↓',
      onClick: () => {
        const arr = note.content.split('\n');
        if (lineIndex < arr.length - 1) {
          arr[lineIndex] += ' ' + arr[lineIndex + 1];
          arr.splice(lineIndex + 1, 1);
          editWithUndo(arr.join('\n'), 'Merged down');
        }
      }
    },
    {
      id: 'move-up',
      label: 'Move ↑',
      onClick: () => {
        const arr = note.content.split('\n');
        if (lineIndex > 0) [arr[lineIndex - 1], arr[lineIndex]] = [arr[lineIndex], arr[lineIndex - 1]];
        editWithUndo(arr.join('\n'), 'Moved up');
      }
    },
    {
      id: 'move-down',
      label: 'Move ↓',
      onClick: () => {
        const arr = note.content.split('\n');
        if (lineIndex < arr.length - 1) [arr[lineIndex + 1], arr[lineIndex]] = [arr[lineIndex], arr[lineIndex + 1]];
        editWithUndo(arr.join('\n'), 'Moved down');
      }
    },
    {
      id: 'move-to-section',
      label: 'Move To Section',
      onClick: () => {
        if (h2Sections.length === 0) return;
        setShowMoveToSectionSubmenu((current) => !current);
      }
    }
  ];

  const DIVIDER = '----------------------------------------------------------------------------------------------------';

  const getRawLineIndex = () => {
    const arr = note.content.split('\n');
    let count = 0;
    for (let i = 0; i < arr.length; i++) {
      if (!arr[i].trim().startsWith('meta::')) {
        if (count === lineIndex) return i;
        count++;
      }
    }
    return lineIndex;
  };

  const insertButtons = [
    {
      id: 'insert-above',
      label: 'Insert ↑',
      onClick: () => {
        const arr = note.content.split('\n');
        arr.splice(getRawLineIndex(), 0, ' ');
        editWithUndo(arr.join('\n'), 'Line inserted above');
      }
    },
    {
      id: 'insert-below',
      label: 'Insert ↓',
      onClick: () => {
        const arr = note.content.split('\n');
        arr.splice(getRawLineIndex() + 1, 0, ' ');
        editWithUndo(arr.join('\n'), 'Line inserted below');
      }
    },
    {
      id: 'insert-divider-above',
      label: 'Divider ↑',
      onClick: () => {
        const arr = note.content.split('\n');
        arr.splice(getRawLineIndex(), 0, DIVIDER);
        editWithUndo(arr.join('\n'), 'Divider inserted above');
      }
    },
    {
      id: 'insert-divider-below',
      label: 'Divider ↓',
      onClick: () => {
        const arr = note.content.split('\n');
        arr.splice(getRawLineIndex() + 1, 0, DIVIDER);
        editWithUndo(arr.join('\n'), 'Divider inserted below');
      }
    }
  ];

  const colorOptions = [
    { color: '#DC2626', label: 'Red' },
    { color: '#2563EB', label: 'Blue' },
    { color: '#059669', label: 'Green' },
    { color: '#7C3AED', label: 'Purple' },
    { color: '#EA580C', label: 'Orange' }
  ];

  return (
    <div
      ref={menuRef}
      style={{ position: 'fixed', top: `${adjustedPos.y}px`, left: `${adjustedPos.x}px` }}
      className="z-50 bg-white border border-gray-300 rounded shadow-md px-2 py-1"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      onMouseLeave={() => {
        setShowColorSubmenu(false);
        setShowMoveToSectionSubmenu(false);
      }}
    >
      {isBatchMultiSelectMode ? (
        <div className="grid grid-cols-2 gap-2 min-w-[220px]">
          <button
            className={`p-1 text-xs rounded cursor-pointer ${
              h2Sections.length === 0 ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 hover:shadow-lg'
            }`}
            onClick={() => triggerBatchAction('move_to_section')}
            disabled={h2Sections.length === 0}
          >
            Move To Section
          </button>
          <button
            className="p-1 text-xs rounded cursor-pointer bg-gray-100 hover:bg-gray-200 hover:shadow-lg"
            onClick={() => triggerBatchAction('move_to_new_note')}
          >
            Move To New Note
          </button>
          <button
            className="p-1 text-xs rounded cursor-pointer bg-gray-100 hover:bg-gray-200 hover:shadow-lg"
            onClick={() => triggerBatchAction('move_to_note')}
          >
            Move To Note
          </button>
          <button
            className="p-1 text-xs rounded cursor-pointer bg-gray-100 hover:bg-gray-200 hover:shadow-lg"
            onClick={() => triggerBatchAction('bold')}
          >
            Bold
          </button>
          <button
            className="p-1 text-xs rounded cursor-pointer bg-gray-100 hover:bg-gray-200 hover:shadow-lg"
            onClick={() => triggerBatchAction('italics')}
          >
            Italics
          </button>
          <button
            className="p-1 text-xs rounded cursor-pointer bg-gray-100 hover:bg-gray-200 hover:shadow-lg"
            onClick={() => triggerBatchAction('cancel_multi_select')}
          >
            Cancel
          </button>
          <div className="col-span-2 border-t-2 my-1"></div>
          <div className="col-span-2 flex justify-center gap-1 py-1">
            {colorOptions.map((option) => (
              <button
                key={option.color}
                className="w-6 h-6 rounded shadow hover:shadow-lg transition-shadow"
                style={{ backgroundColor: option.color }}
                title={option.label}
                onClick={() => triggerBatchAction('color', { color: option.color })}
              />
            ))}
            <button
              className="w-6 h-6 rounded shadow hover:shadow-lg transition-shadow bg-white border border-gray-300 relative"
              title="Default"
              onClick={() => triggerBatchAction('color', { color: 'default' })}
            >
              <span className="absolute inset-0 flex items-center justify-center text-red-500 font-bold text-xs">×</span>
            </button>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-3 gap-2">
        <div className="grid grid-cols-2 gap-1 col-span-2">
          {primaryButtons.map((button) => (
            <button
              key={button.id}
              className={`p-1 text-xs rounded cursor-pointer ${
                button.id === 'move-to-section' && h2Sections.length === 0
                  ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 hover:bg-gray-200 hover:shadow-lg'
              }`}
              onClick={button.onClick}
              disabled={button.id === 'move-to-section' && h2Sections.length === 0}
            >
              {button.label}
            </button>
          ))}
          <button
            className="p-1 text-xs rounded cursor-pointer bg-green-50 hover:bg-green-100 hover:shadow-lg"
            onClick={startGenericMultiSelect}
          >
            Multi Select
          </button>
        </div>

        <div className="flex flex-col gap-1">
          {insertButtons.map((button) => (
            <button
              key={button.id}
              className="p-1 text-xs rounded cursor-pointer bg-gray-100 hover:bg-gray-200 hover:shadow-lg"
              onClick={button.onClick}
            >
              {button.label}
            </button>
          ))}
        </div>

        {showMoveToSectionSubmenu && h2Sections.length > 0 && (
          <>
            <div className="col-span-3 border-t my-1"></div>
            <div className="col-span-3 text-[10px] uppercase tracking-wide text-gray-500 px-1">
              Move under H2
            </div>
            <button
              className="col-span-3 text-left p-1 text-xs bg-purple-50 hover:bg-purple-100 rounded cursor-pointer"
              onClick={startMultiMoveToSection}
            >
              Select Multiple Lines
            </button>
            {h2Sections.map((section) => (
              <button
                key={`section-${section.actualIndex}`}
                className="col-span-3 text-left p-1 text-xs bg-blue-50 hover:bg-blue-100 rounded cursor-pointer truncate"
                onClick={() => moveLineToSection(section.actualIndex)}
                title={section.label}
              >
                {section.label}
              </button>
            ))}
          </>
        )}
        
        <div className="col-span-3 border-t-2 my-1"></div>
        
        {/* Color options as squares - always at bottom */}
        <div className="col-span-3 flex justify-center gap-1 py-1">
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
      </div>
      )}
    </div>
  );
} 
