const ShortStory = require('../models/ShortStory');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { uploadImageBuffer } = require('../utils/cloudinaryAssets');

function countWords(content = '') {
  return String(content).trim().split(/\s+/).filter(Boolean).length;
}

function parseTags(tags) {
  if (Array.isArray(tags)) return tags.map((tag) => String(tag || '').trim().toLowerCase()).filter(Boolean);
  return String(tags || '').split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean);
}

exports.createShortStory = asyncHandler(async (req, res) => {
  const { title, coverImage, description, content, tags } = req.body;
  if (!title || (!coverImage && !req.file) || !description || !content) {
    throw new AppError('title, coverImage, description, and content are required', 400);
  }
  if (countWords(description) > 50) throw new AppError('Description must be 50 words or fewer', 400);

  const normalizedTags = Array.from(new Set(parseTags(tags)));
  if (normalizedTags.length > 3) throw new AppError('Short stories support max 3 tags', 400);

  const author = await User.findById(req.user.id).select('name authorStatus role').lean();
  if (!author || author.role !== 'author' || author.authorStatus !== 'approved') {
    throw new AppError('Only approved authors can upload short stories', 403);
  }

  let resolvedCoverImage = String(coverImage || '').trim();
  let coverImagePublicId = '';
  if (req.file) {
    const upload = await uploadImageBuffer({ file: req.file, folder: 'readnovax/short-stories' });
    resolvedCoverImage = upload.secureUrl;
    coverImagePublicId = upload.publicId;
  }

  const words = countWords(content);
  const story = await ShortStory.create({
    title: String(title).trim(),
    coverImage: resolvedCoverImage,
    coverImagePublicId,
    description: String(description).trim(),
    content: String(content).trim(),
    tags: normalizedTags,
    authorId: req.user._id || req.user.id,
    authorName: String(author.name || req.user?.name || 'ReadNovaX Editorial').trim(),
    status: 'review',
    wordCount: words,
    readingTime: Math.max(1, Math.ceil(words / 220))
  });

  res.status(201).json({ success: true, data: story });
});

exports.getPublishedShortStory = asyncHandler(async (req, res) => {
  const story = await ShortStory.findOne({ _id: req.params.id, status: 'published' }).lean();
  if (!story) throw new AppError('Short story not found', 404);
  res.json({ success: true, data: story });
});

exports.completeShortStoryView = asyncHandler(async (req, res) => {
  const { shortStoryId, progress = 100, status = 'read' } = req.body;
  if (!shortStoryId) throw new AppError('shortStoryId is required', 400);
  if (Number(progress) < 100 || status === 'skipped') {
    return res.json({ success: true, message: 'Partial or skipped read not counted as a view' });
  }

  const story = await ShortStory.findByIdAndUpdate(shortStoryId, { $inc: { views: 1 } }, { new: true }).lean();
  if (!story || story.status !== 'published') throw new AppError('Short story not found', 404);

  if (req.user?.id) {
    await User.updateOne(
      { _id: req.user.id },
      {
        $pull: { shortStoryHistory: { shortStoryId: story._id } }
      }
    );
    await User.updateOne(
      { _id: req.user.id },
      {
        $push: {
          shortStoryHistory: {
            shortStoryId: story._id,
            status: 'read',
            completedAt: new Date(),
            updatedAt: new Date()
          }
        }
      }
    );
  }

  res.json({ success: true, views: story.views });
});
