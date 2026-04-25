export const THEME_STORAGE_KEY = 'rabbit-notes-theme';

const VALID_THEMES = new Set(['light', 'dark', 'system']);
const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

export const normalizeThemePreference = (theme) => (
  VALID_THEMES.has(theme) ? theme : 'light'
);

export const getStoredThemePreference = () => {
  if (typeof window === 'undefined') return 'light';
  return normalizeThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
};

export const saveThemePreference = (theme) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(THEME_STORAGE_KEY, normalizeThemePreference(theme));
};

export const getSystemTheme = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }

  return window.matchMedia(DARK_MEDIA_QUERY).matches ? 'dark' : 'light';
};

export const getEffectiveTheme = (themePreference) => {
  const normalizedTheme = normalizeThemePreference(themePreference);
  return normalizedTheme === 'system' ? getSystemTheme() : normalizedTheme;
};

export const applyThemePreference = (themePreference) => {
  if (typeof document === 'undefined') return 'light';

  const normalizedTheme = normalizeThemePreference(themePreference);
  const effectiveTheme = getEffectiveTheme(normalizedTheme);
  const root = document.documentElement;
  const body = document.body;

  root.classList.toggle('dark', effectiveTheme === 'dark');
  root.dataset.theme = effectiveTheme;
  root.dataset.themePreference = normalizedTheme;
  root.style.colorScheme = effectiveTheme;

  if (body) {
    body.dataset.theme = effectiveTheme;
    body.style.colorScheme = effectiveTheme;
  }

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute(
      'content',
      effectiveTheme === 'dark' ? '#0f172a' : '#f8fafc'
    );
  }

  return effectiveTheme;
};

export const subscribeToSystemThemeChanges = (onChange) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }

  const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);
  const handler = () => onChange(getSystemTheme());

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }

  mediaQuery.addListener(handler);
  return () => mediaQuery.removeListener(handler);
};
