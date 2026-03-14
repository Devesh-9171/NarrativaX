const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema(
  {
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
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

module.exports = mongoose.model('Chapter', chapterSchema);
