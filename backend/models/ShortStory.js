const mongoose = require('mongoose');

const shortStorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    coverImage: { type: String, trim: true, required: true },
    coverImagePublicId: { type: String, trim: true, default: '' },
    description: { type: String, required: true, trim: true, maxlength: 600 },
    content: { type: String, required: true, trim: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorName: { type: String, required: true, trim: true },
    status: { type: String, enum: ['review', 'published', 'rejected'], default: 'review', index: true },
    rejectionReason: { type: String, trim: true, default: '' },
    publishedAt: { type: Date },
    wordCount: { type: Number, default: 0 },
    readingTime: { type: Number, default: 0 },
    views: { type: Number, default: 0, index: true }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

shortStorySchema.pre('validate', function normalize(next) {
  this.tags = Array.from(new Set((this.tags || []).map((tag) => String(tag || '').trim().toLowerCase()).filter(Boolean)));
  if ((this.tags || []).length > 3) {
    return next(new Error('Short stories support max 3 tags'));
  }
  return next();
});

module.exports = mongoose.model('ShortStory', shortStorySchema);
