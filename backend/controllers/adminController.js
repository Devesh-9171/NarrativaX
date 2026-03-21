const slugify = require('slugify');
const crypto = require('crypto');
const Book = require('../models/Book');
const Chapter = require('../models/Chapter');
const BlogPost = require('../models/BlogPost');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { cache } = require('../utils/cache');
const { DEFAULT_LANGUAGE, normalizeLanguage } = require('../utils/language');
const { sanitizeHtml } = require('../utils/html');

function generateSlug(value) {
  return slugify(String(value || ''), { lower: true, strict: true, trim: true });
}


async function resolveGroupId(groupId) {
  if (!groupId) return crypto.randomUUID();
  const existing = await Book.findById(groupId).select('groupId').lean();
  return existing?.groupId || String(groupId).trim();
}

async function ensureUniqueBlogSlug(title, excludeId) {
  const baseSlug = generateSlug(title);
  if (!baseSlug) throw new AppError('A valid blog title is required', 400);

  let slug = baseSlug;
  let counter = 1;

  while (
    await BlogPost.exists({
      slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {})
    })
  ) {
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
}

exports.createBook = asyncHandler(async (req, res) => {
  const data = req.body;
  const groupId = await resolveGroupId(data.groupId);
  const language = normalizeLanguage(data.language, DEFAULT_LANGUAGE);
  const duplicateLanguage = await Book.findOne({ groupId, language }).lean();
  if (duplicateLanguage) {
    throw new AppError('This language already exists for the selected book group', 409);
  }

  const book = await Book.create({
    ...data,
    language,
    groupId,
    slug: generateSlug(language === 'hi' ? `${data.title}-hi` : data.title),
    coverImage: req.file ? `/uploads/${req.file.filename}` : data.coverImage
  });

  cache.flushAll();
  res.status(201).json(book);
});

exports.updateBook = asyncHandler(async (req, res) => {
  const existingBook = await Book.findById(req.params.bookId);
  if (!existingBook) throw new AppError('Book not found', 404);

  const data = req.body;
  const nextLanguage = normalizeLanguage(data.language, existingBook.language || DEFAULT_LANGUAGE);
  const nextGroupId = data.groupId ? await resolveGroupId(data.groupId) : existingBook.groupId || String(existingBook._id);

  const duplicateLanguage = await Book.findOne({ groupId: nextGroupId, language: nextLanguage, _id: { $ne: existingBook._id } }).lean();
  if (duplicateLanguage) {
    throw new AppError('This language already exists for the selected book group', 409);
  }

  if (data.title) data.slug = generateSlug(nextLanguage === 'hi' ? `${data.title}-hi` : data.title);
  data.language = nextLanguage;
  data.groupId = nextGroupId;
  if (req.file) data.coverImage = `/uploads/${req.file.filename}`;

  const book = await Book.findByIdAndUpdate(req.params.bookId, data, { new: true });
  await Chapter.updateMany({ bookId: book._id }, { $set: { language: book.language } });

  cache.flushAll();
  res.json(book);
});

exports.addChapter = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.bookId).select('_id language');
  if (!book) throw new AppError('Book not found', 404);

  const chapter = await Chapter.create({
    ...req.body,
    bookId: book._id,
    language: book.language || DEFAULT_LANGUAGE,
    slug: generateSlug(req.body.title || `chapter-${req.body.chapterNumber}`)
  });

  cache.flushAll();
  res.status(201).json(chapter);
});

exports.getBlogs = asyncHandler(async (_req, res) => {
  const posts = await BlogPost.find()
    .sort({ publishedAt: -1, createdAt: -1 })
    .select('title slug description coverImage content contentHtml publishedAt updatedAt')
    .lean();

  res.json({ success: true, data: posts });
});

exports.createBlog = asyncHandler(async (req, res) => {
  const { title, description, coverImage, content, contentHtml } = req.body;

  if (!title || !description || !coverImage || !(content || contentHtml)) {
    throw new AppError('title, description, coverImage, and content are required', 400);
  }

  const slug = await ensureUniqueBlogSlug(title);
  const sanitizedHtml = sanitizeHtml(contentHtml || content);
  const post = await BlogPost.create({
    title: String(title).trim(),
    slug,
    description: String(description).trim(),
    coverImage: String(coverImage).trim(),
    content: String(content || '').trim(),
    contentHtml: sanitizedHtml,
    publishedAt: new Date()
  });

  cache.flushAll();
  res.status(201).json({ success: true, post });
});

exports.updateBlog = asyncHandler(async (req, res) => {
  const post = await BlogPost.findById(req.params.blogId);
  if (!post) throw new AppError('Blog post not found', 404);

  const { title, description, coverImage, content, contentHtml } = req.body;
  const nextTitle = title ? String(title).trim() : post.title;

  post.title = nextTitle;
  post.slug = await ensureUniqueBlogSlug(nextTitle, post._id);
  if (description) post.description = String(description).trim();
  if (coverImage) post.coverImage = String(coverImage).trim();
  if (typeof content !== 'undefined') post.content = String(content).trim();
  if (typeof contentHtml !== 'undefined' || typeof content !== 'undefined') {
    post.contentHtml = sanitizeHtml(contentHtml || content);
  }
  post.publishedAt = new Date();

  await post.save();
  cache.flushAll();

  res.json({ success: true, post });
});

exports.deleteBlog = asyncHandler(async (req, res) => {
  const post = await BlogPost.findByIdAndDelete(req.params.blogId).select('_id');
  if (!post) throw new AppError('Blog post not found', 404);

  cache.flushAll();
  res.json({ success: true, message: 'Blog post deleted' });
});

exports.dashboardStats = asyncHandler(async (_req, res) => {
  const [totalBooks, totalChapters, totalBlogs, totalViews, topBooks] = await Promise.all([
    Book.countDocuments(),
    Chapter.countDocuments(),
    BlogPost.countDocuments(),
    Book.aggregate([{ $group: { _id: null, views: { $sum: '$totalViews' } } }]),
    Book.find().sort({ totalViews: -1 }).limit(5).select('title slug totalViews rating category language').lean()
  ]);

  res.json({
    totalBooks,
    totalChapters,
    totalBlogs,
    totalViews: totalViews[0]?.views || 0,
    topBooks
  });
});
