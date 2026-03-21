const mongoose = require('mongoose');
const { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } = require('../utils/language');

const chapterSchema = new mongoose.Schema(
  {
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    language: { type: String, enum: SUPPORTED_LANGUAGES, default: DEFAULT_LANGUAGE, index: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, index: true },
    chapterNumber: { type: Number, required: true },
    content: { type: String, required: true },
    views: { type: Number, default: 0 }
  },
  { timestamps: true }
);

chapterSchema.index({ bookId: 1, chapterNumber: 1 }, { unique: true });
chapterSchema.index({ bookId: 1, slug: 1 }, { unique: true });
chapterSchema.index({ language: 1, updatedAt: -1 });
chapterSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Chapter', chapterSchema);
