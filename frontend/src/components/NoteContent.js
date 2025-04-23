import React from 'react';
import NoteEditor from './NoteEditor';
import H1 from './H1';
import H2 from './H2';
import InlineEditor from './InlineEditor';
import { PlusIcon } from '@heroicons/react/24/solid';
import {
    parseFormattedContent
} from '../utils/TextUtils';
import { renderLineWithClickableDates, getIndentFlags, getRawLines } from '../utils/genUtils';
import { updateNoteById as updateNote } from '../utils/ApiUtils';

/**
 * NoteContent - renders the body of a note, including headings, lines, inline editors,
 * date pickers, and the 'add new line' button.
 */
export default function NoteContent({
    note,
    searchTerm,
    duplicatedUrlColors,
    editingLine,
    setEditingLine,
    editedLineContent,
    setEditedLineContent,
    rightClickNoteId,
    rightClickIndex,
    setRightClickNoteId,
    setRightClickIndex,
    setRightClickPos,
    editingInlineDate,
    setEditingInlineDate,
    handleInlineDateSelect,
    popupNoteText,
    setPopupNoteText,
    objList,
    addingLineNoteId,
    setAddingLineNoteId,
    newLineText,
    setNewLineText,
    newLineInputRef,
}) {
    console.log("Note")
    console.log(note)
    console.log("Note-END")

    const rawLines = getRawLines(note.content);
    console.log("typeof rawLines")
    console.log(typeof rawLines)
    const contentLines = parseFormattedContent(rawLines);
    const indentFlags = getIndentFlags(contentLines);

    console.log("Content Lines")
    console.log(contentLines)

    if (!Array.isArray(contentLines) || contentLines.length === 0) {
        return '<div>1234</div>';
      }

    return (
        <div className="relative bg-gray-50 p-4 rounded-md border text-gray-800 text-sm leading-relaxed">
            <div className="whitespace-pre-wrap break-words break-all space-y-1">
                {contentLines.map((line, idx) => {
                    const isListItem = line.startsWith('- ');
                    if (line.trim() === '') {
                        return (
                            <div
                                key={idx}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setRightClickNoteId(note.id);
                                    setRightClickIndex(idx);
                                    setRightClickPos({ x: e.clientX, y: e.clientY });
                                }}
                                className={`cursor-text  ${rightClickNoteId === note.id &&
                                        rightClickIndex === idx
                                        ? 'bg-yellow-100'
                                        : ''
                                    }`}
                            >
                                &nbsp;
                            </div>
                        );
                    }
                    if (line.startsWith('<h1>') && line.endsWith('</h1>')) {
                        return (
                            <H1
                                key={idx}
                                note={note}
                                line={line}
                                idx={idx}
                                searchTerm={searchTerm}
                                duplicatedUrlColors={duplicatedUrlColors}
                                editingLine={editingLine}
                                setEditingLine={setEditingLine}
                                editedLineContent={editedLineContent}
                                setEditedLineContent={setEditedLineContent}
                                setRightClickNoteId={setRightClickNoteId}
                                setRightClickIndex={setRightClickIndex}
                                setRightClickPos={setRightClickPos}
                                rightClickNoteId={rightClickNoteId}
                                rightClickIndex={rightClickIndex}
                            />
                        );
                    }
                    if (line.startsWith('<h2>') && line.endsWith('</h2>')) {
                        return (
                            <H2
                                key={idx}
                                note={note}
                                line={line}
                                idx={idx}
                                searchTerm={searchTerm}
                                duplicatedUrlColors={duplicatedUrlColors}
                                editingLine={editingLine}
                                setEditingLine={setEditingLine}
                                editedLineContent={editedLineContent}
                                setEditedLineContent={setEditedLineContent}
                                setRightClickNoteId={setRightClickNoteId}
                                setRightClickIndex={setRightClickIndex}
                                setRightClickPos={setRightClickPos}
                                rightClickNoteId={rightClickNoteId}
                                rightClickIndex={rightClickIndex}
                            />
                        );
                    }
                    return (
                        <div
                            key={idx}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                setRightClickNoteId(note.id);
                                setRightClickIndex(idx);
                                setRightClickPos({ x: e.clientX, y: e.clientY });
                            }}
                            className={`${(indentFlags[idx] || isListItem) ? 'pl-8 ' : ''
                                }group cursor-text flex items-center justify-between `}
                        >
                            {editingLine.noteId === note.id &&
                                editingLine.lineIndex === idx ? (
                                <InlineEditor
                                    text={editedLineContent}
                                    setText={setEditedLineContent}
                                    onSave={(newText) => {
                                        const lines = note.content.split('\n');
                                        lines[idx] = newText;
                                        updateNote(note.id, lines.join('\n'));
                                        setEditingLine({ noteId: null, lineIndex: null });
                                    }}
                                    onCancel={() =>
                                        setEditingLine({ noteId: null, lineIndex: null })
                                    }
                                />
                            ) : (
                                <>
                                    {(indentFlags[idx] || isListItem) && (
                                        <span className="mr-2 text-3xl self-start leading-none">
                                            •
                                        </span>
                                    )}
                                    <span className="flex-1">
                                        {renderLineWithClickableDates(
                                            line,
                                            note,
                                            idx,
                                            isListItem,
                                            searchTerm,
                                            parseFormattedContent,
                                            setEditingInlineDate,
                                            handleInlineDateSelect
                                        )}
                                    </span>
                                    {editingInlineDate.noteId === note.id &&
                                        editingInlineDate.lineIndex === idx && (
                                            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                                                <div className="bg-white p-4 rounded shadow-md">
                                                    <input
                                                        type="date"
                                                        value={(() => {
                                                            const orig = editingInlineDate.originalDate;
                                                            if (orig.includes('/')) {
                                                                const [day, month, year] = orig.split('/');
                                                                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                                                            }
                                                            const [day, mon, year] = orig.split(' ');
                                                            const months = [
                                                                'Jan',
                                                                'Feb',
                                                                'Mar',
                                                                'Apr',
                                                                'May',
                                                                'Jun',
                                                                'Jul',
                                                                'Aug',
                                                                'Sep',
                                                                'Oct',
                                                                'Nov',
                                                                'Dec',
                                                            ];
                                                            const mm = (months.indexOf(mon) + 1).toString().padStart(2, '0');
                                                            return `${year}-${mm}-${day.padStart(2, '0')}`;
                                                        })()}
                                                        onChange={(e) =>
                                                            handleInlineDateSelect(
                                                                editingInlineDate.noteId,
                                                                editingInlineDate.lineIndex,
                                                                e.target.value
                                                            )
                                                        }
                                                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                                                    />
                                                    <button
                                                        onClick={() =>
                                                            setEditingInlineDate({ noteId: null, lineIndex: null, originalDate: '' })
                                                        }
                                                        className="ml-2 text-sm text-red-500 hover:underline"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
            {popupNoteText === note.id && (
                <div className="mt-2">
                    <NoteEditor
                        objList={objList}
                        text={note.content}
                        note={note}
                        onCancel={() => setPopupNoteText(null)}
                        onSave={(updatedNote) => {
                            updateNote(updatedNote.id, updatedNote.content);
                            setPopupNoteText(null);
                        }}
                    />
                </div>
            )}
            <div className="absolute bottom-2 right-2">
                <button
                    title="Add line"
                    onClick={() => {
                        setAddingLineNoteId(note.id);
                        setNewLineText('');
                        setTimeout(() => newLineInputRef.current?.focus(), 0);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                >
                    <PlusIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}