const User = require('../models/User');
const Book = require('../models/Book');
const ShortStory = require('../models/ShortStory');
const Chapter = require('../models/Chapter');
const ReadingProgress = require('../models/ReadingProgress');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('bookmarks')
    .populate('favoriteBooks')
    .populate('readingHistory.bookId readingHistory.chapterId');

  if (!user) throw new AppError('User not found', 404);
  res.json(user);
});

exports.toggleBookmark = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('User not found', 404);

  const chapterId = req.params.chapterId;
  const index = user.bookmarks.findIndex((id) => id.toString() === chapterId);
  if (index >= 0) user.bookmarks.splice(index, 1);
  else user.bookmarks.push(chapterId);

  await user.save();
  res.json({ bookmarks: user.bookmarks });
});

exports.toggleFavoriteBook = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('User not found', 404);

  const bookId = req.params.bookId;
  const index = user.favoriteBooks.findIndex((id) => id.toString() === bookId);
  if (index >= 0) user.favoriteBooks.splice(index, 1);
  else user.favoriteBooks.push(bookId);

  await user.save();
  res.json({ favoriteBooks: user.favoriteBooks });
});

exports.saveReadingProgress = asyncHandler(async (req, res) => {
  const { bookId, chapterId, progress, status } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('User not found', 404);

  const existing = user.readingHistory.find((item) => item.chapterId.toString() === chapterId);

  if (existing) {
    existing.progress = progress;
    existing.status = status === 'skipped' ? 'skipped' : 'read';
    existing.lastReadAt = new Date();
    if (Number(progress) >= 100) existing.completedAt = new Date();
  } else {
    user.readingHistory.push({
      bookId,
      chapterId,
      progress,
      status: status === 'skipped' ? 'skipped' : 'read',
      completedAt: Number(progress) >= 100 ? new Date() : undefined
    });
  }

  await user.save();
  res.json({ readingHistory: user.readingHistory });
});

exports.requestAuthorRole = asyncHandler(async (req, res) => {
  const { fullName, penName, bio, agreeToTerms } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('User not found', 404);

  if (!user.isEmailVerified) {
    throw new AppError('Please verify your email before applying as author', 400);
  }

  if (!fullName || !penName) {
    throw new AppError('fullName and penName are required', 400);
  }

  const hasAcceptedTerms = agreeToTerms === true || String(agreeToTerms).trim().toLowerCase() === 'true';
  if (!hasAcceptedTerms) {
    throw new AppError('Terms not accepted', 400);
  }

  user.authorStatus = 'pending';
  user.authorProfile = {
    ...user.authorProfile,
    fullName: String(fullName).trim(),
    penName: String(penName).trim(),
    bio: String(bio || '').trim()
  };
  user.authorTermsAcceptance = {
    userId: user._id,
    acceptedTerms: true,
    acceptedAt: new Date()
  };

  await user.save();
  res.json({ success: true, authorStatus: user.authorStatus });
});

exports.updateAuthorPaymentDetails = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('User not found', 404);

  const isAuthor = user.role === 'author' || ['pending', 'approved'].includes(user.authorStatus);
  if (!isAuthor) throw new AppError('Only authors can update payment details', 403);

  const { upiId, bankDetails, internationalPayment } = req.body || {};
  if (!user.authorProfile) user.authorProfile = {};

  user.authorProfile.upiId = String(upiId || '').trim();
  user.authorProfile.bankDetails = String(bankDetails || '').trim();
  user.authorProfile.internationalPayment = String(internationalPayment || '').trim();

  await user.save();

  res.json({
    success: true,
    paymentDetails: {
      upiId: user.authorProfile.upiId || '',
      bankDetails: user.authorProfile.bankDetails || '',
      internationalPayment: user.authorProfile.internationalPayment || ''
    }
  });
});

exports.enableTranslationPermission = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('User not found', 404);

  if (!user.authorProfile) user.authorProfile = {};
  if (!user.authorProfile.translationPermissionGrantedAt) {
    user.authorProfile.translationPermissionGrantedAt = new Date();
    await user.save();
  }

  res.json({
    success: true,
    translationPermissionGrantedAt: user.authorProfile.translationPermissionGrantedAt
  });
});

exports.getMyContent = asyncHandler(async (req, res) => {
  const books = await Book.find({ authorUserId: req.user.id })
    .sort({ updatedAt: -1 })
    .select('title slug status contentType tags isCompleted language groupId updatedAt totalViews')
    .lean();
  const shortStories = await ShortStory.find({ authorId: req.user.id })
    .sort({ updatedAt: -1 })
    .select('title status language groupId updatedAt views')
    .lean();

  res.json({ success: true, data: books, shortStories });
});


exports.upsertReadingProgress = asyncHandler(async (req, res) => {
  const { bookId, chapterId, chapterNumber } = req.body || {};

  if (!bookId || !chapterId || !Number.isFinite(Number(chapterNumber))) {
    throw new AppError('bookId, chapterId and chapterNumber are required', 400);
  }

  const chapter = await Chapter.findOne({ _id: chapterId, bookId }).select('_id chapterNumber');
  if (!chapter) throw new AppError('Chapter not found for this book', 404);

  const progress = await ReadingProgress.findOneAndUpdate(
    { userId: req.user.id, bookId },
    {
      userId: req.user.id,
      bookId,
      chapterId: chapter._id,
      chapterNumber: chapter.chapterNumber || Number(chapterNumber)
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  res.json({ success: true, data: progress });
});

exports.getBookReadingProgress = asyncHandler(async (req, res) => {
  const progress = await ReadingProgress.findOne({ userId: req.user.id, bookId: req.params.bookId })
    .select('userId bookId chapterId chapterNumber updatedAt')
    .lean();

  res.json({ success: true, data: progress || null });
});

exports.getContinueReading = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 5, 1), 10);

  const entries = await ReadingProgress.find({ userId: req.user.id })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate({ path: 'bookId', select: 'title slug coverImage language contentType status' })
    .populate({ path: 'chapterId', select: 'slug title chapterNumber' })
    .lean();

  const filtered = entries.filter((item) => item.bookId && item.bookId.contentType !== 'short_story' && item.bookId.status === 'published');

  const payload = await Promise.all(filtered.map(async (item) => {
    let chapter = item.chapterId;

    if (!chapter) {
      chapter = await Chapter.findOne({ bookId: item.bookId._id }).sort({ chapterNumber: 1 }).select('slug title chapterNumber').lean();
    }

    if (!chapter) return null;

    return {
      bookId: item.bookId._id,
      bookTitle: item.bookId.title,
      bookSlug: item.bookId.slug,
      bookCoverImage: item.bookId.coverImage,
      language: item.bookId.language,
      chapterId: chapter._id,
      chapterSlug: chapter.slug,
      chapterTitle: chapter.title,
      chapterNumber: chapter.chapterNumber,
      updatedAt: item.updatedAt
    };
  }));

  res.json({ success: true, data: payload.filter(Boolean) });
});
