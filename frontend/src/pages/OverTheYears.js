import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { UserIcon, PhotoIcon, CalendarIcon, PlusIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/solid';
import { MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { createNote, updateNoteById, deleteImageById, deleteNoteById } from '../utils/ApiUtils';

const API_BASE_URL = 'http://localhost:5001';

// Helper function to get person info
const getPersonInfo = (content) => {
  const lines = content.split('\n');
  const name = lines[0];
  const tags = lines
    .filter(line => line.startsWith('meta::tag::'))
    .map(line => line.split('::')[2]);
  
  const metaInfo = lines
    .filter(line => line.startsWith('meta::info::'))
    .map(line => {
      const [_, __, name, type, value] = line.split('::');
      return { name, type, value };
    });

  const photos = lines
    .filter(line => line.startsWith('meta::photo::'))
    .map(line => line.replace('meta::photo::', '').trim());

  // Try to extract birth date from meta info
  const birthDateInfo = metaInfo.find(info => 
    info.name.toLowerCase().includes('birth') || 
    info.name.toLowerCase().includes('dob') ||
    info.name.toLowerCase().includes('date of birth')
  );

  return { name, tags, metaInfo, photos, birthDateInfo };
};

const OverTheYears = ({ allNotes = [], setAllNotes }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [uploadingPerson, setUploadingPerson] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pastedImageFile, setPastedImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null); // Preview URL for pasted/selected image
  const [photoDate, setPhotoDate] = useState('');
  const [photoDateInput, setPhotoDateInput] = useState(''); // For date input (YYYY-MM-DD format)
  const [photoNotes, setPhotoNotes] = useState('');
  const [showEditPhotoModal, setShowEditPhotoModal] = useState(false);
  const [editingPhotoNote, setEditingPhotoNote] = useState(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [timelinePerson, setTimelinePerson] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [maxPhotoHeight, setMaxPhotoHeight] = useState(null);
  const [photoDimensions, setPhotoDimensions] = useState(new Map());

  // Filter people with meta::overtheyear tag and get photos from linked photo notes
  const peopleWithOverTheYears = useMemo(() => {
    return allNotes
      .filter(note => {
        if (!note.content || !note.content.includes('meta::person::')) return false;
        // Check if note has meta::overtheyear tag
        return note.content.includes('meta::overtheyear');
      })
      .map(note => {
        const personInfo = getPersonInfo(note.content);
        
        // Get photos from notes with meta::linked_to_person::<person_id> tag
        const personId = note.id;
        const linkedToPersonNotes = allNotes.filter(n => {
          if (n.id === personId) return false; // Exclude the person note itself
          const lines = n.content.split('\n');
          return lines.some(line => line.startsWith(`meta::linked_to_person::${personId}`));
        });
        
        const linkedPhotos = [];
        linkedToPersonNotes.forEach(photoNote => {
          const photoLines = photoNote.content.split('\n');
          const photoUrl = photoLines
            .find(line => line.startsWith('meta::photo::'))
            ?.replace('meta::photo::', '').trim();
          
          if (photoUrl) {
            // Extract metadata from note content (date: and notes:)
            const dateLine = photoLines.find(line => line.startsWith('date:'));
            const date = dateLine ? dateLine.replace('date:', '').trim() : '';
            
            const notesLine = photoLines.find(line => line.startsWith('notes:'));
            const notes = notesLine ? notesLine.replace('notes:', '').trim() : '';
            
            linkedPhotos.push({
              url: photoUrl,
              noteId: photoNote.id,
              date,
              notes
            });
          }
        });
        
        // Convert direct photos to objects with metadata
        const directPhotos = personInfo.photos.map(url => ({
          url,
          noteId: null,
          date: '',
          notes: ''
        }));
        
        // Combine direct photos and linked photos
        const allPhotos = [...directPhotos, ...linkedPhotos];
        
        return {
          ...note,
          ...personInfo,
          photos: allPhotos
        };
      });
  }, [allNotes]);

  // Filter by search query
  const filteredPeople = useMemo(() => {
    if (!searchQuery.trim()) return peopleWithOverTheYears;
    
    const searchWords = searchQuery
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word.toLowerCase());
    
    return peopleWithOverTheYears.filter(person => {
      const nameLower = person.name.toLowerCase();
      return searchWords.some(word => nameLower.includes(word));
    });
  }, [peopleWithOverTheYears, searchQuery]);

  // Helper function to parse date and get timestamp for sorting
  const parseDateForSorting = (dateString) => {
    if (!dateString) return 0;
    
    // Try to parse various date formats
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
    
    // Try to extract year and month from string
    const yearMatch = dateString.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[0]);
      const monthMatch = dateString.match(/\b(0?[1-9]|1[0-2])\b/);
      const month = monthMatch ? parseInt(monthMatch[0]) - 1 : 0;
      return new Date(year, month, 1).getTime();
    }
    
    return 0;
  };

  // Helper function to convert date string to YYYY-MM-DD format for date input
  const convertDateToInputFormat = (dateString) => {
    if (!dateString) return '';
    
    // Try to parse as Date first
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Try to extract YYYY-MM-DD format from string
    const isoMatch = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return isoMatch[0];
    }
    
    // Try to extract date components from various formats
    const yearMatch = dateString.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      const year = yearMatch[0];
      const monthMatch = dateString.match(/\b(0?[1-9]|1[0-2])\b/);
      const dayMatch = dateString.match(/\b(0?[1-9]|[12][0-9]|3[01])\b/);
      
      if (monthMatch && dayMatch) {
        const month = String(parseInt(monthMatch[0])).padStart(2, '0');
        const day = String(parseInt(dayMatch[0])).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } else if (monthMatch) {
        const month = String(parseInt(monthMatch[0])).padStart(2, '0');
        return `${year}-${month}-01`;
      }
    }
    
    return '';
  };

  // Helper function to extract year and month from date
  const extractYearMonth = (dateString) => {
    if (!dateString) return { year: null, month: null };
    
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return { year: date.getFullYear(), month: date.getMonth() };
    }
    
    // Try to extract year and month from string
    const yearMatch = dateString.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[0]);
      const monthMatch = dateString.match(/\b(0?[1-9]|1[0-2])\b/);
      const month = monthMatch ? parseInt(monthMatch[0]) - 1 : null;
      return { year, month };
    }
    
    return { year: null, month: null };
  };

  // Get sorted photos for timeline (latest first)
  const timelinePhotos = useMemo(() => {
    if (!timelinePerson || !timelinePerson.photos || timelinePerson.photos.length === 0) {
      return [];
    }
    
    // Filter photos that have dates and sort by date (latest first)
    const photosWithDates = timelinePerson.photos
      .filter(photo => {
        const photoDate = typeof photo === 'object' ? photo.date : '';
        return photoDate && photoDate.trim() !== '';
      })
      .map(photo => {
        const photoDate = typeof photo === 'object' ? photo.date : '';
        const { year, month } = extractYearMonth(photoDate);
        return {
          ...photo,
          url: typeof photo === 'string' ? photo : photo.url,
          date: photoDate,
          notes: typeof photo === 'object' ? photo.notes : '',
          noteId: typeof photo === 'object' ? photo.noteId : null,
          timestamp: parseDateForSorting(photoDate),
          year,
          month
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp); // Latest first
    
    return photosWithDates;
  }, [timelinePerson]);

  // Get timeline data for horizontal timeline with months on x-axis
  const timelineData = useMemo(() => {
    if (timelinePhotos.length === 0) return { months: [], photosByMonth: new Map() };
    
    // Filter photos with valid year and month
    const validPhotos = timelinePhotos.filter(photo => 
      photo.year !== null && photo.month !== null
    );
    
    if (validPhotos.length === 0) return { months: [], photosByMonth: new Map() };
    
    // Find earliest and latest dates
    const timestamps = validPhotos.map(p => p.timestamp).filter(t => t > 0);
    if (timestamps.length === 0) return { months: [], photosByMonth: new Map() };
    
    const earliestTimestamp = Math.min(...timestamps);
    const latestTimestamp = Math.max(...timestamps);
    
    const earliestDate = new Date(earliestTimestamp);
    const latestDate = new Date(latestTimestamp);
    
    // Generate all months between earliest and latest
    const months = [];
    const currentDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
    const endDate = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);
    
    while (currentDate <= endDate) {
      months.push({
        year: currentDate.getFullYear(),
        month: currentDate.getMonth(),
        timestamp: currentDate.getTime()
      });
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    // Reverse months array so latest is on the left
    months.reverse();
    
    // Map photos to their respective months
    const photosByMonth = new Map();
    validPhotos.forEach((photo, index) => {
      const monthKey = `${photo.year}-${photo.month}`;
      if (!photosByMonth.has(monthKey)) {
        photosByMonth.set(monthKey, []);
      }
      photosByMonth.get(monthKey).push({ ...photo, index });
    });
    
    return { months, photosByMonth };
  }, [timelinePhotos]);

  // Calculate age from birth date
  const calculateAge = (birthDateInfo) => {
    if (!birthDateInfo || !birthDateInfo.value) return null;
    
    try {
      // Try to parse the date
      const birthDate = new Date(birthDateInfo.value);
      if (isNaN(birthDate.getTime())) return null;
      
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      return null;
    }
  };

  // Calculate age from birth date to photo date in years months days format
  const calculateAgeAtPhotoDate = (birthDateInfo, photoDateString) => {
    if (!birthDateInfo || !birthDateInfo.value || !photoDateString) return null;
    
    try {
      // Parse birth date
      const birthDate = new Date(birthDateInfo.value);
      if (isNaN(birthDate.getTime())) return null;
      
      // Parse photo date
      let photoDate = new Date(photoDateString);
      if (isNaN(photoDate.getTime())) {
        // Try to extract date from string
        const yearMatch = photoDateString.match(/\b(19|20)\d{2}\b/);
        const monthMatch = photoDateString.match(/\b(0?[1-9]|1[0-2])\b/);
        const dayMatch = photoDateString.match(/\b(0?[1-9]|[12][0-9]|3[01])\b/);
        
        if (yearMatch && monthMatch) {
          const year = parseInt(yearMatch[0]);
          const month = parseInt(monthMatch[0]) - 1;
          const day = dayMatch ? parseInt(dayMatch[0]) : 1;
          photoDate = new Date(year, month, day);
        } else {
          return null;
        }
      }
      
      if (isNaN(photoDate.getTime())) return null;
      
      // Calculate difference
      let years = photoDate.getFullYear() - birthDate.getFullYear();
      let months = photoDate.getMonth() - birthDate.getMonth();
      let days = photoDate.getDate() - birthDate.getDate();
      
      // Adjust for negative days
      if (days < 0) {
        months--;
        const lastDayOfPrevMonth = new Date(photoDate.getFullYear(), photoDate.getMonth(), 0).getDate();
        days += lastDayOfPrevMonth;
      }
      
      // Adjust for negative months
      if (months < 0) {
        years--;
        months += 12;
      }
      
      // Build age string
      const parts = [];
      if (years > 0) {
        parts.push(`${years} year${years !== 1 ? 's' : ''}`);
      }
      if (months > 0) {
        parts.push(`${months} month${months !== 1 ? 's' : ''}`);
      }
      if (days > 0) {
        parts.push(`${days} day${days !== 1 ? 's' : ''}`);
      }
      
      return parts.length > 0 ? parts.join(' ') : null;
    } catch (error) {
      return null;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (error) {
      return dateString;
    }
  };

  // Handle adding a new person
  const handleAddPerson = async () => {
    if (!newPersonName.trim()) {
      alert('Please enter a name');
      return;
    }

    setIsSaving(true);
    try {
      // Create note with name, meta::person::, and meta::overtheyear tags
      const content = `${newPersonName.trim()}\nmeta::person::\nmeta::overtheyear`;
      
      const response = await createNote(content);
      
      // Update allNotes
      if (setAllNotes) {
        setAllNotes([...allNotes, response]);
      }
      
      // Close modal and reset form
      setShowAddModal(false);
      setNewPersonName('');
    } catch (error) {
      console.error('Error adding person:', error);
      alert('Failed to add person. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle image upload
  const uploadImage = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_BASE_URL}/api/images`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      const imageUrl = `${API_BASE_URL}${data.imageUrl}`;
      
      return imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
      throw error;
    } finally {
      setUploading(false);
    }
  }, []);

  // Handle saving photo as separate note with bidirectional link
  const handleSavePhoto = useCallback(async (imageUrl, personId, date, notes) => {
    if (!imageUrl || !personId) return;

    try {
      setUploading(true);
      
      // Get person name for photo note
      const personNote = allNotes.find(n => n.id === personId);
      const personName = personNote ? getPersonInfo(personNote.content).name : 'person';
      
      // Build photo note content with metadata
      let photoNoteContent = `Photo for ${personName}\nmeta::photo::${imageUrl}\nmeta::linked_to_person::${personId}`;
      
      // Add metadata in note content format
      if (date && date.trim() !== '') {
        photoNoteContent += `\ndate:${date.trim()}`;
      }
      if (notes && notes.trim() !== '') {
        photoNoteContent += `\nnotes:${notes.trim()}`;
      }
      
      const photoNote = await createNote(photoNoteContent);
      
      // Update person note with link to photo
      if (personNote) {
        const personLines = personNote.content.split('\n');
        const linkedPhotos = personLines.filter(line => line.startsWith('meta::linked_from_photos::'));
        
        let updatedPersonContent = personNote.content;
        
        // Check if photo link already exists
        const photoLinkExists = linkedPhotos.some(line => line.includes(photoNote.id));
        
        if (!photoLinkExists) {
          // Add link to photo note
          updatedPersonContent = updatedPersonContent.trim() + `\nmeta::linked_from_photos::${photoNote.id}`;
          await updateNoteById(personId, updatedPersonContent);
          
          // Update allNotes
          if (setAllNotes) {
            setAllNotes([...allNotes.map(n => 
              n.id === personId 
                ? { ...n, content: updatedPersonContent }
                : n
            ), photoNote]);
          }
        } else {
          // Just add the photo note to allNotes if link already exists
          if (setAllNotes) {
            setAllNotes([...allNotes, photoNote]);
          }
        }
      }
      
      // Close modal and reset
      setShowImageUploadModal(false);
      setUploadingPerson(null);
      setPastedImageFile(null);
      setPhotoDate('');
      setPhotoDateInput('');
      setPhotoNotes('');
    } catch (error) {
      console.error('Error saving photo:', error);
      alert('Failed to save photo. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [allNotes, setAllNotes]);

  // Handle paste for images
  useEffect(() => {
    if (!showImageUploadModal) return;

    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          e.stopPropagation();
          const file = item.getAsFile();
          if (file) {
            // Create preview URL
            const previewUrl = URL.createObjectURL(file);
            setPastedImageFile(file);
            setImagePreview(previewUrl);
          }
        }
      }
    };

    // Also handle keydown to stop propagation when Cmd+V is pressed
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        // Stop propagation to prevent global paste handler from running
        e.stopPropagation();
      }
    };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [showImageUploadModal, uploadingPerson]);

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile && uploadingPerson) {
      // Create preview URL
      const previewUrl = URL.createObjectURL(imageFile);
      setPastedImageFile(imageFile);
      setImagePreview(previewUrl);
    } else {
      alert('Please drop a valid image file');
    }
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file && uploadingPerson) {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setPastedImageFile(file);
      setImagePreview(previewUrl);
    }
    // Reset file input
    e.target.value = '';
  };

  // Handle deleting photo
  const handleDeletePhoto = async () => {
    if (!editingPhotoNote) return;

    if (!window.confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
      return;
    }

    try {
      setUploading(true);

      // Extract image URL from photo note
      const photoLines = editingPhotoNote.content.split('\n');
      const photoLine = photoLines.find(line => line.startsWith('meta::photo::'));
      if (!photoLine) {
        alert('Photo URL not found in note');
        return;
      }

      const imageUrl = photoLine.replace('meta::photo::', '').trim();
      
      // Extract image ID from URL
      // URL format: http://localhost:5001/api/images/{imageId}.{ext}
      const urlParts = imageUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      const imageId = filename.split('.')[0]; // Remove extension

      // Find person note that links to this photo
      const personNote = allNotes.find(note => {
        const lines = note.content.split('\n');
        return lines.some(line => line.startsWith(`meta::linked_from_photos::${editingPhotoNote.id}`));
      });

      // Prepare updated person note content (remove link to photo)
      let updatedPersonContent = null;
      if (personNote) {
        const personLines = personNote.content.split('\n');
        const updatedPersonLines = personLines.filter(line => 
          !line.startsWith(`meta::linked_from_photos::${editingPhotoNote.id}`)
        );
        updatedPersonContent = updatedPersonLines.join('\n').trim();
        
        // Update person note to remove link to photo (before deleting photo note)
        await updateNoteById(personNote.id, updatedPersonContent);
      }

      // Delete image from backend
      await deleteImageById(imageId);

      // Delete photo note from backend
      await deleteNoteById(editingPhotoNote.id);

      // Update allNotes state
      if (setAllNotes) {
        if (personNote && updatedPersonContent) {
          setAllNotes(allNotes
            .filter(note => note.id !== editingPhotoNote.id) // Remove photo note
            .map(note => 
              note.id === personNote.id 
                ? { ...note, content: updatedPersonContent }
                : note
            )
          );
        } else {
          // If person note not found, just remove photo note from allNotes
          setAllNotes(allNotes.filter(note => note.id !== editingPhotoNote.id));
        }
      }

      // Close modal and reset
      setShowEditPhotoModal(false);
      setEditingPhotoNote(null);
      setPhotoDate('');
      setPhotoDateInput('');
      setPhotoNotes('');
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Keyboard navigation for timeline modal
  useEffect(() => {
    if (!showTimelineModal || timelinePhotos.length === 0) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' && currentPhotoIndex > 0) {
        setCurrentPhotoIndex(currentPhotoIndex - 1);
      } else if (e.key === 'ArrowRight' && currentPhotoIndex < timelinePhotos.length - 1) {
        setCurrentPhotoIndex(currentPhotoIndex + 1);
      } else if (e.key === 'Escape') {
        setShowTimelineModal(false);
        setTimelinePerson(null);
        setCurrentPhotoIndex(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showTimelineModal, currentPhotoIndex, timelinePhotos.length]);

  // Calculate maximum photo height for scaling
  useEffect(() => {
    if (!showTimelineModal || timelinePhotos.length === 0) {
      setMaxPhotoHeight(null);
      setPhotoDimensions(new Map());
      return;
    }

    const loadImagesAndFindMaxHeight = async () => {
      const dimensionsMap = new Map();
      
      const imagePromises = timelinePhotos.map((photo) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const dimensions = { height: img.naturalHeight, width: img.naturalWidth };
            dimensionsMap.set(photo.url, dimensions);
            resolve(dimensions);
          };
          img.onerror = () => {
            const dimensions = { height: 0, width: 0 };
            dimensionsMap.set(photo.url, dimensions);
            resolve(dimensions);
          };
          img.src = photo.url;
        });
      });

      const imageDimensions = await Promise.all(imagePromises);
      const maxHeight = Math.max(...imageDimensions.map(dim => dim.height));
      
      if (maxHeight > 0) {
        setMaxPhotoHeight(maxHeight);
        setPhotoDimensions(dimensionsMap);
      }
    };

    loadImagesAndFindMaxHeight();
  }, [showTimelineModal, timelinePhotos]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Over the Years</h1>
            <p className="text-gray-600">
              Track how people have changed from birth through their photos
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add Person</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* People Grid */}
        {filteredPeople.length === 0 ? (
          <div className="text-center py-12">
            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">
              {searchQuery ? 'No people found matching your search' : 'No people found. Click "Add Person" to get started.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPeople.map((person) => {
              const age = calculateAge(person.birthDateInfo);
              
              return (
                <div
                  key={person.id}
                  className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedPerson(person)}
                >
                  <div className="p-4">
                    {/* Person Header */}
                    <div className="flex items-start gap-3 mb-4">
                      {person.photos && person.photos.length > 0 ? (
                        <img
                          src={typeof person.photos[0] === 'string' ? person.photos[0] : person.photos[0].url}
                          alt={person.name}
                          className="h-16 w-16 rounded-full object-cover border-2 border-indigo-200"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserIcon className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-4xl font-semibold text-gray-900 truncate" style={{ fontFamily: "'Dancing Script', cursive" }}>
                          {person.name}
                        </h3>
                        {age !== null && (
                          <p className="text-sm text-gray-500">
                            Age: {age} years
                          </p>
                        )}
                        {person.birthDateInfo && (
                          <p className="text-xs text-gray-400 mt-1">
                            Born: {formatDate(person.birthDateInfo.value)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Photo Count */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <PhotoIcon className="h-4 w-4" />
                        <span>{person.photos.length} photo{person.photos.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {person.photos && person.photos.some(photo => {
                          const photoDate = typeof photo === 'object' ? photo.date : '';
                          return photoDate && photoDate.trim() !== '';
                        }) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTimelinePerson(person);
                              setShowTimelineModal(true);
                              setCurrentPhotoIndex(0);
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                            title="View timeline"
                          >
                            <CalendarIcon className="h-3 w-3" />
                            <span>Timeline</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadingPerson(person);
                            setShowImageUploadModal(true);
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                          title="Add image"
                        >
                          <PlusIcon className="h-3 w-3" />
                          <span>Add Image</span>
                        </button>
                      </div>
                    </div>

                    {/* Tags */}
                    {person.tags && person.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {person.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {person.tags.length > 3 && (
                          <span className="px-2 py-0.5 text-xs text-gray-500">
                            +{person.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Person Detail Modal */}
        {selectedPerson && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setSelectedPerson(null);
              setSelectedImage(null);
            }}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedPerson.photos && selectedPerson.photos.length > 0 ? (
                      <img
                        src={selectedPerson.photos[0]}
                        alt={selectedPerson.name}
                        className="h-12 w-12 rounded-full object-cover border-2 border-indigo-200"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-5xl font-bold text-gray-900" style={{ fontFamily: "'Dancing Script', cursive" }}>
                        {selectedPerson.name}
                      </h2>
                      {calculateAge(selectedPerson.birthDateInfo) !== null && (
                        <p className="text-sm text-gray-500">
                          Age: {calculateAge(selectedPerson.birthDateInfo)} years
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedPerson.photos && selectedPerson.photos.some(photo => {
                      const photoDate = typeof photo === 'object' ? photo.date : '';
                      return photoDate && photoDate.trim() !== '';
                    }) && (
                      <button
                        onClick={() => {
                          setTimelinePerson(selectedPerson);
                          setShowTimelineModal(true);
                          setCurrentPhotoIndex(0);
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
                        title="View timeline"
                      >
                        Timeline
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedPerson(null);
                        setSelectedImage(null);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Photos Timeline */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedPerson.photos && selectedPerson.photos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {selectedPerson.photos.map((photo, index) => {
                      const photoUrl = typeof photo === 'string' ? photo : photo.url;
                      const photoNoteId = typeof photo === 'object' ? photo.noteId : null;
                      const photoDate = typeof photo === 'object' ? photo.date : '';
                      const photoNotes = typeof photo === 'object' ? photo.notes : '';
                      
                      return (
                        <div
                          key={index}
                          className="relative group"
                        >
                          <div
                            className="cursor-pointer"
                            onClick={() => setSelectedImage(photoUrl)}
                          >
                            <img
                              src={photoUrl}
                              alt={`${selectedPerson.name} - Photo ${index + 1}`}
                              className="w-full h-48 object-cover rounded-lg border-2 border-gray-200 hover:border-indigo-400 transition-colors"
                            />
                          </div>
                          {/* Display date and notes below photo */}
                          <div className="mt-2 space-y-1">
                            {photoDate && (
                              <div className="text-sm text-gray-700">
                                <span className="font-medium">Date:</span> {photoDate}
                              </div>
                            )}
                            {photoNotes && (
                              <div className="text-sm text-gray-700">
                                <span className="font-medium">Notes:</span> {photoNotes}
                              </div>
                            )}
                          </div>
                          {photoNoteId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const photoNote = allNotes.find(n => n.id === photoNoteId);
                                if (photoNote) {
                                  const photoLines = photoNote.content.split('\n');
                                  const dateLine = photoLines.find(line => line.startsWith('date:'));
                                  const date = dateLine ? dateLine.replace('date:', '').trim() : '';
                                  const notesLine = photoLines.find(line => line.startsWith('notes:'));
                                  const notes = notesLine ? notesLine.replace('notes:', '').trim() : '';
                                  
                                  setEditingPhotoNote(photoNote);
                                  setPhotoDate(date);
                                  setPhotoDateInput(convertDateToInputFormat(date));
                                  setPhotoNotes(notes);
                                  setShowEditPhotoModal(true);
                                }
                              }}
                              className="absolute top-2 right-2 bg-indigo-600 text-white p-1.5 rounded-full hover:bg-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Edit photo metadata"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <PhotoIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No photos available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Image Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img
                src={selectedImage}
                alt="Selected photo"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Add Person Modal */}
        {showAddModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowAddModal(false);
              setNewPersonName('');
            }}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Add Person</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewPersonName('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isSaving) {
                      handleAddPerson();
                    }
                  }}
                  placeholder="Enter person's name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewPersonName('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPerson}
                  disabled={isSaving || !newPersonName.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </span>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Upload Modal */}
        {showImageUploadModal && uploadingPerson && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowImageUploadModal(false);
              setUploadingPerson(null);
              setIsDragging(false);
              setPastedImageFile(null);
              setPhotoDate('');
              setPhotoNotes('');
            }}
          >
            <div
              className={`bg-white rounded-lg p-6 w-full max-w-md mx-4 ${
                isDragging ? 'border-4 border-indigo-500 border-dashed' : ''
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Add Image for {uploadingPerson.name}
                </h2>
                <button
            onClick={() => {
              if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
              }
              setShowImageUploadModal(false);
              setUploadingPerson(null);
              setIsDragging(false);
              setPastedImageFile(null);
              setImagePreview(null);
              setPhotoDate('');
              setPhotoDateInput('');
              setPhotoNotes('');
            }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {uploading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
                  <p className="text-sm text-gray-600">Uploading image...</p>
                </div>
              ) : (
                <>
                  {imagePreview ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full max-h-64 object-contain rounded-lg border-2 border-gray-200"
                        />
                        <button
                          onClick={() => {
                            if (imagePreview) {
                              URL.revokeObjectURL(imagePreview);
                            }
                            setImagePreview(null);
                            setPastedImageFile(null);
                          }}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 transition-colors"
                          title="Remove image"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Metadata Fields */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date
                          </label>
                          <input
                            type="date"
                            value={photoDateInput}
                            onChange={(e) => {
                              setPhotoDateInput(e.target.value);
                              // Convert date input value to text format for saving
                              if (e.target.value) {
                                setPhotoDate(e.target.value);
                              } else {
                                setPhotoDate('');
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                          </label>
                          <textarea
                            value={photoNotes}
                            onChange={(e) => setPhotoNotes(e.target.value)}
                            placeholder="Optional notes"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      
                      {/* Save Button */}
                      <div className="flex gap-3 mt-6">
                        <button
                          onClick={async () => {
                            if (!pastedImageFile || !uploadingPerson) return;
                            
                            try {
                              setUploading(true);
                              const imageUrl = await uploadImage(pastedImageFile);
                              await handleSavePhoto(imageUrl, uploadingPerson.id, photoDate, photoNotes);
                              
                              // Clean up preview URL
                              if (imagePreview) {
                                URL.revokeObjectURL(imagePreview);
                              }
                              setImagePreview(null);
                              setPastedImageFile(null);
                            } catch (error) {
                              console.error('Error saving image:', error);
                              alert('Failed to save image. Please try again.');
                            } finally {
                              setUploading(false);
                            }
                          }}
                          disabled={uploading || !pastedImageFile}
                          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {uploading ? (
                            <span className="flex items-center justify-center gap-2">
                              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Saving...
                            </span>
                          ) : (
                            'Save Image'
                          )}
                        </button>
                        <button
                          onClick={() => {
                            if (imagePreview) {
                              URL.revokeObjectURL(imagePreview);
                            }
                            setImagePreview(null);
                            setPastedImageFile(null);
                            setPhotoDate('');
                            setPhotoDateInput('');
                            setPhotoNotes('');
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragging 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}>
                        <PhotoIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-sm text-gray-600 mb-2">
                          Drag and drop an image here, or click to select
                        </p>
                        <p className="text-xs text-gray-500 mb-4">
                          Or press Ctrl+V (Cmd+V on Mac) to paste from clipboard
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileInputChange}
                          className="hidden"
                          id="image-upload-input"
                        />
                        <label
                          htmlFor="image-upload-input"
                          className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 cursor-pointer text-sm font-medium"
                        >
                          Select Image
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-4 text-center">
                        Supported formats: JPG, PNG, GIF, WebP
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Edit Photo Metadata Modal */}
        {showEditPhotoModal && editingPhotoNote && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowEditPhotoModal(false);
              setEditingPhotoNote(null);
              setPhotoDate('');
              setPhotoDateInput('');
              setPhotoNotes('');
            }}
          >
            <div
              className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Edit Photo Metadata
                </h2>
                <button
                  onClick={() => {
                    setShowEditPhotoModal(false);
                    setEditingPhotoNote(null);
                    setPhotoDate('');
                    setPhotoDateInput('');
                    setPhotoNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={photoDateInput}
                    onChange={(e) => {
                      setPhotoDateInput(e.target.value);
                      // Convert date input value to text format for saving
                      if (e.target.value) {
                        const date = new Date(e.target.value);
                        if (!isNaN(date.getTime())) {
                          // Format as YYYY-MM-DD for consistency
                          setPhotoDate(e.target.value);
                        }
                      } else {
                        setPhotoDate('');
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={photoNotes}
                    onChange={(e) => setPhotoNotes(e.target.value)}
                    placeholder="Optional notes"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={async () => {
                    try {
                      setUploading(true);
                      
                      // Get existing content
                      const lines = editingPhotoNote.content.split('\n');
                      
                      // Remove existing metadata lines (date: and notes:)
                      const filteredLines = lines.filter(line => 
                        !line.startsWith('date:') &&
                        !line.startsWith('notes:')
                      );
                      
                      // Add new metadata in note content format
                      let updatedContent = filteredLines.join('\n').trim();
                      if (photoDate) {
                        updatedContent += `\ndate:${photoDate.trim()}`;
                      }
                      if (photoNotes) {
                        updatedContent += `\nnotes:${photoNotes.trim()}`;
                      }
                      
                      await updateNoteById(editingPhotoNote.id, updatedContent);
                      
                      // Update allNotes
                      if (setAllNotes) {
                        setAllNotes(allNotes.map(note =>
                          note.id === editingPhotoNote.id
                            ? { ...note, content: updatedContent }
                            : note
                        ));
                      }
                      
                      // Close modal and reset
                      setShowEditPhotoModal(false);
                      setEditingPhotoNote(null);
                      setPhotoDate('');
                      setPhotoDateInput('');
                      setPhotoNotes('');
                    } catch (error) {
                      console.error('Error updating photo metadata:', error);
                      alert('Failed to update photo metadata. Please try again.');
                    } finally {
                      setUploading(false);
                    }
                  }}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </span>
                  ) : (
                    'Save'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowEditPhotoModal(false);
                    setEditingPhotoNote(null);
                    setPhotoDate('');
                    setPhotoDateInput('');
                    setPhotoNotes('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeletePhoto}
                  disabled={uploading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  title="Delete photo"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Timeline Modal */}
        {showTimelineModal && timelinePerson && timelinePhotos.length > 0 && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center p-4"
            onClick={() => {
              setShowTimelineModal(false);
              setTimelinePerson(null);
              setCurrentPhotoIndex(0);
            }}
          >
            <div
              className="w-full max-w-7xl h-full max-h-[95vh] flex flex-col bg-white rounded-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">
                  Timeline - <span className="text-5xl" style={{ fontFamily: "'Dancing Script', cursive" }}>{timelinePerson.name}</span>
                </h2>
                <button
                  onClick={() => {
                    setShowTimelineModal(false);
                    setTimelinePerson(null);
                    setCurrentPhotoIndex(0);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Photo Display Area */}
              <div className="flex-1 flex items-center justify-center p-8 relative bg-gray-50">
                {currentPhotoIndex < timelinePhotos.length && (
                  <>
                    {/* Back Button */}
                    {currentPhotoIndex > 0 && (
                      <button
                        onClick={() => setCurrentPhotoIndex(currentPhotoIndex - 1)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 transition-colors z-10"
                        title="Previous photo"
                      >
                        <ChevronLeftIcon className="h-8 w-8 text-gray-700" />
                      </button>
                    )}

                    {/* Photo */}
                    <div className="flex flex-col items-center max-w-4xl w-full">
                      {(() => {
                        const currentPhoto = timelinePhotos[currentPhotoIndex];
                        const dimensions = photoDimensions.get(currentPhoto.url);
                        
                        // Calculate scaled dimensions based on maxPhotoHeight
                        let imageStyle = {};
                        if (maxPhotoHeight && dimensions && dimensions.height > 0) {
                          const aspectRatio = dimensions.width / dimensions.height;
                          
                          // Scale all photos to the maximum height
                          // But limit to viewport if too large
                          const maxViewportHeight = window.innerHeight * 0.6; // 60vh
                          const maxViewportWidth = window.innerWidth * 0.8; // 80vw
                          
                          // Use the maximum height, but scale down if it exceeds viewport
                          let targetHeight = maxPhotoHeight;
                          if (targetHeight > maxViewportHeight) {
                            targetHeight = maxViewportHeight;
                          }
                          
                          const scaledWidth = targetHeight * aspectRatio;
                          
                          // If width exceeds viewport, scale down proportionally
                          if (scaledWidth > maxViewportWidth) {
                            const scale = maxViewportWidth / scaledWidth;
                            imageStyle = {
                              height: `${targetHeight * scale}px`,
                              width: `${maxViewportWidth}px`
                            };
                          } else {
                            imageStyle = {
                              height: `${targetHeight}px`,
                              width: `${scaledWidth}px`
                            };
                          }
                        }
                        
                        return (
                          <img
                            src={currentPhoto.url}
                            alt={`Photo ${currentPhotoIndex + 1}`}
                            className="object-contain rounded-lg shadow-xl"
                            style={imageStyle}
                          />
                        );
                      })()}
                      
                      {/* Date and Year Below Photo */}
                      <div className="mt-6 text-center space-y-2">
                        {timelinePhotos[currentPhotoIndex].year && timelinePhotos[currentPhotoIndex].month !== null && (
                          <div className="text-3xl font-bold text-gray-900 uppercase">
                            {new Date(2000, timelinePhotos[currentPhotoIndex].month, 1).toLocaleString('default', { month: 'short' })} {timelinePhotos[currentPhotoIndex].year}
                          </div>
                        )}
                        {timelinePhotos[currentPhotoIndex].date && (
                          <div className="text-xl text-gray-700">
                            {timelinePhotos[currentPhotoIndex].date}
                            {timelinePerson && timelinePerson.birthDateInfo && (() => {
                              const ageAtPhoto = calculateAgeAtPhotoDate(
                                timelinePerson.birthDateInfo,
                                timelinePhotos[currentPhotoIndex].date
                              );
                              return ageAtPhoto ? ` (${ageAtPhoto})` : '';
                            })()}
                          </div>
                        )}
                        {timelinePhotos[currentPhotoIndex].notes && (
                          <div className="text-lg text-gray-600 mt-2">
                            {timelinePhotos[currentPhotoIndex].notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Forward Button */}
                    {currentPhotoIndex < timelinePhotos.length - 1 && (
                      <button
                        onClick={() => setCurrentPhotoIndex(currentPhotoIndex + 1)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 transition-colors z-10"
                        title="Next photo"
                      >
                        <ChevronRightIcon className="h-8 w-8 text-gray-700" />
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Timeline Slider */}
              <div className="p-6 border-t border-gray-200 bg-white">
                {timelineData.months.length > 0 && (
                  <div className="relative">
                    {/* Horizontal Timeline Line */}
                    <div className="relative h-32 mb-4 overflow-x-auto">
                      <div className="relative" style={{ minWidth: `${Math.max(timelineData.months.length * 80, 800)}px`, paddingLeft: '40px', paddingRight: '40px' }}>
                        {/* Timeline Line */}
                        <div className="absolute top-16 left-10 right-10 h-1 bg-gray-300"></div>
                      
                        {/* Months and Photos */}
                        <div className="relative h-full">
                          {timelineData.months.map((month, monthIndex) => {
                            const monthKey = `${month.year}-${month.month}`;
                            const photos = timelineData.photosByMonth.get(monthKey) || [];
                            const totalMonths = timelineData.months.length;
                            // Calculate position: first month at left edge, last month at right edge
                            const timelineWidth = Math.max(timelineData.months.length * 80, 800) - 80; // Subtract padding
                            const position = totalMonths > 1 
                              ? 40 + (monthIndex / (totalMonths - 1)) * timelineWidth
                              : 40 + timelineWidth / 2; // Center if only one month
                            
                            return (
                              <div
                                key={monthIndex}
                                className="absolute top-0 bottom-0 flex flex-col items-center"
                                style={{ left: `${position}px`, transform: 'translateX(-50%)' }}
                              >
                                {/* Month and Year Label */}
                                <div className="text-xs font-semibold text-gray-700 mb-2 whitespace-nowrap uppercase">
                                  {new Date(2000, month.month, 1).toLocaleString('default', { month: 'short' })} {month.year}
                                </div>
                                
                                {/* Month Marker on Timeline */}
                                <div className="absolute top-16 w-2 h-2 bg-gray-400 rounded-full -translate-x-1/2"></div>
                                
                                {/* Photo Circles */}
                                {photos.map((photo, photoIndex) => {
                                  const isActive = timelinePhotos[currentPhotoIndex]?.url === photo.url;
                                  // Stack multiple photos vertically if in same month
                                  const photoOffset = photos.length > 1 
                                    ? (photoIndex - (photos.length - 1) / 2) * 12 
                                    : 0;
                                  
                                  return (
                                    <button
                                      key={photoIndex}
                                      onClick={() => {
                                        const index = timelinePhotos.findIndex(p => p.url === photo.url);
                                        if (index !== -1) {
                                          setCurrentPhotoIndex(index);
                                        }
                                      }}
                                      className={`absolute w-8 h-8 rounded-full border-4 transition-all -translate-x-1/2 ${
                                        isActive
                                          ? 'bg-indigo-600 border-white shadow-lg scale-125 z-10'
                                          : 'bg-white border-indigo-400 hover:border-indigo-600 hover:scale-110'
                                      }`}
                                      style={{
                                        top: `${48 + photoOffset}px` // Position below timeline line
                                      }}
                                      title={photo.date || `Photo ${photoIndex + 1}`}
                                    />
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    
                    {/* Photo Counter */}
                    <div className="text-center text-sm text-gray-600 mt-4">
                      Photo {currentPhotoIndex + 1} of {timelinePhotos.length}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OverTheYears;

