const slugify = require('slugify');
const Book = require('../models/Book');
const Chapter = require('../models/Chapter');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { cache, cacheKey } = require('../utils/cache');

exports.createChapter = asyncHandler(async (req, res) => {
  const { bookId, chapterNumber, title, content } = req.body;

  if (!bookId || !chapterNumber || !title || !content) {
    throw new AppError('bookId, chapterNumber, title, and content are required', 400);
  }

  const book = await Book.findById(bookId).select('_id');
  if (!book) throw new AppError('Book not found', 404);

  const chapter = await Chapter.create({
    bookId: book._id,
    chapterNumber: Number(chapterNumber),
    title: String(title).trim(),
    content: String(content).trim(),
    slug: slugify(String(title).trim() || `chapter-${chapterNumber}`, { lower: true, strict: true })
  });

  cache.flushAll();
  res.status(201).json({ success: true, chapter });
});

exports.getChapter = asyncHandler(async (req, res) => {
  const { slug, chapterSlug } = req.params;
  const key = cacheKey(['chapter', slug, chapterSlug]);
  const cached = cache.get(key);
  if (cached) return res.json(cached);

  const book = await Book.findOneAndUpdate(
    { slug },
    {
      $inc: { totalViews: 1, viewsLast24h: 1, viewsLast7d: 1 }
    },
    { new: true }
  ).lean();

  if (!book) throw new AppError('Book not found', 404);

  const chapter = await Chapter.findOneAndUpdate(
    { bookId: book._id, slug: chapterSlug },
    { $inc: { views: 1 } },
    { new: true }
  ).lean();

  if (!chapter) throw new AppError('Chapter not found', 404);

  const nextTrendingScore = book.viewsLast24h * 3 + book.viewsLast7d * 2 + book.totalViews;

  await Book.updateOne({ _id: book._id }, { $set: { trendingScore: nextTrendingScore } });

  const [previousChapter, nextChapter] = await Promise.all([
    Chapter.findOne({ bookId: book._id, chapterNumber: chapter.chapterNumber - 1 }).select('title slug chapterNumber').lean(),
    Chapter.findOne({ bookId: book._id, chapterNumber: chapter.chapterNumber + 1 }).select('title slug chapterNumber').lean()
  ]);

  const payload = { book: { ...book, trendingScore: nextTrendingScore }, chapter, previousChapter, nextChapter };
  cache.set(key, payload, 30);
  res.json(payload);
});
