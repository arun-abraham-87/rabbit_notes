const VOCABULARY_KEY = 'user_vocabulary';

export const getVocabulary = () => {
  try {
    const stored = localStorage.getItem(VOCABULARY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading vocabulary:', error);
    return [];
  }
};

export const addToVocabulary = (word) => {
  try {
    const vocabulary = getVocabulary();
    if (!vocabulary.includes(word)) {
      vocabulary.push(word);
      localStorage.setItem(VOCABULARY_KEY, JSON.stringify(vocabulary));
    }
    return vocabulary;
  } catch (error) {
    console.error('Error adding to vocabulary:', error);
    return getVocabulary();
  }
};

export const removeFromVocabulary = (word) => {
  try {
    const vocabulary = getVocabulary();
    const updated = vocabulary.filter(w => w !== word);
    localStorage.setItem(VOCABULARY_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Error removing from vocabulary:', error);
    return getVocabulary();
  }
};

export const isInVocabulary = (word) => {
  const vocabulary = getVocabulary();
  return vocabulary.includes(word);
}; 