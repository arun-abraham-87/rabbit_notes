/**
 * Delete a specific meta tag from note content
 * @param {string} content - The note content
 * @param {string} metaTag - The meta tag to delete (e.g., 'watch', 'priority', 'todo')
 * @returns {string} The note content with the specified meta tag removed
 */
export const deleteMetaTag = (content, metaTag) => {
  const lines = content.split('\n')
    .filter(line => {
      const trimmedLine = line.trim();
      // Keep the line if it's not a meta line or if it's a meta line but not the one we want to delete
      return !trimmedLine.startsWith('meta::') || 
             (trimmedLine.startsWith('meta::') && !trimmedLine.includes(`meta::${metaTag}`));
    });
  return lines.join('\n').trim();
};

/**
 * Add or replace a meta tag in note content
 * @param {string} content - The note content
 * @param {string} metaTag - The meta tag to add/replace (e.g., 'watch', 'priority', 'todo')
 * @param {string} value - The value to set for the meta tag
 * @returns {string} The note content with the meta tag added or replaced
 */
export const addOrReplaceMetaTag = (content, metaTag, value) => {
  // First delete the existing meta tag if it exists
  const contentWithoutTag = deleteMetaTag(content, metaTag);
  
  // Add the new meta tag at the end
  const newMetaLine = `meta::${metaTag}::${value}`;
  return `${contentWithoutTag}\n${newMetaLine}`.trim();
};

/**
 * Check if a meta tag exists in the note content
 * @param {string} content - The note content
 * @param {string} metaTag - The meta tag to check for (e.g., 'watch', 'priority', 'todo')
 * @returns {boolean} True if the meta tag exists, false otherwise
 */
export const hasMetaTag = (content, metaTag) => {
  const lines = content.split('\n');
  return lines.some(line => {
    const trimmedLine = line.trim();
    return trimmedLine.startsWith('meta::') && trimmedLine.includes(`meta::${metaTag}`);
  });
};

/**
 * Add a meta tag at the end of a specific line in the note content
 * @param {string} content - The note content
 * @param {number} lineIndex - The line index where to append the meta tag (0-based)
 * @param {string} metaTag - The meta tag to add (e.g., 'watch', 'priority', 'todo')
 * @param {string} value - The value to set for the meta tag
 * @returns {string} The note content with the meta tag appended to the specified line
 */
export const addMetaTagAtLine = (content, lineIndex, metaTag, value) => {
  const lines = content.split('\n');
  
  // Ensure lineIndex is within bounds
  const safeIndex = Math.max(0, Math.min(lineIndex, lines.length - 1));
  
  // Append the meta tag to the specified line
  const line = lines[safeIndex].trim();
  const newMetaTag = `meta_line::${metaTag}::${value}`;
  lines[safeIndex] = line ? `${line} ${newMetaTag}` : newMetaTag;
  
  return lines.join('\n').trim();
};


