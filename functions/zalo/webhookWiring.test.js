const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');

describe('Zalo webhook production wiring', () => {
  test('binds named secrets and reviewed runtime service account', () => {
    expect(source).toContain("const ZALO_BOT_WEBHOOK_SECRET = defineSecret('ZALO_BOT_WEBHOOK_SECRET')");
    expect(source).toContain("const ZALO_BOT_TOKEN = defineSecret('ZALO_BOT_TOKEN')");
    expect(source).toMatch(/exports\.zaloWebhook = onRequest\(\{[\s\S]*?serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT,[\s\S]*?secrets: \[ZALO_BOT_WEBHOOK_SECRET, ZALO_BOT_TOKEN\]/);
  });

  test('keeps replies group-only and sends through server-held token', () => {
    expect(source).toContain("if (event.chatType !== 'GROUP') return;");
    expect(source).toContain('botToken: ZALO_BOT_TOKEN.value()');
    expect(source).not.toContain('process.env.ZALO_BOT_TOKEN');
  });
});
