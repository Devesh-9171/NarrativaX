import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_THEME, THEME_CHANGE_EVENT, THEME_STORAGE_KEY, applyTheme, getStoredTheme, normalizeTheme, persistTheme } from '../utils/theme';

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  isDark: DEFAULT_THEME === 'dark',
  setTheme: () => DEFAULT_THEME,
  toggleTheme: () => DEFAULT_THEME
});

function readInitialTheme() {
  if (typeof document !== 'undefined') {
    const domTheme = document.documentElement.dataset.theme;
    if (domTheme) return normalizeTheme(domTheme);
  }

  if (typeof window !== 'undefined') {
    const bootTheme = window.__READNOVAX_THEME__;
    if (bootTheme) return normalizeTheme(bootTheme);
    return getStoredTheme();
  }

  return DEFAULT_THEME;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readInitialTheme);
  const themeRef = useRef(theme);

  const syncTheme = useCallback((nextTheme) => {
    const normalizedTheme = normalizeTheme(nextTheme);
    themeRef.current = normalizedTheme;
    setThemeState((current) => (current === normalizedTheme ? current : normalizedTheme));
    applyTheme(normalizedTheme);
    return normalizedTheme;
  }, []);

  useEffect(() => {
    syncTheme(readInitialTheme());

    const handleThemeChange = (event) => {
      syncTheme(event?.detail?.theme || getStoredTheme());
    };

    const handleStorage = (event) => {
      if (event.key && event.key !== THEME_STORAGE_KEY) return;
      syncTheme(getStoredTheme());
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [syncTheme]);

  const setTheme = useCallback(
    (nextTheme) => {
      const resolvedTheme = normalizeTheme(typeof nextTheme === 'function' ? nextTheme(themeRef.current) : nextTheme);
      themeRef.current = resolvedTheme;
      setThemeState((current) => (current === resolvedTheme ? current : resolvedTheme));
      persistTheme(resolvedTheme);
      return resolvedTheme;
    },
    []
  );

  const toggleTheme = useCallback(() => setTheme((current) => (current === 'dark' ? 'light' : 'dark')), [setTheme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme
    }),
    [setTheme, theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
