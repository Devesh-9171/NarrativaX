const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    month: { type: String, required: true, trim: true },
    monthKey: { type: String, required: true, trim: true },
    monthlyViews: { type: Number, required: true, min: 0, default: 0 },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['paid'], default: 'paid' },
    paidAt: { type: Date, required: true, default: Date.now }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

paymentSchema.index({ authorId: 1, monthKey: 1 }, { unique: true });
paymentSchema.index({ paidAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
