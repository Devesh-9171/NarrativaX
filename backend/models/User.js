const mongoose = require('mongoose');

const authorProfileSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true },
    penName: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 2000 },
    upiId: { type: String, trim: true, maxlength: 150 },
    bankDetails: { type: String, trim: true, maxlength: 500 },
    internationalPayment: { type: String, trim: true, maxlength: 250 },
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
    emailVerificationOtpLastSentAt: { type: Date, select: false },
    role: { type: String, enum: ['user', 'author', 'admin'], default: 'user' },
    authorStatus: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none', index: true },
    authorProfile: { type: authorProfileSchema, default: () => ({}) },
    monthlyViews: { type: Number, default: 0, min: 0 },
    lifetimeViews: { type: Number, default: 0, min: 0 },
    totalPaidAmount: { type: Number, default: 0, min: 0 },
    paymentRecords: [
      {
        amount: { type: Number, min: 0 },
        paidAt: { type: Date },
        note: { type: String, trim: true, maxlength: 250 },
        reference: { type: String, trim: true, maxlength: 150 }
      }
    ],
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

userSchema.pre('validate', function normalizeRoleAndAuthorState(next) {
  if (this.role === 'author' && this.authorStatus !== 'approved') {
    this.authorStatus = 'approved';
  } else if (this.role === 'user' && this.authorStatus === 'approved') {
    this.authorStatus = 'none';
  }

  next();
});

module.exports = mongoose.model('User', userSchema);
