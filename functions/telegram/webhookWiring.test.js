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

  test('declares an empty-default TELEGRAM_WEBHOOK_SECRET param without hardcoding a value', () => {
    expect(source).toMatch(/TELEGRAM_WEBHOOK_SECRET\s*=\s*define(Secret|String)\(/);
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
});
