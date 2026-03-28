const mongoose = require('mongoose');

const readingProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', required: true },
    chapterNumber: { type: Number, required: true, min: 1 }
  },
  { timestamps: true }
);

readingProgressSchema.index({ userId: 1, bookId: 1 }, { unique: true });
readingProgressSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('ReadingProgress', readingProgressSchema);
