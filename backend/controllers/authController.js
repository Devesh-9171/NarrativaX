const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const config = require('../config');
const { sendEmail, hasEmailProviderConfig } = require('../utils/mailer');

function signToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role, name: user.name }, config.jwtSecret, { expiresIn: '7d' });
}

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    username: user.name,
    email: user.email,
    role: user.role,
    authorStatus: user.authorStatus,
    authorProfile: user.authorProfile || {},
    isEmailVerified: Boolean(user.isEmailVerified),
    createdAt: user.createdAt
  };
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendVerificationOtp(user) {
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const sentAt = new Date();
  user.emailVerificationOtp = otp;
  user.emailVerificationOtpExpiresAt = expiresAt;
  user.emailVerificationOtpLastSentAt = sentAt;
  await user.save();

  console.info(`[otp] Generated OTP for ${user.email} at ${sentAt.toISOString()}`);
  return { otp, sentAt };
}

async function sendVerificationOtpEmail({ email, otp }) {
  const result = await sendEmail({
    to: email,
    subject: 'ReadNovaX email verification OTP',
    text: `Your verification OTP is ${otp}. It expires in 10 minutes.`,
    html: `<p>Your verification OTP is <strong>${otp}</strong>.</p><p>It expires in 10 minutes.</p>`
  });

  if (result?.skipped) {
    console.error(`[otp] Email send skipped for ${email}.`);
    throw new AppError('Email delivery service is not configured', 503);
  }

  const messageId = result?.data?.id || result?.id || 'unknown';
  console.info(`[otp] Email send success for ${email}. messageId=${messageId}`);
  return result;
}

exports.signup = asyncHandler(async (req, res) => {
  const name = (req.body.name || req.body.username || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  if (!name || !email || !password) {
    throw new AppError('name, email, and password are required', 400);
  }

  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters long', 400);
  }

  const existingUser = await User.findOne({ email }).lean();
  if (existingUser) {
    throw new AppError('User already exists with this email', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, password: hashedPassword });
  const { otp } = await sendVerificationOtp(user);
  try {
    await sendVerificationOtpEmail({ email: user.email, otp });
  } catch (error) {
    console.error(`[otp] Email send failed for ${user.email}:`, error?.message || error);
    throw new AppError('Signup failed: unable to deliver verification OTP email. Please try again.', 502);
  }
  const emailProviderEnabled = hasEmailProviderConfig();
  res.status(201).json({
    success: true,
    requiresEmailVerification: true,
    message: emailProviderEnabled
      ? 'Signup successful. OTP sent to your email.'
      : 'Signup successful.',
    otpDelivery: 'sent',
    user: sanitizeUser(user)
  });
});

exports.login = asyncHandler(async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  if (!email || !password) {
    throw new AppError('email and password are required', 400);
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken(user);
  res.json({ success: true, token, user: sanitizeUser(user) });
});

exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({ success: true, user: sanitizeUser(user) });
});

exports.verifyEmailOtp = asyncHandler(async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const otp = String(req.body.otp || '').trim();
  if (!email || !otp) throw new AppError('email and otp are required', 400);

  const user = await User.findOne({ email }).select('+emailVerificationOtp +emailVerificationOtpExpiresAt');
  if (!user) throw new AppError('User not found', 404);
  if (user.isEmailVerified) return res.json({ success: true, message: 'Email already verified' });
  if (!user.emailVerificationOtp || user.emailVerificationOtp !== otp) throw new AppError('Invalid OTP', 400);
  if (!user.emailVerificationOtpExpiresAt || user.emailVerificationOtpExpiresAt < new Date()) throw new AppError('OTP expired', 400);

  user.isEmailVerified = true;
  user.emailVerificationOtp = undefined;
  user.emailVerificationOtpExpiresAt = undefined;
  await user.save();

  const token = signToken(user);
  res.json({ success: true, message: 'Email verified successfully', token, user: sanitizeUser(user) });
});

exports.resendEmailOtp = asyncHandler(async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email) throw new AppError('email is required', 400);
  const user = await User.findOne({ email }).select('+emailVerificationOtp +emailVerificationOtpExpiresAt +emailVerificationOtpLastSentAt');
  if (!user) throw new AppError('User not found', 404);
  if (user.isEmailVerified) return res.json({ success: true, message: 'Email already verified' });

  const now = Date.now();
  const lastSentAt = user.emailVerificationOtpLastSentAt ? new Date(user.emailVerificationOtpLastSentAt).getTime() : 0;
  const cooldownMs = (config.otpResendCooldownSeconds || 45) * 1000;
  const retryAfterSeconds = Math.ceil(Math.max(0, cooldownMs - (now - lastSentAt)) / 1000);
  if (lastSentAt && retryAfterSeconds > 0) {
    throw new AppError(`Please wait ${retryAfterSeconds}s before resending OTP`, 429);
  }

  const { otp } = await sendVerificationOtp(user);
  try {
    await sendVerificationOtpEmail({ email: user.email, otp });
  } catch (error) {
    console.error(`[otp] Resend email failed for ${user.email}:`, error?.message || error);
    throw new AppError('Unable to resend OTP email right now. Please try again.', 502);
  }
  const emailProviderEnabled = hasEmailProviderConfig();
  res.json({
    success: true,
    message: emailProviderEnabled ? 'OTP sent to your email.' : 'OTP sent.',
    otpDelivery: 'sent',
    cooldownSeconds: config.otpResendCooldownSeconds || 45
  });
});
