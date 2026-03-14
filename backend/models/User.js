const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' }],
    favoriteBooks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
    readingHistory: [
      {
        bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
        chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' },
        progress: { type: Number, default: 0 },
        lastReadAt: { type: Date, default: Date.now }
      }
    ],
    role: { type: String, enum: ['reader', 'admin'], default: 'reader' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
