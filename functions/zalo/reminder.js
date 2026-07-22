const OPENING_CHECKLIST_TEXT = `Chuẩn bị mở ca:
- Mở app, chấm công
- Sắp xếp ly, chén, dĩa
- Dọn vệ sinh, lau bàn ghế
- Soạn hàng: đồ khô, nước đá
- Mở đèn, nhạc
- Đốt than`;

async function sendZaloBotText({ botToken, chatId, text = OPENING_CHECKLIST_TEXT, fetchImpl = fetch } = {}) {
  const token = String(botToken || '').trim();
  const targetChatId = String(chatId || '').trim();
  if (!token) throw new Error('Missing Zalo Bot token');
  if (!targetChatId) throw new Error('Missing Zalo Bot chat ID');

  const response = await fetchImpl(`https://bot-api.zaloplatforms.com/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: targetChatId, text: String(text || '').trim() }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok !== true) {
    throw new Error(`Zalo Bot send failed (${response.status || data?.error_code || 'unknown'})`);
  }
  return { messageId: String(data?.result?.message_id || '').trim() };
}

module.exports = { OPENING_CHECKLIST_TEXT, sendZaloBotText };
