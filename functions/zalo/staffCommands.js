const { OPENING_CHECKLIST_TEXT } = require('./reminder');

const CLOSING_CHECKLIST_TEXT = `Checklist đóng ca:
- Kiểm tra và chốt các đơn còn lại
- Dọn bàn ghế, khu pha chế và khu bếp
- Rửa, úp gọn ly, chén, dĩa
- Kiểm tra đồ khô, nước đá và báo thiếu hàng
- Tắt đèn, nhạc, thiết bị không cần thiết
- Chốt công cuối ca`;

function normalizeCommandText(text = '') {
  return String(text)
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseStaffCommand(text = '') {
  const value = normalizeCommandText(text);
  if (!value) return null;
  if (/\bmo ca\b/.test(value)) return 'open';
  if (/\bdong ca\b/.test(value)) return 'close';
  if (/\b(help|huong dan|tro giup|lenh)\b/.test(value)) return 'help';
  return null;
}

function buildStaffCommandReply(command) {
  if (command === 'open') return OPENING_CHECKLIST_TEXT;
  if (command === 'close') return CLOSING_CHECKLIST_TEXT;
  if (command === 'help') {
    return `Lệnh nhân viên:\n- @Bot mở ca — gửi checklist chuẩn bị mở ca\n- @Bot đóng ca — gửi checklist đóng ca\n- @Bot help — xem lại hướng dẫn\n\nTrong group, hãy mention Bot hoặc trả lời tin nhắn của Bot để Bot nhận lệnh.`;
  }
  return null;
}

module.exports = {
  CLOSING_CHECKLIST_TEXT,
  normalizeCommandText,
  parseStaffCommand,
  buildStaffCommandReply,
};
