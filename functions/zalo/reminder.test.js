const { OPENING_CHECKLIST_TEXT, sendZaloBotText } = require('./reminder');

describe('Zalo opening checklist reminder', () => {
  test('sends the agreed Vietnamese opening checklist to the captured group', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 'sent-1' } }),
    });

    await expect(sendZaloBotText({
      botToken: 'bot-token',
      chatId: 'zgr-test',
      fetchImpl,
    })).resolves.toEqual({ messageId: 'sent-1' });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://bot-api.zaloplatforms.com/botbot-token/sendMessage',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: 'zgr-test', text: OPENING_CHECKLIST_TEXT }),
      }),
    );
    expect(OPENING_CHECKLIST_TEXT).toContain('Chuẩn bị mở ca:');
    expect(OPENING_CHECKLIST_TEXT).toContain('- Đốt than');
  });

  test('fails without sending when the Bot API rejects the message', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ ok: false, error_code: 403 }) });
    await expect(sendZaloBotText({ botToken: 'bot-token', chatId: 'zgr-test', fetchImpl })).rejects.toThrow('Zalo Bot send failed (403)');
  });
});
