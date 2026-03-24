const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

function hasSmtpConfig() {
  return Boolean(config.smtpHost && config.smtpUser && config.smtpPass);
}

function getTransporter() {
  if (!hasSmtpConfig()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      connectionTimeout: config.smtpConnectionTimeoutMs,
      greetingTimeout: config.smtpGreetingTimeoutMs,
      socketTimeout: config.smtpSocketTimeoutMs,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass
      }
    });
  }

  return transporter;
}

async function sendEmail({ to, subject, text, html }) {
  const client = getTransporter();
  if (!client) {
    console.info(`[mail:disabled] ${subject} -> ${to}.`);
    return { skipped: true };
  }

  return client.sendMail({
    from: config.smtpFrom,
    to,
    subject,
    text,
    html
  });
}

module.exports = { sendEmail, hasSmtpConfig };
