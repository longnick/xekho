const crypto = require('crypto');

const MAX_WEBHOOK_BYTES = 256 * 1024;

function readHeader(req = {}, name) {
  return String(req.headers?.[name] || req.get?.(name) || '').trim();
}

function constantTimeEqual(left = '', right = '') {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length
    && leftBuffer.length > 0
    && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function objectKeys(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? Object.keys(value).slice(0, 16).sort()
    : [];
}

function webhookResult(body = {}) {
  // Zalo documentation shows { ok, result }, while live Bot Platform callbacks
  // currently send the event fields at the root. Accept both envelopes.
  return body?.result && typeof body.result === 'object' ? body.result : body;
}

function getWebhookMessageText(body = {}) {
  const result = webhookResult(body);
  return String(result?.message?.text || '').trim();
}

function summarizeWebhookEvent(body = {}) {
  const result = webhookResult(body);
  const message = result?.message && typeof result.message === 'object' ? result.message : {};
  const chat = message?.chat && typeof message.chat === 'object' ? message.chat : {};
  const from = message?.from && typeof message.from === 'object' ? message.from : {};
  return {
    eventName: String(result?.event_name || '').trim(),
    messageId: String(message.message_id || '').trim(),
    chatId: String(chat.id || '').trim(),
    chatType: String(chat.chat_type || '').trim(),
    senderId: String(from.id || '').trim(),
  };
}

// Schema-only diagnostic: deliberately excludes all user-provided values and text.
function summarizeWebhookShape(body) {
  const result = webhookResult(body);
  const message = result?.message && typeof result.message === 'object' ? result.message : null;
  const chat = message?.chat && typeof message.chat === 'object' ? message.chat : null;
  return {
    bodyType: Array.isArray(body) ? 'array' : typeof body,
    bodyKeys: objectKeys(body),
    usesResultEnvelope: Boolean(body?.result && typeof body.result === 'object'),
    resultType: result && typeof result === 'object' ? 'object' : typeof result,
    resultKeys: objectKeys(result),
    eventName: String(result?.event_name || '').trim(),
    messageType: message ? 'object' : typeof result?.message,
    messageKeys: objectKeys(message),
    chatType: String(chat?.chat_type || '').trim(),
    chatKeys: objectKeys(chat),
    hasChatId: Boolean(String(chat?.id || '').trim()),
  };
}

function createZaloWebhookHandler({ getSecret, logger = console, onEvent } = {}) {
  return async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

    const contentLength = Number(readHeader(req, 'content-length') || 0);
    if (!Number.isSafeInteger(contentLength) || contentLength < 0 || contentLength > MAX_WEBHOOK_BYTES) {
      return res.status(413).json({ ok: false, error: 'payload_too_large' });
    }

    const expectedSecret = typeof getSecret === 'function' ? String(getSecret() || '').trim() : '';
    const receivedSecret = readHeader(req, 'x-bot-api-secret-token');
    if (!expectedSecret) {
      logger.error('zalo_webhook_misconfigured', { reason: 'missing_secret' });
      return res.status(503).json({ ok: false, error: 'temporarily_unavailable' });
    }
    if (!constantTimeEqual(receivedSecret, expectedSecret)) {
      logger.warn('zalo_webhook_rejected', { reason: 'invalid_secret' });
      return res.status(403).json({ ok: false, error: 'unauthorized' });
    }

    const event = summarizeWebhookEvent(req.body);
    if (!event.eventName || !event.chatId) {
      // Only schema metadata is logged here; never log payload values or message text.
      logger.warn('zalo_webhook_rejected', { reason: 'invalid_payload', ...summarizeWebhookShape(req.body) });
      return res.status(400).json({ ok: false, error: 'invalid_payload' });
    }

    // Do not log message text, media URLs, display names, or raw payloads.
    logger.info('zalo_webhook_received', event);
    if (typeof onEvent === 'function') {
      try {
        await onEvent({ event, messageText: getWebhookMessageText(req.body) });
      } catch (_) {
        // Keep the webhook acknowledgement independent of an optional outbound reply.
        logger.error('zalo_webhook_command_dispatch_failed', { messageId: event.messageId, chatId: event.chatId });
      }
    }
    // Match the Zalo Bot Platform webhook acknowledgement example exactly.
    return res.status(200).json({ message: 'Success' });
  };
}

module.exports = {
  MAX_WEBHOOK_BYTES,
  constantTimeEqual,
  summarizeWebhookEvent,
  summarizeWebhookShape,
  createZaloWebhookHandler,
};
