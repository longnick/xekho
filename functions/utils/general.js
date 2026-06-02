// @ts-check
/**
 * Phase 10: General-purpose utility functions extracted from functions/index.js
 *
 * Pure helpers — no db/admin dependencies.
 * Loaded via require() in functions/index.js.
 */
'use strict';

const telegramAds = require('../telegram/ads');

/**
 * Send a JSON HTTP response.
 * @param {any} res
 * @param {number} code
 * @param {any} data
 */
function json(res, code, data) {
  res.status(code).set('Content-Type', 'application/json; charset=utf-8').send(JSON.stringify(data));
}

/**
 * Wrap text into lines that fit within a character limit (for SVG rendering).
 * @param {string} text
 * @param {number} limit
 * @returns {string[]}
 */
function wrapSvgText(text, limit = 36) {
  const normalized = String(text || '').trim();
  if (!normalized) return [''];
  const words = normalized.split(/\s+/);
  const lines = [];
  let current = '';
  words.forEach(word => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= limit) current = next;
    else {
      if (current) lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

/**
 * Strip the data-URL base64 prefix from a value.
 * @param {string} value
 * @returns {string}
 */
function stripDataUrlBase64(value = '') {
  return String(value || '').replace(/^data:[^;]+;base64,/i, '').trim();
}

/**
 * Extract the first JSON object found inside arbitrary text.
 * @param {string} text
 * @returns {any|null}
 */
function extractFirstJson(text = '') {
  const source = String(text || '').trim();
  if (!source) return null;

  const firstBraceIndex = source.indexOf('{');
  if (firstBraceIndex < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = firstBraceIndex; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        const candidate = source.slice(firstBraceIndex, index + 1);
        try {
          return JSON.parse(candidate);
        } catch (_) {
          return null;
        }
      }
    }
  }

  return null;
}

/**
 * Map tool action type strings to canonical forms.
 * @param {string} actionType
 * @returns {string}
 */
function mapToolActionType(actionType = '') {
  const raw = String(actionType || '').trim();
  if (raw === 'goi_mon_ban') return 'goi_mon';
  if (raw === 'nhap_hang_thu_cong') return 'nhap_hang';
  return raw || 'unknown';
}

/**
 * Extract table number from text (local helper for buildAiRouterPendingResponse).
 */
function extractTable(text) {
  const t = telegramAds.normalizeVi(text);
  const m = t.match(/\bban\s*(?:so\s*)?(\d+)\b/);
  if (!m) return null;
  return String(parseInt(m[1], 10));
}

/**
 * Build a pending-confirmation response for AI router tool calls.
 * @param {Object} toolResult
 * @param {string} originalText
 * @returns {Object}
 */
function buildAiRouterPendingResponse(toolResult = {}, originalText = '') {
  const actionType = String(toolResult.actionType || toolResult.tool || '').trim();
  const payload = { ...(toolResult.payload || {}) };
  let preview = toolResult.preview || '';
  if (actionType === 'goi_mon_ban') {
    if (!String(payload.ban || '').trim()) {
      const table = extractTable(originalText);
      const fallbackTable = String(originalText || '').match(/\d+/)?.[0] || '';
      if (table || fallbackTable) payload.ban = table || fallbackTable;
    }
    if (Array.isArray(payload.items) && payload.items.length > 1) {
      const ghostNames = new Set((Array.isArray(toolResult.suggested_items) ? toolResult.suggested_items : [])
        .filter(item => telegramAds.normalizeVi(item?.ten_mon_ai || '') === 'goi')
        .map(item => telegramAds.normalizeVi(item?.ten_mon_chinh_ta || ''))
        .filter(Boolean));
      payload.items = payload.items.filter((item) => {
        const name = telegramAds.normalizeVi(item?.ten_mon || item?.name || '');
        if (name === 'goi') return false;
        if (ghostNames.has(name)) return false;
        return true;
      });
    }
    const count = Array.isArray(payload.items) ? payload.items.length : 0;
    preview = `Lên order ${payload.ban ? `bàn ${payload.ban}` : ''}: ${count} món`;
  }
  return {
    ok: true,
    status: 'pending_confirmation',
    message: String(preview ? `Cần xác nhận trước khi thực hiện: ${preview}` : (toolResult.message || 'Cần xác nhận trước khi thực hiện thao tác này.')),
    action_type: mapToolActionType(actionType),
    tool: actionType,
    payload,
    preview,
    validation_summary: toolResult.validation_summary || null,
    suggested_items: toolResult.suggested_items || null,
    rejected_items: toolResult.rejected_items || null,
  };
}

module.exports = {
  json,
  wrapSvgText,
  stripDataUrlBase64,
  extractFirstJson,
  mapToolActionType,
  buildAiRouterPendingResponse,
};
