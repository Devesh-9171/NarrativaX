const mongoose = require('mongoose');

const SIX_MONTHS_IN_SECONDS = 60 * 60 * 24 * 30 * 6;

const storyHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    readAt: { type: Date, default: Date.now, required: true }
  },
  { timestamps: false }
);

storyHistorySchema.index({ userId: 1, storyId: 1 }, { unique: true });
storyHistorySchema.index({ userId: 1, readAt: -1 });
storyHistorySchema.index({ storyId: 1, readAt: -1 });
storyHistorySchema.index({ readAt: 1 }, { expireAfterSeconds: SIX_MONTHS_IN_SECONDS });

module.exports = mongoose.model('StoryHistory', storyHistorySchema);
