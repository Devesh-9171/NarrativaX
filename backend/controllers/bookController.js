const crypto = require('crypto');
const mongoose = require('mongoose');
const Book = require('../models/Book');
const Chapter = require('../models/Chapter');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { cache, cacheKey } = require('../utils/cache');
const { DEFAULT_LANGUAGE, normalizeLanguage } = require('../utils/language');
const { applySharedSlugToBooks, buildSharedBookSlug, syncGroupBookSlugs } = require('../utils/bookSlug');
const { uploadImageBuffer, deleteImageByPublicId } = require('../utils/cloudinaryAssets');

function computeTrendingScore(book) {
  return book.viewsLast24h * 3 + book.viewsLast7d * 2 + book.totalViews;
}

function countWords(content = '') {
  return String(content)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function parseTags(inputTags) {
  if (Array.isArray(inputTags)) {
    return inputTags.map((tag) => String(tag || '').replace(/^#/, '').trim().toLowerCase()).filter(Boolean);
  }

  return String(inputTags || '')
    .split(',')
    .map((tag) => tag.replace(/^#/, '').trim().toLowerCase())
    .filter(Boolean);
}

async function resolveGroupId(groupId) {
  if (!groupId) {
    return crypto.randomUUID();
  }

  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    return String(groupId).trim();
  }

  const existing = await Book.findById(groupId).select('groupId').lean();
  if (existing?.groupId) {
    return existing.groupId;
  }

  return String(groupId).trim();
}

function shouldRequireExistingGroup(language) {
  return normalizeLanguage(language, DEFAULT_LANGUAGE) !== DEFAULT_LANGUAGE;
}

async function getPaginatedBookResults({ query = {}, sort, page, limit, preferredLanguage, projection }) {
  const effectiveProjection = projection || {
    title: 1,
    slug: 1,
    author: 1,
    category: 1,
    contentType: 1,
    tags: 1,
    status: 1,
    isCompleted: 1,
    coverImage: 1,
    rating: 1,
    totalViews: 1,
    language: 1,
    groupId: 1,
    updatedAt: 1
  };

  const groupKey = { $ifNull: ['$groupId', { $toString: '$_id' }] };
  const priorityExpression = {
    $switch: {
      branches: [
        { case: { $eq: ['$language', preferredLanguage] }, then: 2 },
        { case: { $in: ['$language', ['english', 'en']] }, then: 1 }
      ],
      default: 0
    }
  };

  const results = await Book.aggregate([
    { $match: query },
    { $sort: { ...sort, _id: 1 } },
    { $addFields: { groupKey, languagePriority: priorityExpression } },
    { $sort: { ...sort, languagePriority: -1, _id: 1 } },
    { $group: { _id: '$groupKey', doc: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$doc' } },
    { $sort: { ...sort, _id: 1 } },
    {
      $facet: {
        data: [{ $skip: (page - 1) * limit }, { $limit: limit }, { $project: effectiveProjection }],
        totalCount: [{ $count: 'count' }]
      }
    }
  ]);

  const payload = results[0] || { data: [], totalCount: [] };
  return { books: payload.data, total: payload.totalCount[0]?.count || 0 };
}

async function getTranslations(groupId, selectedBookId) {
  const translations = await Book.find({ groupId }).sort({ language: 1 }).select('title slug language groupId coverImage').lean();
  const sharedSlugTranslations = await applySharedSlugToBooks(translations);

  return sharedSlugTranslations.map((translation) => ({
    ...translation,
    isActive: String(translation._id) === String(selectedBookId)
  }));
}

async function resolveBookVariant(identifier, requestedLanguage, options = {}) {
  const matcher = /^[0-9a-fA-F]{24}$/.test(identifier) ? { _id: identifier } : { slug: identifier };
  const seedBook = await Book.findOne({ ...matcher, ...(options.status ? { status: options.status } : {}) }).lean();
  if (!seedBook) return null;

  const language = normalizeLanguage(requestedLanguage, seedBook.language || DEFAULT_LANGUAGE);
  const translatedBook = await Book.findOne({
    groupId: seedBook.groupId || seedBook._id.toString(),
    language,
    ...(options.status ? { status: options.status } : {})
  }).lean();

  return translatedBook || seedBook;
}

exports.createBook = asyncHandler(async (req, res) => {
  const {
    title,
    category,
    description,
    coverImage,
    featured,
    language,
    groupId,
    contentType,
    tags,
    status
  } = req.body;

  const providedLanguage = String(language || '').trim().toLowerCase();
  if (!['english', 'hindi', 'en', 'hi'].includes(providedLanguage)) {
    throw new AppError('Invalid language', 400);
  }
  const normalizedLanguage = normalizeLanguage(language);
  const normalizedTags = parseTags(tags);
  if (!title || !category || !description || !language || normalizedTags.length === 0 || (!req.file && !coverImage)) {
    throw new AppError('title, category, description, language, tags, and cover image are required', 400);
  }
  const normalizedContentType = contentType === 'short_story' ? 'short_story' : 'long_story';
  const maxTags = normalizedContentType === 'short_story' ? 3 : 10;
  if (normalizedTags.length > maxTags) {
    throw new AppError(`Tag limit exceeded. ${normalizedContentType === 'short_story' ? 'Short stories support max 3 tags' : 'Books support max 10 tags'}`, 400);
  }
  if (req.user?.role === 'author') {
    const author = await User.findById(req.user.id).select('authorStatus').lean();
    if (author?.authorStatus !== 'approved') throw new AppError('Only approved authors can publish content', 403);
  }

  if (shouldRequireExistingGroup(normalizedLanguage) && !groupId) {
    throw new AppError('Translated books must be linked to an existing translation group', 400);
  }

  const nextGroupId = await resolveGroupId(groupId);
  const duplicateLanguage = await Book.findOne({ groupId: nextGroupId, language: normalizedLanguage }).lean();
  if (duplicateLanguage) {
    throw new AppError('This language already exists for the selected book group', 409);
  }

  let resolvedCoverImage = String(coverImage || '').trim();
  let resolvedCoverImagePublicId = '';
  if (req.file) {
    const upload = await uploadImageBuffer({ file: req.file, folder: 'readnovax/books' });
    resolvedCoverImage = upload.secureUrl;
    resolvedCoverImagePublicId = upload.publicId;
  }

  const slug = await buildSharedBookSlug({ groupId: nextGroupId, title, language: normalizedLanguage });
  const role = req.user?.role || 'admin';
  const derivedStatus = role === 'admin' ? (status || 'published') : 'review';
  const normalizedAuthor = String(req.user?.name || 'ReadNovaX Editorial').trim();

  const book = await Book.create({
    title: String(title).trim(),
    author: normalizedAuthor,
    authorName: normalizedAuthor,
    authorUserId: req.user?.id || null,
    authorId: req.user?._id || req.user?.id || null,
    category: String(category).trim(),
    description: String(description).trim(),
    contentType: normalizedContentType,
    tags: normalizedTags,
    status: ['review', 'published', 'rejected'].includes(derivedStatus) ? derivedStatus : 'review',
    coverImage: resolvedCoverImage,
    coverImagePublicId: resolvedCoverImagePublicId,
    featured: Boolean(featured),
    slug,
    language: normalizedLanguage,
    groupId: nextGroupId
  });

  await syncGroupBookSlugs(nextGroupId, { title: String(title).trim(), language: normalizedLanguage });
  const [sharedBook] = await applySharedSlugToBooks([book.toObject ? book.toObject() : book]);
  cache.flushAll();
  res.status(201).json({ success: true, book: sharedBook });
});

exports.updateBook = asyncHandler(async (req, res) => {
  const { title, category, description, coverImage, featured, language, groupId, contentType, tags, status } = req.body;
  const book = await Book.findById(req.params.id);
  if (!book) throw new AppError('Book not found', 404);

  const previousGroupId = book.groupId || book._id.toString();
  const providedLanguage = typeof language === 'undefined' ? '' : String(language || '').trim().toLowerCase();
  if (providedLanguage && !['english', 'hindi', 'en', 'hi'].includes(providedLanguage)) throw new AppError('Invalid language', 400);
  const nextLanguage = normalizeLanguage(language, book.language || DEFAULT_LANGUAGE);
  const nextTitle = title ? String(title).trim() : book.title;
  const nextGroupId = groupId ? await resolveGroupId(groupId) : previousGroupId;
  const nextSlug = await buildSharedBookSlug({ groupId: nextGroupId, title: nextTitle, language: nextLanguage });
  const duplicateLanguage = await Book.findOne({ groupId: nextGroupId, language: nextLanguage, _id: { $ne: book._id } }).lean();
  if (duplicateLanguage) throw new AppError('This language already exists for the selected book group', 409);

  book.title = nextTitle;
  book.slug = nextSlug;
  book.author = String(req.user?.name || book.author || 'ReadNovaX Editorial').trim();
  book.authorName = book.author;
  book.authorUserId = req.user?.id || book.authorUserId;
  book.authorId = req.user?._id || req.user?.id || book.authorId;
  book.category = category ? String(category).trim() : book.category;
  book.description = description ? String(description).trim() : book.description;
  book.contentType = contentType ? (contentType === 'short_story' ? 'short_story' : 'long_story') : book.contentType;
  if (typeof tags !== 'undefined') {
    const normalizedTags = parseTags(tags);
    if (normalizedTags.length === 0) throw new AppError('At least one tag is required', 400);
    const maxTags = book.contentType === 'short_story' ? 3 : 10;
    if (normalizedTags.length > maxTags) throw new AppError(`Tag limit exceeded. Max ${maxTags} tags allowed for this content type`, 400);
    book.tags = normalizedTags;
  }
  if (coverImage) book.coverImage = String(coverImage).trim();
  book.language = nextLanguage;
  book.groupId = nextGroupId;
  if (typeof featured !== 'undefined') book.featured = Boolean(featured);
  if (req.user?.role === 'admin' && status && ['review', 'published', 'rejected'].includes(status)) {
    book.status = status;
  }

  if (req.file) {
    const upload = await uploadImageBuffer({ file: req.file, folder: 'readnovax/books' });
    await deleteImageByPublicId(book.coverImagePublicId);
    book.coverImage = upload.secureUrl;
    book.coverImagePublicId = upload.publicId;
  }

  await book.save();
  await Chapter.updateMany({ bookId: book._id }, { $set: { language: book.language } });
  await syncGroupBookSlugs(nextGroupId, { title: nextTitle, language: nextLanguage });
  if (previousGroupId !== nextGroupId) await syncGroupBookSlugs(previousGroupId);

  const [sharedBook] = await applySharedSlugToBooks([book.toObject ? book.toObject() : book]);
  cache.flushAll();
  res.json({ success: true, book: sharedBook });
});

exports.deleteBook = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id).select('_id coverImagePublicId');
  if (!book) throw new AppError('Book not found', 404);

  await Promise.all([
    Chapter.deleteMany({ bookId: book._id }),
    Book.deleteOne({ _id: book._id }),
    deleteImageByPublicId(book.coverImagePublicId)
  ]);
  cache.flushAll();
  res.json({ success: true, message: 'Book deleted' });
});

exports.getHomepage = asyncHandler(async (req, res) => {
  const lang = normalizeLanguage(req.query.lang, DEFAULT_LANGUAGE);
  const key = cacheKey(['homepage', lang]);
  const cached = cache.get(key);
  if (cached) return res.json({ success: true, ...cached });

  const [featuredRaw, trendingRaw, popularRaw, latestChaptersRaw] = await Promise.all([
    Book.find({ featured: true, status: 'published' }).sort({ updatedAt: -1 }).limit(20).lean(),
    Book.find({ status: 'published' }).sort({ trendingScore: -1, totalViews: -1 }).limit(30).lean(),
    Book.find({ status: 'published' }).sort({ totalViews: -1 }).limit(30).lean(),
    Chapter.find()
      .sort({ updatedAt: -1 })
      .limit(40)
      .populate({ path: 'bookId', match: { status: 'published' }, select: 'title slug coverImage author language groupId' })
      .select('title slug chapterNumber updatedAt bookId language')
      .lean()
  ]);

  const selectPreferredBooks = (books) => {
    const groups = new Map();
    for (const book of books) {
      const groupKey = book.groupId || String(book._id);
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey).push(book);
    }
    return Array.from(groups.values()).map((items) => items.find((item) => item.language === lang) || items.find((item) => ['english', 'en'].includes(item.language)) || items[0]);
  };

  const featured = await applySharedSlugToBooks(selectPreferredBooks(featuredRaw).slice(0, 6));
  const trending = await applySharedSlugToBooks(selectPreferredBooks(trendingRaw).slice(0, 8));
  const popular = await applySharedSlugToBooks(selectPreferredBooks(popularRaw).slice(0, 8));
  const latestChapters = latestChaptersRaw.filter((chapter) => chapter.bookId).slice(0, 10);

  const latestChaptersWithSharedSlugs = await Promise.all(latestChapters.map(async (chapter) => {
    const [sharedBook] = await applySharedSlugToBooks([chapter.bookId]);
    return { ...chapter, bookId: sharedBook || chapter.bookId };
  }));

  const payload = { featured, trending, popular, latestChapters: latestChaptersWithSharedSlugs };
  cache.set(key, payload);
  res.json({ success: true, ...payload });
});

exports.getBooks = asyncHandler(async (req, res) => {
  const {
    search = '',
    category,
    sort = 'updatedAt',
    lang = DEFAULT_LANGUAGE,
    includeAllLanguages,
    contentType
  } = req.query;
  const preferredLanguage = normalizeLanguage(lang, DEFAULT_LANGUAGE);
  const query = { status: 'published' };
  const shouldIncludeAllLanguages = String(includeAllLanguages).toLowerCase() === 'true';
  const { page, limit } = getPagination(req.query, {
    defaultLimit: shouldIncludeAllLanguages ? 100 : 12,
    maxLimit: shouldIncludeAllLanguages ? 500 : 20
  });

  if (category) query.category = category;
  if (contentType && ['short_story', 'long_story'].includes(String(contentType))) {
    query.contentType = String(contentType);
  }
  if (search) {
    const pattern = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ title: pattern }, { author: pattern }, { category: pattern }, { tags: pattern }];
  }

  const sortMap = {
    updatedAt: { updatedAt: -1 },
    popular: { totalViews: -1 },
    trending: { trendingScore: -1 },
    rating: { rating: -1 }
  };

  const resolvedSort = sortMap[sort] || sortMap.updatedAt;
  let books;
  let total;

  if (shouldIncludeAllLanguages) {
    [books, total] = await Promise.all([
      Book.find(query)
        .sort({ ...resolvedSort, title: 1, language: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('title slug author category contentType tags status isCompleted coverImage rating totalViews language groupId updatedAt')
        .lean(),
      Book.countDocuments(query)
    ]);
  } else {
    ({ books, total } = await getPaginatedBookResults({ query, sort: resolvedSort, page, limit, preferredLanguage }));
  }

  const booksWithSharedSlugs = await applySharedSlugToBooks(books);
  res.json({ success: true, data: booksWithSharedSlugs, pagination: buildPaginationMeta({ total, page, limit }) });
});

exports.getShortStoriesReel = asyncHandler(async (req, res) => {
  const lang = normalizeLanguage(req.query.lang, DEFAULT_LANGUAGE);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 24, 5), 60);
  const key = cacheKey(['short-stories-reel', lang, limit]);
  const cached = cache.get(key);
  if (cached) return res.json({ success: true, ...cached });

  const storiesRaw = await Book.find({ status: 'published', contentType: 'short_story' })
    .sort({ updatedAt: -1, totalViews: -1 })
    .limit(limit * 3)
    .select('title slug author category contentType tags coverImage language groupId readingTimeMinutes totalViews')
    .lean();

  const grouped = new Map();
  for (const story of storiesRaw) {
    const groupKey = story.groupId || String(story._id);
    if (!grouped.has(groupKey)) grouped.set(groupKey, []);
    grouped.get(groupKey).push(story);
  }

  const preferredStories = Array.from(grouped.values())
    .map((items) => items.find((item) => item.language === lang) || items.find((item) => ['english', 'en'].includes(item.language)) || items[0])
    .slice(0, limit);

  const storyIds = preferredStories.map((story) => story._id);
  const firstChapters = await Chapter.find({ bookId: { $in: storyIds } })
    .sort({ chapterNumber: 1 })
    .select('bookId title slug chapterNumber content')
    .lean();

  const chapterByBookId = new Map();
  for (const chapter of firstChapters) {
    const keyId = String(chapter.bookId);
    if (!chapterByBookId.has(keyId)) chapterByBookId.set(keyId, chapter);
  }

  const sharedStories = await applySharedSlugToBooks(preferredStories);
  const stories = sharedStories
    .map((story) => {
      const firstChapter = chapterByBookId.get(String(story._id));
      if (!firstChapter) return null;
      const wordCount = countWords(firstChapter.content);
      const estimatedReadingTimeMinutes = Math.max(1, Math.ceil(wordCount / 220));
      return {
        ...story,
        firstChapter: {
          _id: firstChapter._id,
          title: firstChapter.title,
          slug: firstChapter.slug,
          chapterNumber: firstChapter.chapterNumber,
          content: firstChapter.content
        },
        wordCount,
        estimatedReadingTimeMinutes,
        readingTimeMinutes: Math.max(Number(story.readingTimeMinutes) || 0, estimatedReadingTimeMinutes)
      };
    })
    .filter(Boolean);

  const payload = { stories };
  cache.set(key, payload);
  res.json({ success: true, ...payload });
});

exports.getBookById = asyncHandler(async (req, res) => {
  const lang = normalizeLanguage(req.query.lang, DEFAULT_LANGUAGE);
  const key = cacheKey(['book-id', req.params.id, lang]);
  const cached = cache.get(key);
  if (cached) return res.json({ success: true, ...cached });

  const book = await resolveBookVariant(req.params.id, lang, { status: 'published' });
  if (!book) throw new AppError('Book not found', 404);

  const [chapters, translations] = await Promise.all([
    Chapter.find({ bookId: book._id }).sort({ chapterNumber: 1 }).select('title slug chapterNumber views updatedAt language').lean(),
    getTranslations(book.groupId || String(book._id), book._id)
  ]);

  const [sharedBook] = await applySharedSlugToBooks([book]);
  const payload = { book: sharedBook || book, chapters, translations };
  cache.set(key, payload);
  res.json({ success: true, ...payload });
});

exports.getBookBySlug = asyncHandler(async (req, res) => {
  const lang = normalizeLanguage(req.query.lang, DEFAULT_LANGUAGE);
  const key = cacheKey(['book', req.params.slug, lang]);
  const cached = cache.get(key);
  if (cached) return res.json(cached);

  const book = await resolveBookVariant(req.params.slug, lang, { status: 'published' });
  if (!book) throw new AppError('Book not found', 404);

  const [chapters, translations] = await Promise.all([
    Chapter.find({ bookId: book._id }).sort({ chapterNumber: 1 }).select('title slug chapterNumber views updatedAt language').lean(),
    getTranslations(book.groupId || String(book._id), book._id)
  ]);

  const [sharedBook] = await applySharedSlugToBooks([book]);
  const payload = { book: sharedBook || book, chapters, translations };
  cache.set(key, payload);
  res.json(payload);
});

exports.getCategoryBooks = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query, { defaultLimit: 12, maxLimit: 20 });
  const preferredLanguage = normalizeLanguage(req.query.lang, DEFAULT_LANGUAGE);
  const query = { category: req.params.slug, status: 'published' };

  const { books, total } = await getPaginatedBookResults({
    query,
    sort: { totalViews: -1, updatedAt: -1 },
    page,
    limit,
    preferredLanguage,
    projection: {
      title: 1,
      slug: 1,
      author: 1,
      category: 1,
      contentType: 1,
      tags: 1,
      coverImage: 1,
      rating: 1,
      totalViews: 1,
      language: 1,
      groupId: 1,
      status: 1,
      isCompleted: 1
    }
  });

  const booksWithSharedSlugs = await applySharedSlugToBooks(books);
  res.json({ data: booksWithSharedSlugs, pagination: buildPaginationMeta({ total, page, limit }) });
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
