const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = ['en', 'hi'];

function normalizeLanguage(value, fallback = DEFAULT_LANGUAGE) {
  const normalizedValue = String(value || '').trim().toLowerCase();
  const normalizedFallback = SUPPORTED_LANGUAGES.includes(String(fallback || '').trim().toLowerCase())
    ? String(fallback).trim().toLowerCase()
    : DEFAULT_LANGUAGE;

  return SUPPORTED_LANGUAGES.includes(normalizedValue) ? normalizedValue : normalizedFallback;
}

function isSupportedLanguage(value) {
  return SUPPORTED_LANGUAGES.includes(String(value || '').trim().toLowerCase());
}

module.exports = {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
  isSupportedLanguage
};
