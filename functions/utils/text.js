/**
 * Sprint 2.2: Pure text/formatting utilities extracted from functions/index.js
 *
 * No external dependencies — all pure functions.
 * Loaded via require() in functions/index.js.
 */
'use strict';

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function escapeTelegramHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeXml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function scoreTelegramTextQuality(text = '') {
  const value = String(text || '');
  let score = 0;
  score += (value.match(/\uFFFD/g) || []).length * 4;
  score -= (value.match(/[À-ỹĐđ]/g) || []).length * 2;
  return score;
}

function fixTelegramMojibake(text = '') {
  return String(text || '');
}

function normalizeTelegramText(value = '') {
  return fixTelegramMojibake(String(value || '')).replace(/\s+\n/g, '\n').trim();
}

function normalizeTelegramTextPreserveLines(value = '') {
  return fixTelegramMojibake(String(value || ''))
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n');
}

function formatCurrencyVi(amount) {
  return `${Number(amount || 0).toLocaleString('vi-VN')}đ`;
}

function formatQtyVi(amount) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value - Math.round(value)) < 1e-9) return Math.round(value).toLocaleString('vi-VN');
  return value.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function getTelegramProductDisplayName(product = {}, fallback = 'Món') {
  return normalizeTelegramText(
    String(product.display_name || product.name || fallback || 'Món').trim() || fallback,
  );
}

function shouldPreferTelegramCatalogName(currentName = '', product = {}) {
  const candidate = String(currentName || '').trim();
  const catalogName = String(product.display_name || product.name || '').trim();
  if (!catalogName) return false;
  if (!candidate) return true;
  if (candidate.includes('\uFFFD')) return true;
  if (!/[À-ỹĐđ]/.test(candidate) && /[À-ỹĐđ]/.test(catalogName)) return true;
  return false;
}

module.exports = {
  chunkArray,
  escapeTelegramHtml,
  escapeXml,
  scoreTelegramTextQuality,
  fixTelegramMojibake,
  normalizeTelegramText,
  normalizeTelegramTextPreserveLines,
  formatCurrencyVi,
  formatQtyVi,
  getTelegramProductDisplayName,
  shouldPreferTelegramCatalogName,
};
