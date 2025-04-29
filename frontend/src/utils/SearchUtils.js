const RECENT_SEARCHES_KEY = 'recentSearches';
const MAX_RECENT_SEARCHES = 5;

export const getRecentSearches = () => {
  try {
    const searches = localStorage.getItem(RECENT_SEARCHES_KEY);
    return searches ? JSON.parse(searches) : [];
  } catch (error) {
    console.error('Error getting recent searches:', error);
    return [];
  }
};

export const addRecentSearch = (searchTerm) => {
  try {
    if (!searchTerm.trim()) return;
    
    const searches = getRecentSearches();
    // Remove if already exists
    const filteredSearches = searches.filter(s => s !== searchTerm);
    // Add to beginning
    filteredSearches.unshift(searchTerm);
    // Keep only last 5
    const recentSearches = filteredSearches.slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
  } catch (error) {
    console.error('Error saving recent search:', error);
  }
}; 