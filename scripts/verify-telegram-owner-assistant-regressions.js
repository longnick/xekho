'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const indexSource = fs.readFileSync(path.join(root, 'functions', 'index.js'), 'utf8');
const reports = require(path.join(root, 'functions', 'telegram', 'reports'));

function asciiFold(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function assertIntent(question, expected) {
  const intent = reports.parseTelegramSmartReportIntent(question);
  assert(intent, `Expected report intent for: ${question}`);
  for (const [key, value] of Object.entries(expected)) {
    const actual = key === 'rangeLabel' ? asciiFold(intent[key]) : intent[key];
    assert.strictEqual(actual, value, `Unexpected ${key} for ${question}`);
  }
  assert(intent.from instanceof Date && !Number.isNaN(intent.from.getTime()), `Invalid from date for ${question}`);
  assert(intent.toExclusive instanceof Date && !Number.isNaN(intent.toExclusive.getTime()), `Invalid toExclusive date for ${question}`);
}

assertIntent('Doanh thu thang nay?', { metric: 'revenue', itemName: '', rangeLabel: 'thang nay' });
assertIntent('Thang nay ban duoc bao nhieu', { metric: 'summary', itemName: '', rangeLabel: 'thang nay' });

assert(indexSource.includes('function tryAnswerTelegramMenuDataQuestion'), 'Missing deterministic menu price handler');
assert(indexSource.includes('function isTelegramMenuDataQuestion'), 'Missing menu price intent detector');
assert(indexSource.includes('gia bao nhieu|bao nhieu tien|gia may|gia mon'), 'Menu price detector must catch gia bao nhieu');
assert(indexSource.includes('const menuDataReply = await tryAnswerTelegramMenuDataQuestion(userText);'), 'Telegram text route must try menu handler before Gemini');
assert(indexSource.includes('const smartReportReply = (menuDataReply || proactiveReply || financeReportReply) ? null : await tryAnswerTelegramSmartReportQuestion(userText);'), 'Telegram text route must try deterministic smart reports before Gemini');
assert(indexSource.includes('sendTelegramInlineMessage({'), 'Report replies with chart buttons must be sent through Telegram inline sender');
assert(indexSource.includes('sendTelegramTextMessage({'), 'Webhook must have text fallback sender');
assert(indexSource.includes('telegramWebhook failed'), 'Webhook must log hard failures');

console.log('OK telegram owner assistant regression routes verified');
