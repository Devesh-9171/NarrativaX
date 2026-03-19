const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://readnovax.in').replace(/\/$/, '');
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://readnovax.onrender.com/api';

const STATIC_PUBLIC_PATHS = ['/', '/about', '/contact', '/terms', '/privacy-policy', '/disclaimer', '/blog'];
const STATIC_PUBLIC_PATH_SET = new Set(STATIC_PUBLIC_PATHS);
const ENABLE_FUTURE_BOOK_SITEMAP = process.env.ENABLE_FUTURE_BOOK_SITEMAP === 'true';
const DYNAMIC_ROUTE_BUILDERS = {
  book: (slug) => `/book/${slug}`,
  chapter: (slug) => `/chapter/${slug}`
};

function getPriority(path) {
  if (path === '/') return 1.0;
  if (path === '/blog') return 0.9;
  return 0.7;
}

function getValidatedApiBaseUrl() {
  try {
    const parsed = new URL(apiBaseUrl);
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return 'https://readnovax.onrender.com/api';
  }
}

const validatedApiBaseUrl = getValidatedApiBaseUrl();

async function requestJson(path) {
  const response = await fetch(`${validatedApiBaseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchAllBooks() {
  const books = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const payload = await requestJson(`/books?page=${page}&limit=100&sort=updatedAt`);
    books.push(...(payload.data || []));

    totalPages = payload.pagination?.totalPages || 1;
    page += 1;
  }

  return books;
}

async function fetchFutureBookPaths(config) {
  try {
    const books = await fetchAllBooks();
    const paths = [];
    const seenPaths = new Set();

    for (const book of books) {
      if (!book?.slug) continue;

      const bookPath = DYNAMIC_ROUTE_BUILDERS.book(book.slug);
      if (!seenPaths.has(bookPath)) {
        seenPaths.add(bookPath);
        paths.push(await config.transform(config, bookPath));
      }

      const bookPayload = await requestJson(`/books/${book.slug}`);
      const chapters = bookPayload.chapters || [];

      for (const chapter of chapters) {
        if (!chapter?.slug) continue;

        const chapterPath = DYNAMIC_ROUTE_BUILDERS.chapter(chapter.slug);
        if (seenPaths.has(chapterPath)) continue;

        seenPaths.add(chapterPath);
        paths.push(await config.transform(config, chapterPath));
      }
    }

    return paths.filter(Boolean);
  } catch (error) {
    console.warn(`[next-sitemap] Skipping future book and chapter paths: ${error.message}`);
    return [];
  }
}

module.exports = {
  siteUrl: SITE_URL,
  outDir: 'public',
  generateRobotsTxt: true,
  sitemapSize: 7000,
  exclude: ['/api/*', '/_next/*', '/_next/**', '/static/*', '/static/**'],
  robotsTxtOptions: {
    policies: [{ userAgent: '*', allow: '/' }]
  },
  transform: async (config, path) => {
    if (/\.(?:avif|css|gif|ico|jpe?g|js|json|map|png|svg|txt|webp|woff2?)$/i.test(path)) {
      return null;
    }

    const isStaticPublicPath = STATIC_PUBLIC_PATH_SET.has(path);
    const isFutureBookPath = ENABLE_FUTURE_BOOK_SITEMAP && (path.startsWith('/book/') || path.startsWith('/chapter/'));

    if (!isStaticPublicPath && !isFutureBookPath) {
      return null;
    }

    return {
      loc: path,
      changefreq: 'daily',
      priority: getPriority(path),
      lastmod: new Date().toISOString(),
      alternateRefs: config.alternateRefs || []
    };
  },
  additionalPaths: async (config) => {
    const staticPaths = await Promise.all(
      STATIC_PUBLIC_PATHS.map((path) => config.transform(config, path))
    );
    const futureBookPaths = ENABLE_FUTURE_BOOK_SITEMAP ? await fetchFutureBookPaths(config) : [];

    return [...staticPaths, ...futureBookPaths].filter(Boolean);
  }
};
