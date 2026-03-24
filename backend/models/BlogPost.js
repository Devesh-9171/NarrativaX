const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 320 },
    coverImage: { type: String, required: true, trim: true },
    coverImagePublicId: { type: String, trim: true },
    content: { type: String, required: true },
    contentHtml: { type: String, default: '' },
    publishedAt: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

blogPostSchema.index({ publishedAt: -1 });
blogPostSchema.index({ title: 'text', description: 'text', content: 'text' });

module.exports = mongoose.model('BlogPost', blogPostSchema);
