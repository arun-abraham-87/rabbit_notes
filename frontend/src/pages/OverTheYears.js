import React, { useState, useMemo } from 'react';
import { UserIcon, PhotoIcon, CalendarIcon } from '@heroicons/react/24/solid';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

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

const OverTheYears = ({ allNotes = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  // Filter people with photos
  const peopleWithPhotos = useMemo(() => {
    return allNotes
      .filter(note => {
        if (!note.content || !note.content.includes('meta::person::')) return false;
        const { photos } = getPersonInfo(note.content);
        return photos && photos.length > 0;
      })
      .map(note => {
        const personInfo = getPersonInfo(note.content);
        return {
          ...note,
          ...personInfo
        };
      });
  }, [allNotes]);

  // Filter by search query
  const filteredPeople = useMemo(() => {
    if (!searchQuery.trim()) return peopleWithPhotos;
    
    const searchWords = searchQuery
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word.toLowerCase());
    
    return peopleWithPhotos.filter(person => {
      const nameLower = person.name.toLowerCase();
      return searchWords.some(word => nameLower.includes(word));
    });
  }, [peopleWithPhotos, searchQuery]);

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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Over the Years</h1>
          <p className="text-gray-600">
            Track how people have changed from birth through their photos
          </p>
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
              {searchQuery ? 'No people found matching your search' : 'No people with photos found'}
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
                          src={person.photos[0]}
                          alt={person.name}
                          className="h-16 w-16 rounded-full object-cover border-2 border-indigo-200"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserIcon className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
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
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <PhotoIcon className="h-4 w-4" />
                      <span>{person.photos.length} photo{person.photos.length !== 1 ? 's' : ''}</span>
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
                      <h2 className="text-2xl font-bold text-gray-900">
                        {selectedPerson.name}
                      </h2>
                      {calculateAge(selectedPerson.birthDateInfo) !== null && (
                        <p className="text-sm text-gray-500">
                          Age: {calculateAge(selectedPerson.birthDateInfo)} years
                        </p>
                      )}
                    </div>
                  </div>
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

              {/* Photos Timeline */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedPerson.photos && selectedPerson.photos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {selectedPerson.photos.map((photo, index) => (
                      <div
                        key={index}
                        className="relative group cursor-pointer"
                        onClick={() => setSelectedImage(photo)}
                      >
                        <img
                          src={photo}
                          alt={`${selectedPerson.name} - Photo ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg border-2 border-gray-200 hover:border-indigo-400 transition-colors"
                        />
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                          Photo {index + 1}
                        </div>
                      </div>
                    ))}
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
      </div>
    </div>
  );
};

export default OverTheYears;

