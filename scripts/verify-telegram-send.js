'use strict';

const vm = require('vm');
const fs = require('fs');
const path = require('path');

const sendPath = path.resolve(__dirname, '..', 'functions', 'telegram', 'send.js');
const sendSrc = fs.readFileSync(sendPath, 'utf-8');

const expectedFunctions = [
  'sendTelegramHtmlMessage',
  'sendTelegramTextMessage',
  'sendTelegramActionConfirmation',
  'sendTelegramInlineMessage',
  'sendTelegramPhotoMessage',
  'answerTelegramCallback',
  'editTelegramMessage',
  'editTelegramInlineMessage',
  'getTelegramPhotoAsBase64',
];

const sandbox = {
  module: { exports: {} },
  exports: {},
  require: (mod) => {
    if (mod === 'axios') {
      return { post: async () => ({ data: { ok: true } }), get: async () => ({ data: { result: {} }, headers: {} }) };
    }
    if (mod === '../utils/text') {
      return {
        normalizeTelegramTextPreserveLines: (s) => String(s || ''),
        normalizeTelegramText: (s) => String(s || ''),
      };
    }
    throw new Error(`Unexpected require: ${mod}`);
  },
};
vm.createContext(sandbox);
const script = new vm.Script(sendSrc, { filename: 'send.js' });
script.runInContext(sandbox);

const exported = sandbox.module.exports;
const exportedKeys = Object.keys(exported);
const missing = expectedFunctions.filter(fn => typeof exported[fn] !== 'function');

if (missing.length) {
  console.error('FAIL: Missing exports:', missing);
  process.exit(1);
}

if (exportedKeys.length !== expectedFunctions.length) {
  console.error(`FAIL: Expected ${expectedFunctions.length} exports, got ${exportedKeys.length}:`, exportedKeys);
  process.exit(1);
}

// Verify each function is async
for (const fn of expectedFunctions) {
  if (exported[fn].constructor.name !== 'AsyncFunction') {
    console.error(`FAIL: ${fn} is not async`);
    process.exit(1);
  }
}

// Verify input validation: sendTelegramHtmlMessage throws on missing token/chat
(async () => {
  try {
    await exported.sendTelegramHtmlMessage({ chatId: '', text: 'test', botToken: '' });
    console.error('FAIL: sendTelegramHtmlMessage should throw on missing token/chat');
    process.exit(1);
  } catch (err) {
    if (!String(err.message).includes('Missing Telegram bot token')) {
      console.error('FAIL: Wrong error message:', err.message);
      process.exit(1);
    }
  }

  // Verify answerTelegramCallback returns null on missing callbackQueryId
  const result = await exported.answerTelegramCallback({ callbackQueryId: '', text: 'test', botToken: 'token' });
  if (result !== null) {
    console.error('FAIL: answerTelegramCallback should return null on missing callbackQueryId');
    process.exit(1);
  }

  // Verify editTelegramMessage returns null on missing chatId/messageId
  const editResult = await exported.editTelegramMessage({ chatId: '', messageId: 0, text: 'test', botToken: 'token' });
  if (editResult !== null) {
    console.error('FAIL: editTelegramMessage should return null on missing chatId/messageId');
    process.exit(1);
  }

  console.log('\u2705 verify-telegram-send Sprint 2.3 verification passed');
  console.log(`   ${expectedFunctions.length} async functions exported: ${exportedKeys.join(', ')}`);
})();
