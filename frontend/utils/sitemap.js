import fs from 'fs';
import path from 'path';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://readnovax.in').replace(/\/$/, '');
const DEFAULT_API_BASE_URL = 'https://readnovax.onrender.com/api';
const SITEMAP_FETCH_TIMEOUT_MS = 45000;
const SITEMAP_RETRY_DELAYS_MS = [0, 1500, 3000, 5000];
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';
const XML_URLSET_OPEN = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">';
const XML_URLSET_CLOSE = '</urlset>';

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
  const fallbackDate = fallback instanceof Date ? fallback : new Date(fallback);
  const date = value ? new Date(value) : fallbackDate;
  const resolvedDate = Number.isNaN(date.getTime()) ? fallbackDate : date;
  return resolvedDate.toISOString();
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

function buildAlternateLinks(variants, routeBuilder) {
  const alternates = [];
  const seen = new Set();

  for (const variant of variants) {
    const hreflang = variant.language === 'hi' ? 'hi' : 'en';
    const href = buildAbsoluteUrl(routeBuilder(variant), variant.language);
    const key = `${hreflang}:${href}`;
    if (seen.has(key)) continue;
    seen.add(key);
    alternates.push({ hreflang, href });
  }

  const xDefaultHref = alternates.find((alternate) => alternate.hreflang === 'en')?.href || alternates[0]?.href;
  if (xDefaultHref && !seen.has(`x-default:${xDefaultHref}`)) {
    alternates.push({ hreflang: 'x-default', href: xDefaultHref });
  }

  return alternates;
}

function createUrlEntry({ loc, lastmod, alternates = [] }) {
  return [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
    `    <lastmod>${xmlEscape(lastmod)}</lastmod>`,
    ...alternates.map((alternate) => `    <xhtml:link rel="alternate" hreflang="${xmlEscape(alternate.hreflang)}" href="${xmlEscape(alternate.href)}" />`),
    '  </url>'
  ].join('\n');
}

function buildSitemapDocument(entries) {
  const safeEntries = Array.isArray(entries)
    ? entries
        .filter((entry) => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];

  return `${XML_DECLARATION}\n${XML_URLSET_OPEN}\n${safeEntries.join('\n')}\n${XML_URLSET_CLOSE}\n`;
}

function getGroupSharedSlug(variants) {
  const englishVariant = variants.find((variant) => variant.language === 'en' && variant.slug);
  return englishVariant?.slug || variants[0]?.slug;
}

function getValidLanguage(value) {
  return value === 'hi' ? 'hi' : 'en';
}

function getMaxIsoDate(values, fallback) {
  const normalized = values
    .map((value) => normalizeIsoDate(value, fallback))
    .filter((value) => ISO_DATE_PATTERN.test(value))
    .sort();

  return normalized[normalized.length - 1] || normalizeIsoDate(fallback);
}

function isValidSlug(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value || '').trim());
}

function createStaticEntries(generatedAt) {
  return STATIC_ROUTE_FILES.map((route) => createUrlEntry({
    loc: buildAbsoluteUrl(route.path),
    lastmod: getStaticRouteLastmod(route.file, generatedAt)
  }));
}

function createHomepageOnlyEntries(generatedAt) {
  return [createUrlEntry({
    loc: buildAbsoluteUrl('/'),
    lastmod: normalizeIsoDate(generatedAt, generatedAt)
  })];
}

function dedupeAndSortEntries(rawEntries = []) {
  const seen = new Set();
  return rawEntries
    .filter(Boolean)
    .sort((left, right) => left.loc.localeCompare(right.loc))
    .filter((entry) => {
      if (!entry.loc || seen.has(entry.loc)) {
        return false;
      }
      seen.add(entry.loc);
      return true;
    });
}

export function validateSitemapXml(xml) {
  if (typeof xml !== 'string' || !xml.trim()) {
    throw new Error('Sitemap XML is empty');
  }

  if (!xml.includes('\n')) {
    throw new Error('Sitemap XML must be multi-line');
  }

  if (!xml.startsWith(XML_DECLARATION)) {
    throw new Error('Sitemap XML declaration is missing or invalid');
  }

  const trimmedXml = xml.trim();
  const rootMatches = trimmedXml.match(/<urlset\b[^>]*>[\s\S]*<\/urlset>/g) || [];
  if (rootMatches.length !== 1) {
    throw new Error('Sitemap must contain a single <urlset> root element');
  }

  if (!trimmedXml.includes(XML_URLSET_OPEN)) {
    throw new Error('Sitemap root element or namespaces are invalid');
  }

  if (!trimmedXml.endsWith(XML_URLSET_CLOSE)) {
    throw new Error('Sitemap root element is not properly closed');
  }

  const xmlWithoutDeclaration = trimmedXml.slice(XML_DECLARATION.length).trim();
  if (!xmlWithoutDeclaration.startsWith(XML_URLSET_OPEN)) {
    throw new Error('Sitemap XML contains content before the root element');
  }

  const urlBlocks = trimmedXml.match(/<url>[\s\S]*?<\/url>/g) || [];
  if (!urlBlocks.length) {
    throw new Error('Sitemap must contain at least one URL entry');
  }

  const rootContent = trimmedXml
    .slice(trimmedXml.indexOf(XML_URLSET_OPEN) + XML_URLSET_OPEN.length, trimmedXml.lastIndexOf(XML_URLSET_CLOSE))
    .trim();
  const reconstructedRootContent = urlBlocks.join('\n').trim();

  if (rootContent !== reconstructedRootContent) {
    throw new Error('Sitemap root contains unexpected content outside <url> nodes');
  }

  const seenLocs = new Set();
  for (const block of urlBlocks) {
    const locMatch = block.match(/<loc>([^<]+)<\/loc>/);
    const lastmodMatch = block.match(/<lastmod>([^<]+)<\/lastmod>/);
    if (!locMatch) {
      throw new Error('A sitemap URL entry is missing <loc>');
    }
    if (!lastmodMatch) {
      throw new Error('A sitemap URL entry is missing <lastmod>');
    }

    const loc = locMatch[1];
    const lastmod = lastmodMatch[1];
    if (seenLocs.has(loc)) {
      throw new Error(`Duplicate sitemap URL detected: ${loc}`);
    }
    seenLocs.add(loc);

    try {
      new URL(loc);
    } catch {
      throw new Error(`Invalid sitemap URL detected: ${loc}`);
    }

    if (!ISO_DATE_PATTERN.test(lastmod)) {
      throw new Error(`Invalid sitemap lastmod detected: ${lastmod}`);
    }
  }

  return true;
}

function createDynamicEntries(payload = {}, generatedAt = new Date().toISOString()) {
  const books = Array.isArray(payload.books) ? payload.books : [];
  const blogPosts = Array.isArray(payload.blogPosts) ? payload.blogPosts : [];
  const dynamicEntries = [];

  const booksByGroupId = new Map();
  for (const rawBook of books) {
    const slug = String(rawBook?.slug || '').trim();
    if (!isValidSlug(slug)) continue;

    const book = {
      ...rawBook,
      slug,
      language: getValidLanguage(rawBook?.language),
      groupId: rawBook?.groupId || rawBook?.id || slug,
      chapters: Array.isArray(rawBook?.chapters) ? rawBook.chapters : []
    };
    const groupId = book.groupId;
    const variants = booksByGroupId.get(groupId) || [];
    variants.push(book);
    booksByGroupId.set(groupId, variants);
  }

  for (const variants of booksByGroupId.values()) {
    const sharedSlug = getGroupSharedSlug(variants);
    if (!isValidSlug(sharedSlug)) continue;

    const bookAlternates = buildAlternateLinks(variants, () => `/book/${sharedSlug}`);
    const bookLastmod = getMaxIsoDate(
      variants.flatMap((book) => [book.updatedAt, book.latestContentUpdatedAt]),
      generatedAt
    );

    for (const book of variants) {
      dynamicEntries.push({
        loc: buildAbsoluteUrl(`/book/${sharedSlug}`, book.language),
        alternates: bookAlternates,
        lastmod: bookLastmod
      });
    }

    const chaptersByNumber = new Map();
    for (const book of variants) {
      for (const rawChapter of book.chapters) {
        const slug = String(rawChapter?.slug || '').trim();
        if (!isValidSlug(slug)) continue;
        const chapterNumber = Number(rawChapter?.chapterNumber);
        if (!Number.isFinite(chapterNumber)) continue;

        const chapterVariants = chaptersByNumber.get(chapterNumber) || [];
        chapterVariants.push({
          bookSlug: sharedSlug,
          language: book.language,
          slug,
          chapterNumber,
          updatedAt: rawChapter.updatedAt
        });
        chaptersByNumber.set(chapterNumber, chapterVariants);
      }
    }

    for (const chapterVariants of chaptersByNumber.values()) {
      const chapterAlternates = buildAlternateLinks(chapterVariants, (chapter) => `/book/${chapter.bookSlug}/${chapter.slug}`);
      const chapterLastmod = getMaxIsoDate(chapterVariants.map((chapter) => chapter.updatedAt), generatedAt);

      for (const chapter of chapterVariants) {
        dynamicEntries.push({
          loc: buildAbsoluteUrl(`/book/${chapter.bookSlug}/${chapter.slug}`, chapter.language),
          alternates: chapterAlternates,
          lastmod: chapterLastmod
        });
      }
    }
  }

  for (const rawPost of blogPosts) {
    const slug = String(rawPost?.slug || '').trim();
    if (!isValidSlug(slug)) continue;

    dynamicEntries.push({
      loc: buildAbsoluteUrl(`/blog/${slug}`),
      lastmod: getMaxIsoDate([rawPost.updatedAt, rawPost.publishedAt], generatedAt),
      alternates: []
    });
  }

  return dedupeAndSortEntries(dynamicEntries).map((entry) => createUrlEntry(entry));
}

function createFallbackSitemap(generatedAt = new Date().toISOString()) {
  const xml = buildSitemapDocument(createHomepageOnlyEntries(generatedAt));
  validateSitemapXml(xml);
  return xml;
}

function logSitemapXml(xml, context = 'generated') {
  console.info(`[sitemap] Final XML (${context}):\n${xml}`);
}

export async function buildSitemapXml() {
  const fallbackGeneratedAt = new Date().toISOString();

  try {
    const payload = await fetchJsonWithRetry('/sitemap');
    const generatedAt = normalizeIsoDate(payload?.generatedAt, fallbackGeneratedAt);
    const entries = [
      ...createStaticEntries(generatedAt),
      ...createDynamicEntries(payload, generatedAt)
    ];
    const xml = buildSitemapDocument(entries);
    validateSitemapXml(xml);
    logSitemapXml(xml, 'dynamic');
    return xml;
  } catch (error) {
    console.error('[sitemap] Falling back to minimal sitemap XML.', error);
    const fallbackXml = createFallbackSitemap(fallbackGeneratedAt);
    validateSitemapXml(fallbackXml);
    logSitemapXml(fallbackXml, 'fallback');
    return fallbackXml;
  }
}

export { createFallbackSitemap };
