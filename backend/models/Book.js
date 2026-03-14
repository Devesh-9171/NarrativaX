const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    author: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['action', 'romance', 'comedy', 'mystery', 'finance']
    },
    description: { type: String, required: true },
    coverImage: { type: String, required: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalViews: { type: Number, default: 0, index: true },
    viewsLast24h: { type: Number, default: 0 },
    viewsLast7d: { type: Number, default: 0 },
    trendingScore: { type: Number, default: 0, index: true },
    featured: { type: Boolean, default: false }
  },
  { timestamps: true }
);

bookSchema.index({ title: 'text', author: 'text', category: 'text' });

module.exports = mongoose.model('Book', bookSchema);
