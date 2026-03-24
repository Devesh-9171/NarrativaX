const mongoose = require('mongoose');
const { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, normalizeLanguage } = require('../utils/language');

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, index: true },
    author: { type: String, required: true, trim: true },
    authorName: { type: String, trim: true },
    authorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    category: {
      type: String,
      required: true,
      enum: ['action', 'romance', 'comedy', 'mystery', 'finance']
    },
    contentType: { type: String, enum: ['short_story', 'long_story'], default: 'long_story', index: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    status: { type: String, enum: ['review', 'published', 'rejected'], default: 'published', index: true },
    rejectionReason: { type: String, trim: true, maxlength: 1000 },
    description: { type: String, required: true },
    coverImage: { type: String, required: true },
    coverImagePublicId: { type: String, trim: true },
    language: {
      type: String,
      enum: SUPPORTED_LANGUAGES,
      required: true,
      default: DEFAULT_LANGUAGE,
      index: true,
      set: (value) => normalizeLanguage(value, DEFAULT_LANGUAGE)
    },
    groupId: { type: String, trim: true, index: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalViews: { type: Number, default: 0, index: true },
    viewsLast24h: { type: Number, default: 0 },
    viewsLast7d: { type: Number, default: 0 },
    trendingScore: { type: Number, default: 0, index: true },
    readingTimeMinutes: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false, index: true },
    completedAt: { type: Date },
    publishedAt: { type: Date }
  },
  { timestamps: true }
);

bookSchema.pre('save', function setDefaults(next) {
  if (!this.language) {
    this.language = DEFAULT_LANGUAGE;
  }


  if (!SUPPORTED_LANGUAGES.includes(this.language)) {
    return next(new Error('Invalid language'));
  }

  if (!this.authorName && this.author) {
    this.authorName = this.author;
  }

  if (!this.authorId && this.authorUserId) {
    this.authorId = this.authorUserId;
  }

  if (!this.groupId && this._id) {
    this.groupId = this._id.toString();
  }

  if (!Array.isArray(this.tags)) {
    this.tags = [];
  }

  this.tags = Array.from(new Set(this.tags.map((tag) => String(tag || '').trim().toLowerCase()).filter(Boolean)));

  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  next();
});

bookSchema.index(
  { title: 'text', author: 'text', category: 'text', tags: 'text' },
  { default_language: 'none', language_override: 'searchLanguage' }
);
bookSchema.index({ category: 1, totalViews: -1 });
bookSchema.index({ featured: 1, updatedAt: -1 });
bookSchema.index({ updatedAt: -1 });
bookSchema.index({ groupId: 1, language: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Book', bookSchema);
