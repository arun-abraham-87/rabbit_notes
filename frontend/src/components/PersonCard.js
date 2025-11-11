import React, { useState, useEffect, useMemo } from 'react';
import { UserIcon, XMarkIcon, CodeBracketIcon, PencilIcon, PhotoIcon, TrashIcon, UserGroupIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import { parseNoteContent } from '../utils/TextUtils';
import { getAgeInStringFmt } from '../utils/DateUtils';
import { updateNoteById, deleteImageById } from '../utils/ApiUtils';

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

  const relationships = lines
    .filter(line => line.startsWith('meta::relationship::'))
    .map(line => {
      const parts = line.split('::');
      return {
        type: parts[2],
        personId: parts[3]
      };
    });

  return { name, tags, metaInfo, photos, relationships };
  };

// Relationship Card Preview Component
const RelationshipCardPreview = ({ person, allNotes, onEdit, hidePhotos = false }) => {
  if (!person || !person.content) return null;

  const { name, tags, metaInfo, photos } = getPersonInfo(person.content);

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        {!hidePhotos && (
          <div className="flex-shrink-0">
            {photos && photos.length > 0 ? (
              <img
                src={photos[0]}
                alt={name}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                <UserIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>
        )}
        <div className="flex-grow min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded"
                >
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="px-2 py-0.5 text-xs text-gray-500">
                  +{tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {metaInfo && metaInfo.length > 0 && (
        <div className="space-y-1 pt-2 border-t">
          {metaInfo.slice(0, 3).map((info, idx) => (
            <div key={idx} className="text-xs text-gray-600">
              <span className="font-medium">{info.name}:</span> {info.value}
            </div>
          ))}
          {metaInfo.length > 3 && (
            <div className="text-xs text-gray-500">
              +{metaInfo.length - 3} more
            </div>
          )}
        </div>
      )}

      {onEdit && (
        <button
          onClick={() => onEdit(person)}
          className="w-full mt-2 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
        >
          View Full Profile
        </button>
      )}
    </div>
  );
};

const PersonCard = ({ note, onShowRaw, onEdit, onRemoveTag, onUpdate, allNotes = [], hidePhotos = false, onTagClick = null }) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [hoveredRelationship, setHoveredRelationship] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showRelationsModal, setShowRelationsModal] = useState(false);
  const [viewingPersonInModal, setViewingPersonInModal] = useState(null); // Track which person's relationships we're viewing

  const API_BASE_URL = 'http://localhost:5001';

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showImageModal) {
          setShowImageModal(false);
          setSelectedImage(null);
          setImageSize({ width: 0, height: 0 });
        }
        if (showImageUpload) {
          setShowImageUpload(false);
          setIsDragging(false);
          setUploading(false);
        }
        if (showRelationsModal) {
          setShowRelationsModal(false);
        }
      }
    };

    if (showImageModal || showImageUpload || showRelationsModal) {
      window.addEventListener('keydown', handleEscape);
      return () => {
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showImageModal, showImageUpload, showRelationsModal]);

  // Upload image function
  const uploadImage = async (file) => {
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
      
      // Update the person's note with the new photo
      const lines = note.content.split('\n');
      const photoLines = lines.filter(line => line.startsWith('meta::photo::'));
      
      // Add the new photo URL to the content
      let updatedContent = note.content;
      if (!photoLines.some(line => line.includes(imageUrl))) {
        updatedContent += `\nmeta::photo::${imageUrl}`;
      }
      
      // Update the note via API
      await updateNoteById(note.id, updatedContent);
      
      // Call onUpdate callback to update parent state
      if (onUpdate) {
        onUpdate({ ...note, content: updatedContent });
      }
      
      setShowImageUpload(false);
      setUploading(false);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
      setUploading(false);
    }
  };

  // Handle drag and drop on card
  const handleCardDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only show drag over effect if dragging files
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
    }
  };

  const handleCardDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only show drag over effect if dragging files
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
    }
  };

  const handleCardDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only remove drag over effect if leaving the card
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDraggingOver(false);
    }
  };

  const handleCardDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      await uploadImage(imageFile);
    } else {
      alert('Please drop a valid image file');
    }
  };

  // Handle drag and drop (for image upload popup)
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
    
    if (imageFile) {
      uploadImage(imageFile);
    } else {
      alert('Please drop a valid image file');
    }
  };

  // Handle paste
  useEffect(() => {
    if (!showImageUpload) return;

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
            await uploadImage(file);
          }
        }
      }
    };

    // Also handle keydown to stop propagation when Cmd+V or Ctrl+V is pressed
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
  }, [showImageUpload]);

  // Handle file input change
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };

  // Delete image function
  const handleDeleteImage = async (imageUrl) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) {
      return;
    }

    try {
      // Extract image ID from URL
      // URL format: http://localhost:5001/api/images/{imageId}.{ext}
      const urlParts = imageUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      const imageId = filename.split('.')[0]; // Remove extension

      // Delete image from backend
      await deleteImageById(imageId);

      // Remove the photo line from note content
      const lines = note.content.split('\n');
      const updatedLines = lines.filter(line => {
        // Remove the line that contains this image URL
        return !line.startsWith('meta::photo::') || !line.includes(imageUrl);
      });
      const updatedContent = updatedLines.join('\n');

      // Update the note via API
      await updateNoteById(note.id, updatedContent);

      // Call onUpdate callback to update parent state
      if (onUpdate) {
        onUpdate({ ...note, content: updatedContent });
      }

      // Close the modal
      setShowImageModal(false);
      setSelectedImage(null);
      setImageSize({ width: 0, height: 0 });
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image. Please try again.');
    }
  };

  const { name, tags, metaInfo, photos, relationships } = getPersonInfo(note.content);

  // Helper function to get reverse relationship type
  const getReverseRelationshipType = (type) => {
    const reverseMap = {
      'father_of': 'child_of',
      'mother_of': 'child_of',
      'brother_of': 'brother_of',
      'sister_of': 'sister_of',
      'spouse_of': 'spouse_of',
      'uncle_of': 'nephew_of',
      'aunt_of': 'niece_of',
      'cousin_of': 'cousin_of',
      'grandfather_of': 'grandchild_of',
      'grandmother_of': 'grandchild_of',
    };
    return reverseMap[type];
  };

  // Also get reverse relationships (relationships from other people pointing to this person)
  const reverseRelationships = useMemo(() => {
    const reverse = [];
    allNotes.forEach(otherNote => {
      if (otherNote.id === note.id) return; // Skip self
      
      const otherLines = otherNote.content.split('\n');
      const otherRelationships = otherLines
        .filter(line => line.startsWith('meta::relationship::'))
        .map(line => {
          const parts = line.split('::');
          return {
            type: parts[2],
            personId: parts[3]
          };
        });
      
      // Check if any relationship points to this person
      otherRelationships.forEach(rel => {
        if (rel.personId === note.id) {
          // This is a reverse relationship - other person has relationship pointing to this person
          // Get the reverse type
          const reverseType = getReverseRelationshipType(rel.type);
          if (reverseType) {
            reverse.push({
              type: reverseType,
              personId: otherNote.id
            });
          }
        }
      });
    });
    return reverse;
  }, [allNotes, note.id]);

  // Combine relationships and reverse relationships, removing duplicates
  const allRelationships = useMemo(() => {
    const combined = [...relationships];
    reverseRelationships.forEach(revRel => {
      // Check if this reverse relationship already exists
      const exists = relationships.some(rel => 
        rel.type === revRel.type && rel.personId === revRel.personId
      );
      if (!exists) {
        combined.push(revRel);
      }
    });
    return combined;
  }, [relationships, reverseRelationships]);

  // Relationship type labels
  const relationshipLabels = {
    'father_of': 'Father of',
    'mother_of': 'Mother of',
    'brother_of': 'Brother of',
    'sister_of': 'Sister of',
    'spouse_of': 'Spouse of',
    'child_of': 'Child of',
    'son_of': 'Son of',
    'daughter_of': 'Daughter of',
    'uncle_of': 'Uncle of',
    'aunt_of': 'Aunt of',
    'cousin_of': 'Cousin of',
    'grandfather_of': 'Grandfather of',
    'grandmother_of': 'Grandmother of',
    'grandchild_of': 'Grandchild of',
    'nephew_of': 'Nephew of',
    'niece_of': 'Niece of',
  };

  // Get reverse relationship label for display
  const getReverseRelationshipLabel = (relType, otherPersonId, personNote = null) => {
    const thisPerson = personNote || note;
    const otherPerson = allNotes.find(n => n.id === otherPersonId);
    if (!otherPerson) return relationshipLabels[relType] || relType;
    
    const otherPersonLines = otherPerson.content.split('\n');
    const thisPersonLines = thisPerson.content.split('\n');
    
    // If this person has "child_of" relationship, check if other person is father or mother
    if (relType === 'child_of') {
      // Check if this person has son_of or daughter_of relationship
      const hasSonOf = thisPersonLines.some(line => 
        line.startsWith(`meta::relationship::son_of::${otherPersonId}`)
      );
      const hasDaughterOf = thisPersonLines.some(line => 
        line.startsWith(`meta::relationship::daughter_of::${otherPersonId}`)
      );
      
      if (hasSonOf) return 'Son of';
      if (hasDaughterOf) return 'Daughter of';
      
      // Check if other person has father_of or mother_of pointing to this person
      const hasFatherOf = otherPersonLines.some(line => 
        line.startsWith(`meta::relationship::father_of::${thisPerson.id}`)
      );
      const hasMotherOf = otherPersonLines.some(line => 
        line.startsWith(`meta::relationship::mother_of::${thisPerson.id}`)
      );
      
      if (hasFatherOf || hasMotherOf) {
        // Show as child_of since we can't determine son/daughter
        return 'Child of';
      }
    }
    
    return relationshipLabels[relType] || relType;
  };

  // Get person name by ID
  const getPersonName = (personId) => {
    const personNote = allNotes.find(n => n.id === personId);
    if (personNote) {
      const lines = personNote.content.split('\n');
      return lines[0]; // First line is the name
    }
    return personId;
  };

  // Helper function to get relationships for any person note
  const getRelationshipsForPerson = (personNote) => {
    if (!personNote || !personNote.content) return [];
    
    const personLines = personNote.content.split('\n');
    const directRelationships = personLines
      .filter(line => line.startsWith('meta::relationship::'))
      .map(line => {
        const parts = line.split('::');
        return {
          type: parts[2],
          personId: parts[3]
        };
      });
    
    // Get reverse relationships
    const reverse = [];
    allNotes.forEach(otherNote => {
      if (otherNote.id === personNote.id) return;
      
      const otherLines = otherNote.content.split('\n');
      const otherRelationships = otherLines
        .filter(line => line.startsWith('meta::relationship::'))
        .map(line => {
          const parts = line.split('::');
          return {
            type: parts[2],
            personId: parts[3]
          };
        });
      
      otherRelationships.forEach(rel => {
        if (rel.personId === personNote.id) {
          const reverseType = getReverseRelationshipType(rel.type);
          if (reverseType) {
            reverse.push({
              type: reverseType,
              personId: otherNote.id
            });
          }
        }
      });
    });
    
    // Combine and deduplicate
    const combined = [...directRelationships];
    reverse.forEach(revRel => {
      const exists = directRelationships.some(rel => 
        rel.type === revRel.type && rel.personId === revRel.personId
      );
      if (!exists) {
        combined.push(revRel);
      }
    });
    
    return combined;
  };

  // Get all related people as note objects
  const relatedPeople = useMemo(() => {
    const related = [];
    allRelationships.forEach(rel => {
      const relatedPerson = allNotes.find(n => n.id === rel.personId);
      if (relatedPerson) {
        const relLabel = getReverseRelationshipLabel(rel.type, rel.personId);
        related.push({
          person: relatedPerson,
          relationshipType: relLabel
        });
      }
    });
    return related;
  }, [allRelationships, allNotes]);

  // Helper function to group relationships
  const groupRelationships = (relationships) => {
    const groups = {
      parents: [],      // Child of relationships (parents)
      spouse: [],
      siblings: [],
      children: [],     // Son/Daughter relationships (this person's children)
      grandchildren: [],
      friends: []
    };

    relationships.forEach(rel => {
      const relType = rel.type;
      
      // Parent relationships (child_of, son_of, daughter_of)
      if (relType === 'child_of' || relType === 'son_of' || relType === 'daughter_of') {
        groups.parents.push(rel);
      }
      // Spouse relationships
      else if (relType === 'spouse_of') {
        groups.spouse.push(rel);
      }
      // Sibling relationships
      else if (relType === 'brother_of' || relType === 'sister_of') {
        groups.siblings.push(rel);
      }
      // Grandchildren relationships
      else if (relType === 'grandchild_of' || relType === 'grandson_of' || relType === 'granddaughter_of') {
        groups.grandchildren.push(rel);
      }
      // Children relationships (this person's children - father_of, mother_of)
      else if (relType === 'father_of' || relType === 'mother_of') {
        groups.children.push(rel);
      }
      // Friends relationships (catch-all for others)
      else {
        groups.friends.push(rel);
      }
    });

    return groups;
  };

  // Group relationships by category
  const groupedRelationships = useMemo(() => {
    return groupRelationships(allRelationships);
  }, [allRelationships]);

  // Get relationships for the person being viewed in the modal
  const modalPerson = viewingPersonInModal || note;
  const modalPersonRelationships = useMemo(() => {
    return getRelationshipsForPerson(modalPerson);
  }, [modalPerson, allNotes]);
  
  const modalPersonGroupedRelationships = useMemo(() => {
    return groupRelationships(modalPersonRelationships);
  }, [modalPersonRelationships]);
  
  const modalPersonName = useMemo(() => {
    if (!modalPerson || !modalPerson.content) return '';
    const lines = modalPerson.content.split('\n');
    return lines[0];
  }, [modalPerson]);

  const renderMetaValue = (info) => {
    if (info.type === 'date') {
      const age = getAgeInStringFmt(info.value);
      return `${info.value} (${age})`;
    }
    return info.value;
  };

  // Helper function to render a relationship button
  const renderRelationshipButton = (rel, index) => {
    const relLabel = getReverseRelationshipLabel(rel.type, rel.personId);
    const personName = getPersonName(rel.personId);
    const relatedPerson = allNotes.find(n => n.id === rel.personId);
    return (
      <button
        key={index}
        onClick={(e) => {
          e.stopPropagation();
          if (relatedPerson && onEdit) {
            onEdit(relatedPerson);
          }
        }}
        onMouseEnter={(e) => {
          if (relatedPerson) {
            const rect = e.currentTarget.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const popupWidth = 320; // w-80 = 320px
            const popupHeight = 384; // max-h-96 = 384px
            
            // Calculate position - prefer right side, but adjust if needed
            let x = rect.right + 10;
            let y = rect.top;
            
            // If popup would go off right edge, show on left side
            if (x + popupWidth > viewportWidth) {
              x = rect.left - popupWidth - 10;
            }
            
            // If popup would go off bottom, adjust y
            if (y + popupHeight > viewportHeight) {
              y = viewportHeight - popupHeight - 10;
            }
            
            // Ensure popup doesn't go off top
            if (y < 10) {
              y = 10;
            }
            
            setHoverPosition({ x, y });
            setHoveredRelationship(relatedPerson);
          }
        }}
        onMouseLeave={() => {
          setHoveredRelationship(null);
        }}
        className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline text-left"
        title={`Click to view ${personName}`}
      >
        {relLabel}: {personName}
      </button>
    );
  };

  return (
    <div 
      className={`relative bg-white rounded-lg border p-6 shadow-sm flex flex-col hover:shadow-md transition-shadow h-full ${
        isDraggingOver ? 'border-indigo-500 border-2 bg-indigo-50' : ''
      }`}
      onDragOver={handleCardDragOver}
      onDragEnter={handleCardDragEnter}
      onDragLeave={handleCardDragLeave}
      onDrop={handleCardDrop}
    >
      <div className="flex items-start gap-3 flex-grow">
        {!hidePhotos && (
        <div className="flex-shrink-0">
            {photos && photos.length > 0 ? (
            <button
              type="button"
              className="block h-32 w-32 rounded-lg overflow-hidden border-2 border-indigo-200 bg-indigo-100 flex items-center justify-center hover:border-indigo-400 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              title="View photo"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(photos[0]);
                setImageSize({ width: 0, height: 0 });
                setShowImageModal(true);
              }}
            >
              <img
                src={photos[0]}
                alt={name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) {
                    e.target.nextSibling.style.display = 'flex';
                  }
                }}
              />
              <div className="hidden h-32 w-32 rounded-lg bg-indigo-100 items-center justify-center">
                <UserIcon className="h-16 w-16 text-indigo-600" />
              </div>
            </button>
          ) : (
            <button
              type="button"
              className="h-32 w-32 rounded-lg bg-indigo-100 flex items-center justify-center hover:bg-indigo-200 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 border-2 border-dashed border-indigo-300 hover:border-indigo-400"
              title="Click to upload photo"
              onClick={(e) => {
                e.stopPropagation();
                setShowImageUpload(true);
              }}
            >
              <UserIcon className="h-16 w-16 text-indigo-600" />
            </button>
          )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-gray-900 break-words">
            {parseNoteContent({ content: name, searchQuery: "" }).map((element, idx) => (
              <React.Fragment key={idx}>{element}</React.Fragment>
            ))}
          </h3>
        
          {/* Meta Info Section */}
          {metaInfo.length > 0 && (
            <div className="mt-2 space-y-1">
              {metaInfo.map((info, index) => (
                <p key={index} className="text-xs text-gray-500">
                  {info.name}: {renderMetaValue(info)}
                </p>
              ))}
            </div>
          )}

          {/* Relationships Section */}
          {allRelationships && allRelationships.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {/* Parent relationships - First line (Child of) */}
              {groupedRelationships.parents.length > 0 && (
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  {groupedRelationships.parents.map((rel, index) => renderRelationshipButton(rel, `parent-${index}`))}
                </div>
              )}
              
              {/* Spouse relationships - Second line */}
              {groupedRelationships.spouse.length > 0 && (
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  {groupedRelationships.spouse.map((rel, index) => renderRelationshipButton(rel, `spouse-${index}`))}
                </div>
              )}
              
              {/* Sibling relationships - Third line */}
              {groupedRelationships.siblings.length > 0 && (
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  {groupedRelationships.siblings.map((rel, index) => renderRelationshipButton(rel, `sibling-${index}`))}
                </div>
              )}
              
              {/* Children relationships - Fourth line */}
              {groupedRelationships.children.length > 0 && (
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  {groupedRelationships.children.map((rel, index) => renderRelationshipButton(rel, `child-${index}`))}
                </div>
              )}
              
              {/* Grandchildren relationships - Fifth line */}
              {groupedRelationships.grandchildren.length > 0 && (
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  {groupedRelationships.grandchildren.map((rel, index) => renderRelationshipButton(rel, `grandchild-${index}`))}
                </div>
              )}
              
              {/* Friends relationships - Finally */}
              {groupedRelationships.friends.length > 0 && (
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  {groupedRelationships.friends.map((rel, index) => renderRelationshipButton(rel, `friend-${index}`))}
                </div>
              )}
            </div>
          )}
          
          {/* Additional Photos Section (skip first photo as it's shown as headshot) */}
          {!hidePhotos && photos && photos.length > 1 && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                {photos.slice(1).map((photo, index) => (
                  <button
                    key={index + 1}
                    type="button"
                    className="relative group focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded"
                    title={photo}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(photo);
                      setImageSize({ width: 0, height: 0 });
                      setShowImageModal(true);
                    }}
                  >
                    <img
                      src={photo}
                      alt={`Photo ${index + 2}`}
                      className="h-16 w-16 object-cover rounded border border-gray-200 hover:border-indigo-400 transition-colors"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'flex';
                        }
                      }}
                    />
                    <div className="hidden h-16 w-16 bg-gray-100 border border-gray-200 rounded items-center justify-center">
                      <PhotoIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 flex flex-col gap-1">
          {allRelationships && allRelationships.length > 0 && (
            <button
              className="p-1 rounded hover:bg-gray-100"
              title="Show relations"
              onClick={(e) => {
                e.stopPropagation();
                setViewingPersonInModal(null); // Reset to show this person's relationships
                setShowRelationsModal(true);
              }}
            >
              <UserGroupIcon className="h-5 w-5 text-gray-400 hover:text-indigo-600" />
            </button>
          )}
          <button
            className="p-1 rounded hover:bg-gray-100"
            title="Show raw note"
            onClick={() => onShowRaw(note.content)}
          >
            <CodeBracketIcon className="h-5 w-5 text-gray-400 hover:text-indigo-600" />
          </button>
          <button
            className="p-1 rounded hover:bg-gray-100"
            title="Edit person"
            onClick={() => onEdit(note)}
          >
            <PencilIcon className="h-5 w-5 text-gray-400 hover:text-indigo-600" />
          </button>
          {name && (
            <a
              href={`https://www.facebook.com/search/top/?q=${encodeURIComponent(name)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-2 py-1 rounded hover:bg-gray-100 text-xs font-medium text-gray-400 hover:text-blue-600"
              title="Search on Facebook"
            >
              FB
            </a>
          )}
        </div>
      </div>
      {tags && tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 cursor-pointer hover:bg-indigo-200 transition-colors"
              onClick={(e) => {
                // Only trigger tag click if not clicking the remove button
                if (!e.target.closest('button')) {
                  onTagClick && onTagClick(tag);
                }
              }}
              title="Click to filter by this tag"
            >
              {tag}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTag(note.id, tag);
                }}
                className="ml-1 text-indigo-600 hover:text-indigo-800"
                title="Remove tag"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowImageModal(false);
            setSelectedImage(null);
            setImageSize({ width: 0, height: 0 });
          }}
        >
          <div className="relative max-w-7xl max-h-full">
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteImage(selectedImage);
                }}
                className="text-white hover:text-red-300 bg-black bg-opacity-50 rounded-full p-2 transition-colors"
                title="Delete photo"
              >
                <TrashIcon className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowImageModal(false);
                  setSelectedImage(null);
                  setImageSize({ width: 0, height: 0 });
                }}
                className="text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2 transition-colors"
                title="Close"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <img
              src={selectedImage}
              alt="Full size photo"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
              onLoad={(e) => {
                const img = e.target;
                const naturalWidth = img.naturalWidth;
                const naturalHeight = img.naturalHeight;
                setImageSize({ width: naturalWidth, height: naturalHeight });
              }}
              style={{
                transform: (() => {
                  if (imageSize.width === 0 || imageSize.height === 0) return 'scale(1)';
                  
                  const maxDimension = Math.max(imageSize.width, imageSize.height);
                  
                  // Small images (< 400px): scale 1.8x
                  if (maxDimension < 400) {
                    return 'scale(1.8)';
                  }
                  // Medium images (400px - 1000px): scale 1.5x
                  else if (maxDimension < 1000) {
                    return 'scale(1.5)';
                  }
                  // Large images: no scaling
                  return 'scale(1)';
                })(),
                transition: 'transform 0.2s ease-in-out'
              }}
            />
          </div>
        </div>
      )}

      {/* Image Upload Popup */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            className={`bg-white rounded-lg p-6 w-full max-w-md mx-4 ${
              isDragging ? 'border-4 border-indigo-500 border-dashed' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload Photo</h3>
              <button
                onClick={() => {
                  setShowImageUpload(false);
                  setIsDragging(false);
                  setUploading(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {uploading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-4 text-sm text-gray-600">Uploading image...</p>
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
                    id="image-upload-input-person"
                  />
                  <label
                    htmlFor="image-upload-input-person"
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
          </div>
        </div>
      )}

      {/* Uploading Overlay */}
      {uploading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg z-10">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
            <p className="text-sm text-gray-600">Uploading image...</p>
          </div>
        </div>
      )}

      {/* Relationship Hover Popup */}
      {hoveredRelationship && (
        <div
          className="fixed z-50 bg-white rounded-lg border shadow-xl p-4 w-80 max-h-96 overflow-y-auto"
          style={{
            left: `${hoverPosition.x}px`,
            top: `${hoverPosition.y}px`,
            transform: 'translateY(0)'
          }}
          onMouseEnter={() => {
            // Keep popup open when hovering over it
          }}
          onMouseLeave={() => {
            setHoveredRelationship(null);
          }}
        >
          <RelationshipCardPreview 
            person={hoveredRelationship} 
            allNotes={allNotes}
            onEdit={onEdit}
            hidePhotos={hidePhotos}
          />
        </div>
      )}

      {/* Show Relations Modal */}
      {showRelationsModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowRelationsModal(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {viewingPersonInModal && (
                  <button
                    onClick={() => setViewingPersonInModal(null)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    title="Back to {name}"
                  >
                    <ArrowLeftIcon className="h-5 w-5" />
                  </button>
                )}
                <h2 className="text-xl font-semibold text-gray-900">
                  Relations for {modalPersonName}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowRelationsModal(false);
                  setViewingPersonInModal(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {modalPersonRelationships.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No relationships found</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Parent relationships (Child of) */}
                {modalPersonGroupedRelationships.parents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Parents</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {modalPersonGroupedRelationships.parents.map((rel, index) => {
                        const relatedPerson = allNotes.find(n => n.id === rel.personId);
                        const relLabel = getReverseRelationshipLabel(rel.type, rel.personId, modalPerson);
                        if (!relatedPerson) return null;
                        return (
                          <div
                            key={`parent-${index}`}
                            className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white cursor-pointer"
                            onClick={() => setViewingPersonInModal(relatedPerson)}
                          >
                            <div className="mb-2">
                              <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                                {relLabel}
                              </span>
                            </div>
                            <RelationshipCardPreview 
                              person={relatedPerson} 
                              allNotes={allNotes}
                              onEdit={null}
                              hidePhotos={hidePhotos}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Spouse relationships */}
                {modalPersonGroupedRelationships.spouse.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Spouse</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {modalPersonGroupedRelationships.spouse.map((rel, index) => {
                        const relatedPerson = allNotes.find(n => n.id === rel.personId);
                        const relLabel = getReverseRelationshipLabel(rel.type, rel.personId, modalPerson);
                        if (!relatedPerson) return null;
                        return (
                          <div
                            key={`spouse-${index}`}
                            className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white cursor-pointer"
                            onClick={() => setViewingPersonInModal(relatedPerson)}
                          >
                            <div className="mb-2">
                              <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                                {relLabel}
                              </span>
                            </div>
                            <RelationshipCardPreview 
                              person={relatedPerson} 
                              allNotes={allNotes}
                              onEdit={null}
                              hidePhotos={hidePhotos}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sibling relationships */}
                {modalPersonGroupedRelationships.siblings.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Siblings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {modalPersonGroupedRelationships.siblings.map((rel, index) => {
                        const relatedPerson = allNotes.find(n => n.id === rel.personId);
                        const relLabel = getReverseRelationshipLabel(rel.type, rel.personId, modalPerson);
                        if (!relatedPerson) return null;
                        return (
                          <div
                            key={`sibling-${index}`}
                            className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white cursor-pointer"
                            onClick={() => setViewingPersonInModal(relatedPerson)}
                          >
                            <div className="mb-2">
                              <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                                {relLabel}
                              </span>
                            </div>
                            <RelationshipCardPreview 
                              person={relatedPerson} 
                              allNotes={allNotes}
                              onEdit={null}
                              hidePhotos={hidePhotos}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Children relationships */}
                {modalPersonGroupedRelationships.children.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Children</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {modalPersonGroupedRelationships.children.map((rel, index) => {
                        const relatedPerson = allNotes.find(n => n.id === rel.personId);
                        const relLabel = getReverseRelationshipLabel(rel.type, rel.personId, modalPerson);
                        if (!relatedPerson) return null;
                        return (
                          <div
                            key={`child-${index}`}
                            className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white cursor-pointer"
                            onClick={() => setViewingPersonInModal(relatedPerson)}
                          >
                            <div className="mb-2">
                              <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                                {relLabel}
                              </span>
                            </div>
                            <RelationshipCardPreview 
                              person={relatedPerson} 
                              allNotes={allNotes}
                              onEdit={null}
                              hidePhotos={hidePhotos}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Grandchildren relationships */}
                {modalPersonGroupedRelationships.grandchildren.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Grandchildren</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {modalPersonGroupedRelationships.grandchildren.map((rel, index) => {
                        const relatedPerson = allNotes.find(n => n.id === rel.personId);
                        const relLabel = getReverseRelationshipLabel(rel.type, rel.personId, modalPerson);
                        if (!relatedPerson) return null;
                        return (
                          <div
                            key={`grandchild-${index}`}
                            className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white cursor-pointer"
                            onClick={() => setViewingPersonInModal(relatedPerson)}
                          >
                            <div className="mb-2">
                              <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                                {relLabel}
                              </span>
                            </div>
                            <RelationshipCardPreview 
                              person={relatedPerson} 
                              allNotes={allNotes}
                              onEdit={null}
                              hidePhotos={hidePhotos}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Friends relationships */}
                {modalPersonGroupedRelationships.friends.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Friends & Others</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {modalPersonGroupedRelationships.friends.map((rel, index) => {
                        const relatedPerson = allNotes.find(n => n.id === rel.personId);
                        const relLabel = getReverseRelationshipLabel(rel.type, rel.personId, modalPerson);
                        if (!relatedPerson) return null;
                        return (
                          <div
                            key={`friend-${index}`}
                            className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white cursor-pointer"
                            onClick={() => setViewingPersonInModal(relatedPerson)}
                          >
                            <div className="mb-2">
                              <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                                {relLabel}
                              </span>
                            </div>
                            <RelationshipCardPreview 
                              person={relatedPerson} 
                              allNotes={allNotes}
                              onEdit={null}
                              hidePhotos={hidePhotos}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonCard; 