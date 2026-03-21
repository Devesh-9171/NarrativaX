import fs from 'fs';
import path from 'path';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://readnovax.in').replace(/\/$/, '');
const DEFAULT_API_BASE_URL = 'https://readnovax.onrender.com/api';
const SITEMAP_FETCH_TIMEOUT_MS = 45000;
const SITEMAP_RETRY_DELAYS_MS = [0, 1500, 3000];

const STATIC_ROUTE_FILES = [
  { path: '/', file: 'pages/index.js' },
  { path: '/about', file: 'pages/about.js' },
  { path: '/contact', file: 'pages/contact.js' },
  { path: '/terms', file: 'pages/terms.js' },
  { path: '/privacy-policy', file: 'pages/privacy-policy.js' },
  { path: '/disclaimer', file: 'pages/disclaimer.js' },
  { path: '/blog', file: 'pages/blog/index.js' }
];

function resolveApiBaseUrl() {
  const candidate = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || DEFAULT_API_BASE_URL).trim();

  try {
    const parsed = new URL(candidate);
    return `${parsed.origin}${parsed.pathname.replace(/\/$/, '') || '/api'}`;
  } catch {
    return DEFAULT_API_BASE_URL;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeIsoDate(value, fallback = new Date()) {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildAbsoluteUrl(routePath, language) {
  const url = new URL(routePath, `${SITE_URL}/`);
  if (language === 'hi') {
    url.searchParams.set('lang', 'hi');
  }
  return url.toString();
}

function getStaticRouteLastmod(relativeFilePath, fallbackIso) {
  const roots = [process.cwd(), path.join(process.cwd(), 'frontend')];

  for (const root of roots) {
    try {
      const absoluteFilePath = path.join(root, relativeFilePath);
      return fs.statSync(absoluteFilePath).mtime.toISOString();
    } catch {
      continue;
    }
  }

  return fallbackIso;
}

async function fetchJsonWithRetry(requestPath) {
  const apiBaseUrl = resolveApiBaseUrl();
  let lastError = null;

  for (const delay of SITEMAP_RETRY_DELAYS_MS) {
    if (delay > 0) {
      await wait(delay);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SITEMAP_FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(`${apiBaseUrl}${requestPath}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        },
        cache: 'no-store',
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Sitemap API request failed with ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(`Unable to fetch runtime sitemap data: ${lastError?.message || 'Unknown error'}`);
}

function createUrlEntry({ loc, lastmod, alternates = [] }) {
  const alternateXml = alternates
    .map((alternate) => `<xhtml:link rel="alternate" hreflang="${xmlEscape(alternate.hreflang)}" href="${xmlEscape(alternate.href)}" />`)
    .join('');

  return `<url><loc>${xmlEscape(loc)}</loc><lastmod>${xmlEscape(lastmod)}</lastmod>${alternateXml}</url>`;
}

export async function buildSitemapXml() {
  const payload = await fetchJsonWithRetry('/sitemap');
  const generatedAt = normalizeIsoDate(payload.generatedAt);
  const books = Array.isArray(payload.books) ? payload.books : [];
  const blogPosts = Array.isArray(payload.blogPosts) ? payload.blogPosts : [];

  const entries = [];

  for (const route of STATIC_ROUTE_FILES) {
    entries.push(createUrlEntry({
      loc: buildAbsoluteUrl(route.path),
      lastmod: getStaticRouteLastmod(route.file, generatedAt)
    }));
  }

  const booksByGroupId = new Map();
  for (const book of books) {
    const groupId = book.groupId || book.id;
    const variants = booksByGroupId.get(groupId) || [];
    variants.push(book);
    booksByGroupId.set(groupId, variants);
  }

  for (const variants of booksByGroupId.values()) {
    const bookAlternates = variants.map((variant) => ({
      hreflang: variant.language || 'en',
      href: buildAbsoluteUrl(`/book/${variant.slug}`, variant.language)
    }));

    for (const book of variants) {
      entries.push(createUrlEntry({
        loc: buildAbsoluteUrl(`/book/${book.slug}`, book.language),
        lastmod: normalizeIsoDate(book.updatedAt, new Date(generatedAt)),
        alternates: bookAlternates
      }));
    }

    const chaptersByNumber = new Map();
    for (const book of variants) {
      for (const chapter of book.chapters || []) {
        const chapterVariants = chaptersByNumber.get(chapter.chapterNumber) || [];
        chapterVariants.push({
          bookSlug: book.slug,
          language: book.language,
          slug: chapter.slug,
          updatedAt: chapter.updatedAt
        });
        chaptersByNumber.set(chapter.chapterNumber, chapterVariants);
      }
    }

    for (const chapterVariants of chaptersByNumber.values()) {
      const chapterAlternates = chapterVariants.map((chapter) => ({
        hreflang: chapter.language || 'en',
        href: buildAbsoluteUrl(`/book/${chapter.bookSlug}/${chapter.slug}`, chapter.language)
      }));

      for (const chapter of chapterVariants) {
        entries.push(createUrlEntry({
          loc: buildAbsoluteUrl(`/book/${chapter.bookSlug}/${chapter.slug}`, chapter.language),
          lastmod: normalizeIsoDate(chapter.updatedAt, new Date(generatedAt)),
          alternates: chapterAlternates
        }));
      }
    }
  }

  for (const post of blogPosts) {
    entries.push(createUrlEntry({
      loc: buildAbsoluteUrl(`/blog/${post.slug}`),
      lastmod: normalizeIsoDate(post.updatedAt || post.publishedAt, new Date(generatedAt))
    }));
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries.join('')}</urlset>`;
}
