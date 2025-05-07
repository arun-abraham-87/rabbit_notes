/**
 * Extracts pinned sections from a note's content
 * @param {string} content - The note content to extract pins from
 * @returns {Array} Array of pinned sections with their indices
 */
export const extractPinnedSections = (content) => {
  if (!content) return [];
  
  const lines = content.split('\n');
  const pinnedSections = [];
  
  lines.forEach((line, index) => {
    if (line.trim().startsWith('meta::pin::')) {
      const indices = line.split('meta::pin::')[1].split(',').map(i => parseInt(i.trim(), 10));
      pinnedSections.push({ indices, lineIndex: index });
    }
  });
  
  return pinnedSections;
};

/**
 * Gets the content of a pinned section from a note
 * @param {string} content - The note content
 * @param {Array} indices - Array of line indices that make up the pinned section
 * @returns {string} The content of the pinned section
 */
export const getPinnedSectionContent = (content, indices) => {
  if (!content || !indices || !indices.length) return '';
  
  const lines = content.split('\n');
  return indices
    .map(index => lines[index] || '')
    .filter(line => line.trim())
    .join('\n');
};

/**
 * Adds a pin to a section of a note
 * @param {string} content - The note content
 * @param {Array} indices - Array of line indices to pin
 * @returns {string} Updated note content with pin added
 */
export const addPin = (content, indices) => {
  if (!content || !indices || !indices.length) return content;
  
  const pinLine = `meta::pin::${indices.join(',')}`;
  return `${content}\n${pinLine}`;
};

/**
 * Removes a pin from a note
 * @param {string} content - The note content
 * @param {Array} indices - Array of line indices to unpin
 * @returns {string} Updated note content with pin removed
 */
export const removePin = (content, indices) => {
  if (!content || !indices || !indices.length) return content;
  
  const lines = content.split('\n');
  const pinIndex = lines.findIndex(line => 
    line.trim().startsWith('meta::pin::') && 
    line.split('meta::pin::')[1].split(',').map(i => parseInt(i.trim(), 10)).join(',') === indices.join(',')
  );
  
  if (pinIndex === -1) return content;
  
  lines.splice(pinIndex, 1);
  return lines.join('\n');
}; 