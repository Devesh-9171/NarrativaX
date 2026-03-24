const slugify = require('slugify');
const Book = require('../models/Book');
const Chapter = require('../models/Chapter');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { cache, cacheKey } = require('../utils/cache');
const { DEFAULT_LANGUAGE, normalizeLanguage } = require('../utils/language');
const { applySharedSlugToBooks } = require('../utils/bookSlug');
const { uploadImageBuffer } = require('../utils/cloudinaryAssets');

function parseTags(inputTags) {
  if (Array.isArray(inputTags)) {
    return inputTags.map((tag) => String(tag || '').replace(/^#/, '').trim().toLowerCase()).filter(Boolean);
  }

  return String(inputTags || '')
    .split(',')
    .map((tag) => tag.replace(/^#/, '').trim().toLowerCase())
    .filter(Boolean);
}

exports.createChapter = asyncHandler(async (req, res) => {
  const { bookId, chapterNumber, title, content } = req.body;

  if (!bookId || !chapterNumber || !title || !content) {
    throw new AppError('bookId, chapterNumber, title, and content are required', 400);
  }

  const book = await Book.findById(bookId).select('_id language status contentType');
  if (!book) throw new AppError('Book not found', 404);
  if (book.contentType === 'short_story') {
    throw new AppError('Short stories are single-page content and cannot have chapters', 400);
  }

  const baseSlug = slugify(String(title).trim() || `chapter-${chapterNumber}`, { lower: true, strict: true }) || `chapter-${chapterNumber}`;
  let slug = baseSlug;
  let suffix = 1;

  while (await Chapter.exists({ bookId: book._id, slug })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  let image;
  let imagePublicId;

  if (req.file) {
    const upload = await uploadImageBuffer({ file: req.file, folder: 'readnovax/chapters' });
    image = upload.secureUrl;
    imagePublicId = upload.publicId;
  }

  const chapter = await Chapter.create({
    bookId: book._id,
    language: book.language || DEFAULT_LANGUAGE,
    chapterNumber: Number(chapterNumber),
    title: String(title).trim(),
    content: String(content).trim(),
    slug,
    image,
    imagePublicId
  });

  const readingTimeMinutes = Math.max(1, Math.ceil(String(content).trim().split(/\s+/).length / 220));
  await Book.updateOne({ _id: book._id }, { $set: { readingTimeMinutes } });

  cache.flushAll();
  res.status(201).json({ success: true, chapter });
});

exports.getChapter = asyncHandler(async (req, res) => {
  const { slug, chapterSlug } = req.params;
  const requestedLanguage = normalizeLanguage(req.query.lang, DEFAULT_LANGUAGE);
  const key = cacheKey(['chapter', slug, chapterSlug, requestedLanguage]);
  const cached = cache.get(key);
  if (cached) return res.json(cached);

  const seedBook = await Book.findOne({ slug, status: 'published' }).lean();
  if (!seedBook) throw new AppError('Book not found', 404);

  const activeBook = await Book.findOne({
    groupId: seedBook.groupId || String(seedBook._id),
    language: requestedLanguage,
    status: 'published'
  }).lean() || seedBook;

  const initialChapter = await Chapter.findOne({ bookId: seedBook._id, slug: chapterSlug }).lean();
  if (!initialChapter) throw new AppError('Chapter not found', 404);

  const chapter = await Chapter.findOne(
    activeBook._id.equals?.(seedBook._id) || String(activeBook._id) === String(seedBook._id)
      ? { bookId: activeBook._id, slug: chapterSlug }
      : { bookId: activeBook._id, chapterNumber: initialChapter.chapterNumber }
  ).lean();

  if (!chapter) throw new AppError('Chapter not found in the selected language', 404);

  const book = activeBook;

  const translationBooks = await Book.find({ groupId: book.groupId || String(book._id), status: 'published' })
    .sort({ language: 1 })
    .select('title slug language groupId')
    .lean();

  const translationChapterDocs = await Chapter.find({
    bookId: { $in: translationBooks.map((translationBook) => translationBook._id) },
    chapterNumber: chapter.chapterNumber
  })
    .select('bookId slug chapterNumber updatedAt')
    .lean();

  const chapterByBookId = new Map(translationChapterDocs.map((translationChapter) => [String(translationChapter.bookId), translationChapter]));

  const [previousChapter, nextChapter, chapters] = await Promise.all([
    Chapter.findOne({ bookId: book._id, chapterNumber: chapter.chapterNumber - 1 }).select('title slug chapterNumber').lean(),
    Chapter.findOne({ bookId: book._id, chapterNumber: chapter.chapterNumber + 1 }).select('title slug chapterNumber').lean(),
    Chapter.find({ bookId: book._id }).sort({ chapterNumber: 1 }).select('title slug chapterNumber').lean()
  ]);

  const [sharedBook] = await applySharedSlugToBooks([book]);
  const sharedTranslations = await applySharedSlugToBooks(translationBooks);
  const chapterTranslations = sharedTranslations
    .map((translation) => {
      const translatedChapter = chapterByBookId.get(String(translation._id));
      if (!translatedChapter) return null;
      return {
        language: translation.language,
        bookSlug: translation.slug,
        chapterSlug: translatedChapter.slug,
        chapterNumber: translatedChapter.chapterNumber,
        updatedAt: translatedChapter.updatedAt
      };
    })
    .filter(Boolean);

  let similarBooks = [];
  if ((sharedBook?.tags || []).length > 0) {
    similarBooks = await Book.find({
      _id: { $ne: book._id },
      groupId: { $ne: book.groupId },
      status: 'published',
      tags: { $in: sharedBook.tags }
    })
      .sort({ totalViews: -1, updatedAt: -1 })
      .limit(5)
      .select('title slug coverImage tags language')
      .lean();

    similarBooks = await applySharedSlugToBooks(similarBooks);
  }

  const payload = {
    book: sharedBook || book,
    chapter,
    chapters,
    previousChapter,
    nextChapter,
    translations: sharedTranslations,
    chapterTranslations,
    chapterNumber: chapter.chapterNumber,
    similarBooks
  };
  cache.set(key, payload, 30);
  res.json(payload);
});

exports.completeChapterView = asyncHandler(async (req, res) => {
  const { chapterId, progress = 100, status = 'read', tags, contentType, readingTimeMinutes } = req.body;
  if (!chapterId) throw new AppError('chapterId is required', 400);
  if (Number(progress) < 100 || status === 'skipped') {
    return res.json({ success: true, message: 'Partial or skipped read not counted as a view' });
  }

  const chapter = await Chapter.findById(chapterId).select('_id bookId');
  if (!chapter) throw new AppError('Chapter not found', 404);

  const book = await Book.findById(chapter.bookId).select('_id totalViews viewsLast24h viewsLast7d tags contentType readingTimeMinutes status');
  if (!book || book.status !== 'published') throw new AppError('Book not found', 404);

  const incPayload = { totalViews: 1, viewsLast24h: 1, viewsLast7d: 1 };
  const normalizedTags = parseTags(tags);
  const updateBookPayload = {
    $inc: incPayload,
    $set: {
      trendingScore: (book.viewsLast24h + 1) * 3 + (book.viewsLast7d + 1) * 2 + (book.totalViews + 1),
      contentType: contentType || book.contentType || 'long_story',
      readingTimeMinutes: Number(readingTimeMinutes) > 0 ? Number(readingTimeMinutes) : book.readingTimeMinutes
    }
  };

  if (normalizedTags.length > 0) {
    updateBookPayload.$set.tags = normalizedTags;
  }

  await Promise.all([
    Chapter.updateOne({ _id: chapter._id }, { $inc: { views: 1 } }),
    Book.updateOne({ _id: book._id }, updateBookPayload)
  ]);

  if (req.user?.id) {
    const user = await User.findById(req.user.id);
    if (user) {
      const existing = user.readingHistory.find((item) => String(item.chapterId) === String(chapter._id));
      if (existing) {
        existing.progress = Number(progress) || 100;
        existing.status = status === 'skipped' ? 'skipped' : 'read';
        existing.lastReadAt = new Date();
        existing.completedAt = new Date();
        existing.bookId = chapter.bookId;
      } else {
        user.readingHistory.push({
          bookId: chapter.bookId,
          chapterId: chapter._id,
          progress: Number(progress) || 100,
          status: status === 'skipped' ? 'skipped' : 'read',
          completedAt: new Date(),
          lastReadAt: new Date()
        });
      }
      await user.save();
    }
  }

  cache.flushAll();
  res.json({ success: true, message: 'Completed view tracked' });
});
