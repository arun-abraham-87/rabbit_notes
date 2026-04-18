export const DEFAULT_APP_FONT = 'System Default';

export const getAppFontFamily = (fontName) => (
  fontName && fontName !== DEFAULT_APP_FONT ? `"${fontName}", sans-serif` : ''
);

export const applyAppFont = (fontName) => {
  const fontFamily = getAppFontFamily(fontName);
  document.documentElement.style.fontFamily = fontFamily;

  if (document.body) {
    document.body.style.fontFamily = fontFamily;
  }
};

export const applySavedAppFont = () => {
  applyAppFont(localStorage.getItem('appFont') || DEFAULT_APP_FONT);
};
