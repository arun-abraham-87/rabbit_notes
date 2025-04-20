export const findDuplicatedUrls = (safeNotes) => {
    const urlPattern = /https?:\/\/[^\s]+/g;

    const urlToNotesMap = {};

    safeNotes.forEach((note) => {
        const urls = note.content.match(urlPattern) || [];
        urls.forEach((url) => {
            if (!urlToNotesMap[url]) {
                urlToNotesMap[url] = [];
            }
            urlToNotesMap[url].push(note.id);
        });
    });

    const duplicatedUrls = Object.entries(urlToNotesMap)
        .filter(([, ids]) => ids.length > 1)
        .map(([url]) => url);


    const duplicatedUrlColors = {};
    const highlightPalette = ['#fde68a', '#a7f3d0', '#fbcfe8', '#bfdbfe', '#ddd6fe', '#fecaca'];

    duplicatedUrls.forEach((url, idx) => {
        duplicatedUrlColors[url] = highlightPalette[idx % highlightPalette.length];
    });

    const duplicateUrlNoteIds = new Set();
    Object.values(urlToNotesMap).forEach((noteIds) => {
        if (noteIds.length > 1) {
            noteIds.forEach((id) => duplicateUrlNoteIds.add(id));
        }
    });

    const duplicateWithinNoteIds = new Set();
    safeNotes.forEach((note) => {
        const urls = note.content.match(urlPattern) || [];
        const seen = new Set();
        for (const url of urls) {
            if (seen.has(url)) {
                duplicateWithinNoteIds.add(note.id);
                break;
            }
            seen.add(url);
        }
    });

    return { duplicateUrlNoteIds, duplicateWithinNoteIds, urlToNotesMap, duplicatedUrlColors };
}