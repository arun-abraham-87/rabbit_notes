export const getAllUniqueTags = (notes, type = 'all') => {
  const allTags = new Set();

  notes.forEach(note => {
    if (note?.content) {
      const lines = note.content.split('\n');

      // Parse event tags
      if (type === 'all' || type === 'event') {
        const eventTagsLine = lines.find(line => line.startsWith('event_tags:'));
        if (eventTagsLine) {
          const tags = eventTagsLine.replace('event_tags:', '').trim().split(',');
          tags.forEach(tag => {
            const t = tag.trim();
            if (t) allTags.add(t.startsWith('#') ? t : `#${t}`);
          });
        }
      }

      // Parse tracker tags
      if (type === 'all' || type === 'tracker') {
        const trackerTagsLine = lines.find(line => line.startsWith('Tags:'));
        if (trackerTagsLine) {
          const tags = trackerTagsLine.replace('Tags:', '').trim().split(',');
          tags.forEach(tag => {
            const t = tag.trim();
            if (t) allTags.add(t.startsWith('#') ? t : `#${t}`);
          });
        }
      }
    }
  });

  return Array.from(allTags).sort();
};