const slugify = require('slugify');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Book = require('../models/Book');
const Chapter = require('../models/Chapter');
const BlogPost = require('../models/BlogPost');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { cache } = require('../utils/cache');
const { DEFAULT_LANGUAGE, normalizeLanguage } = require('../utils/language');
const { applySharedSlugToBooks, buildSharedBookSlug, syncGroupBookSlugs } = require('../utils/bookSlug');
const { sanitizeHtml } = require('../utils/html');
const { uploadImageBuffer, deleteImageByPublicId } = require('../utils/cloudinaryAssets');

function generateSlug(value) {
  return slugify(String(value || ''), { lower: true, strict: true, trim: true });
}

async function resolveGroupId(groupId) {
  if (!groupId) return crypto.randomUUID();
  if (!mongoose.Types.ObjectId.isValid(groupId)) return String(groupId).trim();
  const existing = await Book.findById(groupId).select('groupId').lean();
  return existing?.groupId || String(groupId).trim();
}

function shouldRequireExistingGroup(language) {
  return normalizeLanguage(language, DEFAULT_LANGUAGE) !== DEFAULT_LANGUAGE;
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
  const language = normalizeLanguage(data.language, DEFAULT_LANGUAGE);
  if (shouldRequireExistingGroup(language) && !data.groupId) {
    throw new AppError('Translated books must be linked to an existing translation group', 400);
  }

  if (!req.file && !data.coverImage) {
    throw new AppError('Book cover image is required', 400);
  }

  const groupId = await resolveGroupId(data.groupId);
  const duplicateLanguage = await Book.findOne({ groupId, language }).lean();
  if (duplicateLanguage) {
    throw new AppError('This language already exists for the selected book group', 409);
  }

  let coverImage = data.coverImage;
  let coverImagePublicId = data.coverImagePublicId;

  if (req.file) {
    const upload = await uploadImageBuffer({ file: req.file, folder: 'readnovax/books' });
    coverImage = upload.secureUrl;
    coverImagePublicId = upload.publicId;
  }

  const slug = await buildSharedBookSlug({ groupId, title: data.title, language });
  const book = await Book.create({
    ...data,
    language,
    groupId,
    slug,
    coverImage,
    coverImagePublicId
  });

  await syncGroupBookSlugs(groupId, { title: data.title, language });
  const [sharedBook] = await applySharedSlugToBooks([book.toObject ? book.toObject() : book]);
  cache.flushAll();
  res.status(201).json(sharedBook || book);
});

exports.updateBook = asyncHandler(async (req, res) => {
  const existingBook = await Book.findById(req.params.bookId);
  if (!existingBook) throw new AppError('Book not found', 404);

  const data = req.body;
  const previousGroupId = existingBook.groupId || String(existingBook._id);
  const nextLanguage = normalizeLanguage(data.language, existingBook.language || DEFAULT_LANGUAGE);
  const nextGroupId = data.groupId ? await resolveGroupId(data.groupId) : previousGroupId;

  const duplicateLanguage = await Book.findOne({ groupId: nextGroupId, language: nextLanguage, _id: { $ne: existingBook._id } }).lean();
  if (duplicateLanguage) {
    throw new AppError('This language already exists for the selected book group', 409);
  }

  const nextTitle = data.title ? String(data.title).trim() : existingBook.title;
  data.slug = await buildSharedBookSlug({ groupId: nextGroupId, title: nextTitle, language: nextLanguage });
  data.language = nextLanguage;
  data.groupId = nextGroupId;

  if (req.file) {
    const upload = await uploadImageBuffer({ file: req.file, folder: 'readnovax/books' });
    data.coverImage = upload.secureUrl;
    data.coverImagePublicId = upload.publicId;
    await deleteImageByPublicId(existingBook.coverImagePublicId);
  }

  const book = await Book.findByIdAndUpdate(req.params.bookId, data, { new: true });
  await Chapter.updateMany({ bookId: book._id }, { $set: { language: book.language } });
  await syncGroupBookSlugs(nextGroupId, { title: nextTitle, language: nextLanguage });
  if (previousGroupId !== nextGroupId) {
    await syncGroupBookSlugs(previousGroupId);
  }

  const [sharedBook] = await applySharedSlugToBooks([book.toObject ? book.toObject() : book]);
  cache.flushAll();
  res.json(sharedBook || book);
});

exports.addChapter = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.bookId).select('_id language');
  if (!book) throw new AppError('Book not found', 404);

  let image;
  let imagePublicId;
  if (req.file) {
    const upload = await uploadImageBuffer({ file: req.file, folder: 'readnovax/chapters' });
    image = upload.secureUrl;
    imagePublicId = upload.publicId;
  }

  const chapter = await Chapter.create({
    ...req.body,
    bookId: book._id,
    language: book.language || DEFAULT_LANGUAGE,
    slug: generateSlug(req.body.title || `chapter-${req.body.chapterNumber}`),
    image,
    imagePublicId
  });

  cache.flushAll();
  res.status(201).json(chapter);
});

exports.getBlogs = asyncHandler(async (_req, res) => {
  const posts = await BlogPost.find()
    .sort({ publishedAt: -1, createdAt: -1 })
    .select('title slug description coverImage coverImagePublicId content contentHtml publishedAt updatedAt')
    .lean();

  res.json({ success: true, data: posts });
});

exports.createBlog = asyncHandler(async (req, res) => {
  const { title, description, coverImage, content, contentHtml } = req.body;

  if (!title || !description || !req.file || !(content || contentHtml)) {
    throw new AppError('title, description, cover image file, and content are required', 400);
  }

  const upload = await uploadImageBuffer({ file: req.file, folder: 'readnovax/blogs' });
  const slug = await ensureUniqueBlogSlug(title);
  const sanitizedHtml = sanitizeHtml(contentHtml || content);
  const post = await BlogPost.create({
    title: String(title).trim(),
    slug,
    description: String(description).trim(),
    coverImage: upload.secureUrl,
    coverImagePublicId: upload.publicId,
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

  if (req.file) {
    const upload = await uploadImageBuffer({ file: req.file, folder: 'readnovax/blogs' });
    await deleteImageByPublicId(post.coverImagePublicId);
    post.coverImage = upload.secureUrl;
    post.coverImagePublicId = upload.publicId;
  }

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
  const post = await BlogPost.findByIdAndDelete(req.params.blogId).select('_id coverImagePublicId');
  if (!post) throw new AppError('Blog post not found', 404);

  await deleteImageByPublicId(post.coverImagePublicId);

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
