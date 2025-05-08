import React from 'react';
import NoteEditor from './NoteEditor';
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
    compressedView = false
}) {
    const rawLines = getRawLines(note.content);
    const contentLines = parseNoteContent({ content: rawLines.join('\n'), searchTerm: searchQuery });
    const indentFlags = getIndentFlags(contentLines);

    if (editingLine.noteId === note.id      ) {
    console.log('editing line', editingLine);
    console.log('note id:', note.id);
    console.log('editingLine type:', typeof editingLine.noteId, typeof editingLine.lineIndex);
    console.log('note.id type:', typeof note.id);
    }
    
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

                    // Handle headings and regular content in a unified way
                    const isH1 = lineContent.startsWith('<h1>') && lineContent.endsWith('</h1>');
                    const isH2 = lineContent.startsWith('<h2>') && lineContent.endsWith('</h2>');
                    const headingContent = isH1 ? lineContent.slice(4, -5) : isH2 ? lineContent.slice(4, -5) : lineContent;
                
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
                                } ${
                                    isH1 ? 'text-2xl font-bold text-gray-900' :
                                    isH2 ? 'text-lg font-semibold text-purple-700' :
                                    ''
                                }`}
                        >
                            {(() => {
                                const shouldShow = editingLine.noteId === note.id && editingLine.lineIndex === idx;
                                console.log('Inline editor debug:', {
                                    editingLineNoteId: editingLine.noteId,
                                    currentNoteId: note.id,
                                    editingLineIndex: editingLine.lineIndex,
                                    currentIndex: idx,
                                    noteIdMatch: editingLine.noteId === note.id,
                                    lineIndexMatch: editingLine.lineIndex === idx,
                                    shouldShow
                                });
                                return shouldShow ? (
                                    <InlineEditor
                                        text={editedLineContent}
                                        setText={setEditedLineContent}
                                        onSave={(newText) => {
                                            const lines = note.content.split('\n');
                                            // Preserve heading markers when saving
                                            if (isH1) {
                                                lines[idx] = `###${newText}###`;
                                            } else if (isH2) {
                                                lines[idx] = `##${newText}##`;
                                            } else {
                                                lines[idx] = newText;
                                            }
                                            updateNote(note.id, lines.join('\n'));
                                            setEditingLine({ noteId: null, lineIndex: null });
                                        }}
                                        onCancel={() =>
                                            setEditingLine({ noteId: null, lineIndex: null })
                                        }
                                    />
                                ) : (
                                    <>
                                        {(indentFlags[idx] || isListItem) && !isH1 && !isH2 && (
                                            <span className="mr-2 text-3xl self-start leading-none">
                                                •
                                            </span>
                                        )}
                                        <span className="flex-1">
                                            {renderLineWithClickableDates(
                                                headingContent,
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
                                                                    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                                                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
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
                                );
                            })()}
                        </div>
                    );
                })}
            </div>
            {!compressedView && (
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
            )}
        </div>
    );
}