import React from 'react';
import NoteEditor from './NoteEditor';
import H1 from './H1';
import H2 from './H2';
import InlineEditor from './InlineEditor';
import { PlusIcon } from '@heroicons/react/24/solid';
import {
    parseNoteContent
} from '../utils/TextUtils';
import { renderLineWithClickableDates, getIndentFlags, getRawLines } from '../utils/genUtils';
import { updateNoteById as updateNote } from '../utils/ApiUtils';

/**
 * NoteContent - renders the body of a note, including headings, lines, inline editors,
 * date pickers, and the 'add new line' button.
 */
export default function NoteContent({
    note,
    searchQuery,
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
    const contentLines = parseNoteContent({ content: rawLines.join('\n'), searchTerm: searchQuery });
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
                    // Check if line is a React element
                    if (React.isValidElement(line)) {
                        // If it's already a React element, just render it with the right click handler
                        const elementWithProps = React.cloneElement(line, {
                            key: idx,
                            onContextMenu: (e) => {
                                e.preventDefault();
                                setRightClickNoteId(note.id);
                                setRightClickIndex(idx);
                                setRightClickPos({ x: e.clientX, y: e.clientY });
                            },
                            className: `${line.props.className || ''} ${
                                rightClickNoteId === note.id && rightClickIndex === idx
                                    ? 'bg-yellow-100'
                                    : ''
                            }`,
                        });
                        return elementWithProps;
                    }

                    // Handle string content
                    const lineContent = line.toString();
                    const isListItem = lineContent.startsWith('- ');

                    if (lineContent.trim() === '') {
                        return (
                            <div
                                key={idx}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setRightClickNoteId(note.id);
                                    setRightClickIndex(idx);
                                    setRightClickPos({ x: e.clientX, y: e.clientY });
                                }}
                                className={`cursor-text ${
                                    rightClickNoteId === note.id && rightClickIndex === idx
                                        ? 'bg-yellow-100'
                                        : ''
                                }`}
                            >
                                &nbsp;
                            </div>
                        );
                    }

                    if (lineContent.startsWith('<h1>') && lineContent.endsWith('</h1>')) {
                        return (
                            <H1
                                key={idx}
                                note={note}
                                line={lineContent}
                                idx={idx}
                                searchQuery={searchQuery}
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
                    if (lineContent.startsWith('<h2>') && lineContent.endsWith('</h2>')) {
                        return (
                            <H2
                                key={idx}
                                note={note}
                                line={lineContent}
                                idx={idx}
                                searchQuery={searchQuery}
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
                            className={`${(indentFlags[idx] || isListItem) ? 'pl-8 ' : ''}
                                group cursor-text flex items-center justify-between ${
                                    rightClickNoteId === note.id && rightClickIndex === idx
                                        ? 'bg-yellow-100'
                                        : ''
                                }`}
                        >
                            {editingLine.noteId === note.id && editingLine.lineIndex === idx ? (
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
                                            lineContent,
                                            note,
                                            idx,
                                            isListItem,
                                            searchQuery,
                                            parseNoteContent,
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
            <button
                onClick={() => {
                    setAddingLineNoteId(note.id);
                    if (newLineInputRef.current) {
                        newLineInputRef.current.focus();
                    }
                }}
                className="absolute bottom-2 right-2 p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
            >
                <PlusIcon className="w-4 h-4" />
            </button>
        </div>
    );
}