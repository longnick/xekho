'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const indexSource = fs.readFileSync(path.join(root, 'functions/index.js'), 'utf8');
const megaSource = fs.readFileSync(path.join(root, 'functions/firestoreMegaTools.js'), 'utf8');

assert(
  indexSource.includes('function getTelegramKitchenNewOrderBotToken()'),
  'missing dedicated kitchen new-order bot token resolver'
);
assert(
  /function getTelegramKitchenNewOrderBotToken\(\)[\s\S]*TELEGRAM_KITCHEN_READY_BOT_TOKEN\.value\(\)[\s\S]*TELEGRAM_BOT_TOKEN\.value\(\)[\s\S]*TELEGRAM_REPORT_BOT_TOKEN\.value\(\)/.test(indexSource),
  'kitchen new-order bot token must prefer kitchen bot, then default bot, then report bot fallback'
);
assert(
  /function getTelegramKitchenNewOrderChatId\(\)[\s\S]*TELEGRAM_KITCHEN_READY_CHAT_ID\.value\(\)[\s\S]*KITCHEN_NEW_ORDER_TELEGRAM_CHAT_ID\.value\(\)[\s\S]*TELEGRAM_GROUP_CHAT_ID\.value\(\)/.test(indexSource),
  'kitchen new-order chat resolver must prefer known kitchen-ready chat before legacy group/new-order chat ids'
);
assert(
  /async function sendKitchenNewOrderTelegram[\s\S]*const botToken = getTelegramKitchenNewOrderBotToken\(\);[\s\S]*const chatId = getTelegramKitchenNewOrderChatId\(\);/.test(indexSource),
  'sendKitchenNewOrderTelegram must use kitchen token/chat resolvers'
);
assert(
  /if \(confirmMatch\)[\s\S]*sendKitchenTelegramForExecutedOrder\(result\)[\s\S]*const executedActionMessage = buildTelegramExecutedActionMessage\(actionDocId, result, kitchenResult\)[\s\S]*sendTelegramTextMessage\(\{[\s\S]*chatId: callbackChatId[\s\S]*text: executedActionMessage/.test(indexSource),
  'confirm callback must synchronously send kitchen Telegram and send a fresh owner confirmation message'
);
assert(
  !indexSource.includes('MÃ£: ${actionDocId}') && !indexSource.includes('MÃ£: ${targetId}'),
  'known mojibake label MÃ£ must not remain in confirm/customer callback text'
);
assert(
  indexSource.includes('M\\u00e3: ${actionDocId}') || indexSource.includes('Mã: ${actionDocId}'),
  'generic confirm message must use clean Ma label'
);
assert(
  megaSource.includes('items: resolvedItems'),
  'executeOrderAction must return resolved items so confirm callback can notify kitchen synchronously'
);

console.log(JSON.stringify({ ok: true, checked: 'telegram-confirm-order-flow' }));
