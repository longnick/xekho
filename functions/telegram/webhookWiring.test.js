const fs = require('fs');
const path = require('path');

const repo = path.resolve(__dirname, '../..');
const read = relativePath => fs.readFileSync(path.join(repo, relativePath), 'utf8');
const between = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));

describe('Sprint 1 telegram webhook security wiring', () => {
  const source = read('functions/index.js');

  test('imports the telegram webhook security helpers', () => {
    expect(source).toContain("require('./telegram/webhookSecurity')");
    expect(source).toContain('isAuthenticTelegramWebhook');
    expect(source).toContain('extractTelegramWebhookSecret');
  });

  test('declares TELEGRAM_WEBHOOK_SECRET as defineSecret (not defineString)', () => {
    expect(source).toMatch(/TELEGRAM_WEBHOOK_SECRET\s*=\s*defineSecret\(/);
    expect(source).not.toMatch(/TELEGRAM_WEBHOOK_SECRET\s*=\s*defineString\(/);
  });

  test('binds TELEGRAM_WEBHOOK_SECRET in telegramWebhook secrets array', () => {
    const webhook = between(source, 'exports.telegramWebhook = onRequest({', '}, (req, res) => {');
    expect(webhook).toContain('secrets:');
    expect(webhook).toMatch(/secrets:\s*\[.*TELEGRAM_WEBHOOK_SECRET.*\]/s);
  });

  test('reads TELEGRAM_WEBHOOK_SECRET.value() without process.env fallback', () => {
    const webhook = source.slice(source.indexOf('exports.telegramWebhook = onRequest'));
    const scope = webhook.slice(0, webhook.indexOf('\nexports.', 1));
    expect(scope).toContain('TELEGRAM_WEBHOOK_SECRET.value()');
    const secretReadLine = scope.slice(
      scope.indexOf('TELEGRAM_WEBHOOK_SECRET.value()') - 200,
      scope.indexOf('TELEGRAM_WEBHOOK_SECRET.value()') + 200
    );
    expect(secretReadLine).not.toContain('process.env.TELEGRAM_WEBHOOK_SECRET');
  });

  test('verifies webhook authenticity before logging or mutating', () => {
    const webhook = source.slice(source.indexOf('exports.telegramWebhook = onRequest'));
    const scope = webhook.slice(0, webhook.indexOf('\nexports.', 1));
    expect(scope).toContain('isAuthenticTelegramWebhook');
    expect(scope).toContain('extractTelegramWebhookSecret');
    expect(scope).toContain("json(res, 401");
    // authenticity gate must appear before the incoming-update log
    expect(scope.indexOf('isAuthenticTelegramWebhook'))
      .toBeLessThan(scope.indexOf("logger.info('telegramWebhook incoming update'"));
    // and before any callback mutation
    expect(scope.indexOf('isAuthenticTelegramWebhook'))
      .toBeLessThan(scope.indexOf('approveOnlineOrderInternal'));
  });

  test('enforces body-size and rate limits before callback mutations', () => {
    const webhook = source.slice(source.indexOf('exports.telegramWebhook = onRequest'));
    const scope = webhook.slice(0, webhook.indexOf('\nexports.', 1));
    expect(scope).toContain('isTelegramWebhookBodySizeAllowed');
    expect(scope.indexOf('isTelegramWebhookBodySizeAllowed'))
      .toBeLessThan(scope.indexOf('approveOnlineOrderInternal'));
  });

  test('body-size check happens before first req.body access and before logging', () => {
    const webhook = source.slice(source.indexOf('exports.telegramWebhook = onRequest'));
    const scope = webhook.slice(0, webhook.indexOf('\nexports.', 1));
    const bodySizeIdx = scope.indexOf('isTelegramWebhookBodySizeAllowed');
    expect(bodySizeIdx).toBeGreaterThan(0);
    // must precede req.body access
    expect(bodySizeIdx).toBeLessThan(scope.indexOf('req.body'));
    // must precede incoming-update log
    expect(bodySizeIdx).toBeLessThan(scope.indexOf("logger.info('telegramWebhook incoming update'"));
  });

  test('rate-limit key uses req.ip without trusting x-forwarded-for first hop', () => {
    const webhook = source.slice(source.indexOf('exports.telegramWebhook = onRequest'));
    const scope = webhook.slice(0, webhook.indexOf('\nexports.', 1));
    const rateLimitBlock = scope.slice(
      scope.indexOf('telegramWebhookRateLimiter.take') - 400,
      scope.indexOf('telegramWebhookRateLimiter.take')
    );
    // must use req.ip or req.socket.remoteAddress
    expect(rateLimitBlock).toMatch(/req\.(ip|socket\.remoteAddress)/);
    // must NOT split x-forwarded-for and take first hop
    expect(rateLimitBlock).not.toMatch(/x-forwarded-for['"]?\s*\]?\s*\?\s*.*split\s*\(\s*[',]\s*\)\s*\[\s*0\s*\]/);
  });

  test('guards every write callback with an owner authorization check', () => {
    const webhook = source.slice(source.indexOf('exports.telegramWebhook = onRequest'));
    const scope = webhook.slice(0, webhook.indexOf('\nexports.', 1));
    expect(scope).toContain('isTelegramWriteCallbackData');
    const guardIdx = scope.indexOf('isTelegramWriteCallbackData');
    // owner guard must precede each mutating internal
    for (const fn of [
      'approveOnlineOrderInternal',
      'rejectOnlineOrderInternal',
      'closePosOrderFromTelegram',
      'executePendingAction',
      'cancelPendingAction',
    ]) {
      expect(guardIdx).toBeLessThan(scope.indexOf(fn));
    }
    // the write-callback guard uses the owner context / authorized-actor helper
    const guardBlock = scope.slice(guardIdx, guardIdx + 600);
    expect(guardBlock).toMatch(/isTelegramOwnerContext|isAuthorizedTelegramWriteActor/);
  });

  test('write-callback allowlist derives from configured owner ID only, no hardcoded default', () => {
    const ownerFn = between(source, 'function getTelegramOwnerChatIds()', '\n}');
    // Must not include DEFAULT_TELEGRAM_OWNER_CHAT_ID in the return when used for write guards
    // The spec allows the default for non-mutating legacy notification, but mutation guard must be config-only.
    // Simplest: getTelegramOwnerChatIds should return only TELEGRAM_OWNER_CHAT_ID.value(), not the default.
    expect(ownerFn).toContain('TELEGRAM_OWNER_CHAT_ID.value()');
    expect(ownerFn).not.toContain('DEFAULT_TELEGRAM_OWNER_CHAT_ID');
  });
});
