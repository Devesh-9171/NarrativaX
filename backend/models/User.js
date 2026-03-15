const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' }],
    favoriteBooks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
    readingHistory: [
      {
        bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
        chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' },
        progress: { type: Number, default: 0 },
        lastReadAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

userSchema.virtual('username').get(function username() {
  return this.name;
});

userSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  }
});

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
