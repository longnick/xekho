const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.resolve(__dirname, 'index.js'), 'utf8');
const between = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));

describe('R2 callable authorization wiring', () => {
  test.each(['manageUserAccount', 'askPosChatbot', 'approveOnlineOrder', 'rejectOnlineOrder'])('%s export wires handler factory', name => {
    const handler = between(`exports.${name} = onCall`, name === 'rejectOnlineOrder' ? 'async function closePosOrderFromTelegram' : `exports.${{
      manageUserAccount: 'askPosChatbot', askPosChatbot: 'approveOnlineOrder', approveOnlineOrder: 'rejectOnlineOrder',
    }[name]} = onCall`);
    expect(source).toContain('const r2CallableHandlers = makeCallableHandlers({');
    expect(handler).toContain(`r2CallableHandlers.${name}(request)`);
  });

  test('approve preserves already-processed idempotency path', () => {
    const internal = between('async function approveOnlineOrderInternal', 'async function rejectOnlineOrderInternal');
    expect(internal).toContain('alreadyProcessed: true');
    expect(internal).toContain("['approved', 'preparing', 'ready_to_serve', 'delivering', 'completed']");
  });

  test('reject preserves already-rejected idempotency path', () => {
    const internal = between('async function rejectOnlineOrderInternal', 'function mapHistoryItemsToCustomerBill');
    expect(internal).toContain("['cancelled', 'rejected'].includes(currentStatus)");
    expect(internal).toContain('return;');
  });
});
