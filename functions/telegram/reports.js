'use strict';

/**
 * Pure Telegram report helper utilities.
 * No external dependencies beyond basic JS and Intl APIs.
 */

function getVietnamDateParts(date = new Date()) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = dtf.formatToParts(date);
  const map = {};
  parts.forEach(part => {
    if (part.type !== 'literal') map[part.type] = part.value;
  });
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

function normalizeTelegramSmartReportText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTelegramWildcardText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9?\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildTelegramWildcardRegex(value = '') {
  const normalized = normalizeTelegramWildcardText(value);
  if (!normalized || !normalized.includes('?')) return null;
  const escaped = normalized.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
  const pattern = escaped
    .replace(/\s+/g, '\\s+')
    .replace(/(?:\\?\?)+/g, '[a-z0-9]{0,3}');
  if (!pattern) return null;
  return new RegExp('^' + pattern + '$', 'i');
}

function parseTelegramLooseDateTime(value = '', fallbackNow = new Date()) {
  const raw = normalizeTelegramSmartReportText(value);
  if (!raw) return null;
  if (['bay gio', 'hien tai', 'luc nay', 'now'].includes(raw)) return fallbackNow;

  const relativeMatch = raw.match(/^(?:(\d{1,2})(?::(\d{1,2}))?|(\d{1,2})h(?:(\d{1,2}))?)?\s*(?:ngay\s*)?(hom nay|hom qua)$/i);
  if (relativeMatch) {
    const nowParts = getVietnamDateParts(fallbackNow);
    const hour = Number(relativeMatch[1] || relativeMatch[3] || 0);
    const minute = Number(relativeMatch[2] || relativeMatch[4] || 0);
    const dayOffset = String(relativeMatch[5] || '').trim() === 'hom qua' ? -1 : 0;
    const localDate = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day + dayOffset, hour, minute, 0) - 7 * 60 * 60 * 1000);
    return Number.isNaN(localDate.getTime()) ? null : localDate;
  }

  const match = raw.match(
    /(?:(\d{1,2})(?::(\d{1,2}))?|(\d{1,2})h(?:(\d{1,2}))?)?\s*(?:ngay\s*)?(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/i,
  );
  if (!match) return null;

  const nowParts = getVietnamDateParts(fallbackNow);
  const hour = Number(match[1] || match[3] || 0);
  const minute = Number(match[2] || match[4] || 0);
  const day = Number(match[5] || 0);
  const month = Number(match[6] || 0);
  let year = Number(match[7] || nowParts.year);
  if (year > 0 && year < 100) year += 2000;
  if (!day || !month || !year) return null;

  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - 7 * 60 * 60 * 1000);
}

function getInclusiveVietnamDateCount(fromYmd, toYmd) {
  const start = new Date(String(fromYmd || '').trim() + 'T00:00:00');
  const end = new Date(String(toYmd || '').trim() + 'T00:00:00');
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 1;
  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
}

function formatAchievementPercent(value = 0, target = 0) {
  const safeTarget = Math.max(Number(target || 0) || 0, 1);
  const percent = ((Number(value || 0) || 0) / safeTarget) * 100;
  return percent.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + '%';
}

function buildMorningRevenueMood(report = {}) {
  const target = Number(report.targetRevenueForRange || 0) || 0;
  const revenue = Number(report.revenue || 0) || 0;
  const percent = target > 0 ? (revenue / target) * 100 : 0;

  if (target <= 0) {
    return 'Hôm nay em chưa dám gáy vì Sprint 0 chưa cấu hình target doanh thu. Mình đặt target trước để bot tự soi cho chuẩn nhé.';
  }
  if (percent >= 120) {
    return 'Hôm nay xin phép gáy thật to: quán đang vượt target rất đẹp, đội mình chạy bài và chốt đơn quá bén.';
  }
  if (percent >= 100) {
    return 'Tin vui đầu ngày: đã chạm target doanh thu rồi, cứ giữ nhịp này là có quyền ngẩng cao đầu.';
  }
  if (percent >= 80) {
    return 'Đang bám target khá sát rồi, chỉ cần rướn thêm một nhịp nữa là chạm mốc đẹp.';
  }
  if (percent >= 60) {
    return 'Hôm nay hơi thiếu lửa một chút, chưa tệ nhưng cũng chưa đủ để gáy. Cần siết lại nội dung, offer và tốc độ chốt đơn.';
  }
  return 'Hôm nay em tự nhận là chưa làm tốt. Doanh thu còn dưới 60% target, lỗi tại em chưa kéo khách đủ mạnh. Em cần cố gắng hơn nữa để bù lại cho quán.';
}

module.exports = {
  getVietnamDateParts,
  normalizeTelegramSmartReportText,
  normalizeTelegramWildcardText,
  buildTelegramWildcardRegex,
  parseTelegramLooseDateTime,
  getInclusiveVietnamDateCount,
  formatAchievementPercent,
  buildMorningRevenueMood,
};
