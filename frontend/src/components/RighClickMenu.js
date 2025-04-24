// frontend/src/components/RightClickMenu.js
import React from 'react';


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


  const handleCopyLine = (text) => {
    let copyText = text;
    // If markdown link, extract URL only
    const linkMatch = text.match(/\[.*?\]\((.*?)\)/);
    if (linkMatch) {
      copyText = linkMatch[1];
    } else {
      // Otherwise, extract first URL in text
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


  if (noteId == null || lineIndex == null) return null;
  const note = notes.find((n) => n.id === noteId);
  if (!note) return null;

  return (
    <div
      style={{ position: 'fixed', top: `${pos.y}px`, left: `${pos.x}px` }}
      className="z-50 bg-white border border-gray-300 rounded shadow-md px-2 py-1 grid grid-cols-2 gap-1"
    >
      {[
        { label: 'Edit', value: 'editLine' },
        { label: 'Delete', value: 'deleteLine' },
        { separator: true },
        { label: 'Copy', value: 'copyLine' },
        { label: 'Remove Fmt', value: 'removeFormatting' },
        { separator: true },
        { label: 'H1', value: 'makeH1' },
        { label: 'H2', value: 'makeH2' },
        { label: 'AA', value: 'uppercase' },
        { label: 'Aa', value: 'sentenceCase' },
        { label: 'Bold', value: 'toggleBold' },
        { label: 'Italics', value: 'toggleItalics' },
        { separator: true }, // After Bold row
        { label: 'Insert ↑', value: 'insertAbove' },
        { label: 'Insert ↓', value: 'insertBelow' },
        { label: 'Merge ↑', value: 'mergeUp' },
        { label: 'Merge ↓', value: 'mergeDown' },
        { label: 'Move ↑', value: 'moveUp' },
        { label: 'Move ↓', value: 'moveDown' },
        { separator: true }, // After Move row
      ].map((opt, idx) =>
        opt.separator ? (
          <div key={`sep-${idx}`} className="col-span-2 border-t-2 my-1"></div>
        ) : (
          <button
            key={opt.value}
            className="p-1 text-xs bg-gray-100 hover:bg-gray-200 hover:shadow-lg rounded cursor-pointer"
            onClick={() => {
              const arr = note.content.split('\n');
              switch (opt.value) {
                case 'copyLine':
                  handleCopyLine(arr[lineIndex]);
                  //setRightClickText('copied')
                  break;
                case 'editLine':
                  setEditedLineContent(arr[lineIndex]);
                  setEditingLine({ noteId, lineIndex });
                  break;
                case 'insertAbove':
                  arr.splice(lineIndex, 0, '');
                  break;
                case 'insertBelow':
                  arr.splice(lineIndex + 1, 0, '');
                  break;
                case 'removeFormatting':
                  const trimmed = arr[lineIndex].trim();
                  const isH1 = trimmed.startsWith('###') && trimmed.endsWith('###');
                  const isH2 = trimmed.startsWith('##') && trimmed.endsWith('##');
                  if (isH1 || isH2) arr[lineIndex] = isH1 ? trimmed.slice(3, -3) : trimmed.slice(2, -2);
                  break;
                case 'makeH1':
                  const h1Text = arr[lineIndex].trim()
                    .replace(/^###|###$/g, '') // Remove H1 markers
                    .replace(/^##|##$/g, '') // Remove H2 markers
                    .trim();
                  arr[lineIndex] = `###${h1Text}###`;
                  break;
                case 'makeH2':
                  const h2Text = arr[lineIndex].trim()
                    .replace(/^###|###$/g, '') // Remove H1 markers
                    .replace(/^##|##$/g, '') // Remove H2 markers
                    .trim();
                  arr[lineIndex] = `##${h2Text}##`;
                  break;
                case 'moveTop':
                  const topLine = arr.splice(lineIndex, 1)[0];
                  arr.unshift(topLine);
                  break;
                case 'mergeUp':
                  if (lineIndex > 0) {
                    arr[lineIndex - 1] += ' ' + arr[lineIndex];
                    arr.splice(lineIndex, 1);
                  }
                  break;
                case 'mergeDown':
                  if (lineIndex < arr.length - 1) {
                    arr[lineIndex] += ' ' + arr[lineIndex + 1];
                    arr.splice(lineIndex + 1, 1);
                  }
                  break;
                case 'moveUp':
                  if (lineIndex > 0) [arr[lineIndex - 1], arr[lineIndex]] = [arr[lineIndex], arr[lineIndex - 1]];
                  break;
                case 'moveDown':
                  if (lineIndex < arr.length - 1) [arr[lineIndex + 1], arr[lineIndex]] = [arr[lineIndex], arr[lineIndex + 1]];
                  break;
                case 'uppercase':
                  const upperLine = arr[lineIndex].replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, text, url) => `[${text.toUpperCase()}](${url})`);
                  arr[lineIndex] = upperLine.toUpperCase();
                  break;
                case 'sentenceCase':
                  const sentLine = arr[lineIndex].replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, text, url) => {
                    const sent = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
                    return `[${sent}](${url})`;
                  }).split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                  arr[lineIndex] = sentLine;
                  break;
                case 'toggleBold':
                  let boldLine = arr[lineIndex];
                  arr[lineIndex] = boldLine.startsWith('**') && boldLine.endsWith('**') ? boldLine.slice(2, -2) : `**${boldLine}**`;
                  break;
                case 'toggleItalics':
                  let italLine = arr[lineIndex];
                  arr[lineIndex] = italLine.startsWith('*') && italLine.endsWith('*') && !italLine.startsWith('**') ? italLine.slice(1, -1) : `*${italLine}*`;
                  break;
                case 'deleteLine':
                  arr.splice(lineIndex, 1);
                  break;
                default:
                  break;
              }
              updateNote(noteId, arr.join('\n'));
            }}
          >
            {opt.label}
          </button>
        )
      )}
    </div>
  );
}