import React, { useState, useEffect } from 'react';
import { updateNoteById } from '../utils/ApiUtils';
import { ClockIcon, PencilIcon, XMarkIcon, CheckIcon, ClipboardDocumentListIcon, BellIcon, EyeSlashIcon, PauseIcon, ChevronDownIcon, PlayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import CadenceSelector from './CadenceSelector';
import NoteEditor from './NoteEditor';
import AddLinkModal from './AddLinkModal';
import AddTextModal from './AddTextModal';
import { checkNeedsReview, formatTimeElapsed } from '../utils/watchlistUtils';
import { Alerts } from './Alerts';
import { addCurrentDateToLocalStorage, updateCadenceHoursMinutes, findwatchitemsOverdue, findDueRemindersAsNotes, parseReviewCadenceMeta, renderCadenceSummary, getNextReviewDate, getHumanFriendlyTimeDiff, handleCadenceChange } from '../utils/CadenceHelpUtils';

// Link type indicator function
const getLinkTypeIndicator = (url) => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    
    // Instagram
    if (hostname.includes('instagram.com')) {
      return '[Instagram]';
    }
    
    // Google services
    if (hostname.includes('docs.google.com')) {
      if (pathname.includes('/document/')) {
        return '[Google Docs]';
      } else if (pathname.includes('/spreadsheets/')) {
        return '[Google Sheets]';
      } else if (pathname.includes('/presentation/')) {
        return '[Google Slides]';
      } else if (pathname.includes('/forms/')) {
        return '[Google Forms]';
      }
    }
    
    // Gmail
    if (hostname.includes('mail.google.com') || hostname.includes('gmail.com')) {
      return '[Gmail]';
    }
    
    // Slack
    if (hostname.includes('slack.com')) {
      return '[Slack]';
    }
    
    // Discord
    if (hostname.includes('discord.com') || hostname.includes('discord.gg')) {
      return '[Discord]';
    }
    
    // GitHub
    if (hostname.includes('github.com')) {
      return '[GitHub]';
    }
    
    // YouTube
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return '[YouTube]';
    }
    
    // Twitter/X
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return '[Twitter]';
    }
    
    // LinkedIn
    if (hostname.includes('linkedin.com')) {
      return '[LinkedIn]';
    }
    
    // Facebook
    if (hostname.includes('facebook.com')) {
      return '[Facebook]';
    }
    
    // Reddit
    if (hostname.includes('reddit.com')) {
      return '[Reddit]';
    }
    
    // Notion
    if (hostname.includes('notion.so')) {
      return '[Notion]';
    }
    
    // Figma
    if (hostname.includes('figma.com')) {
      return '[Figma]';
    }
    
    // Zoom
    if (hostname.includes('zoom.us')) {
      return '[Zoom]';
    }
    
    // Teams
    if (hostname.includes('teams.microsoft.com')) {
      return '[Teams]';
    }
    
    // Dropbox
    if (hostname.includes('dropbox.com')) {
      return '[Dropbox]';
    }
    
    // Google Drive
    if (hostname.includes('drive.google.com')) {
      return '[Google Drive]';
    }
    
    // OneDrive
    if (hostname.includes('onedrive.live.com') || hostname.includes('1drv.ms')) {
      return '[OneDrive]';
    }
    
    // iCloud
    if (hostname.includes('icloud.com')) {
      return '[iCloud]';
    }
    
    // Spotify
    if (hostname.includes('open.spotify.com')) {
      return '[Spotify]';
    }
    
    // Apple Music
    if (hostname.includes('music.apple.com')) {
      return '[Apple Music]';
    }
    
    // Netflix
    if (hostname.includes('netflix.com')) {
      return '[Netflix]';
    }
    
    // Amazon
    if (hostname.includes('amazon.com') || hostname.includes('amazon.co.uk') || hostname.includes('amazon.ca')) {
      return '[Amazon]';
    }
    
    // eBay
    if (hostname.includes('ebay.com')) {
      return '[eBay]';
    }
    
    // PayPal
    if (hostname.includes('paypal.com')) {
      return '[PayPal]';
    }
    
    // Stripe
    if (hostname.includes('stripe.com')) {
      return '[Stripe]';
    }
    
    // Shopify
    if (hostname.includes('shopify.com')) {
      return '[Shopify]';
    }
    
    // WordPress
    if (hostname.includes('wordpress.com')) {
      return '[WordPress]';
    }
    
    // Medium
    if (hostname.includes('medium.com')) {
      return '[Medium]';
    }
    
    // Substack
    if (hostname.includes('substack.com')) {
      return '[Substack]';
    }
    
    // Calendly
    if (hostname.includes('calendly.com')) {
      return '[Calendly]';
    }
    
    // Typeform
    if (hostname.includes('typeform.com')) {
      return '[Typeform]';
    }
    
    // Airtable
    if (hostname.includes('airtable.com')) {
      return '[Airtable]';
    }
    
    // Trello
    if (hostname.includes('trello.com')) {
      return '[Trello]';
    }
    
    // Asana
    if (hostname.includes('asana.com')) {
      return '[Asana]';
    }
    
    // Monday.com
    if (hostname.includes('monday.com')) {
      return '[Monday]';
    }
    
    // Jira
    if (hostname.includes('atlassian.net') || hostname.includes('jira.com')) {
      return '[Jira]';
    }
    
    // Confluence
    if (hostname.includes('atlassian.net') && pathname.includes('/wiki/')) {
      return '[Confluence]';
    }
    
    // Linear
    if (hostname.includes('linear.app')) {
      return '[Linear]';
    }
    
    // ClickUp
    if (hostname.includes('clickup.com')) {
      return '[ClickUp]';
    }
    
    // Notion
    if (hostname.includes('notion.so')) {
      return '[Notion]';
    }
    
    // Obsidian
    if (hostname.includes('obsidian.md')) {
      return '[Obsidian]';
    }
    
    // Roam Research
    if (hostname.includes('roamresearch.com')) {
      return '[Roam]';
    }
    
    // Logseq
    if (hostname.includes('logseq.com')) {
      return '[Logseq]';
    }
    
    // Default for unknown services
    return '';
    
  } catch (error) {
    // If URL parsing fails, return empty string
    return '';
  }
};

const ReviewOverdueAlert = ({ notes, expanded: initialExpanded = true, setNotes }) => {
  const [expandedNotes, setExpandedNotes] = useState({});
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showPriorityPopup, setShowPriorityPopup] = useState(false);
  const [noteToConvert, setNoteToConvert] = useState(null);
  const [showCadenceSelector, setShowCadenceSelector] = useState(null);
  const [overdueNotes, setOverdueNotes] = useState([]);
  const [snoozedNotes, setSnoozedNotes] = useState([]);
  const [isSnoozedExpanded, setIsSnoozedExpanded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [noteIdForLink, setNoteIdForLink] = useState(null);
  const [showAddTextModal, setShowAddTextModal] = useState(false);
  const [noteIdForText, setNoteIdForText] = useState(null);
  const [urlForText, setUrlForText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentCustomText, setCurrentCustomText] = useState('');
  const [editingLinkText, setEditingLinkText] = useState('');

  useEffect(() => {
    const overdueNotes = findwatchitemsOverdue(notes);
    // Filter out notes with reminder tag
    const filteredOverdue = overdueNotes.filter(note => !note.content.includes('meta::reminder'));
    setOverdueNotes(filteredOverdue);
    
    // Get all watch notes that are not overdue and don't have reminder tag
    const allWatchNotes = notes.filter(note => 
      note.content.includes('meta::watch') && 
      !note.content.includes('meta::reminder')
    );
    const snoozed = allWatchNotes.filter(note => !overdueNotes.some(overdue => overdue.id === note.id));
    setSnoozedNotes(snoozed);
  }, [notes]);

  const filterNotesBySearch = (notes) => {
    if (!searchText.trim()) return notes;
    
    const searchLower = searchText.toLowerCase();
    return notes.filter(note => {
      // Remove meta tags for search
      const contentWithoutMeta = note.content
        .split('\n')
        .filter(line => !line.trim().startsWith('meta::'))
        .join('\n')
        .toLowerCase();
      
      return contentWithoutMeta.includes(searchLower);
    });
  };

  const filteredOverdueNotes = filterNotesBySearch(overdueNotes);
  const filteredSnoozedNotes = filterNotesBySearch(snoozedNotes);

  if (overdueNotes.length === 0 && snoozedNotes.length === 0) return null;

  const toggleNoteExpand = (noteId) => {
    setExpandedNotes(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  };

  const handleEditNote = (note) => {
    setSelectedNote(note);
    setShowNoteEditor(true);
  };

  const handleUnfollow = async (note) => {
    try {
      // Remove the entire line containing meta::watch
      const updatedContent = note.content
        .split('\n')
        .filter(line => !line.trim().startsWith('meta::watch'))
        .join('\n')
        .trim();
      
      // Update the note
      await updateNoteById(note.id, updatedContent);
      
      // Update the notes list immediately
      const updatedNotes = notes.map(n => 
        n.id === note.id ? { ...n, content: updatedContent } : n
      );
      setNotes(updatedNotes);

      // Remove from localStorage
      const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
      delete reviews[note.id];
      localStorage.setItem('noteReviews', JSON.stringify(reviews));

      const cadences = JSON.parse(localStorage.getItem('noteReviewCadence') || '{}');
      delete cadences[note.id];
      localStorage.setItem('noteReviewCadence', JSON.stringify(cadences));

      Alerts.success('Note removed from watchlist');
    } catch (error) {
      console.error('Error unfollowing note:', error);
      Alerts.error('Failed to remove from watchlist');
    }
  };

  const formatContent = (content, note) => {
    // Split content into lines, trim each line, and filter out empty lines
    const lines = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => !line.trim().startsWith('meta::'))
      .filter(line => line.length > 0);

    // Helper to render a line with URL logic
    const renderLine = (line, key) => {
      // Check for H1 headers (###text###)
      const h1Match = line.match(/^###(.+?)###$/);
      if (h1Match) {
        const toSentenceCase = (text) => {
          if (!text || typeof text !== 'string') return text;
          return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        };
        
        return (
          <h1 key={key} className="text-2xl font-bold text-gray-900">
            {toSentenceCase(h1Match[1])}
          </h1>
        );
      }
      
      // Check for H2 headers (##text##)
      const h2Match = line.match(/^##(.+?)##$/);
      if (h2Match) {
        return (
          <h2 key={key} className="text-lg font-semibold text-purple-700">
            {h2Match[1]}
          </h2>
        );
      }
      
      // Markdown link: [text](url)
      const markdownMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
      if (markdownMatch) {
        const text = markdownMatch[1];
        const url = markdownMatch[2];
        const linkIndicator = getLinkTypeIndicator(url);
        return (
          <span key={key} className="inline-flex items-center gap-1">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              {linkIndicator ? (
                <>
                  {text} <span className="text-xs text-gray-500 font-normal">{linkIndicator}</span>
                </>
              ) : text}
            </a>
            <button
              onClick={() => handleEditText(note.id, url, text)}
              className="px-1 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-400 transition-colors duration-150"
              title="Edit link text"
            >
              Edit
            </button>
          </span>
        );
      }
      // Plain URL
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urlMatch = line.match(urlRegex);
      if (urlMatch) {
        // Replace all URLs in the line with clickable links (host name as text)
        let lastIndex = 0;
        const parts = [];
        urlMatch.forEach((url, i) => {
          const index = line.indexOf(url, lastIndex);
          if (index > lastIndex) {
            parts.push(toSentenceCase(line.slice(lastIndex, index)));
          }
          const host = url.replace(/^https?:\/\//, '').split('/')[0];
          parts.push(
            <span key={key + '-url-' + i} className="inline-flex items-center gap-1">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800"
              >
                {host}
              </a>
              <button
                onClick={() => handleAddText(note.id, url)}
                className="px-1 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-400 transition-colors duration-150"
                title="Add custom text for this link"
              >
                Add text
              </button>
            </span>
          );
          lastIndex = index + url.length;
        });
        if (lastIndex < line.length) {
          parts.push(toSentenceCase(line.slice(lastIndex)));
        }
        return <span key={key}>{parts}</span>;
      }
      // No URL, render as plain text with sentence case
      return <span key={key}>{toSentenceCase(line)}</span>;
    };

    // Function to convert text to sentence case
    const toSentenceCase = (text) => {
      // Check if it's a URL or markdown link
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const markdownMatch = text.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
      if (urlRegex.test(text) || markdownMatch) return text;

      // Convert to sentence case
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    };

    // Check if the note contains any links
    const hasAnyLinks = lines.some(line => {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const markdownMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
      return urlRegex.test(line) || markdownMatch;
    });

    // Always show first 5 lines, show more only if there are more than 5 lines
    const firstFiveLines = lines.slice(0, 5);
    const remainingLines = lines.slice(5);
    const hasMoreLines = lines.length > 5;

    return (
      <>
        {/* Always show first 5 lines */}
        {firstFiveLines.map((line, index) => {
          const isFirstLine = index === 0;
          const isSecondLine = index === 1;
          const isFirstLineH1 = line.trim().startsWith('###') && line.trim().endsWith('###');
          
          return (
            <div 
              key={index} 
              className={isFirstLine ? '' : isSecondLine ? 'mt-1 text-gray-600' : 'mt-1 text-gray-600'}
            >
              <div className="flex items-center gap-2">
                {renderLine(line, 'line-' + index)}
                {isFirstLine && !isFirstLineH1 && (
                  <button
                    onClick={() => handleConvertToH1(note, line)}
                    className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-400 transition-colors duration-150"
                    title="Convert to H1"
                  >
                    H1
                  </button>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Add link button for all notes as last line */}
        {firstFiveLines.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => handleAddLink(note.id)}
              className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
            >
              Add link
            </button>
          </div>
        )}
        
        {/* Show remaining lines if expanded */}
        {hasMoreLines && expandedNotes[content] && (
          <div className="mt-2 text-gray-600">
            {remainingLines.map((line, index) => (
              <div key={index}>{renderLine(line, 'rem-' + index)}</div>
            ))}
          </div>
        )}
        
        {/* Show more/less button only if there are more than 5 lines */}
        {hasMoreLines && (
          <button
            onClick={() => toggleNoteExpand(content)}
            className="mt-1 text-sm text-blue-600 hover:text-blue-800"
          >
            {expandedNotes[content] ? 'Show less' : `Show more (${remainingLines.length} more line${remainingLines.length > 1 ? 's' : ''})`}
          </button>
        )}
      </>
    );
  };

  const handleConvertToTodo = (note) => {
    setNoteToConvert(note);
    setShowPriorityPopup(true);
  };

  const handlePrioritySelect = async (priority) => {
    if (!noteToConvert) return;

    try {
      // Add todo tag and priority tag
      let updatedContent = `${noteToConvert.content}\nmeta::todo::`;
      
      // Add appropriate priority tag
      if (priority === 'critical') {
        updatedContent += '\nmeta::critical';
      } else {
        updatedContent += `\nmeta::${priority}`;
      }

      await updateNoteById(noteToConvert.id, updatedContent);
      
      // Update the notes list immediately
      const updatedNotes = notes.map(n => 
        n.id === noteToConvert.id ? { ...n, content: updatedContent } : n
      );
      setNotes(updatedNotes);
      
      Alerts.success(`Note converted to ${priority} priority todo`);
    } catch (error) {
      console.error('Error converting to todo:', error);
      Alerts.error('Failed to convert to todo');
    } finally {
      setShowPriorityPopup(false);
      setNoteToConvert(null);
    }
  };

  const handleCadence = async (note, hours, minutes = 0) => {
    try {
      
      const updatedContent = updateCadenceHoursMinutes(note, hours, minutes);
      if (updatedContent) {
        await updateNoteById(note.id, updatedContent);
        addCurrentDateToLocalStorage(note.id);
        setNotes(notes.map(n => n.id === note.id ? { ...n, content: updatedContent } : n));
        Alerts.success('Review cadence updated');
      }
    } catch (error) {
      console.error('Error updating cadence:', error);
      Alerts.error('Failed to update review cadence');
    }
  };

  const handleAddReminder = async (note) => {
    try {
      const updatedContent = `${note.content}\nmeta::reminder`;
      await updateNoteById(note.id, updatedContent);
      
      // Update the notes list immediately
      const updatedNotes = notes.map(n => 
        n.id === note.id ? { ...n, content: updatedContent } : n
      );
      setNotes(updatedNotes);
      
      Alerts.success('Reminder added to note');
    } catch (error) {
      console.error('Error adding reminder:', error);
      Alerts.error('Failed to add reminder');
    }
  };

  const handleUnsnooze = (note) => {
    try {
      // Get current reviews from localStorage
      const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
      
      // Delete the review entry for this note
      delete reviews[note.id];
      
      // Update localStorage
      localStorage.setItem('noteReviews', JSON.stringify(reviews));
      
      // Force a re-render by updating the notes state
      setNotes([...notes]);
      
      Alerts.success('Note unsnoozed');
    } catch (error) {
      console.error('Error unsnoozing note:', error);
      Alerts.error('Failed to unsnooze note');
    }
  };

  const handleAddLink = (noteId) => {
    setNoteIdForLink(noteId);
    setShowAddLinkModal(true);
  };

  const handleSaveLink = async (noteId, linkUrl) => {
    try {
      const note = notes.find(n => n.id === noteId);
      if (!note) return;

      // Split content into lines
      const lines = note.content.split('\n');
      
      // Find the index where meta tags start (lines that start with meta::)
      const metaTagIndex = lines.findIndex(line => line.trim().startsWith('meta::'));
      
      // If no meta tags found, add the link at the end
      const insertIndex = metaTagIndex !== -1 ? metaTagIndex : lines.length;
      
      // Insert the link before meta tags
      lines.splice(insertIndex, 0, linkUrl);
      
      // Join lines back together
      const updatedContent = lines.join('\n');
      
      // Update the note
      await updateNoteById(noteId, updatedContent);
      
      // Update the notes state
      setNotes(notes.map(n => n.id === noteId ? { ...n, content: updatedContent } : n));
      
      Alerts.success('Link added successfully');
    } catch (error) {
      console.error('Error adding link:', error);
      Alerts.error('Failed to add link');
    }
  };

  const handleAddText = (noteId, url) => {
    setNoteIdForText(noteId);
    setUrlForText(url);
    setIsEditing(false);
    setCurrentCustomText('');
    setShowAddTextModal(true);
  };

  const handleEditText = (noteId, url, customText) => {
    setNoteIdForText(noteId);
    setUrlForText(url);
    setIsEditing(true);
    setCurrentCustomText(customText);
    setEditingLinkText(customText); // Store the original text being edited
    setShowAddTextModal(true);
  };

  const handleSaveText = async (noteId, newUrl, customText) => {
    try {
      const note = notes.find(n => n.id === noteId);
      if (!note) return;

      // Split content into lines
      const lines = note.content.split('\n');
      
      // Find the line containing the URL and replace it with markdown format
      const updatedLines = lines.map(line => {
        if (isEditing) {
          // For editing, replace existing markdown link with new URL and text
          // Use a more specific regex that matches the exact text and URL being edited
          const escapedUrl = urlForText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const escapedText = editingLinkText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const markdownRegex = new RegExp(`\\[${escapedText}\\]\\(${escapedUrl}\\)`);
          if (markdownRegex.test(line)) {
            return line.replace(markdownRegex, `[${customText}](${newUrl})`);
          }
        } else {
          // For adding, replace plain URL with markdown format
          if (line.trim() === urlForText) {
            return `[${customText}](${newUrl})`;
          }
        }
        return line;
      });
      
      // Join lines back together
      const updatedContent = updatedLines.join('\n');
      
      // Update the note
      await updateNoteById(noteId, updatedContent);
      
      // Update the notes state
      setNotes(notes.map(n => n.id === noteId ? { ...n, content: updatedContent } : n));
      
      setShowAddTextModal(false);
      setIsEditing(false);
      setCurrentCustomText('');
      setEditingLinkText(''); // Clear the editing link text
      setUrlForText(newUrl); // Update the URL state with the new URL after successful edit
      
      Alerts.success(isEditing ? 'Link updated successfully' : 'Link added successfully');
    } catch (error) {
      console.error('Error saving link:', error);
      Alerts.error('Failed to save link');
    }
  };

  const handleConvertToH1 = async (note, lineText) => {
    try {
      // Split content into lines
      const lines = note.content.split('\n');
      
      // Find and replace the first line with H1 format
      const updatedLines = lines.map((line, index) => {
        if (index === 0) {
          // Remove any existing H1 markers and add new ones
          const cleanText = line.replace(/^###\s*/, '').replace(/\s*###$/, '');
          return `###${cleanText}###`;
        }
        return line;
      });
      
      // Join lines back together
      const updatedContent = updatedLines.join('\n');
      
      // Update the note
      await updateNoteById(note.id, updatedContent);
      
      // Update the notes state
      setNotes(notes.map(n => n.id === note.id ? { ...n, content: updatedContent } : n));
      
      Alerts.success('Converted to H1');
    } catch (error) {
      console.error('Error converting to H1:', error);
      Alerts.error('Failed to convert to H1');
    }
  };

  const getCadenceDisplay = (note) => {
    const meta = parseReviewCadenceMeta(note.content);
    if (!meta) {
      console.warn('No cadence meta found for note:', note);
      return 'Every 12 hours';
    }
    const summary = renderCadenceSummary(note);
    if (!summary || summary.trim() === '' || summary === 'Review every') {
      console.warn('Cadence summary is empty or invalid for note:', note, 'meta:', meta);
      return 'Every 12 hours';
    }
    // Remove "Review " from the beginning and ensure first letter is capitalized
    let display = summary.replace(/^Review\s+/, '').replace(/^[a-z]/, letter => letter.toUpperCase());
    // Remove "0d " from the beginning if present
    display = display.replace(/^Every\s+0d\s+/, 'Every ');
    // Convert 24-hour time to 12-hour format with AM/PM
    display = display.replace(/(\d{2}):(\d{2})/g, (match, hours, minutes) => {
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    });
    return display;
  };

  const getTimeUntilNextReview = (note) => {
    const nextReview = getNextReviewDate(note);
    if (!nextReview) return null;
    
    const now = new Date();
    const timeUntilNext = nextReview - now;
    if (timeUntilNext <= 0) return null;
    
    const diff = getHumanFriendlyTimeDiff(nextReview);
    // Remove "0d " from the beginning if present
    return diff.replace(/^0d\s+/, '');
  };

  const onCadenceChange = (note, cadenceObj) => {
    try {
      const updatedContent = handleCadenceChange(note, cadenceObj);
      if (updatedContent) {
        // Update the notes list immediately
        const updatedNotes = notes.map(n => 
          n.id === note.id ? { ...n, content: updatedContent } : n
        );
        setNotes(updatedNotes);
        setShowCadenceSelector(null);
        Alerts.success('Review cadence updated');
      }
    } catch (error) {
      console.error('Error updating cadence:', error);
      Alerts.error('Failed to update review cadence');
    }
  };

  return (
    <div className="w-full">
      {/* Search Box */}
      <div className="mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
            placeholder="Search watchlist..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Overdue Notes Section */}
      {filteredOverdueNotes.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden h-full mb-4">
          <div className="bg-red-50 px-6 py-4 border-b border-red-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ClockIcon className="h-6 w-6 text-red-500" />
                <h3 className="ml-3 text-base font-semibold text-red-800">
                  Review Overdue ({filteredOverdueNotes.length})
                </h3>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredOverdueNotes.map((note, index) => {
              const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
              const reviewTime = reviews[note.id];
              const timeUntilNext = getTimeUntilNextReview(note);

              return (
                <div 
                  key={note.id} 
                  className={`px-6 py-3 transition-colors duration-150 min-h-[120px] ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-gray-100`}
                >
                  <div className="grid grid-cols-4 gap-4">
                    {/* First Section - Description (50%) */}
                    <div className="col-span-2 flex flex-col">
                      <h4 className="text-base font-medium text-gray-900 mb-2 break-words">
                        {formatContent(note.content, note)}
                      </h4>
                      <div className="flex flex-col gap-1 text-sm text-gray-500">
                        <div className="grid grid-cols-[120px_1fr] items-center">
                          <span className="text-xs text-gray-500">Review cadence:</span>
                          <span className="text-xs text-gray-500">{getCadenceDisplay(note)}</span>
                        </div>
                        {timeUntilNext && (
                          <div className="grid grid-cols-[120px_1fr] items-center">
                            <span className="text-xs text-red-500">Next review:</span>
                            <span className="text-xs text-red-500">{timeUntilNext}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Second Section - Review In Buttons (25%) */}
                    <div className="flex flex-wrap gap-1 items-center justify-end">
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-sm text-gray-600 mr-2">Review in:</span>
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => handleCadence(note, 2, 0)}
                            className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                            title="Set 2 hour cadence"
                          >
                            2h
                          </button>
                          <button
                            onClick={() => handleCadence(note, 4, 0)}
                            className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                            title="Set 4 hour cadence"
                          >
                            4h
                          </button>
                          <button
                            onClick={() => handleCadence(note, 12, 0)}
                            className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                            title="Set 12 hour cadence"
                          >
                            12h
                          </button>
                          <button
                            onClick={() => handleCadence(note, 48, 0)}
                            className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                            title="Set 2 day cadence"
                          >
                            2d
                          </button>
                          <button
                            onClick={() => handleCadence(note, 72, 0)}
                            className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                            title="Set 3 day cadence"
                          >
                            3d
                          </button>
                          <button
                            onClick={() => handleCadence(note, 168, 0)}
                            className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                            title="Set 7 day cadence"
                          >
                            7d
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Third Section - Unfollow and Actions */}
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleUnfollow(note)}
                        className="p-2 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
                        title="Remove from watchlist"
                      >
                        <EyeSlashIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEditNote(note)}
                        className="p-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                        title="Edit note"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <div 
                        onClick={() => toggleNoteExpand(`actions-${note.id}`)}
                        className="py-2 text-xs font-medium text-gray-700 cursor-pointer flex items-center"
                      >
                        <div className="flex items-center">
                          <span>Actions</span>
                          <svg
                            className={`w-4 h-4 ml-1 transform transition-transform duration-200 ${expandedNotes[`actions-${note.id}`] ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Dropdown */}
                  {expandedNotes[`actions-${note.id}`] && (
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-2 justify-end">
                        {showCadenceSelector === note.id ? (
                          <CadenceSelector
                            noteId={note.id}
                            notes={notes}
                            onCadenceChange={async () => {
                              // Fetch the updated note content (simulate by reloading from backend or localStorage)
                              // For now, re-fetch from backend is not shown, so we update from localStorage or force a refresh
                              // Option 1: If you have a way to fetch the updated note, do it here
                              // Option 2: For now, just close the selector and force a re-render
                              const updatedNotes = notes.map(n => {
                                if (n.id === note.id) {
                                  // Try to get the latest content from localStorage if available
                                  // (Assume updateCadenceHoursMinutes already updated the note content in localStorage)
                                  // If not, just keep the old content (will update on next full refresh)
                                  return { ...n, content: n.content };
                                }
                                return n;
                              });
                              setNotes(updatedNotes);
                              setShowCadenceSelector(null);
                            }}
                          />
                        ) : (
                          <button
                            onClick={() => setShowCadenceSelector(note.id)}
                            className="px-4 py-2 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                            title="Set custom cadence"
                          >
                            <ClockIcon className="w-5 h-5 inline-block mr-1" />
                            <span>Set cadence</span>
                          </button>
                        )}
                        {!note.content.includes('meta::reminder') && (
                          <button
                            onClick={() => handleAddReminder(note)}
                            className="px-4 py-2 text-xs font-medium text-yellow-700 bg-yellow-50 rounded-lg hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-150"
                            title="Set as reminder"
                          >
                            <BellIcon className="w-5 h-5 inline-block mr-1" />
                            <span>Set as reminder</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Snoozed Notes Section */}
      {filteredSnoozedNotes.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden h-full">
          <div 
            className="bg-gray-50 px-6 py-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors duration-150"
            onClick={() => setIsSnoozedExpanded(!isSnoozedExpanded)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <PauseIcon className="h-6 w-6 text-gray-500" />
                <h3 className="ml-3 text-base font-semibold text-gray-800">
                  Snoozing Watch List ({filteredSnoozedNotes.length})
                </h3>
              </div>
              <ChevronDownIcon 
                className={`h-5 w-5 text-gray-500 transform transition-transform duration-200 ${
                  isSnoozedExpanded ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>
          {isSnoozedExpanded && (
            <div className="divide-y divide-gray-100">
              {filteredSnoozedNotes.map((note, index) => {
                const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
                const reviewTime = reviews[note.id];
                const timeUntilNext = getTimeUntilNextReview(note);

                return (
                  <div 
                    key={note.id} 
                    className={`px-6 py-3 transition-colors duration-150 min-h-[120px] ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-gray-100`}
                  >
                    <div className="grid grid-cols-4 gap-4">
                      {/* First Section - Description (50%) */}
                      <div className="col-span-2 flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                          <PauseIcon className="h-4 w-4 text-gray-400" />
                          <h4 className="text-base font-medium text-gray-900 break-words">
                            {formatContent(note.content, note)}
                          </h4>
                        </div>
                        <div className="flex flex-col gap-1 text-sm text-gray-500">
                          <div className="grid grid-cols-[120px_1fr] items-center">
                            <span className="text-xs text-gray-500">Review cadence:</span>
                            <span className="text-xs text-gray-500">{getCadenceDisplay(note)}</span>
                          </div>
                          {timeUntilNext && (
                            <div className="grid grid-cols-[120px_1fr] items-center">
                              <span className="text-xs text-gray-500">Next review:</span>
                              <span className="text-xs text-gray-500">{timeUntilNext}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Second Section - Review In Buttons (25%) */}
                      <div className="flex flex-wrap gap-1 items-center justify-end">
                        <div className="flex flex-wrap gap-1 items-center">
                          <span className="text-sm text-gray-600 mr-2">Review in:</span>
                          <div className="flex flex-wrap gap-1">
                            <button
                              onClick={() => handleCadence(note, 2, 0)}
                              className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                              title="Set 2 hour cadence"
                            >
                              2h
                            </button>
                            <button
                              onClick={() => handleCadence(note, 4, 0)}
                              className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                              title="Set 4 hour cadence"
                            >
                              4h
                            </button>
                            <button
                              onClick={() => handleCadence(note, 12, 0)}
                              className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                              title="Set 12 hour cadence"
                            >
                              12h
                            </button>
                            <button
                              onClick={() => handleCadence(note, 48, 0)}
                              className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                              title="Set 2 day cadence"
                            >
                              2d
                            </button>
                            <button
                              onClick={() => handleCadence(note, 72, 0)}
                              className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                              title="Set 3 day cadence"
                            >
                              3d
                            </button>
                            <button
                              onClick={() => handleCadence(note, 168, 0)}
                              className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                              title="Set 7 day cadence"
                            >
                              7d
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Third Section - Unfollow and Actions */}
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleUnsnooze(note)}
                          className="p-2 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-150"
                          title="Unsnooze note"
                        >
                          <PlayIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleUnfollow(note)}
                          className="p-2 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
                          title="Remove from watchlist"
                        >
                          <EyeSlashIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleEditNote(note)}
                          className="p-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                          title="Edit note"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <div 
                          onClick={() => toggleNoteExpand(`actions-${note.id}`)}
                          className="py-2 text-xs font-medium text-gray-700 cursor-pointer flex items-center"
                        >
                          <div className="flex items-center">
                            <span>Actions</span>
                            <svg
                              className={`w-4 h-4 ml-1 transform transition-transform duration-200 ${expandedNotes[`actions-${note.id}`] ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions Dropdown */}
                    {expandedNotes[`actions-${note.id}`] && (
                      <div className="mt-4">
                        <div className="flex flex-wrap gap-2 justify-end">
                          {showCadenceSelector === note.id ? (
                            <CadenceSelector
                              noteId={note.id}
                              notes={notes}
                              onCadenceChange={async () => {
                                // Fetch the updated note content (simulate by reloading from backend or localStorage)
                                // For now, re-fetch from backend is not shown, so we update from localStorage or force a refresh
                                // Option 1: If you have a way to fetch the updated note, do it here
                                // Option 2: For now, just close the selector and force a re-render
                                const updatedNotes = notes.map(n => {
                                  if (n.id === note.id) {
                                    // Try to get the latest content from localStorage if available
                                    // (Assume updateCadenceHoursMinutes already updated the note content in localStorage)
                                    // If not, just keep the old content (will update on next full refresh)
                                    return { ...n, content: n.content };
                                  }
                                  return n;
                                });
                                setNotes(updatedNotes);
                                setShowCadenceSelector(null);
                              }}
                            />
                          ) : (
                            <button
                              onClick={() => setShowCadenceSelector(note.id)}
                              className="px-4 py-2 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                              title="Set custom cadence"
                            >
                              <ClockIcon className="w-5 h-5 inline-block mr-1" />
                              <span>Set cadence</span>
                            </button>
                          )}
                          {!note.content.includes('meta::reminder') && (
                            <button
                              onClick={() => handleAddReminder(note)}
                              className="px-4 py-2 text-xs font-medium text-yellow-700 bg-yellow-50 rounded-lg hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-150"
                              title="Set as reminder"
                            >
                              <BellIcon className="w-5 h-5 inline-block mr-1" />
                              <span>Set as reminder</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Show message when no results found */}
      {searchText && filteredOverdueNotes.length === 0 && filteredSnoozedNotes.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          No notes found matching "{searchText}"
        </div>
      )}

      {/* Priority Selection Popup */}
      {showPriorityPopup && noteToConvert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Select Priority</h3>
              <button
                onClick={() => setShowPriorityPopup(false)}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-2">
              {['critical', 'high', 'medium', 'low'].map((priority) => (
                <button
                  key={priority}
                  onClick={() => handlePrioritySelect(priority)}
                  className={`w-full px-4 py-2 text-left text-sm font-medium rounded-lg transition-colors duration-150 ${
                    priority === 'critical' 
                      ? 'text-red-700 hover:bg-red-50' 
                      : priority === 'high'
                      ? 'text-orange-700 hover:bg-orange-50'
                      : priority === 'medium'
                      ? 'text-yellow-700 hover:bg-yellow-50'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Note Editor Modal */}
      {showNoteEditor && selectedNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Edit Note</h2>
              <button
                onClick={() => setShowNoteEditor(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <NoteEditor
              note={selectedNote}
              onSave={async (updatedContent) => {
                try {
                  await updateNoteById(selectedNote.id, updatedContent);
                  // Update the notes list immediately after successful update
                  const updatedNotes = notes.map(n => 
                    n.id === selectedNote.id ? { ...n, content: updatedContent } : n
                  );
                  setNotes(updatedNotes);
                  setShowNoteEditor(false);
                  Alerts.success('Note updated successfully');
                } catch (error) {
                  console.error('Error updating note:', error);
                  Alerts.error('Failed to update note');
                }
              }}
              onCancel={() => setShowNoteEditor(false)}
              objList={[]}
            />
          </div>
        </div>
      )}

      {/* Add Link Modal */}
      <AddLinkModal
        isOpen={showAddLinkModal}
        onClose={() => setShowAddLinkModal(false)}
        onSave={handleSaveLink}
        noteId={noteIdForLink}
      />

      {/* Add Text Modal */}
      <AddTextModal
        isOpen={showAddTextModal}
        onClose={() => setShowAddTextModal(false)}
        onSave={handleSaveText}
        noteId={noteIdForText}
        url={urlForText}
        isEditing={isEditing}
        initialText={currentCustomText}
      />
    </div>
  );
};

export default ReviewOverdueAlert; 