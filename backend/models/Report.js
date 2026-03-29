const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    contentId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    contentType: { type: String, required: true, enum: ['shortStory', 'chapter', 'book'], index: true },
    reportType: {
      type: String,
      required: true,
      enum: ['Copied / Plagiarism', 'Spam / Low Quality', 'Offensive Content', 'Other']
    },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    description: { type: String, trim: true, default: '' }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

reportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
