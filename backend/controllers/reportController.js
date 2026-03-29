const mongoose = require('mongoose');
const Report = require('../models/Report');
const Book = require('../models/Book');
const Chapter = require('../models/Chapter');
const ShortStory = require('../models/ShortStory');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const REPORT_TYPES = ['Copied / Plagiarism', 'Spam / Low Quality', 'Offensive Content', 'Other'];

function isValidEmail(value) {
  return /^\S+@\S+\.\S+$/.test(String(value || '').trim());
}

exports.createReport = asyncHandler(async (req, res) => {
  const { contentId, contentType, reportType } = req.body || {};
  const normalizedEmail = String(req.body?.email || req.user?.email || '').trim().toLowerCase();
  const description = String(req.body?.description || '').trim();
  const isGuest = !req.user?._id;

  if (!contentId || !mongoose.Types.ObjectId.isValid(contentId)) {
    throw new AppError('Valid contentId is required', 400);
  }

  if (!['shortStory', 'chapter', 'book'].includes(contentType)) {
    throw new AppError('Valid contentType is required', 400);
  }

  if (!REPORT_TYPES.includes(reportType)) {
    throw new AppError('Valid report type is required', 400);
  }

  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    throw new AppError('Email is required', 400);
  }

  if (isGuest && !description) {
    throw new AppError('Description is required for guest reports', 400);
  }

  await Report.create({
    contentId,
    contentType,
    reportType,
    email: normalizedEmail,
    description
  });

  res.status(201).json({ success: true, message: 'Report submitted successfully' });
});

async function resolveReportContent(report) {
  if (report.contentType === 'shortStory') {
    const story = await ShortStory.findById(report.contentId).select('title slug').lean();
    return {
      contentTitle: story?.title || 'Removed short story',
      contentPath: story ? `/short-stories/${story.slug || ''}` : ''
    };
  }

  if (report.contentType === 'chapter') {
    const chapter = await Chapter.findById(report.contentId).select('title slug bookId').lean();
    if (!chapter) return { contentTitle: 'Removed chapter', contentPath: '' };
    const book = await Book.findById(chapter.bookId).select('slug').lean();
    return {
      contentTitle: chapter.title,
      contentPath: book ? `/book/${book.slug}/${chapter.slug}` : ''
    };
  }

  const book = await Book.findById(report.contentId).select('title slug').lean();
  return {
    contentTitle: book?.title || 'Removed book',
    contentPath: book ? `/book/${book.slug}` : ''
  };
}

exports.getReports = asyncHandler(async (_req, res) => {
  const reports = await Report.find().sort({ createdAt: -1 }).lean();
  const data = await Promise.all(
    reports.map(async (report) => {
      const content = await resolveReportContent(report);
      return {
        ...report,
        ...content
      };
    })
  );

  res.json({ success: true, data });
});
