// @ts-check
'use strict';

const axios = /** @type {any} */ (require('axios'));
const { normalizeTelegramTextPreserveLines, normalizeTelegramText } = require('../utils/text');

/**
 * @param {{chatId: string, text: string, botToken: string}} params
 * @returns {Promise<any>}
 */
async function sendTelegramHtmlMessage({ chatId, text, botToken }) {
  const finalBotToken = String(botToken || '').trim();
  const finalChatId = String(chatId || '').trim();
  if (!finalBotToken || !finalChatId) {
    throw new Error('Missing Telegram bot token or chat id');
  }

  const response = await axios.post(
    `https://api.telegram.org/bot${finalBotToken}/sendMessage`,
    {
      chat_id: finalChatId,
      text: normalizeTelegramTextPreserveLines(text).slice(0, 3900),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );

  if (response?.data?.ok !== true) {
    throw new Error(`Telegram API returned not ok: ${JSON.stringify(response?.data || {})}`);
  }

  return response.data;
}

/**
 * @param {{chatId: string, text: string, botToken: string}} params
 * @returns {Promise<any>}
 */
async function sendTelegramTextMessage({ chatId, text, botToken }) {
  const finalBotToken = String(botToken || '').trim();
  const finalChatId = String(chatId || '').trim();
  if (!finalBotToken || !finalChatId) {
    throw new Error('Missing Telegram bot token or chat id');
  }

  const response = await axios.post(
    `https://api.telegram.org/bot${finalBotToken}/sendMessage`,
    {
      chat_id: finalChatId,
      text: normalizeTelegramTextPreserveLines(String(text || '')).slice(0, 3900),
      disable_web_page_preview: true,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );

  if (response?.data?.ok !== true) {
    throw new Error(`Telegram API returned not ok: ${JSON.stringify(response?.data || {})}`);
  }

  return response.data;
}

/**
 * @param {{chatId: string, text: string, actionDocId: string, botToken: string}} params
 * @returns {Promise<any>}
 */
async function sendTelegramActionConfirmation({ chatId, text, actionDocId, botToken }) {
  const finalBotToken = String(botToken || '').trim();
  const finalChatId = String(chatId || '').trim();
  const docId = String(actionDocId || '').trim();
  if (!finalBotToken || !finalChatId || !docId) {
    throw new Error('Missing Telegram bot token, chat id or action doc id');
  }

  const response = await axios.post(
    `https://api.telegram.org/bot${finalBotToken}/sendMessage`,
    {
      chat_id: finalChatId,
      text: normalizeTelegramTextPreserveLines(String(text || '')).slice(0, 3900),
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [[
          { text: '\u2705 X\u00e1c nh\u1eadn', callback_data: `confirm_${docId}` },
          { text: '\u274c H\u1ee7y', callback_data: `cancel_${docId}` },
        ]],
      },
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
  );

  if (response?.data?.ok !== true) {
    throw new Error(`Telegram API returned not ok: ${JSON.stringify(response?.data || {})}`);
  }

  return response.data;
}

/**
 * @param {{chatId: string, text: string, buttons?: any[], botToken: string, parseMode?: string}} params
 * @returns {Promise<any>}
 */
async function sendTelegramInlineMessage({ chatId, text, buttons = [], botToken, parseMode = 'HTML' }) {
  const finalBotToken = String(botToken || '').trim();
  const finalChatId = String(chatId || '').trim();
  if (!finalBotToken || !finalChatId) {
    throw new Error('Missing Telegram bot token or chat id');
  }

  const inline_keyboard = Array.isArray(buttons)
    ? buttons
        .map(row => (Array.isArray(row)
          ? row.map(button => ({ ...button, text: normalizeTelegramText(button?.text || '') }))
          : []))
        .filter(row => row.length > 0)
    : [];

  const response = await axios.post(
    `https://api.telegram.org/bot${finalBotToken}/sendMessage`,
    {
      chat_id: finalChatId,
      text: normalizeTelegramTextPreserveLines(String(text || '')).slice(0, 3900),
      parse_mode: parseMode,
      disable_web_page_preview: true,
      reply_markup: inline_keyboard.length ? { inline_keyboard } : undefined,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );

  if (response?.data?.ok !== true) {
    throw new Error(`Telegram API returned not ok: ${JSON.stringify(response?.data || {})}`);
  }

  return response.data;
}

/**
 * @param {{chatId: string, photo: string, caption?: string, botToken: string, parseMode?: string, buttons?: any[]}} params
 * @returns {Promise<any>}
 */
async function sendTelegramPhotoMessage({ chatId, photo, caption = '', botToken, parseMode = 'HTML', buttons = [] }) {
  const finalBotToken = String(botToken || '').trim();
  const finalChatId = String(chatId || '').trim();
  const finalPhoto = String(photo || '').trim();
  if (!finalBotToken || !finalChatId || !finalPhoto) {
    throw new Error('Missing Telegram bot token, chat id or photo');
  }

  const response = await axios.post(
    `https://api.telegram.org/bot${finalBotToken}/sendPhoto`,
    {
      chat_id: finalChatId,
      photo: finalPhoto,
      caption: normalizeTelegramTextPreserveLines(String(caption || '')).slice(0, 1000),
      parse_mode: parseMode,
      reply_markup: Array.isArray(buttons) && buttons.length
        ? {
            inline_keyboard: buttons.map(row => (Array.isArray(row)
              ? row.map(button => ({ ...button, text: normalizeTelegramText(button?.text || '') }))
              : [])),
          }
        : undefined,
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    }
  );

  if (response?.data?.ok !== true) {
    throw new Error(`Telegram API returned not ok: ${JSON.stringify(response?.data || {})}`);
  }

  return response.data;
}

/**
 * @param {{callbackQueryId: string, text: string, botToken: string}} params
 * @returns {Promise<any>}
 */
async function answerTelegramCallback({ callbackQueryId, text, botToken }) {
  if (!callbackQueryId) return null;
  return axios.post(
    `https://api.telegram.org/bot${botToken}/answerCallbackQuery`,
    {
      callback_query_id: callbackQueryId,
      text: normalizeTelegramText(String(text || '')).slice(0, 180),
      show_alert: false,
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
  ).catch(() => null);
}

/**
 * @param {{chatId: string, messageId: string, text: string, botToken: string}} params
 * @returns {Promise<any>}
 */
async function editTelegramMessage({ chatId, messageId, text, botToken }) {
  if (!chatId || !messageId) return null;
  return axios.post(
    `https://api.telegram.org/bot${botToken}/editMessageText`,
    {
      chat_id: chatId,
      message_id: messageId,
      text: normalizeTelegramTextPreserveLines(String(text || '')).slice(0, 3900),
      reply_markup: { inline_keyboard: [] },
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
  ).catch(() => null);
}

/**
 * @param {{chatId: string, messageId: string, text: string, buttons?: any[], botToken: string, parseMode?: string}} params
 * @returns {Promise<any>}
 */
async function editTelegramInlineMessage({ chatId, messageId, text, buttons = [], botToken, parseMode = 'HTML' }) {
  if (!chatId || !messageId) return null;
  return axios.post(
    `https://api.telegram.org/bot${botToken}/editMessageText`,
    {
      chat_id: chatId,
      message_id: messageId,
      text: normalizeTelegramTextPreserveLines(String(text || '')).slice(0, 3900),
      parse_mode: parseMode,
      disable_web_page_preview: true,
      reply_markup: Array.isArray(buttons) && buttons.length
        ? {
            inline_keyboard: buttons.map(row => (Array.isArray(row)
              ? row.map(button => ({ ...button, text: normalizeTelegramText(button?.text || '') }))
              : [])),
          }
        : { inline_keyboard: [] },
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
  ).catch(() => null);
}

/**
 * @param {{botToken: string, photo: any[]}} params
 * @returns {Promise<{base64: string, mimeType: string}>}
 */
async function getTelegramPhotoAsBase64({ botToken, photo }) {
  const list = Array.isArray(photo) ? photo : [];
  if (!list.length) throw new Error('Telegram photo is empty');
  const best = list.slice().sort((a, b) => Number(b.file_size || 0) - Number(a.file_size || 0))[0];
  const fileId = String(best.file_id || '').trim();
  if (!fileId) throw new Error('Missing Telegram file_id');

  const fileRes = await axios.get(
    `https://api.telegram.org/bot${botToken}/getFile`,
    { params: { file_id: fileId }, timeout: 15000 }
  );
  const filePath = String(fileRes?.data?.result?.file_path || '').trim();
  if (!filePath) throw new Error('Telegram getFile did not return file_path');

  const imageRes = await axios.get(
    `https://api.telegram.org/file/bot${botToken}/${filePath}`,
    { responseType: 'arraybuffer', timeout: 30000 }
  );
  const headerMimeType = String(imageRes.headers?.['content-type'] || '').split(';')[0].trim().toLowerCase();
  const normalizedPath = String(filePath || '').toLowerCase();
  const inferredMimeType = normalizedPath.endsWith('.png')
    ? 'image/png'
    : normalizedPath.endsWith('.webp')
      ? 'image/webp'
      : normalizedPath.endsWith('.gif')
        ? 'image/gif'
        : 'image/jpeg';
  const mimeType = headerMimeType && headerMimeType !== 'application/octet-stream'
    ? headerMimeType
    : inferredMimeType;
  return {
    base64: Buffer.from(imageRes.data).toString('base64'),
    mimeType,
  };
}

module.exports = {
  sendTelegramHtmlMessage,
  sendTelegramTextMessage,
  sendTelegramActionConfirmation,
  sendTelegramInlineMessage,
  sendTelegramPhotoMessage,
  answerTelegramCallback,
  editTelegramMessage,
  editTelegramInlineMessage,
  getTelegramPhotoAsBase64,
};
