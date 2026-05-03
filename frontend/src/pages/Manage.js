import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { deleteImageById, loadAllNotes, updateNoteById, listImages, exportAllNotes, uploadImage } from '../utils/ApiUtils';
import { decodeSensitiveContent, encodeSensitiveContent, hasEncodedContent } from '../utils/SensitiveUrlUtils';
import { extractImageIds } from '../utils/NotesUtils';

const LARGE_IMAGE_THRESHOLD_BYTES = 750 * 1024;
const API_BASE_URL = 'http://localhost:5001/api';
const IMAGE_ID_REGEX = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi;

const formatFileSize = (bytes = 0) => {
  if (!bytes) return '0 KB';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
};

const getNoteTitle = (content = '') => {
  return content
    .split('\n')
    .map(line => line.trim())
    .find(line => line && !line.startsWith('meta::')) || 'Untitled note';
};

const extractReferencedImageIds = (content = '') => {
  const metaImageIds = extractImageIds(content);
  const uuidMatches = content.match(IMAGE_ID_REGEX) || [];
  return Array.from(new Set([
    ...metaImageIds,
    ...uuidMatches.map(id => id.toLowerCase())
  ]));
};

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const loadImageElement = (url) => new Promise((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = url;
});

const canvasToBlob = (canvas, type, quality) => new Promise((resolve) => {
  canvas.toBlob(resolve, type, quality);
});

const compressImageBlob = async (imageUrl, originalSize) => {
  const image = await loadImageElement(imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const candidates = [];
  for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42, 0.32, 0.24, 0.18, 0.12, 0.08]) {
    const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    if (blob) candidates.push({ blob, quality });
  }

  const smallerCandidates = candidates.filter(candidate => candidate.blob.size < originalSize);
  if (smallerCandidates.length === 0) return null;

  return smallerCandidates.reduce((smallest, candidate) => (
    candidate.blob.size < smallest.blob.size ? candidate : smallest
  ));
};

const replaceImageReferences = (content, oldImage, newImage) => {
  const oldId = oldImage.id;
  const oldFilename = oldImage.filename;
  const oldExtension = oldImage.extension;
  const newId = newImage.imageId;
  const newFilename = newImage.filename;
  const newImageUrl = newImage.imageUrl;
  const absoluteNewImageUrl = `http://localhost:5001${newImageUrl}`;

  let updatedContent = content
    .replace(new RegExp(escapeRegExp(`/api/images/${oldFilename}`), 'g'), newImageUrl)
    .replace(new RegExp(escapeRegExp(`http://localhost:5001/api/images/${oldFilename}`), 'g'), absoluteNewImageUrl)
    .replace(new RegExp(escapeRegExp(oldFilename), 'g'), newFilename);

  if (oldExtension) {
    updatedContent = updatedContent.replace(
      new RegExp(`${escapeRegExp(oldId)}\\.${escapeRegExp(oldExtension)}`, 'gi'),
      newFilename
    );
  }

  return updatedContent.replace(new RegExp(escapeRegExp(oldId), 'gi'), newId);
};

const Manage = () => {
  const [activeTab, setActiveTab] = useState('notes');
  const [activeSubTab, setActiveSubTab] = useState('search-replace');
  const [searchText, setSearchText] = useState('');
  const [submittedSearchText, setSubmittedSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [addText, setAddText] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [submittedUseRegex, setSubmittedUseRegex] = useState(false);
  const [notes, setNotes] = useState([]);
  const [matchingNotes, setMatchingNotes] = useState([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [regexError, setRegexError] = useState('');
  const [images, setImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imageSizesLoading, setImageSizesLoading] = useState(false);
  const [imagesError, setImagesError] = useState('');
  const [hasLoadedImages, setHasLoadedImages] = useState(false);
  const [compressingImageId, setCompressingImageId] = useState(null);
  const [bulkCompressProgress, setBulkCompressProgress] = useState(null);

  useEffect(() => {
    const fetchNotes = async () => {
      const data = await loadAllNotes('', null);
      setNotes(data.notes);
    };
    fetchNotes();
  }, []);

  useEffect(() => {
    if (activeSubTab !== 'large-images' || hasLoadedImages || imagesLoading) return;

    const fetchImages = async () => {
      try {
        setImagesLoading(true);
        setImagesError('');
        const imageList = await listImages();
        setImages(imageList);
        setHasLoadedImages(true);
      } catch (error) {
        setImagesError(error.message);
        toast.error('Error loading images: ' + error.message);
      } finally {
        setImagesLoading(false);
      }
    };

    fetchImages();
  }, [activeSubTab, hasLoadedImages, imagesLoading]);

  useEffect(() => {
    if (submittedSearchText.trim()) {
      try {
        let matches;
        if (submittedUseRegex) {
          // Test if the regex is valid
          try {
            new RegExp(submittedSearchText);
            setRegexError('');
          } catch (e) {
            setRegexError('Invalid regular expression');
            return;
          }
          
          const regex = new RegExp(submittedSearchText, 'g');
          matches = notes.filter(note => regex.test(note.content));
          
          // Reset regex lastIndex for next test
          regex.lastIndex = 0;
        } else {
          // Split search text by commas and trim whitespace
          const searchTerms = submittedSearchText.split(',').map(term => term.trim()).filter(term => term);
          
          if (searchTerms.length > 1) {
            // AND condition: all terms must be present
            matches = notes.filter(note => 
              searchTerms.every(term => 
                note.content.toLowerCase().includes(term.toLowerCase())
              )
            );
          } else {
            // Single term search
            matches = notes.filter(note => 
              note.content.toLowerCase().includes(submittedSearchText.toLowerCase())
            );
          }
        }
        setMatchingNotes(matches);
        
        // Count total occurrences
        const count = matches.reduce((total, note) => {
          if (submittedUseRegex) {
            const regex = new RegExp(submittedSearchText, 'g');
            const matches = note.content.match(regex);
            return total + (matches ? matches.length : 0);
          } else {
            const searchTerms = submittedSearchText.split(',').map(term => term.trim()).filter(term => term);
            return total + searchTerms.reduce((termTotal, term) => {
              // Escape special characters for regex
              const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(escapedTerm, 'gi');
              const termMatches = note.content.match(regex);
              return termTotal + (termMatches ? termMatches.length : 0);
            }, 0);
          }
        }, 0);
        setTotalMatches(count);
      } catch (error) {
        setRegexError('Error processing search: ' + error.message);
      }
    } else {
      setMatchingNotes([]);
      setTotalMatches(0);
      setRegexError('');
    }
  }, [submittedSearchText, notes, submittedUseRegex]);

  useEffect(() => {
    if (activeSubTab !== 'large-images' || images.length === 0) return;

    const imagesMissingSize = images.filter(image => typeof image.size !== 'number');
    if (imagesMissingSize.length === 0) return;

    const fetchMissingImageSizes = async () => {
      try {
        setImageSizesLoading(true);
        const imagesWithSizes = await Promise.all(images.map(async (image) => {
          if (typeof image.size === 'number') return image;

          try {
            const response = await fetch(`${API_BASE_URL}/images/${image.filename}`, { method: 'HEAD' });
            const contentLength = Number(response.headers.get('content-length'));
            return {
              ...image,
              size: Number.isFinite(contentLength) ? contentLength : 0
            };
          } catch (error) {
            return {
              ...image,
              size: 0
            };
          }
        }));
        setImages(imagesWithSizes);
      } finally {
        setImageSizesLoading(false);
      }
    };

    fetchMissingImageSizes();
  }, [activeSubTab, images]);

  const handleSearchSubmit = () => {
    if (!searchText.trim()) {
      toast.error('Please enter search text');
      setSubmittedSearchText('');
      setMatchingNotes([]);
      setTotalMatches(0);
      setRegexError('');
      return;
    }

    if (useRegex) {
      try {
        new RegExp(searchText);
      } catch (e) {
        setRegexError('Invalid regular expression');
        return;
      }
    }

    setRegexError('');
    setSubmittedSearchText(searchText);
    setSubmittedUseRegex(useRegex);
  };

  const handleReplace = async () => {
    if (!submittedSearchText.trim()) {
      toast.error('Please submit a search first');
      return;
    }

    if (submittedUseRegex) {
      try {
        new RegExp(submittedSearchText);
      } catch (e) {
        toast.error('Invalid regular expression');
        return;
      }
    }

    const confirmed = window.confirm(
      `Are you sure you want to replace "${submittedSearchText}" with "${replaceText}" in ${matchingNotes.length} notes (${totalMatches} occurrences)?`
    );

    if (confirmed) {
      try {
        for (const note of matchingNotes) {
          let updatedContent;
          if (submittedUseRegex) {
            const regex = new RegExp(submittedSearchText, 'g');
            updatedContent = note.content.replace(regex, replaceText);
          } else {
            const regex = new RegExp(submittedSearchText, 'gi');
            updatedContent = note.content.replace(regex, replaceText);
          }
          await updateNoteById(note.id, updatedContent);
        }
        toast.success(`Successfully replaced text in ${matchingNotes.length} notes`);
        // Refresh notes after replacement
        const data = await loadAllNotes('', null);
        setNotes(data.notes);
        setSearchText('');
        setSubmittedSearchText('');
        setReplaceText('');
      } catch (error) {
        toast.error('Error replacing text: ' + error.message);
      }
    }
  };

  const handleAdd = async () => {
    if (!submittedSearchText.trim() || !addText.trim()) {
      toast.error('Please submit a search and enter text to add');
      return;
    }

    if (submittedUseRegex) {
      try {
        new RegExp(submittedSearchText);
      } catch (e) {
        toast.error('Invalid regular expression');
        return;
      }
    }

    const confirmed = window.confirm(
      `Are you sure you want to add text ${activeSubTab === 'search-add' ? 'below matching lines' : 
        activeSubTab === 'add-end' ? 'at the end of notes' : 'above matching lines'} in ${matchingNotes.length} notes?`
    );

    if (confirmed) {
      try {
        for (const note of matchingNotes) {
          let updatedContent;
          if (activeSubTab === 'add-end') {
            // Add text at the end of the note
            updatedContent = note.content.trim() + '\n' + addText;
          } else {
            // Add text above or below matching lines
            const lines = note.content.split('\n');
            const newLines = [];
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              let matches = false;
              
              if (submittedUseRegex) {
                const regex = new RegExp(submittedSearchText, 'g');
                matches = regex.test(line);
                regex.lastIndex = 0; // Reset regex state
              } else {
                matches = line.toLowerCase().includes(submittedSearchText.toLowerCase());
              }

              if (matches) {
                if (activeSubTab === 'add-above') {
                  newLines.push(addText);
                }
                newLines.push(line);
                if (activeSubTab === 'search-add') {
                  newLines.push(addText);
                }
              } else {
                newLines.push(line);
              }
            }
            
            updatedContent = newLines.join('\n');
          }
          
          await updateNoteById(note.id, updatedContent);
        }
        toast.success(`Successfully added text in ${matchingNotes.length} notes`);
        // Refresh notes after adding
        const data = await loadAllNotes('', null);
        setNotes(data.notes);
        setSearchText('');
        setSubmittedSearchText('');
        setAddText('');
      } catch (error) {
        toast.error('Error adding text: ' + error.message);
      }
    }
  };

  // Function to find sensitive notes and encode their content
  const handleReverseUrls = async () => {
    // Find all sensitive notes that have not been upgraded to full-line encoding.
    const sensitiveNotes = notes.filter(note => 
      note.content.includes('meta::sensitive::') && !hasEncodedContent(note.content)
    );

    if (sensitiveNotes.length === 0) {
      toast.info('No unencoded sensitive notes found');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to encode all content lines in ${sensitiveNotes.length} sensitive notes?`
    );

    if (confirmed) {
      try {
        let processedCount = 0;
        for (const note of sensitiveNotes) {
          const encodedContent = encodeSensitiveContent(decodeSensitiveContent(note.content));
          if (encodedContent !== note.content) {
            await updateNoteById(note.id, encodedContent);
            processedCount++;
          }
        }
        toast.success(`Successfully encoded ${processedCount} sensitive notes`);
        
        // Refresh notes after processing
        const data = await loadAllNotes('', null);
        setNotes(data.notes);
      } catch (error) {
        toast.error('Error reversing URLs: ' + error.message);
      }
    }
  };

  const handleExport = async () => {
    try {
      await exportAllNotes();
      toast.success('Backup Performed');
    } catch (error) {
      toast.error('Error during export: ' + error.message);
    }
  };

  const refreshImages = async () => {
    setImagesLoading(true);
    setImagesError('');
    try {
      const imageList = await listImages();
      setImages(imageList);
      setHasLoadedImages(true);
      return imageList;
    } finally {
      setImagesLoading(false);
    }
  };

  const reduceImageSize = async (image, notesSnapshot) => {
    const originalSize = image.size || 0;
    if (!originalSize) {
      throw new Error('Image size is not loaded yet. Try Refresh first.');
    }

    const imageUrl = `${API_BASE_URL}/images/${image.filename}`;
    const compressed = await compressImageBlob(imageUrl, originalSize);

    if (!compressed) {
      return {
        changed: false,
        reason: 'Could not make this image smaller without changing width and height',
        notes: notesSnapshot,
        originalSize,
        compressedSize: originalSize
      };
    }

    const compressedFile = new File([compressed.blob], `${image.id}-compressed.jpg`, {
      type: 'image/jpeg'
    });
    const uploadedImage = await uploadImage(compressedFile);
    const updatedNotes = notesSnapshot.filter(note => extractReferencedImageIds(note.content).includes(image.id.toLowerCase()));
    const nextNotes = notesSnapshot.map(note => {
      if (!updatedNotes.some(updatedNote => updatedNote.id === note.id)) return note;
      return {
        ...note,
        content: replaceImageReferences(note.content, image, uploadedImage)
      };
    });

    for (const note of updatedNotes) {
      const updatedContent = replaceImageReferences(note.content, image, uploadedImage);
      if (updatedContent !== note.content) {
        await updateNoteById(note.id, updatedContent);
      }
    }

    await deleteImageById(image.id).catch(() => null);

    return {
      changed: true,
      notes: nextNotes,
      originalSize,
      compressedSize: compressed.blob.size
    };
  };

  const handleReduceImageSize = async (image) => {
    if (!window.confirm(`Compress ${image.filename} without changing width or height?`)) {
      return;
    }

    try {
      setCompressingImageId(image.id);
      const result = await reduceImageSize(image, notes);

      if (!result.changed) {
        toast.info(result.reason);
        return;
      }

      const notesData = await loadAllNotes('', null);
      setNotes(notesData.notes);
      await refreshImages();

      toast.success(`Reduced image from ${formatFileSize(result.originalSize)} to ${formatFileSize(result.compressedSize)}`);
    } catch (error) {
      toast.error('Error reducing image size: ' + error.message);
    } finally {
      setCompressingImageId(null);
    }
  };

  const handleReduceAllImageSizes = async () => {
    const uniqueImages = Array.from(
      new Map(largeImageNotes.map(({ image }) => [image.id, image])).values()
    );

    if (uniqueImages.length === 0) {
      toast.info('No large images to reduce');
      return;
    }

    if (!window.confirm(`Compress all ${uniqueImages.length} images currently shown without changing width or height?`)) {
      return;
    }

    let workingNotes = notes;
    let reducedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let savedBytes = 0;

    try {
      for (let index = 0; index < uniqueImages.length; index++) {
        const image = uniqueImages[index];
        setBulkCompressProgress({ current: index + 1, total: uniqueImages.length, filename: image.filename });
        setCompressingImageId(image.id);

        try {
          const result = await reduceImageSize(image, workingNotes);
          workingNotes = result.notes;
          if (result.changed) {
            reducedCount++;
            savedBytes += Math.max(0, result.originalSize - result.compressedSize);
          } else {
            skippedCount++;
          }
        } catch (error) {
          failedCount++;
          console.error('Error reducing image size:', image.filename, error);
        }
      }

      const notesData = await loadAllNotes('', null);
      setNotes(notesData.notes);
      await refreshImages();
      toast.success(`Reduced ${reducedCount} images, skipped ${skippedCount}, failed ${failedCount}. Saved ${formatFileSize(savedBytes)}.`);
    } finally {
      setCompressingImageId(null);
      setBulkCompressProgress(null);
    }
  };

  const largeImageNotes = (() => {
    const imageById = new Map(images.map(image => [image.id.toLowerCase(), image]));
    return notes
      .flatMap(note => {
        const imageIds = extractReferencedImageIds(note.content);
        return imageIds
          .map(imageId => {
            const image = imageById.get(imageId);
            if (!image || image.size <= LARGE_IMAGE_THRESHOLD_BYTES) return null;
            return {
              note,
              image,
              imageUrl: `${API_BASE_URL}/images/${image.filename}`
            };
          })
          .filter(Boolean);
      })
      .sort((a, b) => b.image.size - a.image.size);
  })();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow">
        {/* Main Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('notes')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'notes'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Notes
            </button>
            <button
              onClick={handleExport}
              className="ml-auto py-2 px-4 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Export All
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'notes' && (
            <div>
              {/* Notes Sub-tabs */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveSubTab('search-replace')}
                    className={`py-2 px-4 text-sm font-medium ${
                      activeSubTab === 'search-replace'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Search & Replace
                  </button>
                  <button
                    onClick={() => setActiveSubTab('search-add')}
                    className={`py-2 px-4 text-sm font-medium ${
                      activeSubTab === 'search-add'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Add Below Matches
                  </button>
                  <button
                    onClick={() => setActiveSubTab('add-above')}
                    className={`py-2 px-4 text-sm font-medium ${
                      activeSubTab === 'add-above'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Add Above Matches
                  </button>
                  <button
                    onClick={() => setActiveSubTab('add-end')}
                    className={`py-2 px-4 text-sm font-medium ${
                      activeSubTab === 'add-end'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Add at End
                  </button>
                  <button
                    onClick={() => setActiveSubTab('reverse-urls')}
                    className={`py-2 px-4 text-sm font-medium ${
                      activeSubTab === 'reverse-urls'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Encode Sensitive Notes
                  </button>
                  <button
                    onClick={() => setActiveSubTab('large-images')}
                    className={`py-2 px-4 text-sm font-medium ${
                      activeSubTab === 'large-images'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Large Images
                  </button>
                </nav>
              </div>

              {/* Notes Sub-tab Content */}
              {activeSubTab === 'search-replace' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Search Text
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="text"
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={useRegex ? "Enter regular expression..." : "Enter text to search for (comma-separated for AND condition)..."}
                        />
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={useRegex}
                            onChange={(e) => setUseRegex(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">Use Regex</span>
                        </label>
                      </div>
                      {regexError && (
                        <p className="mt-1 text-sm text-red-600">{regexError}</p>
                      )}
                      {!useRegex && searchText.includes(',') && (
                        <p className="mt-1 text-sm text-gray-600">
                          Will search for notes containing ALL of: {searchText.split(',').map(term => term.trim()).filter(term => term).join(', ')}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Replace With
                      </label>
                      <input
                        type="text"
                        value={replaceText}
                        onChange={(e) => setReplaceText(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter replacement text..."
                      />
                    </div>

                    <button
                      onClick={handleSearchSubmit}
                      disabled={!searchText.trim()}
                      className={`px-4 py-2 rounded-md text-white ${
                        !searchText.trim()
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      Submit Search
                    </button>

                    {submittedSearchText && !regexError && (
                      <div className="text-sm text-gray-600">
                        Found {totalMatches} occurrences in {matchingNotes.length} notes
                      </div>
                    )}

                    <button
                      onClick={handleReplace}
                      disabled={!submittedSearchText || matchingNotes.length === 0 || regexError}
                      className={`px-4 py-2 rounded-md text-white ${
                        !submittedSearchText || matchingNotes.length === 0 || regexError
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      Replace All
                    </button>
                  </div>

                  {matchingNotes.length > 0 && !regexError && (
                    <div className="mt-6">
                      <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        Matching Notes (Preview)
                      </h2>
                      <div className="space-y-4">
                        {matchingNotes.map((note) => {
                          // Create a preview of the replacement
                          let previewContent = note.content;
                          if (submittedUseRegex) {
                            try {
                              const regex = new RegExp(submittedSearchText, 'g');
                              previewContent = note.content.replace(regex, replaceText);
                            } catch (e) {
                              previewContent = note.content;
                            }
                          } else {
                            const searchTerms = submittedSearchText.split(',').map(term => term.trim()).filter(term => term);
                            searchTerms.forEach(term => {
                              const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                              const regex = new RegExp(escapedTerm, 'gi');
                              previewContent = previewContent.replace(regex, replaceText);
                            });
                          }

                          return (
                            <div
                              key={note.id}
                              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                              <div className="text-sm text-gray-600 mb-2">
                                Note ID: {note.id}
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                {/* Original Content */}
                                <div>
                                  <div className="text-sm font-medium text-gray-700 mb-2">Original:</div>
                                  <div className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-2 rounded">
                                    {note.content.split('\n').map((line, index) => {
                                      if (submittedUseRegex) {
                                        try {
                                          const regex = new RegExp(submittedSearchText, 'g');
                                          if (regex.test(line)) {
                                            const parts = line.split(new RegExp(`(${submittedSearchText})`, 'g'));
                                            return (
                                              <div key={index} className="mb-1">
                                                {parts.map((part, i) => (
                                                  <span
                                                    key={i}
                                                    className={
                                                      regex.test(part)
                                                        ? 'bg-yellow-200'
                                                        : ''
                                                    }
                                                  >
                                                    {part}
                                                  </span>
                                                ))}
                                              </div>
                                            );
                                          }
                                        } catch (e) {
                                          return <div key={index} className="mb-1">{line}</div>;
                                        }
                                      } else {
                                        const searchTerms = submittedSearchText.split(',').map(term => term.trim()).filter(term => term);
                                        let lineToShow = line;
                                        let hasMatch = false;

                                        searchTerms.forEach(term => {
                                          if (line.toLowerCase().includes(term.toLowerCase())) {
                                            hasMatch = true;
                                            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                            const regex = new RegExp(`(${escapedTerm})`, 'gi');
                                            lineToShow = lineToShow.replace(regex, '<span class="bg-yellow-200">$1</span>');
                                          }
                                        });

                                        if (hasMatch) {
                                          return (
                                            <div 
                                              key={index} 
                                              className="mb-1"
                                              dangerouslySetInnerHTML={{ __html: lineToShow }}
                                            />
                                          );
                                        }
                                      }
                                      return <div key={index} className="mb-1">{line}</div>;
                                    })}
                                  </div>
                                </div>

                                {/* Preview Content */}
                                <div>
                                  <div className="text-sm font-medium text-gray-700 mb-2">After Replacement:</div>
                                  <div className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-2 rounded">
                                    {previewContent.split('\n').map((line, index) => {
                                      // Highlight the replaced text
                                      if (submittedUseRegex) {
                                        try {
                                          const regex = new RegExp(replaceText, 'g');
                                          if (regex.test(line)) {
                                            const parts = line.split(new RegExp(`(${replaceText})`, 'g'));
                                            return (
                                              <div key={index} className="mb-1">
                                                {parts.map((part, i) => (
                                                  <span
                                                    key={i}
                                                    className={
                                                      regex.test(part)
                                                        ? 'bg-green-200'
                                                        : ''
                                                    }
                                                  >
                                                    {part}
                                                  </span>
                                                ))}
                                              </div>
                                            );
                                          }
                                        } catch (e) {
                                          return <div key={index} className="mb-1">{line}</div>;
                                        }
                                      } else {
                                        const searchTerms = submittedSearchText.split(',').map(term => term.trim()).filter(term => term);
                                        let lineToShow = line;
                                        let hasMatch = false;

                                        searchTerms.forEach(term => {
                                          if (line.toLowerCase().includes(replaceText.toLowerCase())) {
                                            hasMatch = true;
                                            const escapedTerm = replaceText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                            const regex = new RegExp(`(${escapedTerm})`, 'gi');
                                            lineToShow = lineToShow.replace(regex, '<span class="bg-green-200">$1</span>');
                                          }
                                        });

                                        if (hasMatch) {
                                          return (
                                            <div 
                                              key={index} 
                                              className="mb-1"
                                              dangerouslySetInnerHTML={{ __html: lineToShow }}
                                            />
                                          );
                                        }
                                      }
                                      return <div key={index} className="mb-1">{line}</div>;
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(activeSubTab === 'search-add' || activeSubTab === 'add-above' || activeSubTab === 'add-end') && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Search Text
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="text"
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={useRegex ? "Enter regular expression..." : "Enter text to search for..."}
                        />
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={useRegex}
                            onChange={(e) => setUseRegex(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">Use Regex</span>
                        </label>
                      </div>
                      {regexError && (
                        <p className="mt-1 text-sm text-red-600">{regexError}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Text to Add
                      </label>
                      <input
                        type="text"
                        value={addText}
                        onChange={(e) => setAddText(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Enter text to add ${activeSubTab === 'add-end' ? 'at the end of matching notes' : 
                          activeSubTab === 'add-above' ? 'above matching lines' : 'below matching lines'}...`}
                      />
                    </div>

                    <button
                      onClick={handleSearchSubmit}
                      disabled={!searchText.trim()}
                      className={`px-4 py-2 rounded-md text-white ${
                        !searchText.trim()
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      Submit Search
                    </button>

                    {submittedSearchText && !regexError && (
                      <div className="text-sm text-gray-600">
                        Found {totalMatches} matching lines in {matchingNotes.length} notes
                      </div>
                    )}

                    <button
                      onClick={handleAdd}
                      disabled={!addText || !submittedSearchText || matchingNotes.length === 0 || regexError}
                      className={`px-4 py-2 rounded-md text-white ${
                        !addText || !submittedSearchText || matchingNotes.length === 0 || regexError
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {activeSubTab === 'add-end' ? 'Add to Matching Notes' : 
                       activeSubTab === 'add-above' ? 'Add Above All Matches' : 
                       'Add Below All Matches'}
                    </button>
                  </div>

                  {matchingNotes.length > 0 && !regexError && (
                    <div className="mt-6">
                      <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        Matching Notes (Preview)
                      </h2>
                      <div className="space-y-4">
                        {matchingNotes.map((note) => {
                          // Create a preview of the addition
                          let previewContent = note.content;
                          if (activeSubTab === 'add-end') {
                            previewContent = note.content.trim() + '\n' + addText;
                          } else {
                            const lines = note.content.split('\n');
                            const newLines = [];
                            
                            for (let i = 0; i < lines.length; i++) {
                              const line = lines[i];
                              let matches = false;
                              
                              if (submittedUseRegex) {
                                const regex = new RegExp(submittedSearchText, 'g');
                                matches = regex.test(line);
                                regex.lastIndex = 0; // Reset regex state
                              } else {
                                matches = line.toLowerCase().includes(submittedSearchText.toLowerCase());
                              }

                              if (matches) {
                                if (activeSubTab === 'add-above') {
                                  newLines.push(addText);
                                }
                                newLines.push(line);
                                if (activeSubTab === 'search-add') {
                                  newLines.push(addText);
                                }
                              } else {
                                newLines.push(line);
                              }
                            }
                            
                            previewContent = newLines.join('\n');
                          }

                          return (
                            <div
                              key={note.id}
                              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                              <div className="text-sm text-gray-600 mb-2">
                                Note ID: {note.id}
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                {/* Original Content */}
                                <div>
                                  <div className="text-sm font-medium text-gray-700 mb-2">Current:</div>
                                  <div className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-2 rounded">
                                    {note.content.split('\n').map((line, index) => {
                                      if (submittedUseRegex) {
                                        try {
                                          const regex = new RegExp(submittedSearchText, 'g');
                                          if (regex.test(line)) {
                                            const parts = line.split(new RegExp(`(${submittedSearchText})`, 'g'));
                                            return (
                                              <div key={index} className="mb-1">
                                                {parts.map((part, i) => (
                                                  <span
                                                    key={i}
                                                    className={
                                                      regex.test(part)
                                                        ? 'bg-yellow-200'
                                                        : ''
                                                    }
                                                  >
                                                    {part}
                                                  </span>
                                                ))}
                                              </div>
                                            );
                                          }
                                        } catch (e) {
                                          return <div key={index} className="mb-1">{line}</div>;
                                        }
                                      } else {
                                        const searchTerms = submittedSearchText.split(',').map(term => term.trim()).filter(term => term);
                                        let lineToShow = line;
                                        let hasMatch = false;

                                        searchTerms.forEach(term => {
                                          if (line.toLowerCase().includes(term.toLowerCase())) {
                                            hasMatch = true;
                                            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                            const regex = new RegExp(`(${escapedTerm})`, 'gi');
                                            lineToShow = lineToShow.replace(regex, '<span class="bg-yellow-200">$1</span>');
                                          }
                                        });

                                        if (hasMatch) {
                                          return (
                                            <div 
                                              key={index} 
                                              className="mb-1"
                                              dangerouslySetInnerHTML={{ __html: lineToShow }}
                                            />
                                          );
                                        }
                                      }
                                      return <div key={index} className="mb-1">{line}</div>;
                                    })}
                                  </div>
                                </div>

                                {/* Preview Content */}
                                <div>
                                  <div className="text-sm font-medium text-gray-700 mb-2">After Adding:</div>
                                  <div className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-2 rounded">
                                    {previewContent.split('\n').map((line, index) => {
                                      // Highlight the added text
                                      if (line === addText) {
                                        return (
                                          <div key={index} className="mb-1">
                                            <span className="bg-green-200">{line}</span>
                                          </div>
                                        );
                                      }
                                      
                                      if (submittedUseRegex) {
                                        try {
                                          const regex = new RegExp(submittedSearchText, 'g');
                                          if (regex.test(line)) {
                                            const parts = line.split(new RegExp(`(${submittedSearchText})`, 'g'));
                                            return (
                                              <div key={index} className="mb-1">
                                                {parts.map((part, i) => (
                                                  <span
                                                    key={i}
                                                    className={
                                                      regex.test(part)
                                                        ? 'bg-yellow-200'
                                                        : ''
                                                    }
                                                  >
                                                    {part}
                                                  </span>
                                                ))}
                                              </div>
                                            );
                                          }
                                        } catch (e) {
                                          return <div key={index} className="mb-1">{line}</div>;
                                        }
                                      } else {
                                        const searchTerms = submittedSearchText.split(',').map(term => term.trim()).filter(term => term);
                                        let lineToShow = line;
                                        let hasMatch = false;

                                        searchTerms.forEach(term => {
                                          if (line.toLowerCase().includes(term.toLowerCase())) {
                                            hasMatch = true;
                                            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                            const regex = new RegExp(`(${escapedTerm})`, 'gi');
                                            lineToShow = lineToShow.replace(regex, '<span class="bg-yellow-200">$1</span>');
                                          }
                                        });

                                        if (hasMatch) {
                                          return (
                                            <div 
                                              key={index} 
                                              className="mb-1"
                                              dangerouslySetInnerHTML={{ __html: lineToShow }}
                                            />
                                          );
                                        }
                                      }
                                      return <div key={index} className="mb-1">{line}</div>;
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSubTab === 'reverse-urls' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-blue-800 mb-2">
                        Encode Sensitive Notes
                      </h3>
                      <p className="text-blue-700 mb-4">
                        This feature will find all notes with the <code className="bg-blue-100 px-1 rounded">meta::sensitive::</code> tag 
                        that do not yet have the <code className="bg-blue-100 px-1 rounded">meta::encoded</code> tag. It encodes every non-meta line and adds compatibility metadata.
                      </p>
                      <ul className="list-disc list-inside text-blue-700 space-y-1">
                        <li>Plain text lines are encoded using the sensitive-note transform.</li>
                        <li>Older notes without <code className="bg-blue-100 px-1 rounded">meta::encoded</code> keep URL-only decoding for backward compatibility.</li>
                      </ul>
                    </div>

                    {/* Find sensitive notes */}
                    {(() => {
                      const sensitiveNotes = notes.filter(note => 
                        note.content.includes('meta::sensitive::') && !hasEncodedContent(note.content)
                      );
                      
                      return (
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">
                              Unencoded Sensitive Notes: {sensitiveNotes.length}
                            </h3>
                            <button
                              onClick={handleReverseUrls}
                              disabled={sensitiveNotes.length === 0}
                              className={`px-4 py-2 rounded-md text-white ${
                                sensitiveNotes.length === 0
                                  ? 'bg-gray-400 cursor-not-allowed'
                                  : 'bg-red-600 hover:bg-red-700'
                              }`}
                            >
                              Encode All Sensitive Notes
                            </button>
                          </div>

                          {sensitiveNotes.length > 0 && (
                            <div className="space-y-4">
                              <h4 className="text-md font-medium text-gray-700 mb-2">
                                Preview of Sensitive Notes:
                              </h4>
                              {sensitiveNotes.map((note) => {
                                const contentWithTag = encodeSensitiveContent(decodeSensitiveContent(note.content));
                                
                                return (
                                  <div
                                    key={note.id}
                                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                                  >
                                    <div className="text-sm text-gray-600 mb-2">
                                      Note ID: {note.id}
                                      <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                                        Will encode content lines
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {/* Original Content */}
                                      <div>
                                        <div className="text-sm font-medium text-gray-700 mb-2">Original:</div>
                                        <div className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-2 rounded text-sm max-h-40 overflow-y-auto">
                                          {note.content}
                                        </div>
                                      </div>

                                      {/* Reversed Content */}
                                      <div>
                                        <div className="text-sm font-medium text-gray-700 mb-2">After Encoding:</div>
                                        <div className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-2 rounded text-sm max-h-40 overflow-y-auto">
                                          {contentWithTag}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {sensitiveNotes.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              <p>No unencoded sensitive notes found.</p>
                              <p className="mt-2 text-sm">Sensitive notes without <code className="bg-gray-100 px-1 rounded">meta::encoded</code> will appear here.</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {activeSubTab === 'large-images' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">
                      Notes With Images Over 750 KB
                    </h3>
                    <p className="text-blue-700">
                      Finds notes with <code className="bg-blue-100 px-1 rounded">meta::image::</code> references where the stored image file is larger than 750 KB.
                    </p>
                  </div>

                  {(imagesLoading || imageSizesLoading) && (
                    <div className="text-center py-8 text-gray-500">
                      Loading image sizes...
                    </div>
                  )}

                  {imagesError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
                      {imagesError}
                    </div>
                  )}

                  {!imagesLoading && !imageSizesLoading && !imagesError && (
                    <div>
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">
                          Matching Images: {largeImageNotes.length}
                        </h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleReduceAllImageSizes}
                            disabled={largeImageNotes.length === 0 || Boolean(bulkCompressProgress)}
                            className={`px-4 py-2 rounded-md text-sm font-medium ${
                              largeImageNotes.length === 0 || bulkCompressProgress
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                            }`}
                          >
                            {bulkCompressProgress
                              ? `Reducing ${bulkCompressProgress.current}/${bulkCompressProgress.total}`
                              : 'Reduce all'}
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await refreshImages();
                              } catch (error) {
                                setImagesError(error.message);
                                toast.error('Error refreshing images: ' + error.message);
                              }
                            }}
                            className="px-4 py-2 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                          >
                            Refresh
                          </button>
                        </div>
                      </div>

                      {bulkCompressProgress && (
                        <div className="mb-4 text-sm text-gray-600">
                          Reducing {bulkCompressProgress.filename}
                        </div>
                      )}

                      {largeImageNotes.length > 0 ? (
                        <div className="space-y-4">
                          {largeImageNotes.map(({ note, image, imageUrl }) => (
                            <div
                              key={`${note.id}-${image.id}`}
                              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                              <div className="flex gap-4">
                                <a
                                  href={imageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0"
                                  title="Open image"
                                >
                                  <img
                                    src={imageUrl}
                                    alt={image.filename}
                                    className="w-24 h-24 object-cover rounded border border-gray-200"
                                  />
                                </a>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span className="text-sm text-gray-600">Note ID: {note.id}</span>
                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                                      {formatFileSize(image.size)}
                                    </span>
                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                      {image.extension || 'file'}
                                    </span>
                                  </div>
                                  <div className="text-gray-900 font-medium truncate mb-2">
                                    {getNoteTitle(note.content)}
                                  </div>
                                  <div className="text-xs text-gray-500 font-mono break-all mb-3">
                                    {image.filename}
                                  </div>
                                  <a
                                    href={`/#/?search=id:${note.id}`}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                  >
                                    Open note
                                  </a>
                                  <button
                                    onClick={() => handleReduceImageSize(image)}
                                    disabled={compressingImageId === image.id}
                                    className={`ml-4 px-3 py-1.5 rounded-md text-sm font-medium ${
                                      compressingImageId === image.id
                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                        : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                    }`}
                                  >
                                    {compressingImageId === image.id ? 'Reducing...' : 'Reduce size'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>No note images over 750 KB found.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Manage; 
