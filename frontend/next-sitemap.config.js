const DEFAULT_SITE_URL = "https://read-nova-x-frontend.vercel.app";
const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://readnovax.onrender.com/api';

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

module.exports = {
  siteUrl,
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

    return {
      loc: path,
      changefreq: 'daily',
      priority: path === '/' ? 1 : 0.7,
      lastmod: new Date().toISOString(),
      alternateRefs: config.alternateRefs || []
    };
  },
  additionalPaths: async (config) => {
    try {
      const books = await fetchAllBooks();
      const categorySet = new Set();
      const paths = [];

      for (const book of books) {
        if (!book?.slug) continue;

        paths.push(await config.transform(config, `/books/${book.slug}`));

        if (book.category) {
          categorySet.add(book.category);
        }

        try {
          const bookPayload = await requestJson(`/books/${book.slug}`);
          const chapters = bookPayload.chapters || [];

          for (const chapter of chapters) {
            if (!chapter?.slug) continue;
            paths.push(await config.transform(config, `/books/${book.slug}/${chapter.slug}`));
          }
        } catch (error) {
          console.warn(`[next-sitemap] Skipping chapters for ${book.slug}: ${error.message}`);
        }
      }

      for (const category of categorySet) {
        paths.push(await config.transform(config, `/category/${category}`));
      }

      return paths.filter(Boolean);
    } catch (error) {
      console.warn(`[next-sitemap] Unable to fetch dynamic routes: ${error.message}`);
      return [];
    }
  }
};
