const slugify = require('slugify');
const crypto = require('crypto');
const Book = require('../models/Book');
const Chapter = require('../models/Chapter');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { cache, cacheKey } = require('../utils/cache');
const { DEFAULT_LANGUAGE, normalizeLanguage } = require('../utils/language');

function computeTrendingScore(book) {
  return book.viewsLast24h * 3 + book.viewsLast7d * 2 + book.totalViews;
}


function createBookSlug(title, language) {
  const baseSlug = slugify(String(title || ''), { lower: true, strict: true, trim: true });
  return language === 'hi' ? `${baseSlug || 'book'}-hi` : baseSlug;
}

async function ensureUniqueBookSlug(title, language, excludeId = null) {
  const baseSlug = createBookSlug(title, language);
  let slug = baseSlug || `book-${language}`;
  let suffix = 1;

  while (
    await Book.exists({
      slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {})
    })
  ) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  return slug;
}

async function resolveGroupId(groupId) {
  if (!groupId) {
    return crypto.randomUUID();
  }

  const existing = await Book.findById(groupId).select('groupId').lean();
  if (existing?.groupId) {
    return existing.groupId;
  }

  return String(groupId).trim();
}

function selectPreferredBooks(books, preferredLanguage = 'en') {
  const groups = new Map();

  for (const book of books) {
    const key = book.groupId || book._id.toString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(book);
  }

  return Array.from(groups.values()).map((items) => {
    const preferred = items.find((item) => item.language === preferredLanguage);
    const english = items.find((item) => item.language === 'en');
    return preferred || english || items[0];
  });
}

async function getTranslations(groupId, selectedBookId) {
  const translations = await Book.find({ groupId })
    .sort({ language: 1 })
    .select('title slug language groupId coverImage')
    .lean();

  return translations.map((translation) => ({
    ...translation,
    isActive: String(translation._id) === String(selectedBookId)
  }));
}

async function resolveBookVariant(identifier, requestedLanguage) {
  const matcher = /^[0-9a-fA-F]{24}$/.test(identifier)
    ? { _id: identifier }
    : { slug: identifier };

  const seedBook = await Book.findOne(matcher).lean();
  if (!seedBook) return null;

  const language = normalizeLanguage(requestedLanguage, seedBook.language || DEFAULT_LANGUAGE);
  const translatedBook = await Book.findOne({ groupId: seedBook.groupId || seedBook._id.toString(), language }).lean();

  return translatedBook || seedBook;
}

exports.createBook = asyncHandler(async (req, res) => {
  const { title, author, category, description, coverImage, featured, language, groupId } = req.body;
  const normalizedAuthor = String(author || 'ReadNovaX Editorial').trim();
  const normalizedLanguage = normalizeLanguage(language);

  if (!title || !category || !description || !coverImage) {
    throw new AppError('title, category, description, and coverImage are required', 400);
  }

  const nextGroupId = await resolveGroupId(groupId);
  const duplicateLanguage = await Book.findOne({ groupId: nextGroupId, language: normalizedLanguage }).lean();
  if (duplicateLanguage) {
    throw new AppError('This language already exists for the selected book group', 409);
  }

  const slug = await ensureUniqueBookSlug(title, normalizedLanguage);
  const book = await Book.create({
    title: String(title).trim(),
    author: normalizedAuthor,
    category: String(category).trim(),
    description: String(description).trim(),
    coverImage: String(coverImage).trim(),
    featured: Boolean(featured),
    slug,
    language: normalizedLanguage,
    groupId: nextGroupId
  });
  cache.flushAll();

  res.status(201).json({ success: true, book });
});

exports.updateBook = asyncHandler(async (req, res) => {
  const { title, author, category, description, coverImage, featured, language, groupId } = req.body;
  const book = await Book.findById(req.params.id);
  if (!book) throw new AppError('Book not found', 404);

  const nextLanguage = normalizeLanguage(language, book.language || DEFAULT_LANGUAGE);
  const nextTitle = title ? String(title).trim() : book.title;
  const nextSlug = await ensureUniqueBookSlug(nextTitle, nextLanguage, book._id);
  const nextGroupId = groupId ? await resolveGroupId(groupId) : book.groupId || book._id.toString();
  const duplicateLanguage = await Book.findOne({ groupId: nextGroupId, language: nextLanguage, _id: { $ne: book._id } }).lean();
  if (duplicateLanguage) {
    throw new AppError('This language already exists for the selected book group', 409);
  }

  book.title = nextTitle;
  book.slug = nextSlug;
  book.author = String(author || book.author || 'ReadNovaX Editorial').trim();
  book.category = category ? String(category).trim() : book.category;
  book.description = description ? String(description).trim() : book.description;
  book.coverImage = coverImage ? String(coverImage).trim() : book.coverImage;
  book.language = nextLanguage;
  book.groupId = nextGroupId;
  if (typeof featured !== 'undefined') book.featured = Boolean(featured);

  await book.save();
  await Chapter.updateMany({ bookId: book._id }, { $set: { language: book.language } });
  cache.flushAll();

  res.json({ success: true, book });
});

exports.deleteBook = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id).select('_id');
  if (!book) throw new AppError('Book not found', 404);

  await Promise.all([Chapter.deleteMany({ bookId: book._id }), Book.deleteOne({ _id: book._id })]);
  cache.flushAll();

  res.json({ success: true, message: 'Book deleted' });
});

exports.getHomepage = asyncHandler(async (req, res) => {
  const lang = normalizeLanguage(req.query.lang, DEFAULT_LANGUAGE);
  const key = cacheKey(['homepage', lang]);
  const cached = cache.get(key);
  if (cached) return res.json({ success: true, ...cached });

  const [featuredRaw, trendingRaw, popularRaw, latestChaptersRaw] = await Promise.all([
    Book.find({ featured: true }).sort({ updatedAt: -1 }).limit(20).lean(),
    Book.find().sort({ trendingScore: -1, totalViews: -1 }).limit(30).lean(),
    Book.find().sort({ totalViews: -1 }).limit(30).lean(),
    Chapter.find()
      .sort({ updatedAt: -1 })
      .limit(40)
      .populate('bookId', 'title slug coverImage author language groupId')
      .select('title slug chapterNumber updatedAt bookId language')
      .lean()
  ]);

  const featured = selectPreferredBooks(featuredRaw, lang).slice(0, 6);
  const trending = selectPreferredBooks(trendingRaw, lang).slice(0, 8);
  const popular = selectPreferredBooks(popularRaw, lang).slice(0, 8);
  const latestChaptersByGroup = new Map();
  for (const chapter of latestChaptersRaw) {
    if (!chapter.bookId) continue;
    const groupKey = chapter.bookId.groupId || String(chapter.bookId._id);
    const current = latestChaptersByGroup.get(groupKey);
    const nextPriority = chapter.bookId.language === lang ? 2 : chapter.bookId.language === 'en' ? 1 : 0;
    const currentPriority = current ? (current.bookId.language === lang ? 2 : current.bookId.language === 'en' ? 1 : 0) : -1;

    if (!current || nextPriority > currentPriority) {
      latestChaptersByGroup.set(groupKey, chapter);
    }
  }
  const latestChapters = Array.from(latestChaptersByGroup.values()).slice(0, 10);

  const payload = { featured, trending, popular, latestChapters };
  cache.set(key, payload);
  res.json({ success: true, ...payload });
});

exports.getBooks = asyncHandler(async (req, res) => {
  const { search = '', category, sort = 'updatedAt', lang = DEFAULT_LANGUAGE } = req.query;
  const preferredLanguage = normalizeLanguage(lang, DEFAULT_LANGUAGE);
  const { page, limit } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const query = {};

  if (category) query.category = category;
  if (search) {
    const pattern = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ title: pattern }, { author: pattern }, { category: pattern }];
  }

  const sortMap = {
    updatedAt: { updatedAt: -1 },
    popular: { totalViews: -1 },
    trending: { trendingScore: -1 },
    rating: { rating: -1 }
  };

  const allBooks = await Book.find(query)
    .sort(sortMap[sort] || sortMap.updatedAt)
    .select('title slug author category coverImage description rating totalViews featured updatedAt language groupId')
    .lean();

  const dedupedBooks = selectPreferredBooks(allBooks, preferredLanguage);
  const start = (page - 1) * limit;
  const books = dedupedBooks.slice(start, start + limit);
  const total = dedupedBooks.length;

  res.json({ success: true, data: books, pagination: buildPaginationMeta({ total, page, limit }) });
});

exports.getBookById = asyncHandler(async (req, res) => {
  const lang = normalizeLanguage(req.query.lang, DEFAULT_LANGUAGE);
  const key = cacheKey(['book-id', req.params.id, lang]);
  const cached = cache.get(key);
  if (cached) return res.json({ success: true, ...cached });

  const book = await resolveBookVariant(req.params.id, lang);
  if (!book) throw new AppError('Book not found', 404);

  const [chapters, translations] = await Promise.all([
    Chapter.find({ bookId: book._id })
      .sort({ chapterNumber: 1 })
      .select('title slug chapterNumber views updatedAt language')
      .lean(),
    getTranslations(book.groupId || String(book._id), book._id)
  ]);

  const payload = { book, chapters, translations };
  cache.set(key, payload);
  res.json({ success: true, ...payload });
});

exports.getBookBySlug = asyncHandler(async (req, res) => {
  const lang = normalizeLanguage(req.query.lang, DEFAULT_LANGUAGE);
  const key = cacheKey(['book', req.params.slug, lang]);
  const cached = cache.get(key);
  if (cached) return res.json(cached);

  const book = await resolveBookVariant(req.params.slug, lang);
  if (!book) throw new AppError('Book not found', 404);

  const [chapters, translations] = await Promise.all([
    Chapter.find({ bookId: book._id })
      .sort({ chapterNumber: 1 })
      .select('title slug chapterNumber views updatedAt language')
      .lean(),
    getTranslations(book.groupId || String(book._id), book._id)
  ]);

  const payload = { book, chapters, translations };
  cache.set(key, payload);
  res.json(payload);
});

exports.getCategoryBooks = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query, { defaultLimit: 24, maxLimit: 100 });
  const preferredLanguage = normalizeLanguage(req.query.lang, DEFAULT_LANGUAGE);
  const query = { category: req.params.slug };

  const allBooks = await Book.find(query)
    .sort({ totalViews: -1 })
    .select('title slug author category coverImage rating totalViews language groupId')
    .lean();

  const dedupedBooks = selectPreferredBooks(allBooks, preferredLanguage);
  const start = (page - 1) * limit;
  const books = dedupedBooks.slice(start, start + limit);
  const total = dedupedBooks.length;

  res.json({ data: books, pagination: buildPaginationMeta({ total, page, limit }) });
});

exports.recalculateTrending = asyncHandler(async (_req, res) => {
  const books = await Book.find().select('_id viewsLast24h viewsLast7d totalViews').lean();

  await Promise.all(
    books.map((book) =>
      Book.updateOne(
        { _id: book._id },
        {
          $set: {
            trendingScore: computeTrendingScore(book)
          }
        }
      )
    )
  );

  cache.flushAll();
  res.json({ message: 'Trending scores updated' });
});
