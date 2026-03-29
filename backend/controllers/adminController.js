const slugify = require('slugify');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Book = require('../models/Book');
const Chapter = require('../models/Chapter');
const BlogPost = require('../models/BlogPost');
const ShortStory = require('../models/ShortStory');
const User = require('../models/User');
const Payment = require('../models/Payment');
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

function parseTags(inputTags) {
  if (Array.isArray(inputTags)) {
    return inputTags.map((tag) => String(tag || '').replace(/^#/, '').trim().toLowerCase()).filter(Boolean);
  }

  return String(inputTags || '')
    .split(',')
    .map((tag) => tag.replace(/^#/, '').trim().toLowerCase())
    .filter(Boolean);
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
  return false;
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
  while (await BlogPost.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
}

exports.createBook = asyncHandler(async (req, res) => {
  const data = req.body;
  const language = normalizeLanguage(data.language, DEFAULT_LANGUAGE);
  if (shouldRequireExistingGroup(language) && !data.groupId) throw new AppError('Translated books must be linked to an existing translation group', 400);
  if (!req.file && !data.coverImage) throw new AppError('Book cover image is required', 400);

  const normalizedTags = parseTags(data.tags);
  if (normalizedTags.length === 0) throw new AppError('At least one tag is required', 400);

  const groupId = await resolveGroupId(data.groupId);
  const duplicateLanguage = await Book.findOne({ groupId, language }).lean();
  if (duplicateLanguage) throw new AppError('This language already exists for the selected book group', 409);

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
    tags: normalizedTags,
    contentType: data.contentType === 'short_story' ? 'short_story' : 'long_story',
    status: ['review', 'published', 'rejected'].includes(data.status) ? data.status : 'published',
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
  if (duplicateLanguage) throw new AppError('This language already exists for the selected book group', 409);

  const nextTitle = data.title ? String(data.title).trim() : existingBook.title;
  data.slug = await buildSharedBookSlug({ groupId: nextGroupId, title: nextTitle, language: nextLanguage });
  data.language = nextLanguage;
  data.groupId = nextGroupId;
  if (typeof data.tags !== 'undefined') {
    const parsedTags = parseTags(data.tags);
    if (parsedTags.length === 0) throw new AppError('At least one tag is required', 400);
    data.tags = parsedTags;
  }

  if (req.file) {
    const upload = await uploadImageBuffer({ file: req.file, folder: 'readnovax/books' });
    data.coverImage = upload.secureUrl;
    data.coverImagePublicId = upload.publicId;
    await deleteImageByPublicId(existingBook.coverImagePublicId);
  }

  const book = await Book.findByIdAndUpdate(req.params.bookId, data, { new: true });
  await Chapter.updateMany({ bookId: book._id }, { $set: { language: book.language } });
  await syncGroupBookSlugs(nextGroupId, { title: nextTitle, language: nextLanguage });
  if (previousGroupId !== nextGroupId) await syncGroupBookSlugs(previousGroupId);

  const [sharedBook] = await applySharedSlugToBooks([book.toObject ? book.toObject() : book]);
  cache.flushAll();
  res.json(sharedBook || book);
});

exports.addChapter = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.bookId).select('_id language');
  if (!book) throw new AppError('Book not found', 404);
  const isFinalChapter = parseBoolean(req.body.isFinalChapter);

  let image;
  let imagePublicId;
  if (req.file) {
    const upload = await uploadImageBuffer({ file: req.file, folder: 'readnovax/chapters' });
    image = upload.secureUrl;
    imagePublicId = upload.publicId;
  }

  if (isFinalChapter) {
    await Chapter.updateMany({ bookId: book._id, isFinalChapter: true }, { $set: { isFinalChapter: false } });
  }

  const chapter = await Chapter.create({
    ...req.body,
    bookId: book._id,
    language: book.language || DEFAULT_LANGUAGE,
    slug: generateSlug(req.body.title || `chapter-${req.body.chapterNumber}`),
    isFinalChapter,
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
  const [totalBooks, totalShortStories, totalChapters, totalBlogs, totalViews, topBooks, authorRequests, reviewQueue] = await Promise.all([
    Book.countDocuments(),
    ShortStory.countDocuments(),
    Chapter.countDocuments(),
    BlogPost.countDocuments(),
    Book.aggregate([{ $group: { _id: null, views: { $sum: '$totalViews' } } }]),
    Book.find().sort({ totalViews: -1 }).limit(5).select('title slug totalViews rating category language').lean(),
    User.countDocuments({ authorStatus: 'pending' }),
    Book.countDocuments({ status: 'review' })
  ]);

  res.json({
    totalBooks: totalBooks + totalShortStories,
    totalLongStories: totalBooks,
    totalShortStories,
    totalChapters,
    totalBlogs,
    totalViews: totalViews[0]?.views || 0,
    authorRequests,
    reviewQueue,
    topBooks
  });
});

exports.getAuthorRequests = asyncHandler(async (_req, res) => {
  const requests = await User.find({ authorStatus: 'pending' })
    .sort({ updatedAt: 1 })
    .select('name email authorStatus authorProfile createdAt updatedAt')
    .lean();

  res.json({ success: true, data: requests });
});

function normalizeMoney(value) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function normalizeCount(value) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

function getCurrentMonthMetadata(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const monthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date);

  return {
    monthKey: `${year}-${month}`,
    monthLabel
  };
}

exports.getAuthorAnalytics = asyncHandler(async (_req, res) => {
  const authors = await User.find({
    $or: [{ role: 'author' }, { authorStatus: 'approved' }]
  })
    .sort({ updatedAt: -1 })
    .select('name email monthlyViews lifetimeViews totalPaidAmount authorProfile updatedAt')
    .lean();

  const authorIds = authors.map((author) => author._id);
  const payments = authorIds.length > 0
    ? await Payment.find({ authorId: { $in: authorIds } })
      .sort({ paidAt: -1 })
      .select('authorId month monthlyViews amount status paidAt')
      .lean()
    : [];

  const paymentMap = payments.reduce((accumulator, payment) => {
    const key = String(payment.authorId);
    if (!accumulator[key]) accumulator[key] = [];
    accumulator[key].push({
      _id: payment._id,
      month: payment.month,
      monthlyViews: normalizeCount(Number(payment.monthlyViews)),
      amount: normalizeMoney(Number(payment.amount)),
      status: payment.status,
      paidAt: payment.paidAt
    });
    return accumulator;
  }, {});

  const data = authors.map((author) => ({
    ...author,
    monthlyViews: normalizeCount(Number(author.monthlyViews)),
    lifetimeViews: normalizeCount(Number(author.lifetimeViews)),
    totalPaidAmount: normalizeMoney(Number(author.totalPaidAmount)),
    paymentHistory: paymentMap[String(author._id)] || [],
    authorProfile: {
      upiId: author.authorProfile?.upiId || '',
      bankDetails: author.authorProfile?.bankDetails || '',
      internationalPayment: author.authorProfile?.internationalPayment || ''
    }
  }));

  res.json({ success: true, data });
});

exports.markAuthorPaymentAsPaid = asyncHandler(async (req, res) => {
  const { amount } = req.body || {};
  const normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new AppError('Amount must be greater than 0', 400);
  }

  const author = await User.findOne({
    _id: req.params.authorId,
    $or: [{ role: 'author' }, { authorStatus: 'approved' }]
  }).select('_id monthlyViews totalPaidAmount paymentRecords');

  if (!author) throw new AppError('Author not found', 404);

  const { monthKey, monthLabel } = getCurrentMonthMetadata();
  const existingPayment = await Payment.findOne({ authorId: author._id, monthKey }).select('_id').lean();
  if (existingPayment) {
    throw new AppError(`Payment already exists for ${monthLabel}`, 409);
  }

  const paidAt = new Date();
  const monthlyViews = normalizeCount(Number(author.monthlyViews));
  const payment = await Payment.create({
    authorId: author._id,
    month: monthLabel,
    monthKey,
    monthlyViews,
    amount: normalizedAmount,
    status: 'paid',
    paidAt
  });

  author.totalPaidAmount = normalizeMoney(Number(author.totalPaidAmount)) + normalizedAmount;
  author.paymentRecords = [
    ...(author.paymentRecords || []),
    {
      amount: normalizedAmount,
      paidAt,
      note: `Manual payout for ${monthLabel}`,
      reference: `payment:${payment._id}`
    }
  ];
  await author.save();

  res.status(201).json({
    success: true,
    message: 'Payment marked as paid',
    data: {
      payment: {
        _id: payment._id,
        authorId: payment.authorId,
        month: payment.month,
        monthlyViews: payment.monthlyViews,
        amount: payment.amount,
        status: payment.status,
        paidAt: payment.paidAt
      },
      totalPaidAmount: author.totalPaidAmount
    }
  });
});

exports.getAuthorPaymentHistory = asyncHandler(async (req, res) => {
  const author = await User.findOne({
    _id: req.params.authorId,
    $or: [{ role: 'author' }, { authorStatus: 'approved' }]
  })
    .select('_id')
    .lean();

  if (!author) throw new AppError('Author not found', 404);

  const data = await Payment.find({ authorId: author._id })
    .sort({ paidAt: -1 })
    .select('month monthlyViews amount status paidAt')
    .lean();

  res.json({ success: true, data });
});

exports.reviewAuthorRequest = asyncHandler(async (req, res) => {
  const { action } = req.body;
  const user = await User.findById(req.params.userId);
  if (!user) throw new AppError('User not found', 404);

  if (action === 'approve') {
    if (!user.authorTermsAcceptance?.acceptedTerms) {
      throw new AppError('You must accept Terms & Conditions to become an author', 400);
    }
    user.authorStatus = 'approved';
    user.role = 'author';
  } else if (action === 'reject') {
    user.authorStatus = 'rejected';
    user.role = 'user';
  } else {
    throw new AppError('action must be approve or reject', 400);
  }

  await user.save();
  res.json({ success: true, userId: user._id, role: user.role, authorStatus: user.authorStatus });
});

exports.getReviewQueue = asyncHandler(async (_req, res) => {
  const bookItems = await Book.find({ status: 'review' })
    .sort({ updatedAt: 1 })
    .select('title author slug contentType tags status language updatedAt')
    .lean();
  const shortStoryItems = await ShortStory.find({ status: 'review' })
    .sort({ updatedAt: 1 })
    .select('title tags status updatedAt')
    .lean();

  const items = [
    ...bookItems.map((item) => ({ ...item, reviewType: 'book' })),
    ...shortStoryItems.map((item) => ({ ...item, reviewType: 'short_story', contentType: 'short_story', author: 'Author upload', language: 'en' }))
  ].sort((left, right) => new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime());

  res.json({ success: true, data: items });
});

exports.reviewContent = asyncHandler(async (req, res) => {
  const { status, rejectionReason, reviewType = 'book' } = req.body;
  if (!['published', 'rejected', 'review'].includes(status)) {
    throw new AppError('status must be review, published, or rejected', 400);
  }

  const model = reviewType === 'short_story' ? ShortStory : Book;
  const content = await model.findByIdAndUpdate(
    req.params.bookId,
    {
      status,
      rejectionReason: status === 'rejected' ? String(rejectionReason || 'Rejected by admin').trim() : '',
      ...(status === 'published' ? { publishedAt: new Date() } : {})
    },
    { new: true }
  );

  if (!content) throw new AppError('Content not found', 404);
  cache.flushAll();
  res.json({ success: true, data: content });
});

exports.markBookFinished = asyncHandler(async (req, res) => {
  const book = await Book.findByIdAndUpdate(
    req.params.bookId,
    { isCompleted: true, completedAt: new Date() },
    { new: true }
  ).select('title slug isCompleted completedAt');

  if (!book) throw new AppError('Book not found', 404);
  cache.flushAll();
  res.json({ success: true, data: book });
});

exports.getTranslationStats = asyncHandler(async (_req, res) => {
  const books = await Book.find().select('title groupId language').lean();
  const chapters = await Chapter.find().select('bookId').lean();

  const chaptersByBookId = new Map();
  for (const chapter of chapters) {
    const key = String(chapter.bookId);
    chaptersByBookId.set(key, (chaptersByBookId.get(key) || 0) + 1);
  }

  const groups = new Map();
  for (const book of books) {
    const groupKey = book.groupId || String(book._id);
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(book);
  }

  const data = Array.from(groups.values()).map((variants) => {
    const base = variants[0];
    const chapterCounts = variants.map((variant) => chaptersByBookId.get(String(variant._id)) || 0);
    const totalChapters = Math.max(...chapterCounts, 0);
    const translatedChapters = Math.min(...chapterCounts, 0);
    const pendingChapters = Math.max(totalChapters - translatedChapters, 0);
    const status = totalChapters === 0 ? 'Not started' : pendingChapters === 0 ? 'Completed' : 'Partial';

    return {
      groupId: base.groupId || String(base._id),
      title: base.title,
      totalChapters,
      translatedChapters,
      pendingChapters,
      status
    };
  });

  res.json({ success: true, data });
});
