const crypto = require('crypto');
const { isContentLengthAllowed, createRateLimiter } = require('../utils/httpSecurity');

// Constant-time string comparison with a length guard.
// crypto.timingSafeEqual throws on unequal-length buffers, so guard first.
function safeEqualString(a, b) {
  const bufA = Buffer.from(String(a == null ? '' : a), 'utf8');
  const bufB = Buffer.from(String(b == null ? '' : b), 'utf8');
  if (bufA.length === 0 || bufB.length === 0) return false;
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Extract Telegram webhook secret header (case-insensitive) from an Express-like req.
function extractTelegramWebhookSecret(req = {}) {
  const headers = req.headers || {};
  const direct = headers['x-telegram-bot-api-secret-token'];
  if (direct != null && String(direct).trim()) return String(direct).trim();
  // Case-insensitive scan / req.get fallback.
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === 'x-telegram-bot-api-secret-token') {
      const val = headers[key];
      if (val != null && String(val).trim()) return String(val).trim();
    }
  }
  const viaGet = req.get?.('x-telegram-bot-api-secret-token');
  return viaGet != null ? String(viaGet).trim() : '';
}

// Authentic only when configured secret is non-empty AND matches provided via constant-time compare.
// Fail closed on any missing/empty side.
function isAuthenticTelegramWebhook({ configuredSecret, providedSecret } = {}) {
  const configured = String(configuredSecret == null ? '' : configuredSecret).trim();
  const provided = String(providedSecret == null ? '' : providedSecret).trim();
  if (!configured || !provided) return false;
  return safeEqualString(configured, provided);
}

const DEFAULT_TELEGRAM_WEBHOOK_MAX_BYTES = 262144; // 256 KiB

// Content-length guard reusing httpSecurity semantics.
function isTelegramWebhookBodySizeAllowed(req = {}, maxBytes = DEFAULT_TELEGRAM_WEBHOOK_MAX_BYTES) {
  if (!isContentLengthAllowed(req, maxBytes)) return false;
  // Firebase exposes rawBody after framework parsing. This application-level
  // check runs before any req.body access, logging, DB work, or callback action.
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody.byteLength <= maxBytes;
  return true;
}

// Authorization for write callbacks: chatId or userId must be in a non-empty allowlist.
function isAuthorizedTelegramWriteActor({ allowlist, chatId, userId } = {}) {
  const ids = (Array.isArray(allowlist) ? allowlist : [])
    .map(id => String(id == null ? '' : id).trim())
    .filter(Boolean);
  if (ids.length === 0) return false;
  const chat = String(chatId == null ? '' : chatId).trim();
  const user = String(userId == null ? '' : userId).trim();
  if (!chat && !user) return false;
  return ids.some(id => (chat && id === chat) || (user && id === user));
}

const TELEGRAM_WRITE_CALLBACK_PREFIXES = [
  'onl_order_ok_',
  'onl_order_no_',
  'odf_confirm_',
  'odf_cancel_',
  'odf_edit_',
  'cw_payment_cash_',
  'cw_payment_bank_',
  'cw_payment_cancel_',
  'cw_order_ok_',
  'cw_order_no_',
  'cw_service_ack_',
  'cw_service_done_',
  'cw_payment_confirm_',
  'cw_payment_ack_',
  'confirm_',
  'cancel_',
];

// Classify whether callbackData is a mutating write callback.
function isTelegramWriteCallbackData(callbackData) {
  const data = String(callbackData == null ? '' : callbackData).trim();
  if (!data) return false;
  return TELEGRAM_WRITE_CALLBACK_PREFIXES.some(prefix => data.startsWith(prefix));
}

module.exports = {
  safeEqualString,
  extractTelegramWebhookSecret,
  isAuthenticTelegramWebhook,
  isTelegramWebhookBodySizeAllowed,
  isAuthorizedTelegramWriteActor,
  isTelegramWriteCallbackData,
  createRateLimiter,
  DEFAULT_TELEGRAM_WEBHOOK_MAX_BYTES,
  TELEGRAM_WRITE_CALLBACK_PREFIXES,
};
