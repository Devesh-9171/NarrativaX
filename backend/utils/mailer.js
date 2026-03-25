const { Resend } = require('resend');
const config = require('../config');

let resendClient = null;

function hasEmailProviderConfig() {
  return Boolean(config.resendApiKey);
}

function getResendClient() {
  if (!hasEmailProviderConfig()) return null;
  if (!resendClient) {
    resendClient = new Resend(config.resendApiKey);
  }
  return resendClient;
}

async function sendEmail({ to, subject, text, html }) {
  const client = getResendClient();
  if (!client) {
    console.info(`[mail:disabled] ${subject} -> ${to} (RESEND_API_KEY missing).`);
    return { skipped: true };
  }

  const payload = {
    from: config.resendFrom,
    to: Array.isArray(to) ? to : [to],
    subject,
    html: html || `<pre>${text || ''}</pre>`,
    text
  };

  const timeoutMs = Math.max(1000, Number(config.resendRequestTimeoutMs) || 7000);
  const sendPromise = client.emails.send(payload);
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Resend request timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  const response = await Promise.race([sendPromise, timeoutPromise]);
  if (response?.error) {
    throw new Error(response.error.message || 'Resend API returned an unknown error');
  }

  return response;
}

module.exports = { sendEmail, hasEmailProviderConfig };
