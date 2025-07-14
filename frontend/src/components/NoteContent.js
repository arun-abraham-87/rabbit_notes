import React from 'react';
import NoteEditor from './NoteEditor';
import InlineEditor from './InlineEditor';
import { PlusIcon } from '@heroicons/react/24/solid';
import {
    parseNoteContent
} from '../utils/TextUtils';
import { renderLineWithClickableDates, getIndentFlags, getRawLines } from '../utils/genUtils';
import AddTextModal from './AddTextModal';
import { reorderMetaTags } from '../utils/TextUtils';

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
    compressedView = false,
    updateNote
}) {
    const [showAddTextModal, setShowAddTextModal] = React.useState(false);
    const [urlForText, setUrlForText] = React.useState('');

    if (!note) {
        return null;
    }

    const handleAddText = (url) => {
        setUrlForText(url);
        setShowAddTextModal(true);
    };

    const handleSaveText = async (noteId, url, customText) => {
        try {
            // Split content into lines
            const lines = note.content.split('\n');
            
            // Find the line containing the URL and replace it with markdown format
            const updatedLines = lines.map(line => {
                if (line.trim() === url) {
                    return `[${customText}](${url})`;
                }
                return line;
            });
            
            // Join lines back together
            const updatedContent = updatedLines.join('\n');
            const reorderedContent = reorderMetaTags(updatedContent);
            
            // Update the note
            await updateNote(noteId, reorderedContent);
            
            setShowAddTextModal(false);
        } catch (error) {
            console.error('Error adding custom text:', error);
        }
    };

    const rawLines = getRawLines(note.content);
    const contentLines = parseNoteContent({ 
        content: rawLines.join('\n'), 
        searchTerm: searchQuery,
        onAddText: handleAddText
    });
    const indentFlags = getIndentFlags(contentLines);

    if (editingLine?.noteId === note.id) {
        console.log('editing line', editingLine);
        console.log('note id:', note.id);
        console.log('editingLine type:', typeof editingLine.noteId, typeof editingLine.lineIndex);
        console.log('note.id type:', typeof note.id);
    }
    
    if (!Array.isArray(contentLines) || contentLines.length === 0) {
        return '<div>1234</div>';
    }

    const handleRightClick = (e, idx) => {
        e.preventDefault();
        setRightClickNoteId(note.id);
        setRightClickIndex(idx);
        setRightClickPos({ x: e.clientX, y: e.clientY });
    };

    const handleSaveEdit = (newText, idx, isH1, isH2) => {
        const lines = note.content.split('\n');
        if (isH1) {
            lines[idx] = `###${newText}###`;
        } else if (isH2) {
            lines[idx] = `##${newText}##`;
        } else {
            lines[idx] = newText;
        }
        const updatedContent = lines.join('\n');
        const reorderedContent = reorderMetaTags(updatedContent);
        updateNote(note.id, reorderedContent);
        setEditingLine({ noteId: null, lineIndex: null });
    };

    const renderInlineEditor = (idx, isH1, isH2) => (
        <InlineEditor
            key={idx}
            text={editedLineContent}
            setText={setEditedLineContent}
            onSave={(newText) => handleSaveEdit(newText, idx, isH1, isH2)}
            onCancel={() => setEditingLine({ noteId: null, lineIndex: null })}
        />
    );

    const renderDatePicker = (idx) => (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-4 rounded shadow-md">
                <input
                    type="date"
                    value={(() => {
                        const orig = editingInlineDate?.originalDate;
                        if (!orig) return '';
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
                    onChange={(e) => handleInlineDateSelect(
                        editingInlineDate?.noteId,
                        editingInlineDate?.lineIndex,
                        e.target.value
                    )}
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                />
                <button
                    onClick={() => setEditingInlineDate({ noteId: null, lineIndex: null, originalDate: '' })}
                    className="ml-2 text-sm text-red-500 hover:underline"
                >
                    Cancel
                </button>
            </div>
        </div>
    );

    const renderLine = (line, idx) => {
        if (React.isValidElement(line)) {
            if (editingLine?.noteId === note.id && editingLine?.lineIndex === idx) {
                return renderInlineEditor(idx, false, false);
            }
            
            // Apply indentation to React elements (h1, h2, etc.)
            const shouldIndent = indentFlags[idx];
            const elementType = line.type;
            const isH1 = elementType === 'h1';
            const isH2 = elementType === 'h2';
            
            return (
                <div
                    key={idx}
                    onContextMenu={(e) => handleRightClick(e, idx)}
                    className={`${shouldIndent ? 'pl-8 ' : ''}
                        group cursor-text flex items-center justify-between ${
                            rightClickNoteId === note.id && rightClickIndex === idx ? 'bg-yellow-100' : ''
                        }`}
                >
                    {shouldIndent && !isH1 && !isH2 && (
                        <span className="mr-2 text-3xl self-start leading-none">•</span>
                    )}
                    <span className="flex-1">
                        {React.cloneElement(line, {
                            onContextMenu: (e) => handleRightClick(e, idx),
                            className: `${line.props.className || ''} ${
                                rightClickNoteId === note.id && rightClickIndex === idx ? 'bg-yellow-100' : ''
                            }`,
                        })}
                    </span>
                </div>
            );
        }

        const lineContent = line.toString();
        const isListItem = lineContent.startsWith('- ');
        const isH1 = lineContent.startsWith('<h1>') && lineContent.endsWith('</h1>');
        const isH2 = lineContent.startsWith('<h2>') && lineContent.endsWith('</h2>');
        const headingContent = isH1 || isH2 ? lineContent.slice(4, -5) : lineContent;

        if (lineContent.trim() === '') {
            return (
                <div
                    key={idx}
                    onContextMenu={(e) => handleRightClick(e, idx)}
                    className={`cursor-text ${
                        rightClickNoteId === note.id && rightClickIndex === idx ? 'bg-yellow-100' : ''
                    }`}
                >
                    &nbsp;
                </div>
            );
        }

        return (
            <div
                key={idx}
                onContextMenu={(e) => handleRightClick(e, idx)}
                className={`${(indentFlags[idx] || isListItem) ? 'pl-8 ' : ''}
                    group cursor-text flex items-center justify-between ${
                        rightClickNoteId === note.id && rightClickIndex === idx ? 'bg-yellow-100' : ''
                    } ${
                        isH1 ? 'text-2xl font-bold text-gray-900' :
                        isH2 ? 'text-lg font-semibold text-purple-700' : ''
                    }`}
            >
                {editingLine?.noteId === note.id && editingLine?.lineIndex === idx ? (
                    renderInlineEditor(idx, isH1, isH2)
                ) : (
                    <>
                        {(indentFlags[idx] || isListItem) && !isH1 && !isH2 && (
                            <span className="mr-2 text-3xl self-start leading-none">•</span>
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
                        {editingInlineDate?.noteId === note.id && editingInlineDate?.lineIndex === idx && renderDatePicker(idx)}
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="relative bg-gray-50 p-4 rounded-md border text-gray-800 text-sm leading-relaxed">
            <div className="whitespace-pre-wrap break-words break-all space-y-1">
                {contentLines.map((line, idx) => renderLine(line, idx))}
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
            <AddTextModal
                isOpen={showAddTextModal}
                onClose={() => setShowAddTextModal(false)}
                onSave={handleSaveText}
                noteId={note.id}
                url={urlForText}
            />
        </div>
    );
}