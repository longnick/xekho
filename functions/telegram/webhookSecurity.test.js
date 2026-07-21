const {
  safeEqualString,
  extractTelegramWebhookSecret,
  isAuthenticTelegramWebhook,
  isTelegramWebhookBodySizeAllowed,
  isAuthorizedTelegramWriteActor,
  isTelegramWriteCallbackData,
  DEFAULT_TELEGRAM_WEBHOOK_MAX_BYTES,
  TELEGRAM_WRITE_CALLBACK_PREFIXES,
} = require('./webhookSecurity');

describe('telegram webhook security helpers', () => {
  test('safeEqualString compares in constant time with length guards', () => {
    expect(safeEqualString('secret-123', 'secret-123')).toBe(true);
    expect(safeEqualString('secret-123', 'secret-124')).toBe(false);
    expect(safeEqualString('', 'secret-123')).toBe(false);
    expect(safeEqualString('secret-123', '')).toBe(false);
    expect(safeEqualString(null, 'secret-123')).toBe(false);
  });

  test('extractTelegramWebhookSecret reads case-insensitive header', () => {
    expect(extractTelegramWebhookSecret({ headers: { 'x-telegram-bot-api-secret-token': 'abc' } })).toBe('abc');
    expect(extractTelegramWebhookSecret({ headers: { 'X-Telegram-Bot-Api-Secret-Token': 'ABC' } })).toBe('ABC');
    expect(extractTelegramWebhookSecret({ headers: {} })).toBe('');
    expect(extractTelegramWebhookSecret({ headers: { 'x-telegram-bot-api-secret-token': '' } })).toBe('');
  });

  test('isAuthenticTelegramWebhook fails closed on missing/empty sides', () => {
    expect(isAuthenticTelegramWebhook({ configuredSecret: 's', providedSecret: 's' })).toBe(true);
    expect(isAuthenticTelegramWebhook({ configuredSecret: 's', providedSecret: 'x' })).toBe(false);
    expect(isAuthenticTelegramWebhook({ configuredSecret: '', providedSecret: 's' })).toBe(false);
    expect(isAuthenticTelegramWebhook({ configuredSecret: 's', providedSecret: '' })).toBe(false);
    expect(isAuthenticTelegramWebhook({})).toBe(false);
  });

  test('isTelegramWebhookBodySizeAllowed enforces the cap via Content-Length early hint', () => {
    const max = DEFAULT_TELEGRAM_WEBHOOK_MAX_BYTES;
    expect(isTelegramWebhookBodySizeAllowed({ headers: { 'content-length': String(max) } }, max)).toBe(true);
    expect(isTelegramWebhookBodySizeAllowed({ headers: { 'content-length': String(max + 1) } }, max)).toBe(false);
    expect(isTelegramWebhookBodySizeAllowed({ headers: {} }, max)).toBe(true);
  });

  test('isTelegramWebhookBodySizeAllowed inspects req.rawBody byteLength when available', () => {
    const max = DEFAULT_TELEGRAM_WEBHOOK_MAX_BYTES;
    const smallBody = Buffer.from('x'.repeat(100), 'utf8');
    const largeBody = Buffer.from('x'.repeat(max + 1), 'utf8');
    // absent Content-Length, present rawBody under cap => allow
    expect(isTelegramWebhookBodySizeAllowed({ headers: {}, rawBody: smallBody }, max)).toBe(true);
    // absent Content-Length, rawBody over cap => reject
    expect(isTelegramWebhookBodySizeAllowed({ headers: {}, rawBody: largeBody }, max)).toBe(false);
    // forged low Content-Length, rawBody over cap => reject (rawBody wins)
    expect(isTelegramWebhookBodySizeAllowed(
      { headers: { 'content-length': '10' }, rawBody: largeBody },
      max
    )).toBe(false);
    // correct Content-Length, rawBody under cap => allow
    expect(isTelegramWebhookBodySizeAllowed(
      { headers: { 'content-length': String(smallBody.byteLength) }, rawBody: smallBody },
      max
    )).toBe(true);
  });

  test('isAuthorizedTelegramWriteActor matches chat or user in a non-empty allowlist', () => {
    const allowlist = ['6496387732', 'user-9'];
    expect(isAuthorizedTelegramWriteActor({ allowlist, chatId: '6496387732', userId: '' })).toBe(true);
    expect(isAuthorizedTelegramWriteActor({ allowlist, chatId: '', userId: 'user-9' })).toBe(true);
    expect(isAuthorizedTelegramWriteActor({ allowlist, chatId: '999', userId: 'x' })).toBe(false);
    expect(isAuthorizedTelegramWriteActor({ allowlist: [], chatId: '6496387732' })).toBe(false);
    expect(isAuthorizedTelegramWriteActor({ chatId: '6496387732' })).toBe(false);
  });

  test('empty config denies write callbacks (fail-closed, no hardcoded default bypass)', () => {
    // When TELEGRAM_OWNER_CHAT_ID is not configured (empty string), the allowlist must be empty
    // and all write callbacks must be denied, even if a hardcoded default exists elsewhere.
    const emptyAllowlist = [];
    expect(isAuthorizedTelegramWriteActor({ allowlist: emptyAllowlist, chatId: '6496387732', userId: '' })).toBe(false);
    expect(isAuthorizedTelegramWriteActor({ allowlist: emptyAllowlist, chatId: 'any', userId: 'any' })).toBe(false);
  });

  test('isTelegramWriteCallbackData classifies every mutating prefix', () => {
    for (const prefix of TELEGRAM_WRITE_CALLBACK_PREFIXES) {
      expect(isTelegramWriteCallbackData(`${prefix}abc123`)).toBe(true);
    }
    expect(isTelegramWriteCallbackData('')).toBe(false);
    expect(isTelegramWriteCallbackData('chatid')).toBe(false);
    expect(isTelegramWriteCallbackData('onl_order_ok_')).toBe(true);
  });

  test('forged-callback matrix: missing/wrong secret, owner allowlist, non-owner denial', () => {
    const configured = 'webhook-shared-secret';
    // missing secret
    expect(isAuthenticTelegramWebhook({ configuredSecret: configured, providedSecret: '' })).toBe(false);
    // wrong secret
    expect(isAuthenticTelegramWebhook({ configuredSecret: configured, providedSecret: 'nope' })).toBe(false);
    // valid secret + owner in allowlist
    expect(isAuthorizedTelegramWriteActor({ allowlist: ['6496387732'], chatId: '6496387732', userId: '' })).toBe(true);
    // valid secret + unauthorized actor (not in allowlist)
    expect(isAuthorizedTelegramWriteActor({ allowlist: ['6496387732'], chatId: '999', userId: 'x' })).toBe(false);
    // valid secret + valid callback data + authorized => guard passes
    const cb = 'onl_order_ok_ORDER1';
    expect(isTelegramWriteCallbackData(cb)).toBe(true);
    expect(
      !isTelegramWriteCallbackData(cb)
      || isAuthorizedTelegramWriteActor({ allowlist: ['6496387732'], chatId: '6496387732', userId: '' })
    ).toBe(true);
    // forged callback from non-owner is denied (guard triggers)
    expect(
      !(isTelegramWriteCallbackData(cb))
      || isAuthorizedTelegramWriteActor({ allowlist: ['6496387732'], chatId: 'attacker', userId: 'attacker' })
    ).toBe(false);
  });
});
