export const getAllUniqueTags = (notes) => {
  const allTags = new Set();
  
  notes.forEach(note => {
    const lines = note.content.split('\n');
    const tagsLine = lines.find(line => line.startsWith('event_tags:'));
    if (tagsLine) {
      const tags = tagsLine.replace('event_tags:', '').trim().split(',');
      tags.forEach(tag => allTags.add(tag.trim()));
    }
  });
  
  return Array.from(allTags).sort();
}; 