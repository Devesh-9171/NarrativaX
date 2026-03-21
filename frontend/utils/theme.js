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

  try {
    return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const normalizedTheme = normalizeTheme(theme);
  document.documentElement.classList.toggle('dark', normalizedTheme === 'dark');
  document.documentElement.dataset.theme = normalizedTheme;
}

export function persistTheme(theme) {
  const normalizedTheme = normalizeTheme(theme);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
    } catch {
      // Ignore storage write failures and still apply the current theme.
    }
  }

  applyTheme(normalizedTheme);

  if (typeof window !== 'undefined') {
    window.__READNOVAX_THEME__ = normalizedTheme;
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme: normalizedTheme } }));
  }

  return normalizedTheme;
}

export function getThemeInitScript() {
  return `(() => {
    const key = '${THEME_STORAGE_KEY}';
    const defaultTheme = '${DEFAULT_THEME}';
    const normalizeTheme = (value) => value === 'light' ? 'light' : 'dark';
    let nextTheme = defaultTheme;

    try {
      const storedTheme = window.localStorage.getItem(key);
      nextTheme = normalizeTheme(storedTheme);
      window.localStorage.setItem(key, nextTheme);
    } catch {
      nextTheme = defaultTheme;
    }

    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    document.documentElement.dataset.theme = nextTheme;
    window.__READNOVAX_THEME__ = nextTheme;
  })();`;
}
