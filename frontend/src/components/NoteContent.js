import React, { useState, useEffect, useRef } from 'react';
import InlineEditor from './InlineEditor';
import { PlusIcon } from '@heroicons/react/24/solid';
import {
    parseNoteContent
} from '../utils/TextUtils';
import { renderLineWithClickableDates, getIndentFlags, getRawLines } from '../utils/genUtils';
import AddTextModal from './AddTextModal';
import { reorderMetaTags } from '../utils/MetaTagUtils';
import { checkText } from '../utils/languageTool';
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

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
    bulkDeleteMode = false,
    setBulkDeleteMode = () => {},
    bulkDeleteNoteId = null,
    setBulkDeleteNoteId = () => {},
    multiMoveNoteId = null,
    setFocusedNoteIndex = () => {},
    // Super edit mode props
    isSuperEditMode = false,
    highlightedLineIndex = -1,
    highlightedLineText = '',
    wasOpenedFromSuperEdit = false
}) {
    // Use the bulkDeleteMode prop instead of local state
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [showAddTextModal, setShowAddTextModal] = React.useState(false);
    const [urlForText, setUrlForText] = React.useState('');
    const [isEditing, setIsEditing] = React.useState(false);
    const [currentCustomText, setCurrentCustomText] = React.useState('');
    
    // Drag and drop state
    const [draggedLineIndex, setDraggedLineIndex] = useState(null);
    const [dragOverLineIndex, setDragOverLineIndex] = useState(null);
    
    // Grammar check state
    const [grammarResults, setGrammarResults] = useState(null);
    const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);
    const [showGrammarResults, setShowGrammarResults] = useState(false);
    
    // Multi-move state (use prop instead of local state)
    const multiMoveMode = multiMoveNoteId === note.id;
    const [multiMoveSelectedRows, setMultiMoveSelectedRows] = useState(new Set());
    const [multiMoveError, setMultiMoveError] = useState('');
    const [isDraggingMultiMove, setIsDraggingMultiMove] = useState(false);

    // Code block state
    const [codeBlockMode, setCodeBlockMode] = useState(false);
    const [codeBlockSelectedRows, setCodeBlockSelectedRows] = useState(new Set());
    const [codeBlockError, setCodeBlockError] = useState('');

    // Clear selected rows when bulk delete mode is disabled or when this note is not the target
    useEffect(() => {
        if (!bulkDeleteMode || bulkDeleteNoteId !== note.id) {
            setSelectedRows(new Set());
        }
    }, [bulkDeleteMode, bulkDeleteNoteId, note.id]);

    // Clear multi-move selection when multi-move mode is disabled or when this note is not the target
    useEffect(() => {
        if (!multiMoveMode) {
            setMultiMoveSelectedRows(new Set());
            setMultiMoveError('');
        }
    }, [multiMoveMode]);

    // Clear code block selection when code block mode is disabled
    useEffect(() => {
        if (!codeBlockMode) {
            setCodeBlockSelectedRows(new Set());
            setCodeBlockError('');
        }
    }, [codeBlockMode]);

    // Focus the new line input when adding line mode is activated
    useEffect(() => {
        if (addingLineNoteId === note.id && newLineInputRef.current) {
            // Small delay to ensure the InlineEditor is rendered
            setTimeout(() => {
                const textarea = newLineInputRef.current?.querySelector('textarea');
                if (textarea) {
                    textarea.focus();
                }
            }, 100);
        }
    }, [addingLineNoteId, note.id]);

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

    const handleSaveText = async (noteId, url, customText, updatedContent = null) => {
        try {
            let finalContent;
            
            if (updatedContent !== null) {
                // Use the provided updated content (when text was selected from note)
                // But still need to replace the URL with markdown format
                const lines = updatedContent.split('\n');
                
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
                finalContent = updatedLines.join('\n');
            } else {
                // Use the original logic for URL replacement
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
                finalContent = updatedLines.join('\n');
            }
            
            const reorderedContent = reorderMetaTags(finalContent);
            
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

    const isCodeBlockLine = (lineIndex) => {
        const lines = note.content.split('\n');
        const codeBlockMetaLines = lines.filter(line => line.trim().startsWith('meta::code_block::'));
        
        for (const metaLine of codeBlockMetaLines) {
            const match = metaLine.match(/meta::code_block::(\d+)_(\d+)/);
            if (match) {
                const startLine = parseInt(match[1]);
                const endLine = parseInt(match[2]);
                const currentLine = lineIndex + 1; // Convert to 1-based
                
                if (currentLine >= startLine && currentLine <= endLine) {
                    return true;
                }
            }
        }
        return false;
    };

    const isCodeBlockStart = (lineIndex) => {
        if (!isCodeBlockLine(lineIndex)) return false;
        
        // Check if this is the first line of a code block
        const lines = note.content.split('\n');
        const codeBlockMetaLines = lines.filter(line => line.trim().startsWith('meta::code_block::'));
        
        for (const metaLine of codeBlockMetaLines) {
            const match = metaLine.match(/meta::code_block::(\d+)_(\d+)/);
            if (match) {
                const startLine = parseInt(match[1]);
                const currentLine = lineIndex + 1; // Convert to 1-based
                
                if (currentLine === startLine) {
                    return true;
                }
            }
        }
        return false;
    };

    const isCodeBlockEnd = (lineIndex) => {
        if (!isCodeBlockLine(lineIndex)) return false;
        
        // Check if this is the last line of a code block
        const lines = note.content.split('\n');
        const codeBlockMetaLines = lines.filter(line => line.trim().startsWith('meta::code_block::'));
        
        for (const metaLine of codeBlockMetaLines) {
            const match = metaLine.match(/meta::code_block::(\d+)_(\d+)/);
            if (match) {
                const endLine = parseInt(match[2]);
                const currentLine = lineIndex + 1; // Convert to 1-based
                
                if (currentLine === endLine) {
                    return true;
                }
            }
        }
        return false;
    };

    const getCodeBlockContainerStyle = (lineIndex) => {
        if (!isCodeBlockLine(lineIndex)) return {};
        
        const isStart = isCodeBlockStart(lineIndex);
        const isEnd = isCodeBlockEnd(lineIndex);
        
        let style = {
            backgroundColor: '#e5e7eb', // Darker grey background
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            lineHeight: '1.25rem',
            marginLeft: '2rem', // Shift to the right (tab indentation)
            marginTop: '0', // Remove top margin
            marginBottom: '0', // Remove bottom margin
            paddingTop: '0', // Remove top padding
            paddingBottom: '0' // Remove bottom padding
        };
        
        if (isStart) {
            style.borderTop = '1px solid #d1d5db';
            style.borderLeft = '1px solid #d1d5db';
            style.borderRight = '1px solid #d1d5db';
            style.borderTopLeftRadius = '6px';
            style.borderTopRightRadius = '6px';
            style.paddingTop = '8px';
            style.paddingLeft = '8px';
            style.paddingRight = '8px';
            style.marginTop = '4px';
        }
        
        if (isEnd) {
            style.borderBottom = '1px solid #d1d5db';
            style.borderLeft = '1px solid #d1d5db';
            style.borderRight = '1px solid #d1d5db';
            style.borderBottomLeftRadius = '6px';
            style.borderBottomRightRadius = '6px';
            style.paddingBottom = '8px';
            style.paddingLeft = '8px';
            style.paddingRight = '8px';
            style.marginBottom = '4px';
        }
        
        if (!isStart && !isEnd) {
            style.borderLeft = '1px solid #d1d5db';
            style.borderRight = '1px solid #d1d5db';
            style.paddingLeft = '8px';
            style.paddingRight = '8px';
        }
        
        return style;
    };

    const getCodeBlockGroupInfo = (lineIndex) => {
        if (!isCodeBlockLine(lineIndex)) return null;
        
        const lines = note.content.split('\n');
        const codeBlockMetaLines = lines.filter(line => line.trim().startsWith('meta::code_block::'));
        
        for (const metaLine of codeBlockMetaLines) {
            const match = metaLine.match(/meta::code_block::(\d+)_(\d+)/);
            if (match) {
                const startLine = parseInt(match[1]);
                const endLine = parseInt(match[2]);
                const currentLine = lineIndex + 1; // Convert to 1-based
                
                if (currentLine >= startLine && currentLine <= endLine) {
                    return {
                        startLine: startLine - 1, // Convert back to 0-based
                        endLine: endLine - 1, // Convert back to 0-based
                        isStart: currentLine === startLine,
                        isEnd: currentLine === endLine
                    };
                }
            }
        }
        return null;
    };

    const getCodeBlockContent = (lineIndex) => {
        const groupInfo = getCodeBlockGroupInfo(lineIndex);
        if (!groupInfo) return null;
        
        const lines = note.content.split('\n');
        const codeBlockLines = [];
        
        for (let i = groupInfo.startLine; i <= groupInfo.endLine; i++) {
            const line = lines[i];
            // Skip meta tags and empty lines
            if (line && !line.trim().startsWith('meta::') && line.trim() !== '') {
                codeBlockLines.push(line);
            }
        }
        
        return codeBlockLines.join('\n');
    };

    const copyCodeBlock = async (lineIndex) => {
        const codeBlockContent = getCodeBlockContent(lineIndex);
        if (codeBlockContent) {
            try {
                await navigator.clipboard.writeText(codeBlockContent);
                toast.success('Code block copied to clipboard!');
            } catch (error) {
                console.error('Error copying code block:', error);
                toast.error('Failed to copy code block');
            }
        }
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
        // Work directly with the current note
        if (bulkDeleteMode && bulkDeleteNoteId === note.id) {
            // Exit bulk delete mode for this note
            setBulkDeleteMode(false);
            setBulkDeleteNoteId(null);
        } else {
            // Enter bulk delete mode for this note
            setBulkDeleteMode(true);
            setBulkDeleteNoteId(note.id);
        }
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

    // Multi-move functions
    const toggleMultiMoveMode = () => {
        // This function is now handled by the parent component via keyboard events
        // The multi-move mode is controlled by the multiMoveNoteId prop
        setMultiMoveSelectedRows(new Set());
        setMultiMoveError('');
    };

    // Code block functions
    const toggleCodeBlockMode = () => {
        setCodeBlockMode(!codeBlockMode);
        setCodeBlockSelectedRows(new Set());
        setCodeBlockError('');
    };

    const toggleCodeBlockRowSelection = (idx) => {
        const newSelectedRows = new Set(codeBlockSelectedRows);
        
        if (newSelectedRows.has(idx)) {
            newSelectedRows.delete(idx);
        } else {
            newSelectedRows.add(idx);
        }
        
        setCodeBlockSelectedRows(newSelectedRows);
        validateCodeBlockSelection(newSelectedRows);
    };

    const validateCodeBlockSelection = (selectedRows) => {
        if (selectedRows.size === 0) {
            setCodeBlockError('');
            return;
        }

        const sortedIndices = Array.from(selectedRows).sort((a, b) => a - b);
        
        // Check if this is a valid selection with multiple consecutive groups
        const groups = [];
        let currentGroup = [sortedIndices[0]];
        
        for (let i = 1; i < sortedIndices.length; i++) {
            if (sortedIndices[i] === sortedIndices[i - 1] + 1) {
                // Consecutive line, add to current group
                currentGroup.push(sortedIndices[i]);
            } else {
                // Non-consecutive line, save current group and start new one
                groups.push(currentGroup);
                currentGroup = [sortedIndices[i]];
            }
        }
        groups.push(currentGroup); // Add the last group
        
        // All groups must have at least one line
        const isValid = groups.every(group => group.length > 0);
        
        if (!isValid) {
            setCodeBlockError('Invalid selection');
        } else if (groups.length > 1) {
            setCodeBlockError(`Will create ${groups.length} separate code blocks`);
        } else {
            setCodeBlockError('');
        }
    };

    const handleCodeBlockSave = () => {
        if (codeBlockSelectedRows.size === 0) {
            toast.error('Please select at least one line for code block');
            return;
        }

        if (codeBlockError && !codeBlockError.includes('Will create')) {
            toast.error('Please fix the selection error before saving');
            return;
        }

        const sortedIndices = Array.from(codeBlockSelectedRows).sort((a, b) => a - b);
        const lines = note.content.split('\n');
        
        // Find continuous sections
        const sections = [];
        let currentSection = [sortedIndices[0]];
        
        for (let i = 1; i < sortedIndices.length; i++) {
            if (sortedIndices[i] === sortedIndices[i - 1] + 1) {
                // Consecutive line, add to current section
                currentSection.push(sortedIndices[i]);
            } else {
                // Non-consecutive line, save current section and start new one
                sections.push(currentSection);
                currentSection = [sortedIndices[i]];
            }
        }
        sections.push(currentSection); // Add the last section
        
        // Create meta tags for each section
        const existingLines = lines.filter(line => !line.trim().startsWith('meta::code_block::'));
        const newMetaTags = sections.map(section => {
            const startLine = Math.min(...section) + 1; // Convert to 1-based
            const endLine = Math.max(...section) + 1; // Convert to 1-based
            return `meta::code_block::${startLine}_${endLine}`;
        });
        
        const updatedContent = [...existingLines, ...newMetaTags].join('\n');
        const reorderedContent = reorderMetaTags(updatedContent);
        
        updateNote(note.id, reorderedContent);
        setCodeBlockMode(false);
        setCodeBlockSelectedRows(new Set());
        setCodeBlockError('');
        
        if (sections.length > 1) {
            toast.success(`${sections.length} code block sections saved`);
        } else {
            toast.success('Code block section saved');
        }
    };

    const removeCodeBlockTags = () => {
        const lines = note.content.split('\n');
        const contentWithoutCodeBlockTags = lines.filter(line => !line.trim().startsWith('meta::code_block::'));
        const updatedContent = contentWithoutCodeBlockTags.join('\n');
        const reorderedContent = reorderMetaTags(updatedContent);
        
        updateNote(note.id, reorderedContent);
        toast.success('Code block tags removed');
    };

    const toggleMultiMoveRowSelection = (idx) => {
        const newSelectedRows = new Set(multiMoveSelectedRows);
        
        // Check if this line is an H2 heading
        const rawLines = getRawLines(note.content);
        const currentLine = rawLines[idx];
        const isH2 = currentLine && currentLine.trim().startsWith('##') && currentLine.trim().endsWith('##');
        
        if (newSelectedRows.has(idx)) {
            // If deselecting an H2, remove all lines under it
            if (isH2) {
                // Find all lines under this H2 until next H1 or H2
                const linesToRemove = new Set();
                linesToRemove.add(idx);
                
                for (let i = idx + 1; i < rawLines.length; i++) {
                    const line = rawLines[i];
                    const isNextH1 = line && line.trim().startsWith('###') && line.trim().endsWith('###');
                    const isNextH2 = line && line.trim().startsWith('##') && line.trim().endsWith('##');
                    
                    if (isNextH1 || isNextH2) {
                        break; // Stop at next heading
                    }
                    linesToRemove.add(i);
                }
                
                // Remove all selected lines under this H2
                linesToRemove.forEach(lineIdx => newSelectedRows.delete(lineIdx));
            } else {
                // Regular line deselection
                newSelectedRows.delete(idx);
            }
        } else {
            // If selecting an H2, add all lines under it
            if (isH2) {
                // Add the H2 line itself
                newSelectedRows.add(idx);
                
                // Add all lines under this H2 until next H1 or H2
                for (let i = idx + 1; i < rawLines.length; i++) {
                    const line = rawLines[i];
                    const isNextH1 = line && line.trim().startsWith('###') && line.trim().endsWith('###');
                    const isNextH2 = line && line.trim().startsWith('##') && line.trim().endsWith('##');
                    
                    if (isNextH1 || isNextH2) {
                        break; // Stop at next heading
                    }
                    newSelectedRows.add(i);
                }
            } else {
                // Regular line selection
                newSelectedRows.add(idx);
            }
        }
        
        setMultiMoveSelectedRows(newSelectedRows);
        validateMultiMoveSelection(newSelectedRows);
    };

    const validateMultiMoveSelection = (selectedRows) => {
        if (selectedRows.size === 0) {
            setMultiMoveError('');
            return;
        }

        const sortedIndices = Array.from(selectedRows).sort((a, b) => a - b);
        
        // Check if this is a valid H2 section selection
        const rawLines = getRawLines(note.content);
        let isValidH2Section = true;
        let currentSectionStart = -1;
        
        for (let i = 0; i < sortedIndices.length; i++) {
            const idx = sortedIndices[i];
            const line = rawLines[idx];
            const isH2 = line && line.trim().startsWith('##') && line.trim().endsWith('##');
            
            if (isH2) {
                // If we find an H2, check if all lines from this H2 to the next are selected
                if (currentSectionStart !== -1) {
                    // Check if the previous section was complete
                    for (let j = currentSectionStart; j < idx; j++) {
                        if (!selectedRows.has(j)) {
                            isValidH2Section = false;
                            break;
                        }
                    }
                }
                currentSectionStart = idx;
            }
        }
        
        // Check the last section
        if (currentSectionStart !== -1) {
            for (let j = currentSectionStart; j < rawLines.length; j++) {
                const line = rawLines[j];
                const isNextH1 = line && line.trim().startsWith('###') && line.trim().endsWith('###');
                const isNextH2 = line && line.trim().startsWith('##') && line.trim().endsWith('##');
                
                if (isNextH1 || isNextH2) {
                    break;
                }
                
                if (!selectedRows.has(j)) {
                    isValidH2Section = false;
                    break;
                }
            }
        }
        
        // Check for regular consecutive lines (no H2 sections)
        const isConsecutive = sortedIndices.every((index, i) => {
            if (i === 0) return true;
            return index === sortedIndices[i - 1] + 1;
        });
        
        // Check if there are any H2 lines in the selection
        const hasH2Lines = sortedIndices.some(idx => {
            const line = rawLines[idx];
            return line && line.trim().startsWith('##') && line.trim().endsWith('##');
        });
        
        if (hasH2Lines && !isValidH2Section) {
            setMultiMoveError('Please select complete H2 sections');
        } else if (!hasH2Lines && !isConsecutive) {
            setMultiMoveError('Please select consecutive lines only');
        } else {
            setMultiMoveError('');
        }
    };

    const handleMultiMoveDragStart = (e) => {
        if (multiMoveSelectedRows.size === 0 || multiMoveError) {
            return;
        }
        
        const sortedIndices = Array.from(multiMoveSelectedRows).sort((a, b) => a - b);
        
        // Get the raw text content from the original note content
        const rawLines = getRawLines(note.content);
        const sectionLines = sortedIndices.map(idx => rawLines[idx]);
        
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify({
            type: 'multi-move',
            indices: sortedIndices,
            lines: sectionLines
        }));
        
        setIsDraggingMultiMove(true);
    };

    const handleMultiMoveDragEnd = () => {
        setIsDraggingMultiMove(false);
    };

    const handleMultiMoveDrop = (e, targetLineIndex) => {
        if (!isDraggingMultiMove) return;
        
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (data.type !== 'multi-move') return;

            const lines = note.content.split('\n');
            const { indices } = data;
            
            // Remove the selected lines (in reverse order to maintain indices)
            const linesToMove = [];
            indices.reverse().forEach(idx => {
                linesToMove.unshift(lines[idx]);
                lines.splice(idx, 1);
            });

            // Insert the lines at the target position
            lines.splice(targetLineIndex, 0, ...linesToMove);
            
            const updatedContent = lines.join('\n');
            const reorderedContent = reorderMetaTags(updatedContent);
            updateNote(note.id, reorderedContent);
            
            // Reset multi-move selection
            setMultiMoveSelectedRows(new Set());
            setMultiMoveError('');
        } catch (error) {
            console.error('Error in multi-move drop:', error);
        }
    };

    // Grammar check functionality
    const handleGrammarCheck = async () => {
        if (!note.content.trim()) {
            setGrammarResults(null);
            return;
        }

        try {
            setIsCheckingGrammar(true);
            const result = await checkText(note.content);
            setGrammarResults(result);
            setShowGrammarResults(true);
        } catch (error) {
            console.error('Error checking grammar:', error);
        } finally {
            setIsCheckingGrammar(false);
        }
    };

    const handleSuggestionClick = (issue, replacement) => {
        const start = issue.offset;
        const end = start + issue.length;
        const newContent = note.content.substring(0, start) + replacement + note.content.substring(end);
        updateNote(note.id, newContent);
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
        
        try {
            const data = e.dataTransfer.getData('text/plain');
            
            // Check if this is a multi-move operation
            if (data.startsWith('{')) {
                const parsedData = JSON.parse(data);
                if (parsedData.type === 'multi-move') {
                    handleMultiMoveDrop(e, targetLineIndex);
                    return;
                }
            }
            
            // Regular single line drag and drop
            const sourceLineIndex = parseInt(data);
            
            if (sourceLineIndex === targetLineIndex) {
                setDraggedLineIndex(null);
                setDragOverLineIndex(null);
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
        } catch (error) {
            console.error('Error in handleDrop:', error);
        }
    };

    const handleDragEnd = () => {
        setDraggedLineIndex(null);
        setDragOverLineIndex(null);
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
                    draggable={!focusMode && !multiMoveMode}
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
                    style={getCodeBlockContainerStyle(idx)}
                >
                    {bulkDeleteMode && bulkDeleteNoteId === note.id && (
                        <input
                            type="checkbox"
                            checked={selectedRows.has(idx)}
                            onChange={() => toggleRowSelection(idx)}
                            className="mr-2"
                        />
                    )}
                    {multiMoveMode && (
                        <input
                            type="checkbox"
                            checked={multiMoveSelectedRows.has(idx)}
                            onChange={() => toggleMultiMoveRowSelection(idx)}
                            className="mr-2"
                        />
                    )}
                    {codeBlockMode && (
                        <input
                            type="checkbox"
                            checked={codeBlockSelectedRows.has(idx)}
                            onChange={() => toggleCodeBlockRowSelection(idx)}
                            className="mr-2"
                        />
                    )}
                    {shouldIndent && !isH1 && !isH2 && !hasNoBulletsTag() && !isCodeBlockLine(idx) && (
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
                    draggable={!focusMode && !multiMoveMode}
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
                draggable={!focusMode && !multiMoveMode}
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
                style={getCodeBlockContainerStyle(idx)}
            >
                {bulkDeleteMode && bulkDeleteNoteId === note.id && (
                    <input
                        type="checkbox"
                        checked={selectedRows.has(idx)}
                        onChange={() => toggleRowSelection(idx)}
                        className="mr-2"
                    />
                )}
                {multiMoveMode && (
                    <input
                        type="checkbox"
                        checked={multiMoveSelectedRows.has(idx)}
                        onChange={() => toggleMultiMoveRowSelection(idx)}
                        className="mr-2"
                    />
                )}
                {codeBlockMode && (
                    <input
                        type="checkbox"
                        checked={codeBlockSelectedRows.has(idx)}
                        onChange={() => toggleCodeBlockRowSelection(idx)}
                        className="mr-2"
                    />
                )}
                {editingLine?.noteId === note.id && editingLine?.lineIndex === idx ? (
                    renderInlineEditor(idx, isH1, isH2)
                ) : (
                    <>
                        {(indentFlags[idx] || isListItem) && !isH1 && !isH2 && !hasNoBulletsTag() && !isCodeBlockLine(idx) && (
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
                        {isCodeBlockStart(idx) && (
                            <button
                                onClick={() => copyCodeBlock(idx)}
                                className="ml-2 p-2 text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors duration-150"
                                title="Copy entire code block"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span className="ml-1 text-xs">COPY</span>
                            </button>
                        )}
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
                            {bulkDeleteMode && bulkDeleteNoteId === note.id && (
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
                                    bulkDeleteMode && bulkDeleteNoteId === note.id
                                        ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                title={bulkDeleteMode && bulkDeleteNoteId === note.id ? 'Cancel bulk delete' : 'Bulk delete rows'}
                            >
                                {bulkDeleteMode && bulkDeleteNoteId === note.id ? 'Cancel' : 'Bulk Delete'}
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
                            <button
                                onClick={handleGrammarCheck}
                                disabled={isCheckingGrammar || !note.content.trim()}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors duration-150 ${
                                    isCheckingGrammar || !note.content.trim()
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                title="Check grammar and spelling"
                            >
                                {isCheckingGrammar ? 'Checking...' : 'Grammar Check'}
                            </button>
                            <button
                                onClick={toggleMultiMoveMode}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors duration-150 ${
                                    multiMoveMode 
                                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                title={multiMoveMode ? 'Cancel multi-move' : 'Multi-move lines'}
                            >
                                {multiMoveMode ? 'Cancel' : 'Multi Move'}
                            </button>
                            <button
                                onClick={toggleCodeBlockMode}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors duration-150 ${
                                    codeBlockMode 
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                title={codeBlockMode ? 'Cancel code block' : 'Code block lines'}
                            >
                                {codeBlockMode ? 'Cancel' : 'Code Block'}
                            </button>
                            {note.content.includes('meta::code_block::') && (
                                <button
                                    onClick={removeCodeBlockTags}
                                    className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors duration-150"
                                    title="Remove all code block tags"
                                >
                                    Remove Code Blocks
                                </button>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Multi-move error message */}
                {multiMoveMode && multiMoveError && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                        {multiMoveError}
                    </div>
                )}
                
                {/* Code block error message */}
                {codeBlockMode && codeBlockError && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                        {codeBlockError}
                    </div>
                )}
                
                {/* Multi-move drag handle */}
                {multiMoveMode && multiMoveSelectedRows.size > 0 && !multiMoveError && (
                    <div className="mt-2 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-blue-700">
                                    {multiMoveSelectedRows.size} line(s) selected
                                </span>
                                <span className="text-xs text-blue-500">
                                    {(() => {
                                        const rawLines = getRawLines(note.content);
                                        const hasH2Lines = Array.from(multiMoveSelectedRows).some(idx => {
                                            const line = rawLines[idx];
                                            return line && line.trim().startsWith('##') && line.trim().endsWith('##');
                                        });
                                        return hasH2Lines ? '(H2 sections)' : '(consecutive lines)';
                                    })()}
                                </span>
                            </div>
                            <button
                                draggable={true}
                                onDragStart={handleMultiMoveDragStart}
                                onDragEnd={handleMultiMoveDragEnd}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg cursor-move hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 border-2 border-dashed border-blue-300 shadow-md hover:shadow-lg"
                                title="Click and drag this button to move the selected lines"
                            >
                                🖱️ Drag to Move
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Code block save button */}
                {codeBlockMode && codeBlockSelectedRows.size > 0 && (!codeBlockError || codeBlockError.includes('Will create')) && (
                    <div className="mt-2 p-3 bg-green-50 border-2 border-green-200 rounded-lg shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-green-700">
                                    {codeBlockSelectedRows.size} line(s) selected for code block
                                </span>
                                {codeBlockError && codeBlockError.includes('Will create') && (
                                    <span className="text-xs text-blue-600">
                                        {codeBlockError}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={handleCodeBlockSave}
                                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 active:bg-green-800 transition-all duration-150 shadow-md hover:shadow-lg"
                                title="Save the selected lines as code block sections"
                            >
                                💾 Save Code Block
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Grammar Check Results */}
                {showGrammarResults && grammarResults && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-gray-700">Grammar Check Results</h4>
                            <button
                                onClick={() => setShowGrammarResults(false)}
                                className="text-xs text-gray-500 hover:text-gray-700"
                            >
                                Hide
                            </button>
                        </div>
                        
                        {grammarResults.matches && grammarResults.matches.length > 0 ? (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <ExclamationCircleIcon className="h-4 w-4 text-yellow-500" />
                                    <span>
                                        {grammarResults.matches.length} issue{grammarResults.matches.length !== 1 ? 's' : ''} found
                                    </span>
                                </div>
                                
                                <div className="max-h-40 overflow-y-auto space-y-2">
                                    {grammarResults.matches.map((match, index) => {
                                        const textBeforeOffset = note.content.substring(0, match.offset);
                                        const lineNumber = (textBeforeOffset.match(/\n/g) || []).length + 1;
                                        const charPosition = match.offset - textBeforeOffset.lastIndexOf('\n') - 1;
                                        
                                        return (
                                            <div key={index} className="p-2 bg-white rounded border border-gray-200">
                                                <div className="text-xs text-gray-500 mb-1">
                                                    Line {lineNumber}, Char {charPosition}
                                                </div>
                                                <div className="text-sm text-gray-700 mb-2">
                                                    {match.message}
                                                </div>
                                                {match.replacements && match.replacements.length > 0 && (
                                                    <div className="space-y-1">
                                                        <div className="text-xs text-gray-500">Suggestions:</div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {match.replacements.slice(0, 3).map((replacement, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => handleSuggestionClick(match, replacement.value)}
                                                                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors duration-150"
                                                                >
                                                                    {replacement.value}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                                <CheckCircleIcon className="h-4 w-4" />
                                <span>No grammar issues found</span>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Add New Line Inline Editor */}
                {addingLineNoteId === note.id && (
                    <div className="mt-2" ref={newLineInputRef}>
                        <InlineEditor
                            text={newLineText}
                            setText={setNewLineText}
                            onSave={(newText) => {
                                if (newText.trim()) {
                                    const lines = note.content.split('\n');
                                    lines.push(newText.trim());
                                    updateNote(note.id, lines.join('\n'));
                                }
                                setAddingLineNoteId(null);
                                setNewLineText('');
                            }}
                            onCancel={() => {
                                setAddingLineNoteId(null);
                                setNewLineText('');
                            }}
                            onDelete={() => {
                                setAddingLineNoteId(null);
                                setNewLineText('');
                            }}
                            isSuperEditMode={false}
                            wasOpenedFromSuperEdit={false}
                            lineIndex={-1}
                        />
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
                noteContent={note.content}
            />
        </div>
    );
}