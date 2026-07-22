const {
  constantTimeEqual,
  summarizeWebhookEvent,
  summarizeWebhookShape,
  createZaloWebhookHandler,
} = require('./webhook');

function makeResponse() {
  return {
    statusCode: 0,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

const TEST_WEBHOOK_VALUE = ['fixture', 'webhook', 'value'].join('-');

function makeRequest({ method = 'POST', headerValue = TEST_WEBHOOK_VALUE, body, contentLength = '200' } = {}) {
  return {
    method,
    headers: {
      'x-bot-api-secret-token': headerValue,
      'content-length': contentLength,
    },
    body: body || {
      ok: true,
      result: {
        event_name: 'message.text.received',
        message: {
          message_id: 'message-1',
          from: { id: 'staff-1', display_name: 'Private Person' },
          chat: { id: 'group-1', chat_type: 'GROUP' },
          text: 'Private message body must not be logged',
        },
      },
    },
  };
}

describe('Zalo webhook boundary', () => {
  test('uses constant-time equality and summarizes no message content', () => {
    expect(constantTimeEqual('same', 'same')).toBe(true);
    expect(constantTimeEqual('same', 'different')).toBe(false);
    expect(constantTimeEqual('', '')).toBe(false);
    expect(summarizeWebhookShape(makeRequest().body)).toEqual(expect.objectContaining({
      bodyKeys: ['ok', 'result'], usesResultEnvelope: true, eventName: 'message.text.received', chatType: 'GROUP', hasChatId: true,
    }));
    // Live Bot Platform callbacks omit the documented { ok, result } envelope.
    const liveBody = makeRequest().body.result;
    expect(summarizeWebhookEvent(liveBody)).toEqual({
      eventName: 'message.text.received', messageId: 'message-1', chatId: 'group-1', chatType: 'GROUP', senderId: 'staff-1',
    });
    expect(summarizeWebhookShape(liveBody)).toEqual(expect.objectContaining({ usesResultEnvelope: false, hasChatId: true }));
  });

  test('accepts a valid signed event, dispatches text without logging it, and logs metadata only', async () => {
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const onEvent = jest.fn();
    const response = makeResponse();
    await createZaloWebhookHandler({ getSecret: () => TEST_WEBHOOK_VALUE, logger, onEvent })(makeRequest(), response);
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Success' });
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: expect.objectContaining({ chatId: 'group-1', chatType: 'GROUP' }),
      messageText: 'Private message body must not be logged',
    }));
    expect(logger.info).toHaveBeenCalledWith('zalo_webhook_received', expect.objectContaining({ chatId: 'group-1', chatType: 'GROUP' }));
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain('Private message body');
  });

  test('rejects invalid secret and malformed payload', () => {
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const handler = createZaloWebhookHandler({ getSecret: () => TEST_WEBHOOK_VALUE, logger });
    const invalidSecret = makeResponse();
    handler(makeRequest({ headerValue: 'wrong' }), invalidSecret);
    expect(invalidSecret.statusCode).toBe(403);

    const invalidPayload = makeResponse();
    handler(makeRequest({ body: { ok: true, result: {} } }), invalidPayload);
    expect(invalidPayload.statusCode).toBe(400);
  });
});
