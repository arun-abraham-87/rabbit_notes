import { createNote, loadAllNotes, updateNoteById } from './ApiUtils';

export const DASHBOARD_MENU_SETTINGS_META = 'meta::dashboard_menu_settings';
export const DASHBOARD_EVENT_FILTERS_SETTING_KEY = 'dashboard_event_filters';
export const DASHBOARD_NAV_MENU_SETTING_KEY = 'dashboard_nav_menu';

const SETTING_KEY_PREFIX = 'setting_key::';
const SETTING_VALUE_PREFIX = 'setting_json::';
const SETTINGS_UPDATED_EVENT = 'noteBackedDashboardSettingsUpdated';

const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

export const buildDefaultNavbarMenuSettings = (pageIds) => ({
  visibility: pageIds.reduce((acc, pageId) => ({ ...acc, [pageId]: true }), {}),
  mainBar: pageIds.reduce((acc, pageId, index) => ({ ...acc, [pageId]: index < 10 }), {}),
  order: [...pageIds],
});

export const normalizeNavbarMenuSettings = (settings, pageIds) => {
  const defaults = buildDefaultNavbarMenuSettings(pageIds);
  if (!isPlainObject(settings)) return defaults;

  const hasSavedVisibility = isPlainObject(settings.visibility);
  const hasSavedMainBar = isPlainObject(settings.mainBar);
  const savedVisibility = hasSavedVisibility ? settings.visibility : {};
  const savedMainBar = hasSavedMainBar ? settings.mainBar : {};
  const savedOrder = Array.isArray(settings.order) ? settings.order.filter(pageId => pageIds.includes(pageId)) : [];
  const order = [...savedOrder];
  pageIds.forEach(pageId => {
    if (!order.includes(pageId)) order.push(pageId);
  });

  return {
    visibility: pageIds.reduce((acc, pageId) => {
      acc[pageId] = savedVisibility[pageId] !== undefined ? !!savedVisibility[pageId] : true;
      return acc;
    }, {}),
    mainBar: pageIds.reduce((acc, pageId) => {
      acc[pageId] = hasSavedMainBar
        ? savedMainBar[pageId] !== undefined && !!savedMainBar[pageId]
        : defaults.mainBar[pageId];
      return acc;
    }, {}),
    order,
  };
};

const getSettingKeyLine = (key) => `${SETTING_KEY_PREFIX}${key}`;

const findSettingNote = (notes = [], key) => {
  const settingKeyLine = getSettingKeyLine(key);
  return notes.find(note => {
    const content = typeof note?.content === 'string' ? note.content : '';
    return content.includes(DASHBOARD_MENU_SETTINGS_META) && content.split('\n').some(line => line.trim() === settingKeyLine);
  });
};

const buildSettingContent = (key, value) => [
  'Dashboard menu settings',
  getSettingKeyLine(key),
  `${SETTING_VALUE_PREFIX}${encodeURIComponent(JSON.stringify(value))}`,
  DASHBOARD_MENU_SETTINGS_META,
].join('\n');

export const readNoteBackedSettingFromNotes = (notes = [], key, fallback = null) => {
  const note = findSettingNote(notes, key);
  if (!note) return fallback;

  const valueLine = String(note.content || '')
    .split('\n')
    .find(line => line.trim().startsWith(SETTING_VALUE_PREFIX));
  if (!valueLine) return fallback;

  try {
    return JSON.parse(decodeURIComponent(valueLine.trim().slice(SETTING_VALUE_PREFIX.length)));
  } catch (error) {
    console.warn('Failed to parse note-backed setting:', key, error);
    return fallback;
  }
};

export const loadNoteBackedSetting = async (key, fallback = null) => {
  const { notes } = await loadAllNotes();
  return readNoteBackedSettingFromNotes(notes, key, fallback);
};

export const saveNoteBackedSetting = async (key, value, options = {}) => {
  const existingNotes = options.notes || (await loadAllNotes()).notes;
  const existingNote = findSettingNote(existingNotes, key);
  const content = buildSettingContent(key, value);
  const savedNote = existingNote
    ? await updateNoteById(existingNote.id, content, existingNote.tags)
    : await createNote(content);

  if (typeof options.setNotes === 'function') {
    options.setNotes(prevNotes => {
      const found = prevNotes.some(note => note.id === savedNote.id);
      return found
        ? prevNotes.map(note => note.id === savedNote.id ? { ...note, ...savedNote, content } : note)
        : [{ ...savedNote, content }, ...prevNotes];
    });
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT, {
      detail: { key, value },
    }));
  }

  return savedNote;
};

export const addNoteBackedSettingsListener = (handler) => {
  if (typeof window === 'undefined') return () => {};
  const listener = (event) => handler(event.detail || {});
  window.addEventListener(SETTINGS_UPDATED_EVENT, listener);
  return () => window.removeEventListener(SETTINGS_UPDATED_EVENT, listener);
};
