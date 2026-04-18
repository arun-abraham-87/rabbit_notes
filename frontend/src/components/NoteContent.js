import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import InlineEditor from './InlineEditor';
import NoteImages from './NoteImages';
import { PlusIcon } from '@heroicons/react/24/solid';
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import {
    parseNoteContent
} from '../utils/TextUtils';
import { renderLineWithClickableDates, getIndentFlags, getRawLines } from '../utils/genUtils';
import { extractImageIds } from '../utils/NotesUtils';
import AddTextModal from './AddTextModal';
import { reorderMetaTags } from '../utils/MetaTagUtils';
import { checkText } from '../utils/languageTool';
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { saveNoteToHistory } from '../utils/NoteHistoryUtils';
import UndoToast from './UndoToast';

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
    allNotes = [],
    setBulkDeleteMode = () => {},
    bulkDeleteNoteId = null,
    setBulkDeleteNoteId = () => {},
    multiMoveNoteId = null,
    setFocusedNoteIndex = () => {},
    addNote = null, // Add addNote prop
    // Super edit mode props
    isSuperEditMode = false,
    highlightedLineIndex = -1,
    highlightedLineText = '',
    wasOpenedFromSuperEdit = false,
    setShowCopyToast = null
}) {
    const navigate = useNavigate();
    
    // Navigation handler for note links
    const handleNoteNavigation = (url) => {
        if (url.startsWith('#/notes?note=')) {
            // Extract the note ID from the URL
            const noteId = url.split('note=')[1];
            navigate(`/notes?note=${noteId}`);
        }
    };
    
    // Use the bulkDeleteMode prop instead of local state
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [showAddTextModal, setShowAddTextModal] = React.useState(false);
    const [urlForText, setUrlForText] = React.useState('');
    const [isEditing, setIsEditing] = React.useState(false);
    const [currentCustomText, setCurrentCustomText] = React.useState('');
    
    // Drag and drop state
    const [draggedLineIndex, setDraggedLineIndex] = useState(null);
    const [dragOverLineIndex, setDragOverLineIndex] = useState(null);
    const [subLineDropTarget, setSubLineDropTarget] = useState(null); // idx when holding drag on line
    const subLineDropTargetRef = useRef(null); // ref mirror for reliable access in drop handler
    const subLineHoldTimerRef = useRef(null); // timer for hold-to-sub-line detection
    const dragHoverLineRef = useRef(null); // which line cursor is currently over during drag
    
    // Grammar check state
    const [grammarResults, setGrammarResults] = useState(null);
    const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);
    const [showGrammarResults, setShowGrammarResults] = useState(false);
    
    // Multi-move state (use prop instead of local state)
    const multiMoveMode = multiMoveNoteId === note.id;
    const [multiMoveSelectedRows, setMultiMoveSelectedRows] = useState(new Set());
    const [multiMoveError, setMultiMoveError] = useState('');
    const [isDraggingMultiMove, setIsDraggingMultiMove] = useState(false);
    const [showMoveToNotePopup, setShowMoveToNotePopup] = useState(false);
    const [moveToNoteSearch, setMoveToNoteSearch] = useState('');
    const [moveToNoteTarget, setMoveToNoteTarget] = useState(null); // selected target note
    const [showMoveToNoteConfirm, setShowMoveToNoteConfirm] = useState(false);
    const [showMoveToSectionPopup, setShowMoveToSectionPopup] = useState(false);

    // Section collapse state: Set of raw line indices that are collapsed
    const [collapsedSections, setCollapsedSections] = useState(new Set());
    const [hoveredSection, setHoveredSection] = useState(null);
    const [showSectionQuickAccess, setShowSectionQuickAccess] = useState(false);
    const [highlightedQuickAccessSection, setHighlightedQuickAccessSection] = useState(null);
    const [sectionActionPopup, setSectionActionPopup] = useState(null);
    const [sectionAppendText, setSectionAppendText] = useState('');
    const hoverTimeoutRef = useRef(null);
    const contextMenuPinnedSectionRef = useRef(null);
    const quickAccessHighlightTimeoutRef = useRef(null);

    const QUICK_ACCESS_META_PREFIX = 'meta::quick_access::';
    const H2_COLLAPSED_META_PREFIX = 'meta::h2_collapsed_sections::';
    const H2_INDENT_META_PREFIX = 'meta::h2_indent::';
    const H2_SECTION_SPACING_META_PREFIX = 'meta::h2_section_spacing::';

    const getPersistedQuickAccess = (content = '') => {
        const metaLine = content
            .split('\n')
            .map(line => line.trim())
            .find(line => line.startsWith(QUICK_ACCESS_META_PREFIX));
        return metaLine ? metaLine.slice(QUICK_ACCESS_META_PREFIX.length) === 'open' : false;
    };

    const getPersistedCollapsedSectionLabels = (content = '') => {
        const metaLine = content
            .split('\n')
            .map(line => line.trim())
            .find(line => line.startsWith(H2_COLLAPSED_META_PREFIX));
        if (!metaLine) return [];

        try {
            const encodedValue = metaLine.slice(H2_COLLAPSED_META_PREFIX.length);
            const parsed = JSON.parse(decodeURIComponent(encodedValue));
            return Array.isArray(parsed) ? parsed.filter(label => typeof label === 'string') : [];
        } catch (error) {
            console.error('Error parsing persisted H2 collapsed state:', error);
            return [];
        }
    };

    const getPersistedH2IndentState = (content = '') => {
        const metaLine = content
            .split('\n')
            .map(line => line.trim())
            .find(line => line.startsWith(H2_INDENT_META_PREFIX));
        if (!metaLine) return null;
        return metaLine.slice(H2_INDENT_META_PREFIX.length) === 'on';
    };

    const getPersistedH2SectionSpacingState = (content = '') => {
        const metaLine = content
            .split('\n')
            .map(line => line.trim())
            .find(line => line.startsWith(H2_SECTION_SPACING_META_PREFIX));
        if (!metaLine) return null;
        return metaLine.slice(H2_SECTION_SPACING_META_PREFIX.length) === 'on';
    };

    const withPersistedH2IndentState = (content, indentEnabled) => {
        const cleanedLines = content
            .split('\n')
            .filter(line => !line.trim().startsWith(H2_INDENT_META_PREFIX));

        return reorderMetaTags([
            ...cleanedLines,
            `${H2_INDENT_META_PREFIX}${indentEnabled ? 'on' : 'off'}`
        ].join('\n'));
    };

    const withPersistedH2SectionSpacingState = (content, spacingEnabled) => {
        const cleanedLines = content
            .split('\n')
            .filter(line => !line.trim().startsWith(H2_SECTION_SPACING_META_PREFIX));

        return [
            ...cleanedLines,
            `${H2_SECTION_SPACING_META_PREFIX}${spacingEnabled ? 'on' : 'off'}`
        ].join('\n');
    };

    const getVisibleH2Sections = (content = '') => content
        .split('\n')
        .map((line, actualIndex) => ({ line, actualIndex }))
        .filter(({ line }) => !line.trim().startsWith('meta::'))
        .map(({ line, actualIndex }, visibleIndex) => ({ line, actualIndex, visibleIndex }))
        .filter(({ line }) => line && line.trim().startsWith('{#h2#}'))
        .map(({ line, actualIndex, visibleIndex }) => ({
            actualIndex,
            visibleIndex,
            label: line.trim().slice(6).trim() || 'Untitled section'
        }));

    const withPersistedSectionState = (content, quickAccessOpen, collapsedLabels) => {
        const cleanedLines = content
            .split('\n')
            .filter(line => {
                const trimmedLine = line.trim();
                return !trimmedLine.startsWith(QUICK_ACCESS_META_PREFIX) &&
                    !trimmedLine.startsWith(H2_COLLAPSED_META_PREFIX);
            });

        const nextLines = [
            ...cleanedLines,
            `${QUICK_ACCESS_META_PREFIX}${quickAccessOpen ? 'open' : 'closed'}`,
            `${H2_COLLAPSED_META_PREFIX}${encodeURIComponent(JSON.stringify(collapsedLabels))}`
        ];

        return reorderMetaTags(nextLines.join('\n'));
    };

    const persistSectionState = async (quickAccessOpen, collapsedLabels) => {
        if (!note || !updateNote) return;
        const nextContent = withPersistedSectionState(note.content, quickAccessOpen, collapsedLabels);
        if (nextContent === note.content) return;
        await updateNote(note.id, nextContent);
    };

    const toggleSection = (lineIdx) => {
        const sectionLabel = getVisibleH2Sections(note?.content || '')
            .find(section => section.actualIndex === lineIdx)?.label;
        const quickAccessOpen = showSectionQuickAccess;

        setCollapsedSections(prev => {
            const next = new Set(prev);
            if (next.has(lineIdx)) next.delete(lineIdx);
            else next.add(lineIdx);

            if (sectionLabel) {
                const persistedCollapsedLabels = new Set(getPersistedCollapsedSectionLabels(note?.content || ''));
                if (next.has(lineIdx)) persistedCollapsedLabels.add(sectionLabel);
                else persistedCollapsedLabels.delete(sectionLabel);
                void persistSectionState(quickAccessOpen, Array.from(persistedCollapsedLabels));
            }

            return next;
        });
    };

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
            setShowMoveToSectionPopup(false);
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

    useEffect(() => {
        if (rightClickNoteId === note.id) return;
        contextMenuPinnedSectionRef.current = null;
        setHoveredSection(null);
    }, [rightClickNoteId, note.id]);

    useEffect(() => {
        return () => {
            if (quickAccessHighlightTimeoutRef.current) {
                clearTimeout(quickAccessHighlightTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const content = note?.content || '';
        const quickAccessOpen = getPersistedQuickAccess(content);
        const collapsedLabels = new Set(getPersistedCollapsedSectionLabels(content));
        const nextCollapsedSections = new Set(
            getVisibleH2Sections(content)
                .filter(section => collapsedLabels.has(section.label))
                .map(section => section.actualIndex)
        );

        setShowSectionQuickAccess(quickAccessOpen);
        setCollapsedSections(nextCollapsedSections);
    }, [note?.id, note?.content]);

    useEffect(() => {
        const handleStartMultiMoveToSection = (e) => {
            if (!note || e?.detail?.noteId !== note.id) return;

            const rawLinesForSelection = getRawLines(note.content);
            const startingIndex = e?.detail?.lineIndex;
            if (startingIndex == null) return;

            const newSelectedRows = new Set();
            const currentLine = rawLinesForSelection[startingIndex];
            const isH2 = currentLine && currentLine.trim().startsWith('{#h2#}');

            newSelectedRows.add(startingIndex);

            if (isH2) {
                for (let i = startingIndex + 1; i < rawLinesForSelection.length; i++) {
                    const line = rawLinesForSelection[i];
                    const isNextH1 = line && line.trim().startsWith('{#h1#}');
                    const isNextH2 = line && line.trim().startsWith('{#h2#}');
                    if (isNextH1 || isNextH2) {
                        break;
                    }
                    newSelectedRows.add(i);
                }
            }

            setMultiMoveSelectedRows(newSelectedRows);
            validateMultiMoveSelection(newSelectedRows);
        };

        document.addEventListener('startMultiMoveToSection', handleStartMultiMoveToSection);
        return () => {
            document.removeEventListener('startMultiMoveToSection', handleStartMultiMoveToSection);
        };
    }, [note?.id, note?.content]);

    useEffect(() => {
        const handleStartMultiSelectFromContextMenu = (e) => {
            if (!note || e?.detail?.noteId !== note.id) return;

            const startingIndex = e?.detail?.lineIndex;
            if (startingIndex == null) return;

            const event = new CustomEvent('toggleMultiMoveMode', { detail: { noteId: note.id } });
            document.dispatchEvent(event);

            const newSelectedRows = new Set([startingIndex]);
            setMultiMoveSelectedRows(newSelectedRows);
            validateMultiMoveSelection(newSelectedRows);
        };

        document.addEventListener('startMultiSelectFromContextMenu', handleStartMultiSelectFromContextMenu);
        return () => {
        document.removeEventListener('startMultiSelectFromContextMenu', handleStartMultiSelectFromContextMenu);
        };
    }, [note?.id]);

    useEffect(() => {
        const handleContextMultiSelectAction = async (e) => {
            if (!note || e?.detail?.noteId !== note.id) return;

            const { action, color } = e.detail || {};

            if (!multiMoveMode && action !== 'cancel_multi_select') return;

            switch (action) {
                case 'move_to_section':
                    setShowMoveToSectionPopup(true);
                    break;
                case 'move_to_note':
                    setShowMoveToNotePopup(true);
                    setMoveToNoteSearch('');
                    setMoveToNoteTarget(null);
                    break;
                case 'move_to_new_note':
                    await handleExtractToNewNote();
                    break;
                case 'bold':
                    await applyFormattingToSelectedRows((line) => {
                        const leadingWhitespace = line.match(/^\s*/)?.[0] || '';
                        const content = line.slice(leadingWhitespace.length);
                        return content.startsWith('{#bold#}')
                            ? `${leadingWhitespace}${content.slice(8)}`
                            : `${leadingWhitespace}{#bold#}${content}`;
                    });
                    break;
                case 'italics':
                    await applyFormattingToSelectedRows((line) => {
                        const leadingWhitespace = line.match(/^\s*/)?.[0] || '';
                        const content = line.slice(leadingWhitespace.length);
                        return content.startsWith('{#italics#}')
                            ? `${leadingWhitespace}${content.slice(11)}`
                            : `${leadingWhitespace}{#italics#}${content}`;
                    });
                    break;
                case 'color':
                    await applyFormattingToSelectedRows((line) => {
                        const cleanText = line
                            .replace(/<span style="color: [^"]+">([^<]+)<\/span>/g, '$1')
                            .replace(/\[color:([^:]+):([^\]]+)\]/g, '$2')
                            .replace(/@\$%\^[^@]+@\$%\^/g, '')
                            .replace(/^\{<[^}]+>\}/, '');
                        return color === 'default' ? cleanText : `{<${color}>}${cleanText}`;
                    });
                    break;
                case 'cancel_multi_select': {
                    const event = new CustomEvent('toggleMultiMoveMode', { detail: { noteId: note.id } });
                    document.dispatchEvent(event);
                    break;
                }
                default:
                    break;
            }
        };

        document.addEventListener('contextMultiSelectAction', handleContextMultiSelectAction);
        return () => {
            document.removeEventListener('contextMultiSelectAction', handleContextMultiSelectAction);
        };
    }, [note?.id, note?.content, multiMoveMode, multiMoveSelectedRows, multiMoveError]);

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
                    const cleanText = originalFirstLine.replace(/^\{#h1#\}\s*/, '');
                    return `{#h1#}${cleanText}`;
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
            const cleanText = originalLine.replace(/^\{#h2#\}\s*/, '');
            lines[lineIndex] = `{#h2#}${cleanText}`;
            
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
    const visibleLineEntries = note.content
        .split('\n')
        .map((line, actualIndex) => ({ line, actualIndex }))
        .filter(({ line }) => !line.trim().startsWith('meta::'));
    const h2Sections = visibleLineEntries
        .map(({ line, actualIndex }, visibleIndex) => ({ line, actualIndex, visibleIndex }))
        .filter(({ line }) => line && line.trim().startsWith('{#h2#}'))
        .map(({ line, actualIndex, visibleIndex }) => ({
            actualIndex,
            visibleIndex,
            label: line.trim().slice(6).trim() || 'Untitled section'
        }));

    const getH2ContentLineEntries = () => {
        const entries = [];

        h2Sections.forEach(({ visibleIndex }) => {
            for (let vi = visibleIndex + 1; vi < visibleLineEntries.length; vi++) {
                const { line, actualIndex } = visibleLineEntries[vi];
                const trimmed = line.trim();

                if (trimmed.startsWith('{#h1#}') || trimmed.startsWith('{#h2#}')) {
                    break;
                }

                if (trimmed !== '') {
                    entries.push({ line, actualIndex });
                }
            }
        });

        return entries;
    };

    const h2ContentLineEntries = getH2ContentLineEntries();
    const areH2ContentsIndented = h2ContentLineEntries.length > 0 &&
        h2ContentLineEntries.every(({ line }) => line.startsWith('\t'));
    const persistedH2IndentState = getPersistedH2IndentState(note.content);
    const isH2IndentEnabled = persistedH2IndentState ?? areH2ContentsIndented;
    const h2IndentButtonLabel = isH2IndentEnabled ? 'Remove H2 indent' : 'Indent H2 content';
    const isH2SectionSpacingEnabled = getPersistedH2SectionSpacingState(note.content) === true;
    const h2SectionSpacingButtonLabel = isH2SectionSpacingEnabled ? 'Remove section space' : 'Add space after section';

    const getSectionLineActualIndices = (sectionActualIndex, includeBlankLines = true) => {
        const section = h2Sections.find(({ actualIndex }) => actualIndex === sectionActualIndex);
        if (!section) return [];

        const indices = [];
        for (let vi = section.visibleIndex + 1; vi < visibleLineEntries.length; vi++) {
            const { line, actualIndex } = visibleLineEntries[vi];
            const trimmed = line.trim();

            if (trimmed.startsWith('{#h1#}') || trimmed.startsWith('{#h2#}')) {
                break;
            }

            if (includeBlankLines || trimmed !== '') {
                indices.push(actualIndex);
            }
        }

        return indices;
    };

    const getSectionInsertIndex = (sectionActualIndex) => {
        const sectionLineIndices = getSectionLineActualIndices(sectionActualIndex, true);
        if (sectionLineIndices.length > 0) {
            const lines = note.content.split('\n');
            const lastContentIndex = [...sectionLineIndices]
                .reverse()
                .find(actualIndex => (lines[actualIndex] || '').trim() !== '');
            return (lastContentIndex ?? sectionActualIndex) + 1;
        }

        return sectionActualIndex + 1;
    };

    const openSectionActions = (e, section) => {
        e.preventDefault();
        e.stopPropagation();
        setSectionActionPopup(section);
        setSectionAppendText('');
    };

    const closeSectionActions = () => {
        setSectionActionPopup(null);
        setSectionAppendText('');
    };

    const appendTextToSection = async () => {
        if (!note?.content || !updateNote || !sectionActionPopup || !sectionAppendText.trim()) return;

        const lines = note.content.split('\n');
        const insertionIndex = getSectionInsertIndex(sectionActionPopup.actualIndex);
        const baselineIndent = isH2IndentEnabled ? '\t' : '';
        const linesToAppend = sectionAppendText
            .split('\n')
            .map(line => line.trim() ? `${baselineIndent}${line}` : line);

        lines.splice(insertionIndex, 0, ...linesToAppend);
        await updateNote(note.id, reorderMetaTags(lines.join('\n')));
        closeSectionActions();
    };

    const removeEmptyLinesFromSection = async (section = sectionActionPopup) => {
        if (!note?.content || !updateNote || !section) return;

        const lines = note.content.split('\n');
        const emptyLineIndices = getSectionLineActualIndices(section.actualIndex, true)
            .filter(actualIndex => (lines[actualIndex] || '').trim() === '')
            .sort((a, b) => b - a);

        if (emptyLineIndices.length === 0) return;

        emptyLineIndices.forEach(actualIndex => lines.splice(actualIndex, 1));
        await updateNote(note.id, reorderMetaTags(lines.join('\n')));
        if (sectionActionPopup) closeSectionActions();
    };

    const clearSectionSubTextSpacing = async (section = sectionActionPopup) => {
        if (!note?.content || !updateNote || !section) return;

        const lines = note.content.split('\n');
        const baselineIndent = isH2IndentEnabled ? '\t' : '';
        getSectionLineActualIndices(section.actualIndex, false).forEach(actualIndex => {
            const line = lines[actualIndex] || '';
            lines[actualIndex] = `${baselineIndent}${line.replace(/^\t+/, '')}`;
        });

        await updateNote(note.id, reorderMetaTags(lines.join('\n')));
        if (sectionActionPopup) closeSectionActions();
    };

    const getSectionByActualIndex = (actualIndex) => (
        h2Sections.find(section => section.actualIndex === actualIndex) ||
        { actualIndex, label: 'Untitled section' }
    );

    const renderSectionHeaderActions = (actualIndex) => {
        const section = getSectionByActualIndex(actualIndex);

        return (
            <span className="ml-1 inline-flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <button
                    type="button"
                    onClick={(e) => openSectionActions(e, section)}
                    className="rounded px-1 py-0.5 text-[10px] font-medium text-blue-500 hover:bg-blue-50 hover:text-blue-700"
                    title="Append text to section"
                >
                    + add
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void removeEmptyLinesFromSection(section);
                    }}
                    className="rounded px-1 py-0.5 text-[10px] font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    title="Remove empty lines from section"
                >
                    clean
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void clearSectionSubTextSpacing(section);
                    }}
                    className="rounded px-1 py-0.5 text-[10px] font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    title="Clear subtext spacing in section"
                >
                    spacing
                </button>
            </span>
        );
    };

    const toggleH2ContentIndent = async () => {
        if (!note?.content || !updateNote || h2ContentLineEntries.length === 0) return;

        const nextIndentEnabled = !isH2IndentEnabled;
        const lines = note.content.split('\n');
        h2ContentLineEntries.forEach(({ actualIndex }) => {
            const line = lines[actualIndex] || '';
            lines[actualIndex] = nextIndentEnabled
                ? `\t${line}`
                : line.replace(/^\t/, '');
        });

        await updateNote(note.id, withPersistedH2IndentState(lines.join('\n'), nextIndentEnabled));
    };

    const toggleH2SectionSpacing = async () => {
        if (!note?.content || !updateNote || h2Sections.length === 0) return;

        const nextSpacingEnabled = !isH2SectionSpacingEnabled;
        const lines = note.content.split('\n');
        const sectionEndIndices = h2Sections
            .map(section => {
                const sectionLineIndices = getSectionLineActualIndices(section.actualIndex, true);
                return [...sectionLineIndices]
                    .reverse()
                    .find(actualIndex => (lines[actualIndex] || '').trim() !== '') ?? section.actualIndex;
            })
            .sort((a, b) => b - a);

        if (nextSpacingEnabled) {
            sectionEndIndices.forEach(endIndex => {
                if (endIndex + 1 >= lines.length || (lines[endIndex + 1] || '').trim() !== '') {
                    lines.splice(endIndex + 1, 0, '');
                }
            });
        } else {
            sectionEndIndices.forEach(endIndex => {
                while (endIndex + 1 < lines.length && (lines[endIndex + 1] || '').trim() === '') {
                    lines.splice(endIndex + 1, 1);
                }
            });
        }

        await updateNote(note.id, withPersistedH2SectionSpacingState(lines.join('\n'), nextSpacingEnabled));
    };

    const scrollToSection = (actualIndex) => {
        const sectionEl = document.getElementById(`note-${note.id}-line-${actualIndex}`);
        if (!sectionEl) return;

        if (quickAccessHighlightTimeoutRef.current) {
            clearTimeout(quickAccessHighlightTimeoutRef.current);
        }

        setHighlightedQuickAccessSection(actualIndex);
        sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        quickAccessHighlightTimeoutRef.current = setTimeout(() => {
            setHighlightedQuickAccessSection(null);
            quickAccessHighlightTimeoutRef.current = null;
        }, 3000);
    };

    // Build set of actualIndices hidden due to collapsed sections,
    // and a map from h2 actualIndex → preview text lines for that section.
    // We work entirely in terms of visibleLineEntries so indices are consistent.
    const { collapsedLineIndices, collapsedSectionPreview, parentH2Map } = (() => {
        const hidden = new Set(); // stores actualIndex values
        const preview = {};
        const pMap = {}; // actualIndex -> parent H2 actualIndex
        const allCollapsed = h2Sections.length > 0 && h2Sections.every(s => collapsedSections.has(s.actualIndex));
        
        h2Sections.forEach(({ actualIndex: h2ActualIdx, visibleIndex: h2VisibleIdx }) => {
            pMap[h2ActualIdx] = h2ActualIdx;
            const sectionLines = [];
            // Walk visible entries after this h2 until next h1/h2
            for (let vi = h2VisibleIdx + 1; vi < visibleLineEntries.length; vi++) {
                const { line, actualIndex } = visibleLineEntries[vi];
                const t = line.trim();
                if (t.startsWith('{#h1#}') || t.startsWith('{#h2#}')) break;
                
                pMap[actualIndex] = h2ActualIdx;
                
                const clean = t.replace(/^\t+/, '')
                    .replace(/\{#bold#\}/g, '')
                    .replace(/\{#italics#\}/g, '')
                    .replace(/^\{<[^}]+>\}/, '');
                sectionLines.push(clean);
                if (collapsedSections.has(h2ActualIdx)) {
                    if (allCollapsed && hoveredSection === h2ActualIdx) {
                        // Temporarily bypass hiding while hovered
                    } else {
                        hidden.add(actualIndex);
                    }
                }
            }
            preview[h2ActualIdx] = sectionLines;
        });
        return { collapsedLineIndices: hidden, collapsedSectionPreview: preview, parentH2Map: pMap };
    })();

    const contentLines = parseNoteContent({ 
        content: note.content, // Pass full content including meta tags for URL reversal detection
        searchTerm: searchQuery,
        onAddText: handleAddText,
        onEditText: handleEditText,
        allNotes: allNotes,
        onNavigateToNote: (noteId) => {
            navigate(`/notes?note=${noteId}`);
        }
    });
    
    // Extract image IDs from meta tags
    const imageIds = extractImageIds(note.content);

    // Handle image deletion
    const handleImageDelete = async (imageId) => {
        if (!window.confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
            return;
        }

        try {
            // Delete the image file from server
            const response = await fetch(`http://localhost:5001/api/images/${imageId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete image from server');
            }

            // Remove the meta::image:: tag from note content
            const updatedContent = note.content.replace(new RegExp(`meta::image::${imageId}\\s*\n?`, 'g'), '').trim();

            // Update the note
            if (updateNote) {
                await updateNote(note.id, updatedContent);
            }

            console.log('✅ Image deleted successfully');
        } catch (error) {
            console.error('❌ Error deleting image:', error);
            alert('Failed to delete image. Please try again.');
        }
    };
    

    

    // Count leading tabs in each visible raw line to determine indent level
    const indentFlags = visibleLineEntries.map(({ line }) => {
        let count = 0;
        while (count < line.length && line[count] === '\t') count++;
        return count;
    });

    const getSubTextBaselineIndent = (idx) => {
        const actualIdx = visibleLineEntries[idx]?.actualIndex ?? idx;
        const parentSectionIdx = parentH2Map[actualIdx];
        const isInsideH2Section = parentSectionIdx !== undefined && parentSectionIdx !== actualIdx;
        return isH2IndentEnabled && isInsideH2Section ? 1 : 0;
    };

    const isSubTextLine = (idx) => (indentFlags[idx] || 0) > getSubTextBaselineIndent(idx);

    const handleRemoveSubTextIndent = async (e, idx) => {
        e.preventDefault();
        e.stopPropagation();
        if (!note?.content || !updateNote || !isSubTextLine(idx)) return;

        const actualIdx = visibleLineEntries[idx]?.actualIndex ?? idx;
        const lines = note.content.split('\n');
        const line = lines[actualIdx] || '';
        const baselineIndent = getSubTextBaselineIndent(idx);
        const currentIndent = line.match(/^\t*/)?.[0].length || 0;
        const nextIndent = Math.max(baselineIndent, currentIndent - 1);
        lines[actualIdx] = `${'\t'.repeat(nextIndent)}${line.replace(/^\t+/, '')}`;

        await updateNote(note.id, reorderMetaTags(lines.join('\n')));
    };

    const renderIndentBullet = (idx) => {
        const canRemoveSubText = isSubTextLine(idx);
        if (!canRemoveSubText) {
            return <span className="mr-2 text-base self-start leading-none">•</span>;
        }

        return (
            <button
                type="button"
                onClick={(e) => handleRemoveSubTextIndent(e, idx)}
                className="group/sub-bullet mr-2 h-4 w-4 self-start leading-none text-gray-500 hover:text-red-600 focus:outline-none"
                title="Remove sub text indent"
            >
                <span className="group-hover/sub-bullet:hidden">•</span>
                <span className="hidden text-xs font-semibold group-hover/sub-bullet:inline">x</span>
            </button>
        );
    };

    if (editingLine?.noteId === note.id) {
        // Line is being edited
    }
    
    if (!Array.isArray(contentLines) || contentLines.length === 0) {
        return '<div>1234</div>';
    }

    const handleRightClick = (e, idx) => {
        e.preventDefault();
        const actualIdx = visibleLineEntries[idx]?.actualIndex ?? idx;
        const parentSectionIdx = parentH2Map[actualIdx];

        if (parentSectionIdx !== undefined && collapsedSections.has(parentSectionIdx)) {
            contextMenuPinnedSectionRef.current = parentSectionIdx;
            setHoveredSection(parentSectionIdx);
        }

        setRightClickNoteId(note.id);
        setRightClickIndex(idx);
        setRightClickPos({ x: e.clientX, y: e.clientY });
    };

    // Strip formatting metadata from a raw line for clean inline editing
    const stripLineFormatting = (line) => {
        let clean = line;
        // Remove new {<...>} color prefix
        clean = clean.replace(/^\{<[^}]+>\}/, '');
        // Remove old @$%^ color markers (migration)
        clean = clean.replace(/@\$%\^[^@]+@\$%\^/g, '');
        // Remove H1 markers: {#h1#}text
        clean = clean.replace(/^\{#h1#\}/, '');
        // Remove H2 markers: {#h2#}text
        clean = clean.replace(/^\{#h2#\}/, '');
        // Remove {#bold#} prefix
        clean = clean.replace(/^\{#bold#\}/, '');
        // Remove {#italics#} prefix
        clean = clean.replace(/^\{#italics#\}/, '');
        // Remove bullet prefix
        clean = clean.replace(/^- /, '');
        return clean;
    };

    const getCopyableLineText = (idx) => {
        const actualIdx = visibleLineEntries[idx]?.actualIndex ?? idx;
        const rawLine = note.content.split('\n')[actualIdx] || '';
        return stripLineFormatting(rawLine).replace(/^\t+/, '');
    };

    const handleCopyLine = async (e, idx) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            await navigator.clipboard.writeText(getCopyableLineText(idx));
            if (typeof setShowCopyToast === 'function') {
                setShowCopyToast(true);
            } else {
                toast.success('Note line copied');
            }
        } catch (error) {
            console.error('Error copying line:', error);
            toast.error('Failed to copy line');
        }
    };

    const renderCopyLineButton = (idx) => {
        const text = getCopyableLineText(idx).trim();
        if (!text) return null;
        if (/^-{4,}$/.test(text)) return null;

        return (
            <button
                type="button"
                onClick={(e) => handleCopyLine(e, idx)}
                onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
                className="ml-2 flex-shrink-0 rounded p-1 text-gray-300 opacity-0 transition-all duration-150 hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-gray-300"
                title="Copy line"
            >
                <ClipboardDocumentIcon className="h-4 w-4" />
            </button>
        );
    };

    // Extract formatting metadata from a raw line
    const extractLineFormatting = (line) => {
        const formatting = {};
        // Extract new {<...>} color prefix
        const newColorMatch = line.match(/^\{<([^}]+)>\}/);
        if (newColorMatch) formatting.color = newColorMatch[0];
        // Extract old @$%^ color (migration)
        if (!formatting.color) {
            const oldColorMatch = line.match(/@\$%\^([^@]+)@\$%\^/);
            if (oldColorMatch) formatting.color = oldColorMatch[0];
        }
        // Strip color prefix before checking h1/h2
        const lineWithoutColor = line.replace(/^\{<[^}]+>\}/, '').replace(/@\$%\^[^@]+@\$%\^/g, '').trim();
        if (/^\{#h1#\}/.test(lineWithoutColor)) formatting.isH1 = true;
        else if (/^\{#h2#\}/.test(lineWithoutColor)) formatting.isH2 = true;
        if (/^\{#bold#\}/.test(lineWithoutColor.replace(/^\{#h[12]#\}/, ''))) formatting.isBold = true;
        if (/^\{#italics#\}/.test(lineWithoutColor.replace(/^\{#h[12]#\}/, '').replace(/^\{#bold#\}/, ''))) formatting.isItalics = true;
        if (line.startsWith('- ')) formatting.isBullet = true;
        return formatting;
    };

    // Restore formatting metadata to edited text
    const restoreLineFormatting = (text, formatting) => {
        let result = text;
        if (formatting.isItalics) result = `{#italics#}${result}`;
        if (formatting.isBold) result = `{#bold#}${result}`;
        if (formatting.isH1) result = `{#h1#}${result}`;
        else if (formatting.isH2) result = `{#h2#}${result}`;
        if (formatting.isBullet) result = `- ${result}`;
        if (formatting.color) {
            // Only restore new-format color prefix; skip old format
            if (formatting.color.startsWith('{<')) result = `${formatting.color}${result}`;
        }
        return result;
    };

    // Show a 10-second undo toast. Call AFTER saving history and performing the update.
    const showUndoToast = (label, originalContent) => {
        toast(({ closeToast }) => (
            <UndoToast
                label={label}
                onUndo={() => updateNote(note.id, originalContent)}
                closeToast={closeToast}
            />
        ), {
            autoClose: 10000,
            closeButton: false,
            icon: false,
            style: { padding: '8px 12px' },
        });
    };

    const handleTextClick = (idx) => {
        // Save note to history when inline editing starts
        saveNoteToHistory(note);

        // Get the original line content for editing
        const rawLines = getRawLines(note.content);
        const originalLine = rawLines[idx];
        if (!originalLine) return;

        setEditingLine({ noteId: note.id, lineIndex: idx, formatting: extractLineFormatting(originalLine) });
        setEditedLineContent(stripLineFormatting(originalLine));
    };

    const handleLineRowClick = (e, idx, isUrlOnly = false) => {
        const interactiveTarget = e.target.closest('button, input, textarea, select, label');
        if (interactiveTarget) return;
        if (!isUrlOnly && e.target.closest('a')) return;

        if (isUrlOnly) {
            e.preventDefault();
            e.stopPropagation();
        }

        handleTextClick(idx);
    };

    const handleSaveEdit = async (newText, idx, isH1, isH2) => {
        const lines = note.content.split('\n');
        // Restore formatting metadata that was stripped for editing
        const formatting = editingLine?.formatting || {};
        if (isH1) formatting.isH1 = true;
        if (isH2) formatting.isH2 = true;
        lines[idx] = restoreLineFormatting(newText, formatting);
        const updatedContent = lines.join('\n');
        const reorderedContent = reorderMetaTags(updatedContent);
        
        const originalContent = note.content;
        await updateNote(note.id, reorderedContent);
        setEditingLine({ noteId: null, lineIndex: null });
        setEditedLineContent('');
        showUndoToast('Line saved', originalContent);
    };

    const insertLineAt = (index, text = '') => {
        const originalContent = note.content;
        const lines = note.content.split('\n');
        lines.splice(index, 0, text);
        updateNote(note.id, reorderMetaTags(lines.join('\n')));
        if (text) showUndoToast('Divider inserted', originalContent);
    };

    // Insert empty line and immediately open it for editing
    const insertLineAbove = (contentIdx, actualIdx) => {
        insertLineAt(actualIdx, '');
        setEditingLine({ noteId: note.id, lineIndex: contentIdx });
        setEditedLineContent('');
    };

    const insertLineBelow = (contentIdx, actualIdx) => {
        insertLineAt(actualIdx + 1, '');
        setEditingLine({ noteId: note.id, lineIndex: contentIdx + 1 });
        setEditedLineContent('');
    };
    const insertSeparatorAbove = (actualIdx) => {
        insertLineAt(actualIdx, '----------------------------------------------------------------------------------------------------');
    };

    const insertSeparatorBelow = (actualIdx) => {
        insertLineAt(actualIdx + 1, '----------------------------------------------------------------------------------------------------');
    };

    const handleDeleteLine = async (idx) => {
        const originalContent = note.content;
        const lines = note.content.split('\n');
        lines.splice(idx, 1);
        await updateNote(note.id, reorderMetaTags(lines.join('\n')));
        setEditingLine({ noteId: null, lineIndex: null });
        setEditedLineContent('');
        showUndoToast('Line deleted', originalContent);
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
        // Dispatch with noteId so NotesList sets multiMoveNoteId for the right note
        const event = new CustomEvent('toggleMultiMoveMode', { detail: { noteId: note.id } });
        document.dispatchEvent(event);
        setMultiMoveSelectedRows(new Set());
        setMultiMoveError('');
    };

    // Extract selected lines to a new note
    const handleExtractToNewNote = async () => {
        if (multiMoveSelectedRows.size === 0 || multiMoveError) return;

        const sortedIndices = Array.from(multiMoveSelectedRows).sort((a, b) => a - b);
        const lines = note.content.split('\n');

        // Lines to extract
        const extractedLines = sortedIndices.map(i => lines[i]);

        // Remaining lines (keep meta:: lines at their original position)
        const remainingLines = lines.filter((_, i) => !sortedIndices.includes(i));

        const newContent = extractedLines.join('\n');
        const updatedContent = remainingLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

        // Create the new note
        if (addNote) {
            await addNote(newContent);
        }

        // Update existing note with lines removed
        const reordered = reorderMetaTags(updatedContent);
        updateNote(note.id, reordered);

        // Exit multi-move mode
        setMultiMoveSelectedRows(new Set());
        setMultiMoveError('');
        const event = new CustomEvent('toggleMultiMoveMode', { detail: { noteId: note.id } });
        document.dispatchEvent(event);
    };

    const handleMoveToNoteConfirmed = async () => {
        if (!moveToNoteTarget || multiMoveSelectedRows.size === 0) return;

        const sortedIndices = Array.from(multiMoveSelectedRows).sort((a, b) => a - b);
        const lines = note.content.split('\n');
        const extractedLines = sortedIndices.map(i => lines[i]);
        const remainingLines = lines.filter((_, i) => !sortedIndices.includes(i));

        // Append extracted lines to target note (before meta:: lines)
        const targetNote = allNotes.find(n => n.id === moveToNoteTarget.id);
        if (!targetNote) return;

        const targetLines = targetNote.content.split('\n');
        const lastNonMetaIdx = targetLines.reduce((last, l, i) =>
            l.trim().startsWith('meta::') ? last : i, targetLines.length - 1);
        const updatedTarget = [
            ...targetLines.slice(0, lastNonMetaIdx + 1),
            '',
            ...extractedLines,
            ...targetLines.slice(lastNonMetaIdx + 1),
        ].join('\n').trim();

        const updatedSource = reorderMetaTags(
            remainingLines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
        );

        updateNote(targetNote.id, updatedTarget);
        updateNote(note.id, updatedSource);

        // Exit multi-move mode and close popups
        setMultiMoveSelectedRows(new Set());
        setMultiMoveError('');
        setShowMoveToNoteConfirm(false);
        setShowMoveToNotePopup(false);
        setMoveToNoteTarget(null);
        setMoveToNoteSearch('');
        const event = new CustomEvent('toggleMultiMoveMode', { detail: { noteId: note.id } });
        document.dispatchEvent(event);
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
        
        // Create meta tags for each section, preserving existing code block tags
        const existingCodeBlockTags = lines.filter(line => line.trim().startsWith('meta::code_block::'));
        const existingLines = lines.filter(line => !line.trim().startsWith('meta::code_block::'));
        const newMetaTags = sections.map(section => {
            const startLine = Math.min(...section) + 1; // Convert to 1-based
            const endLine = Math.max(...section) + 1; // Convert to 1-based
            return `meta::code_block::${startLine}_${endLine}`;
        });

        const updatedContent = [...existingLines, ...existingCodeBlockTags, ...newMetaTags].join('\n');
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
        const isH2 = currentLine && currentLine.trim().startsWith('{#h2#}');

        if (newSelectedRows.has(idx)) {
            // If deselecting an H2, remove all lines under it
            if (isH2) {
                // Find all lines under this H2 until next H1 or H2
                const linesToRemove = new Set();
                linesToRemove.add(idx);

                for (let i = idx + 1; i < rawLines.length; i++) {
                    const line = rawLines[i];
                    const isNextH1 = line && line.trim().startsWith('{#h1#}');
                    const isNextH2 = line && line.trim().startsWith('{#h2#}');
                    
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
                    const isNextH1 = line && line.trim().startsWith('{#h1#}');
                    const isNextH2 = line && line.trim().startsWith('{#h2#}');
                    
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
            const isH2 = line && line.trim().startsWith('{#h2#}');

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
                const isNextH1 = line && line.trim().startsWith('{#h1#}');
                const isNextH2 = line && line.trim().startsWith('{#h2#}');
                
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
            return line && line.trim().startsWith('{#h2#}');
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

    const handleBulkDelete = async () => {
        const originalContent = note.content;
        const lines = note.content.split('\n');
        const selectedIndices = Array.from(selectedRows).sort((a, b) => b - a);
        selectedIndices.forEach(idx => lines.splice(idx, 1));
        await updateNote(note.id, reorderMetaTags(lines.join('\n')));
        setBulkDeleteMode(false);
        setSelectedRows(new Set());
        showUndoToast(`${selectedIndices.length} line${selectedIndices.length !== 1 ? 's' : ''} deleted`, originalContent);
    };

    const handleMoveToSectionConfirmed = async (targetSectionActualIndex) => {
        if (multiMoveSelectedRows.size === 0 || multiMoveError) return;

        const selectedEntries = Array.from(multiMoveSelectedRows)
            .sort((a, b) => a - b)
            .map(idx => visibleLineEntries[idx])
            .filter(Boolean);

        if (selectedEntries.length === 0) return;

        const selectedActualIndices = selectedEntries.map(entry => entry.actualIndex);
        if (selectedActualIndices.includes(targetSectionActualIndex)) {
            return;
        }

        const updatedLines = [...note.content.split('\n')];
        const linesToMove = [];

        selectedActualIndices
            .slice()
            .sort((a, b) => b - a)
            .forEach(actualIndex => {
                const [removedLine] = updatedLines.splice(actualIndex, 1);
                linesToMove.unshift(removedLine);
            });

        let adjustedTargetIndex = targetSectionActualIndex;
        selectedActualIndices.forEach(actualIndex => {
            if (actualIndex < targetSectionActualIndex) {
                adjustedTargetIndex -= 1;
            }
        });

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

        updatedLines.splice(insertIndex, 0, ...linesToMove);
        const reorderedContent = reorderMetaTags(updatedLines.join('\n'));

        await updateNote(note.id, reorderedContent);
        setMultiMoveSelectedRows(new Set());
        setMultiMoveError('');
        setShowMoveToSectionPopup(false);
        const event = new CustomEvent('toggleMultiMoveMode', { detail: { noteId: note.id } });
        document.dispatchEvent(event);
    };

    const applyFormattingToSelectedRows = async (formatter) => {
        if (multiMoveSelectedRows.size === 0 || multiMoveError) return;

        const updatedLines = [...note.content.split('\n')];
        const selectedEntries = Array.from(multiMoveSelectedRows)
            .sort((a, b) => a - b)
            .map(idx => visibleLineEntries[idx])
            .filter(Boolean);

        selectedEntries.forEach(({ actualIndex }) => {
            updatedLines[actualIndex] = formatter(updatedLines[actualIndex]);
        });

        const reorderedContent = reorderMetaTags(updatedLines.join('\n'));
        await updateNote(note.id, reorderedContent);
    };


    // Drag and drop handlers
    const handleDragStart = (e, lineIndex) => {
        if (focusMode) return; // Disable drag in focus mode
        
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', lineIndex.toString());
        setDraggedLineIndex(lineIndex);
    };

    const SUBLINE_HOLD_MS = 700; // hold duration to activate sub-line mode

    const clearSubLineTimer = () => {
        if (subLineHoldTimerRef.current) {
            clearTimeout(subLineHoldTimerRef.current);
            subLineHoldTimerRef.current = null;
        }
    };

    // Map contentLines index to actual index in note.content.split('\n') via visibleLineEntries
    const rawIndexToActual = (rawIdx) => {
        return visibleLineEntries[rawIdx]?.actualIndex ?? rawIdx;
    };

    const handleDragOver = (e, lineIndex) => {
        if (focusMode) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        // If already locked as sub-line target, keep it
        if (subLineDropTargetRef.current === lineIndex) return;
        // Show normal drop indicator if not yet a sub-line
        if (subLineDropTargetRef.current !== lineIndex) {
            setDragOverLineIndex(lineIndex);
        }
    };

    const handleDragEnter = (e, lineIndex) => {
        if (focusMode) return;
        e.preventDefault();
        // Only clear if we're entering a new line (not a child of current)
        if (e.currentTarget && e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return;
        dragHoverLineRef.current = lineIndex;
        clearSubLineTimer();
        // Clear sub-line if moving to a different line
        if (subLineDropTargetRef.current !== null && subLineDropTargetRef.current !== lineIndex) {
            subLineDropTargetRef.current = null;
            setSubLineDropTarget(null);
        }
        // Start hold timer for sub-line activation
        subLineHoldTimerRef.current = setTimeout(() => {
            if (dragHoverLineRef.current === lineIndex) {
                subLineDropTargetRef.current = lineIndex;
                setSubLineDropTarget(lineIndex);
                setDragOverLineIndex(null);
            }
        }, SUBLINE_HOLD_MS);
    };

    const handleDragLeave = (e) => {
        if (focusMode) return;
        // Only clear if we're truly leaving the element (not just entering a child)
        if (e.currentTarget && e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return;
        clearSubLineTimer();
        dragHoverLineRef.current = null;
        subLineDropTargetRef.current = null;
        setDragOverLineIndex(null);
        setSubLineDropTarget(null);
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

            const sourceLineIndex = parseInt(data);
            if (isNaN(sourceLineIndex) || sourceLineIndex === targetLineIndex) {
                setDraggedLineIndex(null);
                setDragOverLineIndex(null);
                setSubLineDropTarget(null);
                return;
            }

            // Use ref (not state) — state may be cleared by dragleave from child elements before drop fires
            const isSubLine = subLineDropTargetRef.current === targetLineIndex;

            // Map contentLines indices to actual full-content indices via visibleLineEntries
            const sourceActual = visibleLineEntries[sourceLineIndex]?.actualIndex ?? sourceLineIndex;
            const lastActual = visibleLineEntries[visibleLineEntries.length - 1]?.actualIndex ?? visibleLineEntries.length - 1;
            const targetActual = visibleLineEntries[targetLineIndex]?.actualIndex ?? (lastActual + 1);
            const originalContent = note.content;
            const lines = note.content.split('\n');

            if (isSubLine) {
                // Sub-line: place after target and make it one visible indent deeper.
                const movedLine = lines[sourceActual];
                const targetLine = lines[targetActual] || '';
                const targetIndentLevel = targetLine.match(/^\t*/)?.[0].length || 0;
                const indentedLine = `${'\t'.repeat(targetIndentLevel + 1)}${movedLine.replace(/^\t*/, '')}`;
                const newLines = [...lines];
                newLines.splice(sourceActual, 1);
                const adj = sourceActual < targetActual ? targetActual - 1 : targetActual;
                newLines.splice(adj + 1, 0, indentedLine);
                updateNote(note.id, reorderMetaTags(newLines.join('\n')));
                showUndoToast('Line indented', originalContent);
            } else {
                // Normal reorder
                const movedLine = lines[sourceActual];
                const newLines = [...lines];
                newLines.splice(sourceActual, 1);
                const adj = sourceActual < targetActual ? targetActual - 1 : targetActual;
                newLines.splice(adj, 0, movedLine);
                updateNote(note.id, reorderMetaTags(newLines.join('\n')));
                showUndoToast('Line reordered', originalContent);
            }

            clearSubLineTimer();
            dragHoverLineRef.current = null;
            subLineDropTargetRef.current = null;
            setDraggedLineIndex(null);
            setDragOverLineIndex(null);
            setSubLineDropTarget(null);
        } catch (error) {
            console.error('Error in handleDrop:', error);
        }
    };

    const handleDragEnd = () => {
        clearSubLineTimer();
        dragHoverLineRef.current = null;
        subLineDropTargetRef.current = null;
        setDraggedLineIndex(null);
        setDragOverLineIndex(null);
        setSubLineDropTarget(null);
    };

    const renderInlineEditor = (idx, isH1, isH2) => (
        <InlineEditor
            key={idx}
            text={editedLineContent}
            setText={setEditedLineContent}
            onSave={(newText) => handleSaveEdit(newText, idx, isH1, isH2)}
            onCancel={() => setEditingLine({ noteId: null, lineIndex: null })}
            onDelete={() => handleDeleteLine(idx)}
            onNavigateLine={(direction) => {
                const targetIdx = idx + direction;
                if (targetIdx < 0 || targetIdx >= contentLines.length) return;
                // Save current line
                const lines = note.content.split('\n');
                const formatting = editingLine?.formatting || {};
                if (isH1) formatting.isH1 = true;
                if (isH2) formatting.isH2 = true;
                lines[idx] = restoreLineFormatting(editedLineContent, formatting);
                updateNote(note.id, reorderMetaTags(lines.join('\n')));
                // Open adjacent line for editing
                handleTextClick(targetIdx);
            }}
            isSuperEditMode={isSuperEditMode}
            wasOpenedFromSuperEdit={wasOpenedFromSuperEdit}
            lineIndex={idx}
            allNotes={allNotes}
            addNote={addNote}
            updateNote={updateNote}
            currentNoteId={note.id}
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
        const actualIdx = visibleLineEntries[idx]?.actualIndex ?? idx;

        if (React.isValidElement(line)) {
            if (editingLine?.noteId === note.id && editingLine?.lineIndex === idx) {
                return renderInlineEditor(idx, false, false);
            }
            
            // Apply indentation to React elements (h1, h2, etc.)
            const indentLevel = indentFlags[idx] || 0;
            const shouldIndent = indentLevel > 0;
            const elementType = line.type;
            const isH1 = elementType === 'h1';
            const isH2 = elementType === 'h2';
            const isCodeBlock = line.props?.className?.includes('code-block-triple-backtick') || false;
            const isFirstLine = idx === 0;
            
            return (
                <div
                    key={idx}
                    draggable={!focusMode && (multiMoveMode ? multiMoveSelectedRows.has(idx) : true)}
                    onDragStart={(e) => multiMoveMode ? handleMultiMoveDragStart(e) : handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnter={(e) => handleDragEnter(e, idx)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={multiMoveMode ? handleMultiMoveDragEnd : handleDragEnd}
                    onContextMenu={(e) => handleRightClick(e, idx)}
                    onClickCapture={(e) => {
                        if (isUrlOnly) handleLineRowClick(e, idx, isUrlOnly);
                    }}
                    onDoubleClickCapture={(e) => {
                        if (isUrlOnly) handleLineRowClick(e, idx, isUrlOnly);
                    }}
                    onClick={(e) => handleLineRowClick(e, idx, isUrlOnly)}
                    onMouseEnter={() => {
                        const pIdx = parentH2Map[actualIdx];
                        if (pIdx !== undefined && pIdx !== hoveredSection) {
                            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                            hoverTimeoutRef.current = setTimeout(() => {
                                setHoveredSection(pIdx);
                            }, 300);
                        } else if (pIdx !== undefined && pIdx === hoveredSection) {
                            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                        }
                    }}
                    className={`group cursor-text flex items-center relative pl-8 ${
                            rightClickNoteId === note.id && rightClickIndex === idx ? 'bg-yellow-100' : ''
                        } ${
                            isHighlightedInSuperEdit ? 'bg-purple-100 border-l-4 border-purple-500' : ''
                        } ${
                            draggedLineIndex === idx ? 'opacity-50' : ''
                        } ${
                            dragOverLineIndex === idx ? 'border-t-2 border-blue-500 bg-blue-50' : subLineDropTarget === idx ? 'border-r-4 border-amber-400 bg-amber-50' : ''
                        } ${
                            !focusMode ? 'hover:bg-gray-50' : ''
                        } ${
                            multiMoveMode && multiMoveSelectedRows.has(idx) ? 'bg-blue-50 border-l-2 border-blue-400 cursor-grab' : ''
                        }`}
                    style={{ ...getCodeBlockContainerStyle(idx), paddingLeft: `calc(${indentLevel * 2}rem + 2rem)` }}
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
                    {shouldIndent && !isH1 && !isH2 && !isCodeBlock && !hasNoBulletsTag() && !isCodeBlockLine(idx) && (() => {
                        // Check if line is blank by checking the raw line content
                        const rawLines = getRawLines(note.content);
                        const originalLine = rawLines[idx];
                        const isBlank = !originalLine || originalLine.trim() === '';
                        if (isBlank) return null;
                        // Don't add bullet for separator/divider lines
                        const isSeparator = originalLine && /^[-]{4,}$/.test(originalLine.trim());
                        if (isSeparator) return null;
                        // Don't add bullet if the line is already a bullet element from wrapInContainer
                        const isBulletElement = (line.key && line.key.startsWith('bullet-')) ||
                          (originalLine && originalLine.trim().startsWith('- '));
                        if (isBulletElement) return null;
                        return renderIndentBullet(idx);
                    })()}
                    <div className="flex items-center gap-2 w-full min-w-0">
                        {isH2 && !focusMode && (() => {
                            const actualIdx = visibleLineEntries[idx]?.actualIndex ?? idx;
                            const isCollapsed = collapsedSections.has(actualIdx);
                            const preview = collapsedSectionPreview[actualIdx] || [];
                            return (
                                <div className="relative group/collapse flex-shrink-0">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleSection(actualIdx); }}
                                        className="text-gray-400 hover:text-gray-600 text-xs"
                                        title={isCollapsed ? 'Expand section' : 'Collapse section'}
                                        >
                                            {isCollapsed ? '▶' : '▼'}
                                        </button>
                                        {isCollapsed && preview.length > 0 && (
                                            <div className="absolute left-6 top-0 z-50 opacity-0 invisible group-hover/collapse:opacity-100 group-hover/collapse:visible transition-all duration-150 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs text-gray-700 leading-relaxed pointer-events-none">
                                            <div className="text-gray-400 text-[10px] uppercase tracking-wide mb-1.5 font-medium">{preview.length} line{preview.length !== 1 ? 's' : ''} hidden</div>
                                            {preview.slice(0, 12).map((l, i) => (
                                                <div key={i} className="truncate py-0.5 border-b border-gray-50 last:border-0">{l || <span className="text-gray-300">—</span>}</div>
                                            ))}
                                            {preview.length > 12 && <div className="text-gray-400 mt-1">+{preview.length - 12} more…</div>}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                        {React.cloneElement(line, {
                            onContextMenu: (e) => handleRightClick(e, idx),
                            onClickCapture: (e) => {
                                if (isUrlOnly) handleLineRowClick(e, idx, isUrlOnly);
                            },
                            onDoubleClickCapture: (e) => {
                                if (isUrlOnly) handleLineRowClick(e, idx, isUrlOnly);
                            },
                            onClick: () => handleTextClick(idx),
                            className: `${line.props.className || ''} ${
                                rightClickNoteId === note.id && rightClickIndex === idx ? 'bg-yellow-100' : ''
                            }`,
                        })}
                        {isH2 && !focusMode && renderSectionHeaderActions(visibleLineEntries[idx]?.actualIndex ?? idx)}
                        {!focusMode && renderCopyLineButton(idx)}
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
        const isSeparator = /^[-_]{3,}$/.test(lineContent.trim());
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

        if (isSeparator) {
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
                    className={`w-full py-4 relative group ${
                        dragOverLineIndex === idx ? 'border-t-2 border-blue-500 bg-blue-50' : ''
                    } ${!focusMode ? 'hover:bg-gray-50' : ''}`}
                >
                    <div className="relative flex items-center w-full">
                        <hr className="border-t border-gray-300 w-full" />
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteLine(idx); }}
                            className="absolute left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-300 rounded-full w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-400 shadow-sm"
                            title="Delete divider"
                        >
                            <span className="text-[10px] font-bold leading-none">✕</span>
                        </button>
                    </div>
                </div>
            );
        }

        if (lineContent.trim() === '') {
            return (
                <div
                    key={idx}
                    draggable={!focusMode && (multiMoveMode ? multiMoveSelectedRows.has(idx) : true)}
                    onDragStart={(e) => multiMoveMode ? handleMultiMoveDragStart(e) : handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnter={(e) => handleDragEnter(e, idx)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={multiMoveMode ? handleMultiMoveDragEnd : handleDragEnd}
                    onContextMenu={(e) => handleRightClick(e, idx)}
                    onMouseEnter={() => {
                        const actualIdx = visibleLineEntries[idx]?.actualIndex ?? idx;
                        const pIdx = parentH2Map[actualIdx];
                        if (pIdx !== undefined && pIdx !== hoveredSection) {
                            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                            hoverTimeoutRef.current = setTimeout(() => {
                                setHoveredSection(pIdx);
                            }, 300);
                        } else if (pIdx !== undefined && pIdx === hoveredSection) {
                            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                        }
                    }}
                    className={`cursor-text h-6 ${
                        rightClickNoteId === note.id && rightClickIndex === idx ? 'bg-yellow-100' : ''
                    } ${
                        draggedLineIndex === idx ? 'opacity-50' : ''
                    } ${
                        dragOverLineIndex === idx ? 'border-t-2 border-blue-500 bg-blue-50' : subLineDropTarget === idx ? 'border-r-4 border-amber-400 bg-amber-50' : ''
                    } ${
                        !focusMode ? 'hover:bg-gray-50' : ''
                    }`}
                >
                </div>
            );
        }

        const isFirstLine = idx === 0;
        const isFirstLineH1 = lineContent.trim().startsWith('{#h1#}');
        
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
                onClickCapture={(e) => {
                    if (isUrlOnly) handleLineRowClick(e, idx, isUrlOnly);
                }}
                onDoubleClickCapture={(e) => {
                    if (isUrlOnly) handleLineRowClick(e, idx, isUrlOnly);
                }}
                onClick={(e) => handleLineRowClick(e, idx, isUrlOnly)}
                className={`group cursor-text flex items-center ${
                        rightClickNoteId === note.id && rightClickIndex === idx ? 'bg-yellow-100' : ''
                    } ${
                        isH1 ? 'text-2xl font-bold text-gray-900' :
                        isH2 ? 'text-lg font-semibold text-gray-900' : ''
                    } ${
                        isHighlightedInSuperEdit ? 'bg-purple-100 border-l-4 border-purple-500' : ''
                    } ${
                        draggedLineIndex === idx ? 'opacity-50' : ''
                    } ${
                        dragOverLineIndex === idx ? 'border-t-2 border-blue-500 bg-blue-50' : subLineDropTarget === idx ? 'border-r-4 border-amber-400 bg-amber-50' : ''
                    } ${
                        !focusMode ? 'hover:bg-gray-50' : ''
                    }`}
                style={{ ...getCodeBlockContainerStyle(idx), paddingLeft: `${(indentFlags[idx] || 0) * 2}rem` }}
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
                        {((indentFlags[idx] || 0) > 0 || isListItem) && !isH1 && !isH2 && !hasNoBulletsTag() && !isCodeBlockLine(idx) && lineContent.trim() !== '' && (
                            renderIndentBullet(idx)
                        )}
                        <div className="flex items-center gap-2 w-full min-w-0">
                            {isH2 && (() => {
                                const actualIdx = visibleLineEntries[idx]?.actualIndex ?? idx;
                                const isCollapsed = collapsedSections.has(actualIdx);
                                const preview = isCollapsed ? (collapsedSectionPreview[actualIdx] || []) : [];
                                return (
                                    <div className="relative group/collapse flex-shrink-0">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleSection(actualIdx); }}
                                            className="text-gray-400 hover:text-gray-600"
                                            title={isCollapsed ? 'Expand section' : 'Collapse section'}
                                        >
                                            {isCollapsed ? '▶' : '▼'}
                                        </button>
                                        {isCollapsed && preview.length > 0 && (
                                            <div className="absolute left-6 top-0 z-50 opacity-0 invisible group-hover/collapse:opacity-100 group-hover/collapse:visible transition-all duration-150 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs text-gray-700 leading-relaxed pointer-events-none">
                                                <div className="text-gray-400 text-[10px] uppercase tracking-wide mb-1.5 font-medium">{preview.length} line{preview.length !== 1 ? 's' : ''} hidden</div>
                                                {preview.slice(0, 12).map((l, i) => (
                                                    <div key={i} className="truncate py-0.5 border-b border-gray-50 last:border-0">{l || <span className="text-gray-300">—</span>}</div>
                                                ))}
                                                {preview.length > 12 && <div className="text-gray-400 mt-1">+{preview.length - 12} more…</div>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
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
                                    handleInlineDateSelect,
                                    handleNoteNavigation
                                );
                                
                                if (isUrlOnly) {
                                    // For URL-only lines, render without click wrapper
                                    return content;
                                } else {
                                    // For regular text, wrap with click handler
                                    return (
                                        <div 
                                            className="cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded inline-flex min-w-0"
                                        >
                                            {content}
                                        </div>
                                    );
                                }
                            })()}
                            {isH2 && !focusMode && renderSectionHeaderActions(visibleLineEntries[idx]?.actualIndex ?? idx)}
                            {!focusMode && renderCopyLineButton(idx)}
                            {!focusMode && (() => {
                                // Check if this line contains only a URL (same logic as above)
                                const rawLines = getRawLines(note.content);
                                const originalLine = rawLines[idx];
                                const urlRegex = /^(https?:\/\/[^\s]+)$/;
                                const markdownUrlRegex = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/;
                                const isUrlOnly = originalLine && (urlRegex.test(originalLine.trim()) || markdownUrlRegex.test(originalLine.trim()));
                                return !isUrlOnly;
                            })() && isFirstLine && !isFirstLineH1 && (
                                <button
                                    onClick={() => handleConvertToH1(note, lineContent)}
                                    className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-400 transition-colors duration-150 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                    title="Convert to H1"
                                >
                                    H1
                                </button>
                            )}
                            {!focusMode && (() => {
                                // Check if this line contains only a URL (same logic as above)
                                const rawLines = getRawLines(note.content);
                                const originalLine = rawLines[idx];
                                const urlRegex = /^(https?:\/\/[^\s]+)$/;
                                const markdownUrlRegex = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/;
                                const isUrlOnly = originalLine && (urlRegex.test(originalLine.trim()) || markdownUrlRegex.test(originalLine.trim()));
                                return !isUrlOnly;
                            })() && !isFirstLine && (() => {
                                // Check if this line is an H1 by looking at the raw content
                                const rawLines = getRawLines(note.content);
                                const originalLine = rawLines[idx];
                                return originalLine && originalLine.trim().startsWith('{#h1#}');
                            })() && (
                                <button
                                    onClick={() => handleMoveH1ToTop(idx)}
                                    className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-400 transition-colors duration-150 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                    title="Move H1 to top"
                                >
                                    ↑
                                </button>
                            )}
                            {!focusMode && (() => {
                                // Check if this line contains only a URL (same logic as above)
                                const rawLines = getRawLines(note.content);
                                const originalLine = rawLines[idx];
                                const urlRegex = /^(https?:\/\/[^\s]+)$/;
                                const markdownUrlRegex = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/;
                                const isUrlOnly = originalLine && (urlRegex.test(originalLine.trim()) || markdownUrlRegex.test(originalLine.trim()));
                                return !isUrlOnly;
                            })() && !isFirstLine && (() => {
                                // Check if this line is NOT an H1 or H2 by looking at the raw content
                                const rawLines = getRawLines(note.content);
                                const originalLine = rawLines[idx];
                                const isH1 = originalLine && originalLine.trim().startsWith('{#h1#}');
                                const isH2 = originalLine && originalLine.trim().startsWith('{#h2#}');
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
        <div 
            onMouseLeave={() => {
                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                if (contextMenuPinnedSectionRef.current !== null) return;
                setHoveredSection(null);
            }}
            className={`relative ${
            focusMode 
                ? 'bg-transparent p-2 border-0' 
                : 'bg-gray-50 p-4 rounded-md border text-gray-800 text-sm leading-relaxed'
        }`}>
            {sectionActionPopup && !focusMode && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
                    onClick={closeSectionActions}
                >
                    <div
                        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-800">Section actions</h3>
                                <p className="mt-0.5 text-xs text-gray-500 truncate">{sectionActionPopup.label}</p>
                            </div>
                            <button
                                type="button"
                                onClick={closeSectionActions}
                                className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                                x
                            </button>
                        </div>

                        <label className="mb-1 block text-xs font-medium text-gray-600">
                            Append text to this section
                        </label>
                        <textarea
                            value={sectionAppendText}
                            onChange={(e) => setSectionAppendText(e.target.value)}
                            className="mb-3 min-h-[90px] w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            placeholder="Add one or more lines..."
                            autoFocus
                        />

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={appendTextToSection}
                                disabled={!sectionAppendText.trim()}
                                className={`rounded px-3 py-1.5 text-xs font-medium ${
                                    sectionAppendText.trim()
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                }`}
                            >
                                Append text
                            </button>
                            <button
                                type="button"
                                onClick={closeSectionActions}
                                className="rounded bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
	            {h2Sections.length > 0 && !focusMode && (
	                <div className="flex justify-end gap-2 mb-1">
	                    <button
	                        onClick={() => {
	                            const nextQuickAccessState = !showSectionQuickAccess;
                            const collapsedLabels = h2Sections
                                .filter(section => collapsedSections.has(section.actualIndex))
                                .map(section => section.label);

                            setShowSectionQuickAccess(nextQuickAccessState);
                            void persistSectionState(nextQuickAccessState, collapsedLabels);
                        }}
                        className={`text-xs px-1 py-0.5 rounded transition-colors ${
                            showSectionQuickAccess
                                ? 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                        title={showSectionQuickAccess ? 'Hide H2 quick access' : 'Show H2 quick access'}
                    >
                        {showSectionQuickAccess ? 'hide quick access' : 'quick access'}
                    </button>
                    <button
                        onClick={toggleH2ContentIndent}
                        disabled={h2ContentLineEntries.length === 0}
                        className={`text-xs px-1 py-0.5 rounded transition-colors ${
                            h2ContentLineEntries.length === 0
                                ? 'text-gray-300 cursor-not-allowed'
                                : isH2IndentEnabled
                                    ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                                    : 'text-gray-400 hover:text-gray-600'
                        }`}
                        title={isH2IndentEnabled ? 'Remove one tab from content under H2 sections' : 'Add one tab to content under H2 sections'}
                    >
                        {h2IndentButtonLabel}
                    </button>
                    <button
                        onClick={toggleH2SectionSpacing}
                        className={`text-xs px-1 py-0.5 rounded transition-colors ${
                            isH2SectionSpacingEnabled
                                ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                        title={isH2SectionSpacingEnabled ? 'Remove empty line after each H2 section' : 'Add an empty line after each H2 section'}
                    >
                        {h2SectionSpacingButtonLabel}
                    </button>
                    <button
                        onClick={() => {
                            const allCollapsed = h2Sections.every(s => collapsedSections.has(s.actualIndex));
                            if (allCollapsed) {
                                setCollapsedSections(new Set());
                                void persistSectionState(showSectionQuickAccess, []);
                            } else {
                                const nextCollapsedSections = new Set(h2Sections.map(s => s.actualIndex));
                                setCollapsedSections(nextCollapsedSections);
                                void persistSectionState(showSectionQuickAccess, h2Sections.map(s => s.label));
                            }
                        }}
                        className="text-xs text-gray-400 hover:text-gray-600 px-1 py-0.5 rounded transition-colors"
                        title={h2Sections.every(s => collapsedSections.has(s.actualIndex)) ? 'Expand all sections' : 'Collapse all sections'}
                    >
                        {h2Sections.every(s => collapsedSections.has(s.actualIndex)) ? '▶▶ expand all' : '▼▼ collapse all'}
                    </button>
                </div>
            )}
            {showSectionQuickAccess && h2Sections.length > 0 && !focusMode && (
                <div className="mb-3 rounded-lg border border-indigo-100 bg-white/80 px-3 py-2 shadow-sm">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-400">
                        Sections
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {h2Sections.map(section => (
                            <button
                                key={`section-quick-access-${section.actualIndex}`}
                                onClick={() => scrollToSection(section.actualIndex)}
                                className="max-w-full truncate rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:border-indigo-200 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                title={`Scroll to ${section.label}`}
                            >
                                {section.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <div className="whitespace-pre-wrap break-words break-all">
                {contentLines.map((line, idx) => {
                    const actualIdx = visibleLineEntries[idx]?.actualIndex ?? idx;
                    const isHidden = collapsedLineIndices.has(actualIdx);
                    const isQuickAccessHighlighted = highlightedQuickAccessSection === actualIdx;
                    
                    return (
                        <div 
                            key={`anim-wrap-${idx}`}
                            id={`note-${note.id}-line-${actualIdx}`}
                            className={`grid scroll-mt-20 transition-all ease-[cubic-bezier(0.4,0,0.2,1)] duration-700 relative ${
                                isHidden ? 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none' : 'grid-rows-[1fr] opacity-100 mt-1 pointer-events-auto'
                            } ${
                                isQuickAccessHighlighted ? 'animate-pulse [&_*]:!text-red-600' : ''
                            }`}
                        >
                            {/* Insertion point highlight */}
                            {insertionPoint && insertionPoint.idx === actualIdx && (
                                <div className={`absolute left-0 right-0 h-1 bg-blue-500 z-50 rounded-full transition-all ${
                                    insertionPoint.position === 'above' ? '-top-1' : '-bottom-1'
                                }`} />
                            )}
                            {/* Changed overflow-hidden to overflow-visible to prevent clipping of the insertion buttons flyout */}
                            <div className="overflow-visible min-h-0">
                                {renderLine(line, idx)}
                            </div>
                        </div>
                    );
                })}
                
                {/* Display images if any meta::image:: tags are found */}
                <NoteImages 
                    imageIds={imageIds} 
                    onDeleteImage={(imageId) => handleImageDelete(imageId)}
                />
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
                
                {/* Move-to-note note picker popup */}
                {showMoveToNotePopup && !showMoveToNoteConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                                <span className="text-sm font-semibold text-gray-800">Move to note</span>
                                <button onClick={() => setShowMoveToNotePopup(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                            </div>
                            <div className="px-4 pt-3 pb-2">
                                <input
                                    autoFocus
                                    type="text"
                                    value={moveToNoteSearch}
                                    onChange={e => setMoveToNoteSearch(e.target.value)}
                                    placeholder="Search notes…"
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                            </div>
                            <div className="overflow-y-auto max-h-64 px-2 pb-3">
                                {allNotes
                                    .filter(n => n.id !== note.id && n.content)
                                    .filter(n => {
                                        if (!moveToNoteSearch.trim()) return true;
                                        return n.content.toLowerCase().includes(moveToNoteSearch.toLowerCase());
                                    })
                                    .slice(0, 30)
                                    .map(n => {
                                        const firstLine = n.content.split('\n').find(l => l.trim() && !l.trim().startsWith('meta::')) || '';
                                        return (
                                            <button
                                                key={n.id}
                                                onClick={() => { setMoveToNoteTarget(n); setShowMoveToNoteConfirm(true); }}
                                                className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-800 transition-colors truncate"
                                            >
                                                {firstLine || '(empty note)'}
                                            </button>
                                        );
                                    })
                                }
                                {allNotes.filter(n => n.id !== note.id && n.content && (!moveToNoteSearch.trim() || n.content.toLowerCase().includes(moveToNoteSearch.toLowerCase()))).length === 0 && (
                                    <p className="text-center text-sm text-gray-400 py-4">No notes found</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Move-to-note confirmation */}
                {showMoveToNoteConfirm && moveToNoteTarget && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
                            <h3 className="text-sm font-semibold text-gray-800 mb-2">Confirm move</h3>
                            <p className="text-sm text-gray-600 mb-1">
                                Move <span className="font-semibold text-purple-700">{multiMoveSelectedRows.size} line{multiMoveSelectedRows.size !== 1 ? 's' : ''}</span> to:
                            </p>
                            <p className="text-sm font-medium text-gray-800 bg-gray-50 rounded-lg px-3 py-2 mb-4 truncate">
                                {moveToNoteTarget.content.split('\n').find(l => l.trim() && !l.trim().startsWith('meta::')) || '(empty note)'}
                            </p>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => { setShowMoveToNoteConfirm(false); }}
                                    className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleMoveToNoteConfirmed}
                                    className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                                >
                                    Move
                                </button>
                            </div>
                        </div>
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
                                            return line && line.trim().startsWith('{#h2#}');
                                        });
                                        return hasH2Lines ? '(H2 sections)' : '(consecutive lines)';
                                    })()}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleExtractToNewNote}
                                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 active:bg-green-800 transition-all duration-150 shadow-md hover:shadow-lg"
                                    title="Extract selected lines into a new note and remove from this one"
                                >
                                    ✦ New Note
                                </button>
                                <button
                                    onClick={() => setShowMoveToSectionPopup(true)}
                                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-all duration-150 shadow-md hover:shadow-lg"
                                    title="Move selected lines to an H2 section in this note"
                                >
                                    → Move to Section
                                </button>
                                <button
                                    onClick={() => { setShowMoveToNotePopup(true); setMoveToNoteSearch(''); setMoveToNoteTarget(null); }}
                                    className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 active:bg-purple-800 transition-all duration-150 shadow-md hover:shadow-lg"
                                    title="Move selected lines to an existing note"
                                >
                                    → Move to Note
                                </button>
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
                    </div>
                )}

                {showMoveToSectionPopup && (
                    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                                <span className="text-sm font-semibold text-gray-800">Move to section</span>
                                <button onClick={() => setShowMoveToSectionPopup(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                            </div>
                            <div className="px-4 py-3 text-sm text-gray-600 border-b border-gray-100">
                                Move {multiMoveSelectedRows.size} selected line{multiMoveSelectedRows.size !== 1 ? 's' : ''} under:
                            </div>
                            <div className="overflow-y-auto max-h-72 px-2 py-3">
                                {h2Sections.length > 0 ? h2Sections.map(section => {
                                    const disabled = multiMoveSelectedRows.has(section.visibleIndex);
                                    return (
                                        <button
                                            key={`move-section-${section.actualIndex}`}
                                            onClick={() => handleMoveToSectionConfirmed(section.actualIndex)}
                                            disabled={disabled}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                                disabled
                                                    ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                                                    : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-800'
                                            }`}
                                            title={disabled ? 'Cannot move a selection into a section header that is part of the selection' : section.label}
                                        >
                                            {section.label}
                                        </button>
                                    );
                                }) : (
                                    <p className="text-center text-sm text-gray-400 py-4">No H2 sections in this note</p>
                                )}
                            </div>
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
                            allNotes={allNotes}
                            addNote={addNote}
                            updateNote={updateNote}
                            currentNoteId={note.id}
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
