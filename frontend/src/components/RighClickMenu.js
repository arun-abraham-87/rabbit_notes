// frontend/src/components/RightClickMenu.js
import React from 'react';
import {
  ArrowUturnUpIcon,
  ArrowUturnDownIcon,
  ArrowUpIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  LinkIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';

export default function RightClickMenu({
  noteId,
  lineIndex,
  pos,
  notes,
  updateNote,
  handleDelete,
  setPopupNoteText,
  setLinkingNoteId,
  setLinkSearchTerm,
  setLinkPopupVisible,
  selectedNotes,
  toggleNoteSelection,
  setRightClickText,
}) {
  if (noteId == null || lineIndex == null) return null;
  const note = notes.find((n) => n.id === noteId);
  if (!note) return null;

  const baseClass = "p-1 hover:bg-gray-100 rounded";

  return (
    <div
      style={{ position: 'fixed', top: `${pos.y}px`, left: `${pos.x}px` }}
      className="z-50 bg-white border border-gray-300 rounded shadow-md px-2 py-1 flex items-center space-x-1"
    >
      {/* Insert Above */}
      <button
        onClick={() => {
          const arr = note.content.split('\n');
          arr.splice(lineIndex, 0, '');
          updateNote(noteId, arr.join('\n'));
          setRightClickText(null);
        }}
        className={baseClass}
        title="Insert Above"
      >
        <ArrowUturnUpIcon className="w-4 h-4 text-gray-700" />
      </button>

      {/* Insert Below */}
      <button
        onClick={() => {
          const arr = note.content.split('\n');
          arr.splice(lineIndex + 1, 0, '');
          updateNote(noteId, arr.join('\n'));
          setRightClickText(null);
        }}
        className={baseClass}
        title="Insert Below"
      >
        <ArrowUturnDownIcon className="w-4 h-4 text-gray-700" />
      </button>

      {/* Remove / Add Heading Formatting */}
      {(() => {
        const lines = note.content.split('\n');
        const rawLine = lines[lineIndex] || '';
        const trimmed = rawLine.trim();
        const isH1 = trimmed.startsWith('###') && trimmed.endsWith('###');
        const isH2 = trimmed.startsWith('##') && trimmed.endsWith('##');
        if (isH1 || isH2) {
          return (
            <button
              onClick={() => {
                const arr = note.content.split('\n');
                let content = arr[lineIndex].trim();
                content = isH1
                  ? content.slice(3, -3)
                  : content.slice(2, -2);
                arr[lineIndex] = content;
                updateNote(noteId, arr.join('\n'));
                setRightClickText(null);
              }}
              className={baseClass}
              title="Remove formatting"
            >
              <XCircleIcon className="w-4 h-4 text-gray-700" />
            </button>
          );
        } else {
          return (
            <>
              <button
                onClick={() => {
                  const arr = note.content.split('\n');
                  arr[lineIndex] = `###${arr[lineIndex]}###`;
                  updateNote(noteId, arr.join('\n'));
                  setRightClickText(null);
                }}
                className={baseClass}
                title="Make H1"
              >
                H1
              </button>
              <button
                onClick={() => {
                  const arr = note.content.split('\n');
                  arr[lineIndex] = `##${arr[lineIndex]}##`;
                  updateNote(noteId, arr.join('\n'));
                  setRightClickText(null);
                }}
                className={baseClass}
                title="Make H2"
              >
                H2
              </button>
            </>
          );
        }
      })()}

      {/* Move to First */}
      <button
        onClick={() => {
          const arr = note.content.split('\n');
          const line = arr.splice(lineIndex, 1)[0];
          arr.unshift(line);
          updateNote(noteId, arr.join('\n'));
          setRightClickText(null);
        }}
        className={baseClass}
        title="Move to top"
      >
        FIRST <ArrowUpIcon className="w-4 h-4 text-gray-700 inline" />
      </button>

      {/* Merge Up */}
      <button
        onClick={() => {
          const arr = note.content.split('\n');
          if (lineIndex > 0) {
            arr[lineIndex - 1] =
              arr[lineIndex - 1] + ' ' + arr[lineIndex];
            arr.splice(lineIndex, 1);
            updateNote(noteId, arr.join('\n'));
          }
          setRightClickText(null);
        }}
        className={baseClass}
        title="Merge Up"
      >
        Merge <ArrowUturnUpIcon className="w-4 h-4 text-gray-700 inline" />
      </button>

      {/* Merge Down */}
      <button
        onClick={() => {
          const arr = note.content.split('\n');
          if (lineIndex < arr.length - 1) {
            arr[lineIndex] =
              arr[lineIndex] + ' ' + arr[lineIndex + 1];
            arr.splice(lineIndex + 1, 1);
            updateNote(noteId, arr.join('\n'));
          }
          setRightClickText(null);
        }}
        className={baseClass}
        title="Merge Down"
      >
        Merge <ArrowUturnDownIcon className="w-4 h-4 text-gray-700 inline" />
      </button>

      {/* Swap Up */}
      <button
        onClick={() => {
          const arr = note.content.split('\n');
          if (lineIndex > 0) {
            [arr[lineIndex - 1], arr[lineIndex]] = [
              arr[lineIndex],
              arr[lineIndex - 1],
            ];
            updateNote(noteId, arr.join('\n'));
          }
          setRightClickText(null);
        }}
        className={baseClass}
        title="Move Up"
      >
        <ChevronUpIcon className="w-4 h-4 text-gray-700" />
      </button>

      {/* Swap Down */}
      <button
        onClick={() => {
          const arr = note.content.split('\n');
          if (lineIndex < arr.length - 1) {
            [arr[lineIndex + 1], arr[lineIndex]] = [
              arr[lineIndex],
              arr[lineIndex + 1],
            ];
            updateNote(noteId, arr.join('\n'));
          }
          setRightClickText(null);
        }}
        className={baseClass}
        title="Move Down"
      >
        <ChevronDownIcon className="w-4 h-4 text-gray-700" />
      </button>

      {/* Uppercase */}
      <button
        onClick={() => {
          const arr = note.content.split('\n');
          let current = arr[lineIndex];
          const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
          if (linkRegex.test(current)) {
            current = current.replace(
              linkRegex,
              (_, text, url) => `[${text.toUpperCase()}](${url})`
            );
          } else {
            current = current.toUpperCase();
          }
          arr[lineIndex] = current;
          updateNote(noteId, arr.join('\n'));
          setRightClickText(null);
        }}
        className={baseClass}
        title="Uppercase"
      >
        AA
      </button>

      {/* Sentence case */}
      <button
        onClick={() => {
          const arr = note.content.split('\n');
          let current = arr[lineIndex];
          const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
          if (linkRegex.test(current)) {
            current = current.replace(
              linkRegex,
              (_, text, url) => {
                const sent = text.charAt(0).toUpperCase() +
                  text.slice(1).toLowerCase();
                return `[${sent}](${url})`;
              }
            );
          } else {
            current = current
              .split(' ')
              .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(' ');
          }
          arr[lineIndex] = current;
          updateNote(noteId, arr.join('\n'));
          setRightClickText(null);
        }}
        className={baseClass}
        title="Sentence case"
      >
        Aa
      </button>

      {/* Toggle Bold */}
      <button
        onClick={() => {
          const arr = note.content.split('\n');
          let current = arr[lineIndex];
          if (current.startsWith('**') && current.endsWith('**')) {
            current = current.slice(2, -2);
          } else {
            current = `**${current}**`;
          }
          arr[lineIndex] = current;
          updateNote(noteId, arr.join('\n'));
          setRightClickText(null);
        }}
        className={baseClass}
        title="Toggle Bold"
      >
        <strong>B</strong>
      </button>

      {/* Delete Line */}
      <button
        onClick={() => {
          const arr = note.content.split('\n');
          arr.splice(lineIndex, 1);
          updateNote(noteId, arr.join('\n'));
          setRightClickText(null);
        }}
        className={baseClass}
        title="Delete Line"
      >
        <TrashIcon className="w-4 h-4 text-gray-700" />
      </button>

      {/* Select Checkbox */}
      <label className={baseClass}>
        <input
          type="checkbox"
          checked={selectedNotes.includes(noteId)}
          onChange={() => {
            toggleNoteSelection(noteId);
            setRightClickText(null);
          }}
          className="accent-purple-500 w-4 h-4"
        />
      </label>
    </div>
  );
}