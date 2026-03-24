const DEFAULT_LANGUAGE = 'english';
const SUPPORTED_LANGUAGES = ['english', 'hindi'];

const LANGUAGE_ALIASES = {
  en: 'english',
  english: 'english',
  hi: 'hindi',
  hindi: 'hindi'
};

function normalizeLanguage(value, fallback = DEFAULT_LANGUAGE) {
  const normalizedValue = LANGUAGE_ALIASES[String(value || '').trim().toLowerCase()];
  if (normalizedValue) return normalizedValue;

  const normalizedFallback = LANGUAGE_ALIASES[String(fallback || '').trim().toLowerCase()];
  return normalizedFallback || DEFAULT_LANGUAGE;
}

function isSupportedLanguage(value) {
  return SUPPORTED_LANGUAGES.includes(normalizeLanguage(value));
}

function toLanguageQueryParam(value) {
  return normalizeLanguage(value) === 'hindi' ? 'hi' : 'en';
}

module.exports = {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
  isSupportedLanguage,
  toLanguageQueryParam
};
