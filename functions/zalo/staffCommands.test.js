const { parseStaffCommand, buildStaffCommandReply } = require('./staffCommands');

describe('Zalo staff group commands', () => {
  test('recognizes Vietnamese opening and closing commands despite a bot mention', () => {
    expect(parseStaffCommand('@Bot XeKhoChuaLanh mở ca')).toBe('open');
    expect(parseStaffCommand('@Bot XeKhoChuaLanh dong ca')).toBe('close');
  });

  test('returns short operational checklists and a discoverable help response', () => {
    expect(buildStaffCommandReply('open')).toContain('Chuẩn bị mở ca:');
    expect(buildStaffCommandReply('close')).toContain('Checklist đóng ca:');
    expect(buildStaffCommandReply('help')).toContain('mở ca');
  });

  test('does not act on unrelated group text', () => {
    expect(parseStaffCommand('Hôm nay đông khách quá')).toBeNull();
    expect(buildStaffCommandReply(null)).toBeNull();
  });
});
