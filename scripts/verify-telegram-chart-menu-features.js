'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const indexSource = fs.readFileSync(path.join(root, 'functions', 'index.js'), 'utf8');
const sendSource = fs.readFileSync(path.join(root, 'functions', 'telegram', 'send.js'), 'utf8');

assert(sendSource.includes('async function sendTelegramPhotoBuffer'), 'Telegram send helper must support photo buffers for chart images');
assert(sendSource.includes('new Blob([new Uint8Array(photoBuffer)]'), 'Photo-buffer sender must upload multipart Blob data');
assert(sendSource.includes('sendTelegramPhotoBuffer,'), 'Photo-buffer sender must be exported');
assert(indexSource.includes('function createTelegramChartRequest'), 'Chart request persistence helper is missing');
assert(indexSource.includes("db.collection('telegram_chart_requests')"), 'Chart requests must be persisted in Firestore');
assert(indexSource.includes('function handleTelegramChartCallback'), 'Chart callback handler is missing');
assert(indexSource.includes('sendTelegramPhotoBuffer({'), 'Chart callback must send rendered PNG as photo');
assert(indexSource.includes('function tryAnswerTelegramProactiveOwnerInsight'), 'Proactive owner insight handler is missing');
assert(indexSource.includes('So sánh kinh doanh tháng này vs cùng kỳ tháng trước'), 'Proactive comparison title is missing');
assert(indexSource.includes('function tryAnswerTelegramMenuDataQuestion'), 'Menu price/image handler is missing');
assert(indexSource.includes('data.image_url || data.imageUrl || data.realImageUrl'), 'Menu image URL extraction is missing');
assert(indexSource.includes('inlineButtons'), 'Telegram responses must carry inline buttons');
assert(indexSource.includes('sendTelegramInlineMessage({'), 'Final response path must send inline button messages');
assert(indexSource.includes('sendTelegramPhotoMessage({'), 'Final response path must support menu photos');

console.log('OK telegram chart/menu/proactive features verified');
