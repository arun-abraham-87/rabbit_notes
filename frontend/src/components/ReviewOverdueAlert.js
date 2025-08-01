import React, { useState, useEffect, useRef } from 'react';
import { updateNoteById } from '../utils/ApiUtils';
import { ClockIcon, PencilIcon, XMarkIcon, CheckIcon, ClipboardDocumentListIcon, BellIcon, EyeSlashIcon, PauseIcon, ChevronDownIcon, PlayIcon, MagnifyingGlassIcon, MoonIcon } from '@heroicons/react/24/outline';
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

const ReviewOverdueAlert = ({ notes, expanded: initialExpanded = true, setNotes, isReviewsOverdueOnlyMode = false, searchInputRef }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [searchText, setSearchText] = useState('');
  const [expandedNotes, setExpandedNotes] = useState({});
  const [showCadenceSelector, setShowCadenceSelector] = useState(null);
  const [showAddLinkModal, setShowAddLinkModal] = useState(null);
  const [showAddTextModal, setShowAddTextModal] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [focusedReviewIndex, setFocusedReviewIndex] = useState(-1);
  const [showPriorityPopup, setShowPriorityPopup] = useState(false);
  const [noteToConvert, setNoteToConvert] = useState(null);
  const [noteIdForLink, setNoteIdForLink] = useState(null);
  const [noteIdForText, setNoteIdForText] = useState(null);
  const [urlForText, setUrlForText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentCustomText, setCurrentCustomText] = useState('');
  const [editingLinkText, setEditingLinkText] = useState('');
  const [overdueNotes, setOverdueNotes] = useState([]);
  const [snoozedNotes, setSnoozedNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [isSnoozedExpanded, setIsSnoozedExpanded] = useState(false);
  const [showLinkPopup, setShowLinkPopup] = useState(false);
  const [linkPopupLinks, setLinkPopupLinks] = useState([]);
  const [selectedLinkIndex, setSelectedLinkIndex] = useState(0);
  const [snoozeToast, setSnoozeToast] = useState(null);
  const [isWaitingForJump, setIsWaitingForJump] = useState(false);
  const [isWaitingForDoubleG, setIsWaitingForDoubleG] = useState(false);
  const [showRelativeNumbers, setShowRelativeNumbers] = useState(() => {
    const saved = localStorage.getItem('reviewsRelativeNumbers');
    return saved ? JSON.parse(saved) : true;
  });
  const numberBufferRef = useRef('');

  useEffect(() => {
    const overdue = findwatchitemsOverdue(notes).filter(note => !note.content.includes('meta::reminder'));
    
    // Sort overdue notes to prioritize those with meta::review_overdue_priority tag
    const sortedOverdue = overdue.sort((a, b) => {
      const aHasPriority = a.content.includes('meta::review_overdue_priority');
      const bHasPriority = b.content.includes('meta::review_overdue_priority');
      
      if (aHasPriority && !bHasPriority) return -1; // a comes first
      if (!aHasPriority && bHasPriority) return 1;  // b comes first
      return 0; // keep original order for notes with same priority status
    });
    
    setOverdueNotes(sortedOverdue);

    const allWatchNotes = notes.filter(note =>
      note.content.includes('meta::watch') &&
      !note.content.includes('meta::reminder')
    );
    const snoozed = allWatchNotes.filter(note => !overdue.some(overdueNote => overdueNote.id === note.id));
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

  const toggleRelativeNumbers = () => {
    const newValue = !showRelativeNumbers;
    setShowRelativeNumbers(newValue);
    localStorage.setItem('reviewsRelativeNumbers', JSON.stringify(newValue));
  };

  // Calculate relative position for vim navigation
  const getRelativePosition = (currentIndex, focusedIndex, totalItems) => {
    if (focusedIndex === -1) return null;
    const relativePos = Math.abs(currentIndex - focusedIndex);
    if (relativePos === 0) return '0';
    return `${relativePos}`;
  };

  // Add keyboard navigation for reviews-overdue-only mode
  useEffect(() => {
    if (!isReviewsOverdueOnlyMode) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const totalReviews = filteredOverdueNotes.length + filteredSnoozedNotes.length;
      if (totalReviews === 0) return;

      // Handle number input for jump navigation (like 4j)
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        numberBufferRef.current += e.key;
        setIsWaitingForJump(true);
        
        // Set a timeout to clear the buffer if no 'j' is pressed
        setTimeout(() => {
          if (isWaitingForJump) {
            numberBufferRef.current = '';
            setIsWaitingForJump(false);
          }
        }, 2000);
        return;
      }

      // Handle 'j' key for relative movement down
      if (isWaitingForJump && e.key === 'j' && numberBufferRef.current.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const steps = parseInt(numberBufferRef.current);
        setFocusedReviewIndex(prev => {
          const newIndex = prev + steps;
          return newIndex < totalReviews ? newIndex : totalReviews - 1;
        });
        numberBufferRef.current = '';
        setIsWaitingForJump(false);
        return;
      }

      // Handle 'k' key for relative movement up
      if (isWaitingForJump && e.key === 'k' && numberBufferRef.current.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const steps = parseInt(numberBufferRef.current);
        setFocusedReviewIndex(prev => {
          const newIndex = prev - steps;
          return newIndex >= 0 ? newIndex : 0;
        });
        numberBufferRef.current = '';
        setIsWaitingForJump(false);
        return;
      }

      // Handle 'g' key (gg for first item)
      if (e.key === 'g') {
        e.preventDefault();
        e.stopPropagation();
        
        if (isWaitingForDoubleG) {
          // Double 'g' pressed - go to first item
          setFocusedReviewIndex(0);
          setIsWaitingForDoubleG(false);
        } else {
          // First 'g' pressed - wait for second 'g'
          setIsWaitingForDoubleG(true);
          setTimeout(() => {
            setIsWaitingForDoubleG(false);
          }, 300); // 300ms timeout for double 'g'
        }
        return;
      }

      // Handle 'G' key (last item)
      if (e.key === 'G') {
        e.preventDefault();
        e.stopPropagation();
        setFocusedReviewIndex(totalReviews - 1);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setFocusedReviewIndex(prev => 
          prev > 0 ? prev - 1 : totalReviews - 1
        );
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setFocusedReviewIndex(prev => 
          prev < totalReviews - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'Enter' && focusedReviewIndex >= 0) {
        e.preventDefault();
        e.stopPropagation();
        // Open all links in the focused review note
        const allNotes = [...filteredOverdueNotes, ...filteredSnoozedNotes];
        const focusedReview = allNotes[focusedReviewIndex];
        if (focusedReview) {
          // Extract all URLs (plain and markdown) from the note content
          const links = [];
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          const markdownRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
          let match;
          // Extract markdown links
          while ((match = markdownRegex.exec(focusedReview.content)) !== null) {
            links.push({ url: match[2], text: match[1] });
          }
          // Extract plain URLs
          const markdownUrls = links.map(link => link.url);
          while ((match = urlRegex.exec(focusedReview.content)) !== null) {
            if (!markdownUrls.includes(match[1])) {
              links.push({ url: match[1], text: match[1] });
            }
          }
          if (links.length === 1) {
            window.open(links[0].url, '_blank', 'noopener,noreferrer');
          } else if (links.length > 1) {
            setLinkPopupLinks(links);
            setSelectedLinkIndex(0);
            setShowLinkPopup(true);
          }
        }
      } else if (e.key === 's' && focusedReviewIndex >= 0) {
        e.preventDefault();
        e.stopPropagation();
        // Snooze the focused review note
        const allNotes = [...filteredOverdueNotes, ...filteredSnoozedNotes];
        const focusedReview = allNotes[focusedReviewIndex];
        if (focusedReview) {
          // Add a snooze entry for this note in localStorage
          const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
          // Set next review to 24 hours from now (or adjust as needed)
          const nextReview = new Date();
          nextReview.setHours(nextReview.getHours() + 24);
          reviews[focusedReview.id] = nextReview.toISOString();
          localStorage.setItem('noteReviews', JSON.stringify(reviews));
          // Force a re-render by updating the notes state
          setNotes([...notes]);
          Alerts.success('Note snoozed for 24 hours');
        }
      }
      else if (/^[1-9]$/.test(e.key) && focusedReviewIndex >= 0) {
        const allNotes = [...filteredOverdueNotes, ...filteredSnoozedNotes];
        const focusedReview = allNotes[focusedReviewIndex];
        if (focusedReview) {
          // Get cadence options as in the grid
          const cadence = parseReviewCadenceMeta(focusedReview.content) || {};
          const defaultOptions = [
            { h: 2, label: '2h' },
            { h: 4, label: '4h' },
            { h: 12, label: '12h' },
            { h: 48, label: '2d' },
          ];
          let options = [...defaultOptions];
          if (cadence.type === 'every-x-hours' && cadence.hours && !defaultOptions.some(opt => opt.h === cadence.hours && (cadence.minutes || 0) === 0)) {
            options.push({ h: cadence.hours, label: cadence.hours >= 24 ? `${cadence.hours / 24}d` : `${cadence.hours}h` });
          }
          const idx = parseInt(e.key, 10) - 1;
          if (options[idx]) {
            const hours = options[idx].h;
            // Set cadence meta and snooze for that many hours
            handleCadence(focusedReview, hours, 0);
            // Also snooze for that many hours
            const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
            const nextReview = new Date();
            nextReview.setHours(nextReview.getHours() + hours);
            reviews[focusedReview.id] = nextReview.toISOString();
            localStorage.setItem('noteReviews', JSON.stringify(reviews));
            setNotes([...notes]);
            Alerts.success(`Note snoozed for ${hours} hours and cadence set.`);
            setSnoozeToast(`Note snoozed for ${hours} hours.`);
            setTimeout(() => setSnoozeToast(null), 2000);
          }
        }
      }
      else if (e.key === 'e' && focusedReviewIndex >= 0) {
        e.preventDefault();
        e.stopPropagation();
        const allNotes = [...filteredOverdueNotes, ...filteredSnoozedNotes];
        const focusedReview = allNotes[focusedReviewIndex];
        if (focusedReview) {
          setSelectedNote(focusedReview);
          setShowNoteEditor(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isReviewsOverdueOnlyMode, filteredOverdueNotes.length, filteredSnoozedNotes.length, focusedReviewIndex, filteredOverdueNotes, filteredSnoozedNotes]);

  // Reset focused index when reviews change
  useEffect(() => {
    setFocusedReviewIndex(-1);
  }, [filteredOverdueNotes, filteredSnoozedNotes]);

  // Scroll to focused review when it changes
  useEffect(() => {
    if (isReviewsOverdueOnlyMode && focusedReviewIndex >= 0) {
      const allNotes = [...filteredOverdueNotes, ...filteredSnoozedNotes];
      const focusedReview = allNotes[focusedReviewIndex];
      if (focusedReview) {
        // Find the DOM element and scroll to it
        const reviewElement = document.querySelector(`[data-review-id="${focusedReview.id}"]`);
        if (reviewElement) {
          reviewElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [focusedReviewIndex, isReviewsOverdueOnlyMode, filteredOverdueNotes, filteredSnoozedNotes]);

  // Add effect for link popup keyboard navigation
  useEffect(() => {
    if (!showLinkPopup) return;
    const handleLinkPopupKeyDown = (e) => {
      if (!showLinkPopup) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'ArrowUp') {
        setSelectedLinkIndex(prev => prev > 0 ? prev - 1 : linkPopupLinks.length - 1);
      } else if (e.key === 'ArrowDown') {
        setSelectedLinkIndex(prev => prev < linkPopupLinks.length - 1 ? prev + 1 : 0);
      } else if (e.key === 'Enter') {
        if (linkPopupLinks[selectedLinkIndex]) {
          window.open(linkPopupLinks[selectedLinkIndex].url, '_blank', 'noopener,noreferrer');
          setShowLinkPopup(false);
          setLinkPopupLinks([]);
          setSelectedLinkIndex(0);
        }
      } else if (e.key === 'Escape') {
        setShowLinkPopup(false);
        setLinkPopupLinks([]);
        setSelectedLinkIndex(0);
      }
    };
    document.addEventListener('keydown', handleLinkPopupKeyDown, true);
    return () => document.removeEventListener('keydown', handleLinkPopupKeyDown, true);
  }, [showLinkPopup, linkPopupLinks, selectedLinkIndex]);

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

  const handleAddPriority = async (note) => {
    try {
      // Check if the priority tag already exists
      if (note.content.includes('meta::review_overdue_priority')) {
        // Remove the priority tag to unflag the note
        const updatedContent = note.content
          .split('\n')
          .filter(line => !line.trim().startsWith('meta::review_overdue_priority'))
          .join('\n');
        
        // Update the note
        await updateNoteById(note.id, updatedContent);
        
        // Update the notes list immediately
        const updatedNotes = notes.map(n => 
          n.id === note.id ? { ...n, content: updatedContent } : n
        );
        setNotes(updatedNotes);

        Alerts.success('Note unflagged as priority');
        return;
      }

      // Remove any existing cadence tags and add the priority tag
      let updatedContent = note.content
        .split('\n')
        .filter(line => !line.trim().startsWith('meta::review_cadence::'))
        .join('\n');
      
      // Add the priority tag to the note content
      updatedContent = updatedContent + '\nmeta::review_overdue_priority';
      
      // Update the note
      await updateNoteById(note.id, updatedContent);
      
      // Update the notes list immediately
      const updatedNotes = notes.map(n => 
        n.id === note.id ? { ...n, content: updatedContent } : n
      );
      setNotes(updatedNotes);

      Alerts.success('Note flagged as priority');
    } catch (error) {
      console.error('Error toggling priority flag:', error);
      Alerts.error('Failed to toggle priority flag');
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
              </div>
            </div>
          );
        })}
        
        {/* Add link button for all notes as last line */}
        {firstFiveLines.length > 0 && !note.content.includes('meta::no_link') && (
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => handleAddLink(note.id)}
              className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
            >
              Add link
            </button>
            {!hasAnyLinks && (
              <button
                onClick={() => handleAddNoLink(note.id)}
                className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-150"
              >
                No link
              </button>
            )}
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

  const handleAddNoLink = async (noteId) => {
    try {
      const note = notes.find(n => n.id === noteId);
      if (!note) return;

      // Add the no_link meta tag
      const updatedContent = `${note.content}\nmeta::no_link`;
      
      // Update the note
      await updateNoteById(noteId, updatedContent);
      
      // Update the notes state
      setNotes(notes.map(n => n.id === noteId ? { ...n, content: updatedContent } : n));
      
      Alerts.success('No link preference added');
    } catch (error) {
      console.error('Error adding no link preference:', error);
      Alerts.error('Failed to add no link preference');
    }
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
    // Check if note has watch meta tag but no cadence meta tag
    const hasWatchMeta = note.content.includes('meta::watch::');
    const meta = parseReviewCadenceMeta(note.content);
    
    if (!meta) {
      if (hasWatchMeta) {
        // Note has watch meta but no cadence meta - this is a valid case
        return 'Every 12 hours';
      } else {
        // Note doesn't have watch meta at all - shouldn't be in this component
        console.warn('Note without watch meta found in ReviewOverdueAlert:', note);
        return 'Every 12 hours';
      }
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
    // Check if note has watch meta tag
    const hasWatchMeta = note.content.includes('meta::watch::');
    if (!hasWatchMeta) {
      return null; // Not a watch note
    }
    
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
      {/* Number buffer indicator */}
      {isReviewsOverdueOnlyMode && isWaitingForJump && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Jump to:</span>
            <span className="text-lg font-bold">{numberBufferRef.current}</span>
            <span className="text-xs opacity-75">Press j/k</span>
          </div>
        </div>
      )}

      {/* Relative numbers toggle */}
      {isReviewsOverdueOnlyMode && (
        <div className="fixed top-24 left-4 bg-white border border-gray-300 rounded-lg shadow-lg z-50 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Numbers:</span>
            <button
              onClick={toggleRelativeNumbers}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                showRelativeNumbers ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  showRelativeNumbers ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

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
            ref={searchInputRef}
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
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ClockIcon className="h-6 w-6 text-gray-500" />
                <h3 className="ml-3 text-base font-semibold text-gray-800">
                  Reviews Due ({filteredOverdueNotes.length})
                </h3>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredOverdueNotes.map((note, index) => {
              const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
              const reviewTime = reviews[note.id];
              const timeUntilNext = getTimeUntilNextReview(note);
              const isFocused = isReviewsOverdueOnlyMode && focusedReviewIndex === index;

              return (
                <div 
                  key={note.id} 
                  data-review-id={note.id}
                  className={`px-6 py-3 transition-colors duration-150 min-h-[120px] ${
                    isFocused 
                      ? 'bg-blue-50 border-l-4 border-blue-500' 
                      : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-gray-100`}
                  onClick={() => {
                    if (isReviewsOverdueOnlyMode) {
                      setFocusedReviewIndex(index);
                    }
                  }}
                >
                  {/* Note Sub-Card */}
                  <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border rounded-lg p-4 shadow-sm ${
                    note.content.includes('meta::review_overdue_priority') 
                      ? 'border-red-400 border-2' 
                      : 'border-blue-200 border'
                  }`}>
                  <div className="grid grid-cols-4 gap-4">
                    {/* Relative position indicator for vim navigation */}
                    {isReviewsOverdueOnlyMode && showRelativeNumbers && (
                      <div className="col-span-4 mb-2">
                        <div className="text-xs font-mono font-bold text-gray-600 px-2 py-1 min-w-[2rem] text-center inline-block">
                          {getRelativePosition(index, focusedReviewIndex, filteredOverdueNotes.length + filteredSnoozedNotes.length)}
                        </div>
                      </div>
                    )}
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

                    {/* Combined Review In Buttons and Actions */}
                    <div className="col-span-2 flex items-center justify-end">
                      <div className="flex items-center gap-2">
                        <div className="grid grid-cols-5 gap-2">
                          {!note.content.includes('meta::review_overdue_priority') && (
                            <button
                              onClick={() => handleAddPriority(note)}
                              className="flex flex-col items-center justify-center px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                              title="Flag note"
                              style={{ minWidth: 48, minHeight: 48 }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H8.5l-1-1H5a2 2 0 00-2 2z" />
                              </svg>
                            </button>
                          )}
                          {!note.content.includes('meta::review_overdue_priority') && (() => {
                            const cadence = parseReviewCadenceMeta(note.content) || {};
                            const isSelected = (h, m = 0) => {
                              if (!cadence.type && h === 12 && m === 0) return true; // default
                              return cadence.type === 'every-x-hours' && cadence.hours === h && (cadence.minutes || 0) === m;
                            };
                            const defaultOptions = [
                              { h: 2, label: '2h' },
                              { h: 4, label: '4h' },
                              { h: 12, label: '12h' },
                              { h: 48, label: '2d' },
                            ];
                            let options = [...defaultOptions];
                            // If current cadence is not in options, add it
                            if (cadence.type === 'every-x-hours' && cadence.hours && !defaultOptions.some(opt => opt.h === cadence.hours && (cadence.minutes || 0) === 0)) {
                              options.push({ h: cadence.hours, label: cadence.hours >= 24 ? `${cadence.hours / 24}d` : `${cadence.hours}h` });
                            }
                            return options.map(({ h, label }, idx) => (
                              <button
                                key={label}
                                onClick={() => handleCadence(note, h, 0)}
                                className={`flex flex-col items-center justify-center px-2 py-1 text-xs font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 ${
                                  isSelected(h, 0)
                                    ? 'bg-purple-600 text-white border border-purple-700'
                                    : 'text-purple-700 bg-purple-50 hover:bg-purple-100 focus:ring-purple-500 focus:border-purple-500'
                                }`}
                                title={`Set ${label} cadence`}
                                style={{ minWidth: 48 }}
                              >
                                <span className="text-xs text-gray-400 mb-0.5">{idx + 1}</span>
                                <span>{label}</span>
                              </button>
                            ));
                          })()}
                          {note.content.includes('meta::review_overdue_priority') && (
                            <div className="col-span-4"></div>
                          )}
                          {note.content.includes('meta::review_overdue_priority') && (
                            <button
                              onClick={() => handleAddPriority(note)}
                              className="flex flex-col items-center justify-center px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
                              title="Flag note"
                              style={{ minWidth: 48, minHeight: 48 }}
                            >
                              <svg className="w-4 h-4" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H8.5l-1-1H5a2 2 0 00-2 2z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      <div 
                        onClick={() => toggleNoteExpand(`actions-${note.id}`)}
                        className="text-xs font-medium text-gray-700 cursor-pointer flex items-center p-1 rounded hover:bg-gray-100"
                      >
                        <ChevronDownIcon className={`w-4 h-4 transform transition-transform duration-200 ${expandedNotes[`actions-${note.id}`] ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {/* Actions Dropdown */}
                  {expandedNotes[`actions-${note.id}`] && (
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-2 justify-end">
                        <button
                          onClick={() => handleUnfollow(note)}
                          className="px-4 py-2 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
                          title="Remove from watchlist"
                        >
                          Unwatch
                        </button>
                        <button
                          onClick={() => handleEditNote(note)}
                          className="px-4 py-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                          title="Edit note"
                        >
                          Edit
                        </button>
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
                            Set cadence
                          </button>
                        )}
                        {!note.content.includes('meta::reminder') && (
                          <button
                            onClick={() => handleAddReminder(note)}
                            className="px-4 py-2 text-xs font-medium text-yellow-700 bg-yellow-50 rounded-lg hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-150"
                            title="Set as reminder"
                          >
                            Set as reminder
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  </div>
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
                <MoonIcon className="h-6 w-6 text-gray-500" />
                <h3 className="ml-3 text-base font-semibold text-gray-800">
                  Snoozing Reviews ({filteredSnoozedNotes.length})
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
                    onClick={() => {
                      if (isReviewsOverdueOnlyMode) {
                        setFocusedReviewIndex(filteredOverdueNotes.length + index);
                      }
                    }}
                  >
                    {/* Note Sub-Card */}
                    <div className={`bg-gradient-to-r from-green-50 to-emerald-50 border rounded-lg p-4 shadow-sm ${
                      note.content.includes('meta::review_overdue_priority') 
                        ? 'border-red-400 border-2' 
                        : 'border-green-200 border'
                    }`}>
                    <div className="grid grid-cols-4 gap-4">
                      {/* Relative position indicator for vim navigation */}
                      {isReviewsOverdueOnlyMode && showRelativeNumbers && (
                        <div className="col-span-4 mb-2">
                          <div className="text-xs font-mono font-bold text-gray-600 px-2 py-1 min-w-[2rem] text-center inline-block">
                            {getRelativePosition(filteredOverdueNotes.length + index, focusedReviewIndex, filteredOverdueNotes.length + filteredSnoozedNotes.length)}
                          </div>
                        </div>
                      )}
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

                      {/* Actions Button and Unsnooze Button */}
                      <div className="col-span-2 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleUnsnooze(note)}
                          className="px-3 py-2 text-xs font-medium text-green-700 bg-green-200 rounded-lg hover:bg-green-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-150"
                          title="Unsnooze note"
                        >
                          Un Pause
                        </button>
                        <div 
                          onClick={() => toggleNoteExpand(`actions-${note.id}`)}
                          className="text-xs font-medium text-gray-700 cursor-pointer flex items-center p-1 rounded hover:bg-gray-100"
                        >
                          <ChevronDownIcon className={`w-4 h-4 transform transition-transform duration-200 ${expandedNotes[`actions-${note.id}`] ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </div>

                    {/* Actions Dropdown */}
                    {expandedNotes[`actions-${note.id}`] && (
                      <div className="mt-4">
                        <div className="flex flex-wrap gap-2 justify-end">
                          {/* Flag Button */}
                          <button
                            onClick={() => handleAddPriority(note)}
                            className={`px-4 py-2 text-xs font-medium rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 ${
                              note.content.includes('meta::review_overdue_priority')
                                ? 'text-red-700 bg-red-50 focus:ring-red-500'
                                : 'text-purple-700 bg-purple-50 hover:bg-purple-100 focus:ring-purple-500'
                            }`}
                            title={note.content.includes('meta::review_overdue_priority') ? 'Unflag note' : 'Flag note'}
                          >
                            <svg className="w-4 h-4 inline-block mr-1" fill={note.content.includes('meta::review_overdue_priority') ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H8.5l-1-1H5a2 2 0 00-2 2z" />
                            </svg>
                            <span>{note.content.includes('meta::review_overdue_priority') ? 'Unflag' : 'Flag'}</span>
                          </button>
                          
                          {/* Quick Cadence Buttons */}
                          {!note.content.includes('meta::review_overdue_priority') && (
                            <>
                              <button
                                onClick={() => handleCadence(note, 2, 0)}
                                className="px-4 py-2 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                                title="Set 2 hour cadence"
                              >
                                2h
                              </button>
                              <button
                                onClick={() => handleCadence(note, 4, 0)}
                                className="px-4 py-2 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                                title="Set 4 hour cadence"
                              >
                                4h
                              </button>
                              <button
                                onClick={() => handleCadence(note, 12, 0)}
                                className="px-4 py-2 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                                title="Set 12 hour cadence"
                              >
                                12h
                              </button>
                              <button
                                onClick={() => handleCadence(note, 48, 0)}
                                className="px-4 py-2 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                                title="Set 2 day cadence"
                              >
                                2d
                              </button>
                              <button
                                onClick={() => handleCadence(note, 72, 0)}
                                className="px-4 py-2 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                                title="Set 3 day cadence"
                              >
                                3d
                              </button>
                              <button
                                onClick={() => handleCadence(note, 168, 0)}
                                className="px-4 py-2 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                                title="Set 7 day cadence"
                              >
                                7d
                              </button>
                            </>
                          )}
                          
                          <button
                            onClick={() => handleUnfollow(note)}
                            className="px-4 py-2 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
                            title="Remove from watchlist"
                          >
                            Unwatch
                          </button>
                          <button
                            onClick={() => handleEditNote(note)}
                            className="px-4 py-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                            title="Edit note"
                          >
                            Edit
                          </button>
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
                              Set cadence
                            </button>
                          )}
                          {!note.content.includes('meta::reminder') && (
                            <button
                              onClick={() => handleAddReminder(note)}
                              className="px-4 py-2 text-xs font-medium text-yellow-700 bg-yellow-50 rounded-lg hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-150"
                              title="Set as reminder"
                            >
                              Set as reminder
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
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

      {/* Link Selection Popup */}
      {showLinkPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-link-popup tabIndex={0}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Select Link to Open</h2>
              <button
                onClick={() => {
                  setShowLinkPopup(false);
                  setLinkPopupLinks([]);
                  setSelectedLinkIndex(0);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {linkPopupLinks.map((link, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    index === selectedLinkIndex
                      ? 'bg-blue-100 border-blue-300 text-blue-800'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => {
                    window.open(link.url, '_blank', 'noopener,noreferrer');
                    setShowLinkPopup(false);
                    setLinkPopupLinks([]);
                    setSelectedLinkIndex(0);
                  }}
                >
                  <div className="text-sm font-medium truncate">{link.text || link.url}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {index === selectedLinkIndex ? 'Press Enter to open' : 'Click or use arrow keys'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Snooze Toast */}
      {snoozeToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-purple-700 text-white px-6 py-3 rounded-lg shadow-lg z-50 text-base animate-fade-in">
          {snoozeToast}
        </div>
      )}
    </div>
  );
};

export default ReviewOverdueAlert; 