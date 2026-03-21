const slugify = require('slugify');
const Book = require('../models/Book');
const Chapter = require('../models/Chapter');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { cache, cacheKey } = require('../utils/cache');
const { DEFAULT_LANGUAGE, normalizeLanguage } = require('../utils/language');


exports.createChapter = asyncHandler(async (req, res) => {
  const { bookId, chapterNumber, title, content } = req.body;

  if (!bookId || !chapterNumber || !title || !content) {
    throw new AppError('bookId, chapterNumber, title, and content are required', 400);
  }

  const book = await Book.findById(bookId).select('_id language');
  if (!book) throw new AppError('Book not found', 404);

  const baseSlug = slugify(String(title).trim() || `chapter-${chapterNumber}`, { lower: true, strict: true }) || `chapter-${chapterNumber}`;
  let slug = baseSlug;
  let suffix = 1;

  while (await Chapter.exists({ bookId: book._id, slug })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const chapter = await Chapter.create({
    bookId: book._id,
    language: book.language || DEFAULT_LANGUAGE,
    chapterNumber: Number(chapterNumber),
    title: String(title).trim(),
    content: String(content).trim(),
    slug
  });

  cache.flushAll();
  res.status(201).json({ success: true, chapter });
});

exports.getChapter = asyncHandler(async (req, res) => {
  const { slug, chapterSlug } = req.params;
  const requestedLanguage = normalizeLanguage(req.query.lang, DEFAULT_LANGUAGE);
  const key = cacheKey(['chapter', slug, chapterSlug, requestedLanguage]);
  const cached = cache.get(key);
  if (cached) return res.json(cached);

  const seedBook = await Book.findOne({ slug }).lean();
  if (!seedBook) throw new AppError('Book not found', 404);

  const activeBook = await Book.findOne({ groupId: seedBook.groupId || String(seedBook._id), language: requestedLanguage }).lean() || seedBook;
  const initialChapter = await Chapter.findOne({ bookId: seedBook._id, slug: chapterSlug }).lean();
  if (!initialChapter) throw new AppError('Chapter not found', 404);

  const chapter = await Chapter.findOneAndUpdate(
    activeBook._id.equals?.(seedBook._id) || String(activeBook._id) === String(seedBook._id)
      ? { bookId: activeBook._id, slug: chapterSlug }
      : { bookId: activeBook._id, chapterNumber: initialChapter.chapterNumber },
    { $inc: { views: 1 } },
    { new: true }
  ).lean();

  if (!chapter) throw new AppError('Chapter not found in the selected language', 404);

  const book = await Book.findOneAndUpdate(
    { _id: activeBook._id },
    {
      $inc: { totalViews: 1, viewsLast24h: 1, viewsLast7d: 1 }
    },
    { new: true }
  ).lean();

  const nextTrendingScore = book.viewsLast24h * 3 + book.viewsLast7d * 2 + book.totalViews;
  await Book.updateOne({ _id: book._id }, { $set: { trendingScore: nextTrendingScore } });

  const [previousChapter, nextChapter, chapters, translations] = await Promise.all([
    Chapter.findOne({ bookId: book._id, chapterNumber: chapter.chapterNumber - 1 }).select('title slug chapterNumber').lean(),
    Chapter.findOne({ bookId: book._id, chapterNumber: chapter.chapterNumber + 1 }).select('title slug chapterNumber').lean(),
    Chapter.find({ bookId: book._id }).sort({ chapterNumber: 1 }).select('title slug chapterNumber').lean(),
    Book.find({ groupId: book.groupId || String(book._id) }).sort({ language: 1 }).select('title slug language groupId').lean()
  ]);

  const payload = {
    book: { ...book, trendingScore: nextTrendingScore },
    chapter,
    chapters,
    previousChapter,
    nextChapter,
    translations,
    chapterNumber: chapter.chapterNumber
  };
  cache.set(key, payload, 30);
  res.json(payload);
});
