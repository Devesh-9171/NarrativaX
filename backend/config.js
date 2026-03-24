const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const candidateEnvFiles = [
  path.join(__dirname, '.env'),
  path.join(process.cwd(), '.env')
];

for (const envFile of candidateEnvFiles) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
    break;
  }
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalTrimmedString(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function parseAllowedOrigins(value) {
  return toOptionalTrimmedString(value)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function validateRequiredEnv() {
  const missing = [];

  if (!toOptionalTrimmedString(process.env.MONGO_URI)) missing.push('MONGO_URI');
  if (!toOptionalTrimmedString(process.env.JWT_SECRET)) missing.push('JWT_SECRET');
  if (!toOptionalTrimmedString(process.env.CLOUDINARY_CLOUD_NAME)) missing.push('CLOUDINARY_CLOUD_NAME');
  if (!toOptionalTrimmedString(process.env.CLOUDINARY_API_KEY)) missing.push('CLOUDINARY_API_KEY');
  if (!toOptionalTrimmedString(process.env.CLOUDINARY_API_SECRET)) missing.push('CLOUDINARY_API_SECRET');

  return missing;
}

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toNumber(process.env.PORT, 5000),
  mongoUri: toOptionalTrimmedString(process.env.MONGO_URI),
  jwtSecret: toOptionalTrimmedString(process.env.JWT_SECRET),
  allowedOrigins: parseAllowedOrigins(process.env.CLIENT_URL),
  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMaxRequests: toNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 300),
  cacheTtlSeconds: toNumber(process.env.CACHE_TTL_SECONDS, 60),
  dbConnectRetryMs: toNumber(process.env.DB_CONNECT_RETRY_MS, 5000),
  cloudinaryCloudName: toOptionalTrimmedString(process.env.CLOUDINARY_CLOUD_NAME),
  cloudinaryApiKey: toOptionalTrimmedString(process.env.CLOUDINARY_API_KEY),
  cloudinaryApiSecret: toOptionalTrimmedString(process.env.CLOUDINARY_API_SECRET),
  smtpHost: toOptionalTrimmedString(process.env.SMTP_HOST),
  smtpPort: toNumber(process.env.SMTP_PORT, 587),
  smtpSecure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
  smtpUser: toOptionalTrimmedString(process.env.SMTP_USER),
  smtpPass: toOptionalTrimmedString(process.env.SMTP_PASS),
  smtpFrom: toOptionalTrimmedString(process.env.SMTP_FROM) || 'no-reply@readnovax.local',
  smtpConnectionTimeoutMs: toNumber(process.env.SMTP_CONNECTION_TIMEOUT_MS, 15000),
  smtpGreetingTimeoutMs: toNumber(process.env.SMTP_GREETING_TIMEOUT_MS, 15000),
  smtpSocketTimeoutMs: toNumber(process.env.SMTP_SOCKET_TIMEOUT_MS, 30000),
  otpResendCooldownSeconds: toNumber(process.env.OTP_RESEND_COOLDOWN_SECONDS, 45)
};

config.hasConfiguredCorsOrigins = config.allowedOrigins.length > 0;
config.missingRequiredEnv = validateRequiredEnv();

module.exports = config;
