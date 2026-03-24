const mongoose = require('mongoose');
const { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, normalizeLanguage } = require('../utils/language');

const chapterSchema = new mongoose.Schema(
  {
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    language: { type: String, enum: SUPPORTED_LANGUAGES, default: DEFAULT_LANGUAGE, index: true, set: (value) => normalizeLanguage(value, DEFAULT_LANGUAGE) },
    title: { type: String, required: true },
    slug: { type: String, required: true, index: true },
    chapterNumber: { type: Number, required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorName: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    image: { type: String, trim: true },
    imagePublicId: { type: String, trim: true },
    views: { type: Number, default: 0 }
  },
  { timestamps: true }
);

chapterSchema.index({ bookId: 1, chapterNumber: 1 }, { unique: true });
chapterSchema.index({ bookId: 1, slug: 1 }, { unique: true });
chapterSchema.index({ language: 1, updatedAt: -1 });
chapterSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Chapter', chapterSchema);
