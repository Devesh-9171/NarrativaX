export const THEME_STORAGE_KEY = 'theme';
export const DEFAULT_THEME = 'dark';
export const THEME_CHANGE_EVENT = 'theme-change';

export function normalizeTheme(value) {
  return value === 'light' ? 'light' : 'dark';
}

export function getStoredTheme() {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME;
  }

  return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const normalizedTheme = normalizeTheme(theme);
  document.documentElement.classList.toggle('dark', normalizedTheme === 'dark');
  document.documentElement.dataset.theme = normalizedTheme;
}

export function persistTheme(theme) {
  if (typeof window === 'undefined') return normalizeTheme(theme);

  const normalizedTheme = normalizeTheme(theme);
  window.localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
  applyTheme(normalizedTheme);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme: normalizedTheme } }));
  return normalizedTheme;
}

export function getThemeInitScript() {
  return `(() => {
    const key = '${THEME_STORAGE_KEY}';
    const defaultTheme = '${DEFAULT_THEME}';
    const normalizeTheme = (value) => value === 'light' ? 'light' : 'dark';
    const storedTheme = normalizeTheme(window.localStorage.getItem(key));
    const nextTheme = storedTheme || defaultTheme;

    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(key, nextTheme);
  })();`;
}
