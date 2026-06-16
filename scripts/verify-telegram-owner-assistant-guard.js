'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'functions', 'index.js'), 'utf8');

function count(pattern) {
  const matches = source.match(pattern);
  return matches ? matches.length : 0;
}

assert(source.includes("const DEFAULT_TELEGRAM_OWNER_CHAT_ID = '6496387732';"), 'default owner Telegram id must be pinned to the owner DM id');
assert(source.includes("const TELEGRAM_ASSISTANT_BOT_NAME = defineString('TELEGRAM_ASSISTANT_BOT_NAME'"), 'assistant bot name runtime config is missing');
assert(source.includes('function getTelegramAssistantBotToken()'), 'assistant bot token resolver is missing');
assert(source.includes('TELEGRAM_REPORT_BOT_TOKEN.value()\n    || TELEGRAM_BOT_TOKEN.value()'), 'assistant webhook must use report/assistant bot token before generic bot token');
assert(!source.includes('function getTelegramAssistantBotToken() {\n  return String(\n    TELEGRAM_REPORT_BOT_TOKEN.value()\n    || TELEGRAM_KITCHEN_READY_BOT_TOKEN.value()'), 'assistant webhook must not fall back to kitchen bot token');
assert(source.includes('function isTelegramOwnerContext(context = {})'), 'owner allowlist helper is missing');
assert(source.includes('function buildTelegramOwnerOnlyMessage()'), 'owner-only rejection message helper is missing');
assert(source.includes('function rejectTelegramOwnerOnlyAccess({ chatId, botToken })'), 'owner-only rejection sender is missing');

assert(count(/skipped: 'owner-only-text-ai'/g) === 1, 'text AI branch must have exactly one owner-only guard');
assert(count(/skipped: 'owner-only-voice-ai'/g) === 1, 'voice AI branch must have exactly one owner-only guard');
assert(count(/skipped: 'owner-only-photo-ai'/g) === 1, 'non-order photo AI branch must have exactly one owner-only guard');
assert(count(/skipped: 'owner-only-ads-report'/g) === 1, 'ads report branch must have exactly one owner-only guard');
assert(source.includes('ownerOnlyAllowed: isTelegramOwnerContext(userContext)'), 'webhook log should record owner-only decision without secrets');
assert(source.includes('Xe Khô Chữa Lành'), 'assistant prompt must use exact shop name Xe Khô Chữa Lành');
assert(source.includes('function isTelegramAssistantCapabilityQuestion'), 'assistant capability question detector is missing');
assert(source.includes('không chỉ trả lời command cố định'), 'assistant capability response must explain open-ended behavior');
assert(source.includes('hôm qua bán bao nhiêu bia'), 'assistant prompt/capability response should cover natural item-sales questions');
assert(!source.includes('Xe Kho Chua Lanh'), 'assistant prompt must not use old unaccented/wrong shop name');

const tokenLine = "const botToken = getTelegramAssistantBotToken();";
assert(source.includes(tokenLine), 'telegramWebhook must use the assistant bot token resolver');
assert(source.indexOf(tokenLine) < source.indexOf('if (callbackQuery) {'), 'assistant bot token should be resolved at webhook entry');

console.log('OK telegram owner assistant guard verified');
