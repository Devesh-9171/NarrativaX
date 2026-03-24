const mongoose = require('mongoose');

const authorProfileSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true },
    penName: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 2000 },
    paymentDetails: { type: String, trim: true, maxlength: 500 },
    idVerification: { type: String, trim: true, maxlength: 1000 },
    translationPermissionGrantedAt: { type: Date }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    isEmailVerified: { type: Boolean, default: false, index: true },
    emailVerificationOtp: { type: String, select: false },
    emailVerificationOtpExpiresAt: { type: Date, select: false },
    role: { type: String, enum: ['user', 'author', 'admin'], default: 'user' },
    authorStatus: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none', index: true },
    authorProfile: { type: authorProfileSchema, default: () => ({}) },
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' }],
    favoriteBooks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
    readingHistory: [
      {
        bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
        chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' },
        progress: { type: Number, default: 0 },
        status: { type: String, enum: ['read', 'skipped'], default: 'read' },
        completedAt: { type: Date },
        lastReadAt: { type: Date, default: Date.now }
      }
    ],
    shortStoryHistory: [
      {
        shortStoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShortStory' },
        status: { type: String, enum: ['read', 'skipped'], default: 'read' },
        completedAt: { type: Date },
        updatedAt: { type: Date, default: Date.now }
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

userSchema.index({ role: 1, createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
