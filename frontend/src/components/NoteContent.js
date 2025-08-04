import React, { useState } from 'react';
import NoteEditor from './NoteEditor';
import InlineEditor from './InlineEditor';
import { PlusIcon } from '@heroicons/react/24/solid';
import {
    parseNoteContent
} from '../utils/TextUtils';
import { renderLineWithClickableDates, getIndentFlags, getRawLines } from '../utils/genUtils';
import AddTextModal from './AddTextModal';
import { reorderMetaTags } from '../utils/MetaTagUtils';

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
    updateNote,
    focusMode = false,
    // Super edit mode props
    isSuperEditMode = false,
    highlightedLineIndex = -1,
    highlightedLineText = '',
    wasOpenedFromSuperEdit = false
}) {
    const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [showAddTextModal, setShowAddTextModal] = React.useState(false);
    const [urlForText, setUrlForText] = React.useState('');
    const [isEditing, setIsEditing] = React.useState(false);
    const [currentCustomText, setCurrentCustomText] = React.useState('');
    
    // Drag and drop state
    const [draggedLineIndex, setDraggedLineIndex] = useState(null);
    const [dragOverLineIndex, setDragOverLineIndex] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    if (!note) {
        return null;
    }

    const handleAddText = (url) => {
        setUrlForText(url);
        setIsEditing(false);
        setCurrentCustomText('');
        setShowAddTextModal(true);
    };

    const handleEditText = (url, customText) => {
        setUrlForText(url);
        setIsEditing(true);
        setCurrentCustomText(customText);
        setShowAddTextModal(true);
    };

    const handleSaveText = async (noteId, url, customText) => {
        try {
            // Split content into lines
            const lines = note.content.split('\n');
            
            // Find the line containing the URL and replace it with markdown format
            const updatedLines = lines.map(line => {
                if (isEditing) {
                    // For editing, replace existing markdown link
                    const markdownRegex = new RegExp(`\\[([^\\]]+)\\]\\(${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`);
                    if (markdownRegex.test(line)) {
                        return line.replace(markdownRegex, `[${customText}](${url})`);
                    }
                } else {
                    // For adding, replace plain URL with markdown format
                    if (line.trim() === url) {
                        return `[${customText}](${url})`;
                    }
                }
                return line;
            });
            
            // Join lines back together
            const updatedContent = updatedLines.join('\n');
            const reorderedContent = reorderMetaTags(updatedContent);
            
            // Update the note
            await updateNote(noteId, reorderedContent);
            
            setShowAddTextModal(false);
            setIsEditing(false);
            setCurrentCustomText('');
        } catch (error) {
            console.error('Error saving custom text:', error);
        }
    };

    const handleConvertToH1 = async (note, lineText) => {
        try {
            // Split content into lines
            const lines = note.content.split('\n');
            
            // Find and replace the first line with H1 format
            const updatedLines = lines.map((line, index) => {
                if (index === 0) {
                    // Get the original first line from the note content
                    const originalFirstLine = lines[0];
                    
                    // Remove any existing H1 markers and add new ones
                    const cleanText = originalFirstLine.replace(/^###\s*/, '').replace(/\s*###$/, '');
                    return `###${cleanText}###`;
                }
                return line;
            });
            
            // Join lines back together
            const updatedContent = updatedLines.join('\n');
            const reorderedContent = reorderMetaTags(updatedContent);
            
            // Update the note
            await updateNote(note.id, reorderedContent);
        } catch (error) {
            console.error('Error converting to H1:', error);
        }
    };

    const handleConvertToH2 = async (note, lineIndex) => {
        try {
            // Split content into lines
            const lines = note.content.split('\n');
            
            // Get the original line content
            const originalLine = lines[lineIndex];
            if (!originalLine) return;
            
            // Remove any existing H2 markers and add new ones
            const cleanText = originalLine.replace(/^##\s*/, '').replace(/\s*##$/, '');
            lines[lineIndex] = `##${cleanText}##`;
            
            // Join lines back together
            const updatedContent = lines.join('\n');
            const reorderedContent = reorderMetaTags(updatedContent);
            
            // Update the note
            await updateNote(note.id, reorderedContent);
        } catch (error) {
            console.error('Error converting to H2:', error);
        }
    };

    const rawLines = getRawLines(note.content);
    const contentLines = parseNoteContent({ 
        content: note.content, // Pass full content including meta tags for URL reversal detection
        searchTerm: searchQuery,
        onAddText: handleAddText,
        onEditText: handleEditText
    });
    const indentFlags = getIndentFlags(contentLines);

    if (editingLine?.noteId === note.id) {
        // Line is being edited
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

    const handleTextClick = (idx) => {
        // Get the original line content for editing
        const rawLines = getRawLines(note.content);
        const originalLine = rawLines[idx];
        if (!originalLine) return;

        // Check if the line contains only a URL (with or without custom text)
        const urlRegex = /^(https?:\/\/[^\s]+)$/;
        const markdownUrlRegex = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/;
        
        // If the line is just a URL or markdown link, don't open inline editing
        if (urlRegex.test(originalLine.trim()) || markdownUrlRegex.test(originalLine.trim())) {
            return; // Let the normal URL behavior handle it
        }

        setEditingLine({ noteId: note.id, lineIndex: idx });
        setEditedLineContent(originalLine);
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
        setEditedLineContent('');
    };

    const handleDeleteLine = (idx) => {
        const lines = note.content.split('\n');
        lines.splice(idx, 1); // Remove the line at index idx
        const updatedContent = lines.join('\n');
        const reorderedContent = reorderMetaTags(updatedContent);
        updateNote(note.id, reorderedContent);
        setEditingLine({ noteId: null, lineIndex: null });
        setEditedLineContent('');
    };

    const handleMoveH1ToTop = (idx) => {
        const lines = note.content.split('\n');
        const h1Line = lines[idx];
        
        // Remove the H1 line from its current position
        lines.splice(idx, 1);
        
        // Insert the H1 line at the beginning
        lines.unshift(h1Line);
        
        const updatedContent = lines.join('\n');
        const reorderedContent = reorderMetaTags(updatedContent);
        updateNote(note.id, reorderedContent);
    };

    const hasNoBulletsTag = () => {
        return note.content.includes('meta::no_bullets');
    };

    const toggleNoBullets = () => {
        const lines = note.content.split('\n');
        const hasTag = hasNoBulletsTag();
        
        if (hasTag) {
            // Remove the meta tag
            const filteredLines = lines.filter(line => line.trim() !== 'meta::no_bullets');
            const updatedContent = filteredLines.join('\n');
            const reorderedContent = reorderMetaTags(updatedContent);
            updateNote(note.id, reorderedContent);
        } else {
            // Add the meta tag
            lines.push('meta::no_bullets');
            const updatedContent = lines.join('\n');
            const reorderedContent = reorderMetaTags(updatedContent);
            updateNote(note.id, reorderedContent);
        }
    };

    const toggleBulkDeleteMode = () => {
        setBulkDeleteMode(!bulkDeleteMode);
        setSelectedRows(new Set());
    };

    const toggleRowSelection = (idx) => {
        const newSelectedRows = new Set(selectedRows);
        if (newSelectedRows.has(idx)) {
            newSelectedRows.delete(idx);
        } else {
            newSelectedRows.add(idx);
        }
        setSelectedRows(newSelectedRows);
    };

    const selectAllRows = () => {
        const allIndices = new Set();
        for (let i = 0; i < contentLines.length; i++) {
            allIndices.add(i);
        }
        setSelectedRows(allIndices);
    };

    const deselectAllRows = () => {
        setSelectedRows(new Set());
    };

    const handleBulkDelete = () => {
        const lines = note.content.split('\n');
        const selectedIndices = Array.from(selectedRows).sort((a, b) => b - a); // Sort in descending order
        
        // Remove selected lines (in reverse order to maintain indices)
        selectedIndices.forEach(idx => {
            lines.splice(idx, 1);
        });
        
        const updatedContent = lines.join('\n');
        const reorderedContent = reorderMetaTags(updatedContent);
        updateNote(note.id, reorderedContent);
        
        // Reset bulk delete mode
        setBulkDeleteMode(false);
        setSelectedRows(new Set());
    };

    // Drag and drop handlers
    const handleDragStart = (e, lineIndex) => {
        if (focusMode) return; // Disable drag in focus mode
        
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', lineIndex.toString());
        setDraggedLineIndex(lineIndex);
        setIsDragging(true);
    };

    const handleDragOver = (e, lineIndex) => {
        if (focusMode) return;
        
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverLineIndex(lineIndex);
    };

    const handleDragEnter = (e, lineIndex) => {
        if (focusMode) return;
        
        e.preventDefault();
        setDragOverLineIndex(lineIndex);
    };

    const handleDragLeave = (e) => {
        if (focusMode) return;
        
        setDragOverLineIndex(null);
    };

    const handleDrop = (e, targetLineIndex) => {
        if (focusMode) return;
        
        e.preventDefault();
        const sourceLineIndex = parseInt(e.dataTransfer.getData('text/plain'));
        
        if (sourceLineIndex === targetLineIndex) {
            setDraggedLineIndex(null);
            setDragOverLineIndex(null);
            setIsDragging(false);
            return;
        }

        // Get the raw lines (including meta tags)
        const lines = note.content.split('\n');
        
        // Move the line
        const movedLine = lines[sourceLineIndex];
        const newLines = [...lines];
        newLines.splice(sourceLineIndex, 1);
        
        // Adjust target index when dragging down to account for the removed line
        const adjustedTargetIndex = sourceLineIndex < targetLineIndex ? targetLineIndex - 1 : targetLineIndex;
        newLines.splice(adjustedTargetIndex, 0, movedLine);
        
        // Update the note
        const updatedContent = newLines.join('\n');
        const reorderedContent = reorderMetaTags(updatedContent);
        updateNote(note.id, reorderedContent);
        
        // Reset drag state
        setDraggedLineIndex(null);
        setDragOverLineIndex(null);
        setIsDragging(false);
    };

    const handleDragEnd = () => {
        setDraggedLineIndex(null);
        setDragOverLineIndex(null);
        setIsDragging(false);
    };

    const renderInlineEditor = (idx, isH1, isH2) => (
        <InlineEditor
            key={idx}
            text={editedLineContent}
            setText={setEditedLineContent}
            onSave={(newText) => handleSaveEdit(newText, idx, isH1, isH2)}
            onCancel={() => setEditingLine({ noteId: null, lineIndex: null })}
            onDelete={() => handleDeleteLine(idx)}
            isSuperEditMode={isSuperEditMode}
            wasOpenedFromSuperEdit={wasOpenedFromSuperEdit}
            lineIndex={idx}
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
        // Check if this line contains only a URL
        let isUrlOnly = false;
        if (note && note.content) {
            const rawLines = getRawLines(note.content);
            const originalLine = rawLines[idx];
            const urlRegex = /^(https?:\/\/[^\s]+)$/;
            const markdownUrlRegex = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/;
            isUrlOnly = originalLine && (urlRegex.test(originalLine.trim()) || markdownUrlRegex.test(originalLine.trim()));
        }

        // Check if this line is highlighted in super edit mode
        const isHighlightedInSuperEdit = isSuperEditMode && idx === highlightedLineIndex;

        if (React.isValidElement(line)) {
            if (editingLine?.noteId === note.id && editingLine?.lineIndex === idx) {
                return renderInlineEditor(idx, false, false);
            }
            
            // Apply indentation to React elements (h1, h2, etc.)
            const shouldIndent = indentFlags[idx];
            const elementType = line.type;
            const isH1 = elementType === 'h1';
            const isH2 = elementType === 'h2';
            const isFirstLine = idx === 0;
            
            return (
                <div
                    key={idx}
                    draggable={!focusMode}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnter={(e) => handleDragEnter(e, idx)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    onContextMenu={(e) => handleRightClick(e, idx)}
                    className={`${shouldIndent ? 'pl-8 ' : ''}
                        group cursor-text flex items-center ${
                            rightClickNoteId === note.id && rightClickIndex === idx ? 'bg-yellow-100' : ''
                        } ${
                            isHighlightedInSuperEdit ? 'bg-purple-100 border-l-4 border-purple-500' : ''
                        } ${
                            draggedLineIndex === idx ? 'opacity-50' : ''
                        } ${
                            dragOverLineIndex === idx ? 'border-t-2 border-blue-500 bg-blue-50' : ''
                        } ${
                            !focusMode ? 'hover:bg-gray-50' : ''
                        }`}
                >
                    {bulkDeleteMode && (
                        <input
                            type="checkbox"
                            checked={selectedRows.has(idx)}
                            onChange={() => toggleRowSelection(idx)}
                            className="mr-2"
                        />
                    )}
                    {shouldIndent && !isH1 && !isH2 && !hasNoBulletsTag() && (
                        <span className="mr-2 text-3xl self-start leading-none">•</span>
                    )}
                    <div className="flex items-center gap-2">
                        {React.cloneElement(line, {
                            onContextMenu: (e) => handleRightClick(e, idx),
                            onClick: () => handleTextClick(idx),
                            className: `${line.props.className || ''} ${
                                rightClickNoteId === note.id && rightClickIndex === idx ? 'bg-yellow-100' : ''
                            }`,
                        })}
                        {!focusMode && isFirstLine && !isH1 && (
                            <button
                                onClick={() => handleConvertToH1(note, line.props.children)}
                                className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-400 transition-colors duration-150"
                                title="Convert to H1"
                            >
                                H1
                            </button>
                        )}
                        {!focusMode && !isFirstLine && isH1 && (
                            <button
                                onClick={() => handleMoveH1ToTop(idx)}
                                className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-400 transition-colors duration-150"
                                title="Move H1 to top"
                            >
                                ↑
                            </button>
                        )}
                    </div>
                </div>
            );
        }

        const lineContent = line.toString();
        const isListItem = lineContent.startsWith('- ');
        const isH1 = lineContent.startsWith('<h1>') && lineContent.endsWith('</h1>');
        const isH2 = lineContent.startsWith('<h2>') && lineContent.endsWith('</h2>');
        
        // Convert to sentence case for H1 headings
        const toSentenceCase = (text) => {
            if (!text || typeof text !== 'string') return text;
            return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        };
        
        const headingContent = isH1 || isH2 ? 
            (isH1 ? toSentenceCase(lineContent.slice(4, -5)) : lineContent.slice(4, -5)) : 
            lineContent;

        if (lineContent.trim() === '') {
            return (
                <div
                    key={idx}
                    draggable={!focusMode}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnter={(e) => handleDragEnter(e, idx)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    onContextMenu={(e) => handleRightClick(e, idx)}
                    className={`cursor-text ${
                        rightClickNoteId === note.id && rightClickIndex === idx ? 'bg-yellow-100' : ''
                    } ${
                        draggedLineIndex === idx ? 'opacity-50' : ''
                    } ${
                        dragOverLineIndex === idx ? 'border-t-2 border-blue-500 bg-blue-50' : ''
                    } ${
                        !focusMode ? 'hover:bg-gray-50' : ''
                    }`}
                >
                    &nbsp;
                </div>
            );
        }

        const isFirstLine = idx === 0;
        const isFirstLineH1 = lineContent.trim().startsWith('###') && lineContent.trim().endsWith('###');
        
        return (
            <div
                key={idx}
                draggable={!focusMode}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnter={(e) => handleDragEnter(e, idx)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                onContextMenu={(e) => handleRightClick(e, idx)}
                className={`${(indentFlags[idx] || isListItem) ? 'pl-8 ' : ''}
                    group cursor-text flex items-center ${
                        rightClickNoteId === note.id && rightClickIndex === idx ? 'bg-yellow-100' : ''
                    } ${
                        isH1 ? 'text-2xl font-bold text-gray-900' :
                        isH2 ? 'text-lg font-semibold text-gray-900' : ''
                    } ${
                        isHighlightedInSuperEdit ? 'bg-purple-100 border-l-4 border-purple-500' : ''
                    } ${
                        draggedLineIndex === idx ? 'opacity-50' : ''
                    } ${
                        dragOverLineIndex === idx ? 'border-t-2 border-blue-500 bg-blue-50' : ''
                    } ${
                        !focusMode ? 'hover:bg-gray-50' : ''
                    }`}
            >
                {bulkDeleteMode && (
                    <input
                        type="checkbox"
                        checked={selectedRows.has(idx)}
                        onChange={() => toggleRowSelection(idx)}
                        className="mr-2"
                    />
                )}
                {editingLine?.noteId === note.id && editingLine?.lineIndex === idx ? (
                    renderInlineEditor(idx, isH1, isH2)
                ) : (
                    <>
                        {(indentFlags[idx] || isListItem) && !isH1 && !isH2 && !hasNoBulletsTag() && (
                            <span className="mr-2 text-3xl self-start leading-none">•</span>
                        )}
                        <div className="flex items-center gap-2">
                            {(() => {
                                // Check if this line contains only a URL
                                const rawLines = getRawLines(note.content);
                                const originalLine = rawLines[idx];
                                const urlRegex = /^(https?:\/\/[^\s]+)$/;
                                const markdownUrlRegex = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/;
                                const isUrlOnly = originalLine && (urlRegex.test(originalLine.trim()) || markdownUrlRegex.test(originalLine.trim()));
                                
                                const content = renderLineWithClickableDates(
                                    headingContent,
                                    note,
                                    idx,
                                    isListItem,
                                    searchQuery,
                                    parseNoteContent,
                                    setEditingInlineDate,
                                    handleInlineDateSelect
                                );
                                
                                if (isUrlOnly) {
                                    // For URL-only lines, render without click wrapper
                                    return content;
                                } else {
                                    // For regular text, wrap with click handler
                                    return (
                                        <div 
                                            onClick={() => handleTextClick(idx)}
                                            className="cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded flex-1"
                                        >
                                            {content}
                                        </div>
                                    );
                                }
                            })()}
                            {!focusMode && !isUrlOnly && isFirstLine && !isFirstLineH1 && (
                                <button
                                    onClick={() => handleConvertToH1(note, lineContent)}
                                    className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-400 transition-colors duration-150 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                    title="Convert to H1"
                                >
                                    H1
                                </button>
                            )}
                            {!focusMode && !isUrlOnly && !isFirstLine && (() => {
                                // Check if this line is an H1 by looking at the raw content
                                const rawLines = getRawLines(note.content);
                                const originalLine = rawLines[idx];
                                return originalLine && originalLine.trim().startsWith('###') && originalLine.trim().endsWith('###');
                            })() && (
                                <button
                                    onClick={() => handleMoveH1ToTop(idx)}
                                    className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-400 transition-colors duration-150 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                    title="Move H1 to top"
                                >
                                    ↑
                                </button>
                            )}
                            {!focusMode && !isUrlOnly && !isFirstLine && (() => {
                                // Check if this line is NOT an H1 or H2 by looking at the raw content
                                const rawLines = getRawLines(note.content);
                                const originalLine = rawLines[idx];
                                const isH1 = originalLine && originalLine.trim().startsWith('###') && originalLine.trim().endsWith('###');
                                const isH2 = originalLine && originalLine.trim().startsWith('##') && originalLine.trim().endsWith('##');
                                return !isH1 && !isH2;
                            })() && (
                                <button
                                    onClick={() => handleConvertToH2(note, idx)}
                                    className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-400 transition-colors duration-150 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                    title="Convert to H2"
                                >
                                    H2
                                </button>
                            )}
                        </div>
                        {editingInlineDate?.noteId === note.id && editingInlineDate?.lineIndex === idx && renderDatePicker(idx)}
                    </>
                )}
            </div>
        );
    };

    return (
        <div className={`relative ${
            focusMode 
                ? 'bg-transparent p-2 border-0' 
                : 'bg-gray-50 p-4 rounded-md border text-gray-800 text-sm leading-relaxed'
        }`}>
            <div className="whitespace-pre-wrap break-words break-all space-y-1">
                {contentLines.map((line, idx) => renderLine(line, idx))}
                {/* Drop zone at the bottom for dragging to last position */}
                {!focusMode && (
                    <div
                        draggable={false}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            setDragOverLineIndex(contentLines.length);
                        }}
                        onDragEnter={(e) => {
                            e.preventDefault();
                            setDragOverLineIndex(contentLines.length);
                        }}
                        onDragLeave={(e) => {
                            setDragOverLineIndex(null);
                        }}
                        onDrop={(e) => handleDrop(e, contentLines.length)}
                        className={`h-4 transition-colors duration-150 ${
                            dragOverLineIndex === contentLines.length ? 'bg-blue-100 border-t-2 border-blue-500' : ''
                        }`}
                    />
                )}
                {/* Plus button at the end of the last line */}
                {!compressedView && !focusMode && (
                    <div className="flex items-center justify-between mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setAddingLineNoteId(note.id);
                                    if (newLineInputRef.current) {
                                        newLineInputRef.current.focus();
                                    }
                                }}
                                className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors duration-150"
                                title="Add new line"
                            >
                                <PlusIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            {bulkDeleteMode && (
                                <>
                                    <button
                                        onClick={selectAllRows}
                                        className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-150"
                                        title="Select all rows"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        onClick={deselectAllRows}
                                        className="px-3 py-1 text-xs font-medium bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors duration-150"
                                        title="Deselect all rows"
                                    >
                                        Deselect All
                                    </button>
                                    {selectedRows.size > 0 && (
                                        <button
                                            onClick={handleBulkDelete}
                                            className="px-3 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-150"
                                            title={`Delete ${selectedRows.size} selected row(s)`}
                                        >
                                            Delete ({selectedRows.size})
                                        </button>
                                    )}
                                </>
                            )}
                            <button
                                onClick={toggleBulkDeleteMode}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors duration-150 ${
                                    bulkDeleteMode 
                                        ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                title={bulkDeleteMode ? 'Cancel bulk delete' : 'Bulk delete rows'}
                            >
                                {bulkDeleteMode ? 'Cancel' : 'Bulk Delete'}
                            </button>
                            <button
                                onClick={toggleNoBullets}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors duration-150 ${
                                    hasNoBulletsTag() 
                                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                title={hasNoBulletsTag() ? 'Show bullets' : 'Hide bullets'}
                            >
                                {hasNoBulletsTag() ? 'Show Bullets' : 'Hide Bullets'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <AddTextModal
                isOpen={showAddTextModal}
                onClose={() => setShowAddTextModal(false)}
                onSave={handleSaveText}
                noteId={note.id}
                url={urlForText}
                isEditing={isEditing}
                initialText={currentCustomText}
            />
        </div>
    );
}