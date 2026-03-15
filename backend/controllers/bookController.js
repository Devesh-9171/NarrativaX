const slugify = require('slugify');
const Book = require('../models/Book');
const Chapter = require('../models/Chapter');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { cache, cacheKey } = require('../utils/cache');

function computeTrendingScore(book) {
  return book.viewsLast24h * 3 + book.viewsLast7d * 2 + book.totalViews;
}

exports.createBook = asyncHandler(async (req, res) => {
  const { title, author, category, description, coverImage, featured } = req.body;

  if (!title || !author || !category || !description || !coverImage) {
    throw new AppError('title, author, category, description, and coverImage are required', 400);
  }

  const slug = slugify(title, { lower: true, strict: true });
  const existingBook = await Book.findOne({ slug }).lean();
  if (existingBook) {
    throw new AppError('A book with this title already exists', 409);
  }

  const book = await Book.create({ title, author, category, description, coverImage, featured: Boolean(featured), slug });
  cache.flushAll();

  res.status(201).json({ success: true, book });
});

exports.getHomepage = asyncHandler(async (_req, res) => {
  const key = cacheKey(['homepage']);
  const cached = cache.get(key);
  if (cached) return res.json({ success: true, ...cached });

  const [featured, trending, latestChapters, popular] = await Promise.all([
    Book.find({ featured: true }).sort({ updatedAt: -1 }).limit(6).lean(),
    Book.find().sort({ trendingScore: -1, totalViews: -1 }).limit(8).lean(),
    Chapter.find()
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('bookId', 'title slug coverImage author')
      .select('title slug chapterNumber updatedAt bookId')
      .lean(),
    Book.find().sort({ totalViews: -1 }).limit(8).lean()
  ]);

  const payload = { featured, trending, popular, latestChapters };
  cache.set(key, payload);
  res.json({ success: true, ...payload });
});

exports.getBooks = asyncHandler(async (req, res) => {
  const { search = '', category, sort = 'updatedAt' } = req.query;
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });
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

  const [books, total] = await Promise.all([
    Book.find(query)
      .sort(sortMap[sort] || sortMap.updatedAt)
      .skip(skip)
      .limit(limit)
      .select('title slug author category coverImage rating totalViews featured updatedAt')
      .lean(),
    Book.countDocuments(query)
  ]);

  res.json({ success: true, data: books, pagination: buildPaginationMeta({ total, page, limit }) });
});

exports.getBookById = asyncHandler(async (req, res) => {
  const key = cacheKey(['book-id', req.params.id]);
  const cached = cache.get(key);
  if (cached) return res.json({ success: true, ...cached });

  const matcher = /^[0-9a-fA-F]{24}$/.test(req.params.id)
    ? { _id: req.params.id }
    : { slug: req.params.id };
  const book = await Book.findOne(matcher).lean();
  if (!book) throw new AppError('Book not found', 404);

  const chapters = await Chapter.find({ bookId: book._id })
    .sort({ chapterNumber: 1 })
    .select('title slug chapterNumber views updatedAt')
    .lean();

  const payload = { book, chapters };
  cache.set(key, payload);
  res.json({ success: true, ...payload });
});

exports.getBookBySlug = asyncHandler(async (req, res) => {
  const key = cacheKey(['book', req.params.slug]);
  const cached = cache.get(key);
  if (cached) return res.json(cached);

  const book = await Book.findOne({ slug: req.params.slug }).lean();
  if (!book) throw new AppError('Book not found', 404);

  const chapters = await Chapter.find({ bookId: book._id })
    .sort({ chapterNumber: 1 })
    .select('title slug chapterNumber views updatedAt')
    .lean();

  const payload = { book, chapters };
  cache.set(key, payload);
  res.json(payload);
});

exports.getCategoryBooks = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 24, maxLimit: 100 });
  const query = { category: req.params.slug };

  const [books, total] = await Promise.all([
    Book.find(query)
      .sort({ totalViews: -1 })
      .skip(skip)
      .limit(limit)
      .select('title slug author category coverImage rating totalViews')
      .lean(),
    Book.countDocuments(query)
  ]);

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
