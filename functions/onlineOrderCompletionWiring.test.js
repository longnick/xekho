const fs = require('fs');
const path = require('path');
const onlineOrders = require('./telegram/online-orders');

const repo = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(repo, relativePath), 'utf8');
const between = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));

describe('online order completion money and Telegram reliability', () => {
  test('rejects a zero-price online item before POS order creation', () => {
    expect(() => onlineOrders.assertOnlineOrderPosItems([
      { id: 'bia-corona', name: 'Bia Corona', price: 0, qty: 1 },
    ])).toThrow('Đơn online có món chưa có giá hợp lệ: Bia Corona');
  });

  test('accepts positive online item prices and fixes delivering label', () => {
    expect(onlineOrders.assertOnlineOrderPosItems([
      { id: 'bia-corona', name: 'Bia Corona', price: 35000, qty: 1 },
    ])).toHaveLength(1);
    expect(onlineOrders.buildOnlineOrderTelegramStatusLabel('delivering')).toBe('ĐANG GIAO');
  });

  test('approval validates POS item prices before transaction writes', () => {
    const source = read('functions/index.js');
    const approval = between(source, 'async function approveOnlineOrderInternal', 'async function rejectOnlineOrderInternal');
    expect(approval).toContain('assertOnlineOrderPosItems(items.map');
    expect(approval.indexOf('assertOnlineOrderPosItems(items.map')).toBeLessThan(approval.indexOf('await db.runTransaction'));
  });

  test('history completion sync remains wired because order deletion skips update trigger', () => {
    const source = read('functions/index.js');
    const historyTrigger = between(source, 'exports.onHistoryFinalizeCustomerOrderRequests', 'exports.onHistoryOrderCancelled');
    expect(historyTrigger).toContain('syncOnlineOrderCompletedFromHistory(historyDoc)');
  });

  test('later POS updates cannot overwrite a terminal completed online order', () => {
    const source = read('functions/index.js');
    const sync = between(source, 'exports.syncOnlineOrderStatusFromPosOrder', 'exports.onPaymentRequestCreated');
    expect(sync).toContain("const currentOnlineStatus = String(matchedOnlineOrder.data?.status || '').trim().toLowerCase();");
    expect(sync).toContain("['completed', 'cancelled', 'rejected'].includes(currentOnlineStatus)) return;");
  });

  test('DB close snapshots transaction live order into history', () => {
    const source = read('db.js');
    const close = between(source, 'async close(orderId, payInfo)', '/**\n   * Hủy đơn');
    expect(close).toContain('const liveOrderSnap = await tx.get(orderRef)');
    expect(close).toContain('const liveOrder = liveOrderSnap.data()');
    expect(close).toContain('...liveOrder,');
    expect(close).not.toContain("items: [{ id: '', name: 'Món', price: 0");
  });

  test('online Telegram callback ACKs before approval work and logs edit failure', () => {
    const source = read('functions/index.js');
    const webhook = between(source, 'exports.telegramWebhook = onRequest', '\nexports.onOrderRequestCreated');
    const onlineCallback = between(webhook, 'if (onlineOrderApproveMatch || onlineOrderRejectMatch)', 'if (orderDraftConfirmMatch');
    expect(onlineCallback.indexOf('answerTelegramCallback')).toBeLessThan(onlineCallback.indexOf('approveOnlineOrderInternal'));
    expect(onlineCallback).toContain("logger.error('Telegram online-order message edit failed'");
  });

  test('index wrapper forwards canonical order instead of overwriting it', () => {
    const source = read('functions/index.js');
    const wrapper = between(source, 'function calculateOnlineOrderCompletionTotals', 'async function buildOnlineOrderInventoryDeductionMap');
    expect(wrapper).toContain('calculateOnlineOrderCompletionTotals(order);');
    expect(wrapper).not.toContain('return telegramOnlineOrders.calculateOnlineOrderCompletionTotals(order = {});');
  });

  test('completion totals percent discount before shipping and VAT', () => {
    expect(onlineOrders.calculateOnlineOrderCompletionTotals({
      items: [{ qty: 2, price: 100000 }], discount: 10, discountType: 'percent', shipping: 15000, vatAmount: 5000,
    })).toEqual({ subtotal: 200000, discountAmount: 20000, finalTotal: 200000 });
  });

  test('completion totals round percent discount and final VND total like POS API', () => {
    expect(onlineOrders.calculateOnlineOrderCompletionTotals({
      items: [{ qty: 1, price: 99999 }], discount: 12.5, discountType: 'percent', shipping: 1, vatAmount: 0,
    })).toEqual({ subtotal: 99999, discountAmount: 12500, finalTotal: 87500 });
  });

  test('server completion permits insufficient inventory but floors stock at zero', () => {
    const source = read('functions/index.js');
    const completion = between(source, 'async function completeOnlineOrderInternal', 'async function approveOnlineOrderInternal');
    expect(completion).not.toContain('currentQty < inventoryDeductions[snap.id]');
    expect(completion).toContain('tx.update(snap.ref, { current_stock: Math.max(0, currentQty - deductAmt) });');
  });

  test('server completion snapshots retail inventory cost then product cost fallback into history', () => {
    const source = read('functions/index.js');
    const deduction = between(source, 'async function buildOnlineOrderInventoryDeductionMap', 'function buildOnlineOrderTelegramStatusLabel');
    const completion = between(source, 'async function completeOnlineOrderInternal', 'async function approveOnlineOrderInternal');
    expect(deduction).toContain('costPerUnit');
    expect(deduction).toContain('product.cost');
    expect(deduction).toContain('item.cost');
    expect(completion).toContain('cost: canonicalItems.reduce((sum, item) => sum + (Number(item.cost) || 0) * item.qty, 0)');
  });

  test('completion totals VND discount before shipping and VAT', () => {
    expect(onlineOrders.calculateOnlineOrderCompletionTotals({
      items: [{ qty: 2, price: 100000 }], discount: 25000, discountType: 'vnd', shipping: 15000, vatAmount: 5000,
    })).toEqual({ subtotal: 200000, discountAmount: 25000, finalTotal: 195000 });
  });

  test('server completion transaction preserves explicit history money schema and inventory deduction', () => {
    const source = read('functions/index.js');
    const completion = between(source, 'async function completeOnlineOrderInternal', 'async function approveOnlineOrderInternal');
    expect(completion).toContain("db.collection('online_orders').doc(cleanOrderId)");
    expect(completion).toContain("db.collection('orders').doc(posOrderId)");
    expect(completion).toContain('await db.runTransaction');
    expect(completion).toContain('const canonicalOrder = posOrderSnap.data() || {};');
    expect(completion).toContain('assertCanonicalOnlineCompletionItems(canonicalOrder.items)');
    expect(completion).toContain('calculateOnlineOrderCompletionTotals({ ...canonicalOrder, items: canonicalItems })');
    expect(completion).toContain("billNo: `ONL-${String(onlineOrder.orderCode || '').trim() || cleanOrderId}`");
    ['cost:', 'taxRate:', 'discount:', 'discountType:', 'discountNote:', 'shipping:', 'vatAmount:', 'discountAmount:'].forEach(field => expect(completion).toContain(field));
    expect(completion).toContain('await buildOnlineOrderInventoryDeductionMap(canonicalItems, tx)');
    expect(completion).toContain("db.collection('Inventory_Items').doc(id)");
    expect(completion).toContain('Không thể trừ tồn kho cho đơn online:');
    expect(completion).toContain('tx.update(snap.ref, { current_stock: Math.max(0, currentQty - deductAmt) });');
    expect(completion).toContain('tx.set(historyRef, {');
    expect(completion).toContain('items: canonicalItems,');
    expect(completion).toContain('total: finalTotal,');
    expect(completion).toContain("status: 'completed'");
    expect(completion).toContain('historyId: historyRef.id');
    expect(completion).toContain('finalTotal');
    expect(completion).toContain('completedAt: paidAt');
    expect(completion).toContain('tx.delete(posOrderRef);');
  });

  test('online Telegram callback catches early ACK failure before mutation', () => {
    const source = read('functions/index.js');
    const webhook = between(source, 'exports.telegramWebhook = onRequest', '\nexports.onOrderRequestCreated');
    const onlineCallback = between(webhook, 'if (onlineOrderApproveMatch || onlineOrderRejectMatch)', 'if (orderDraftConfirmMatch');
    expect(onlineCallback).toMatch(/answerTelegramCallback\([\s\S]*?\)\.catch\(err => logger\.warn\('Telegram online-order callback ACK failed'/);
    expect(onlineCallback.indexOf('answerTelegramCallback')).toBeLessThan(onlineCallback.indexOf('approveOnlineOrderInternal'));
  });

  test('server completion keeps terminal idempotency and POS terminal guard', () => {
    const source = read('functions/index.js');
    const completion = between(source, 'async function completeOnlineOrderInternal', 'async function approveOnlineOrderInternal');
    expect(completion).toContain("if (currentStatus === 'completed')");
    expect(completion).toContain("canonicalOrder.status || 'open'");
  });

  test('client invokes protected callable, never DB.Orders.close for online completion', () => {
    const dbSource = read('db.js');
    const appSource = read('app.js');
    const completion = between(appSource, 'async function completeOnlineOrder(orderId)', 'async function cancelOnlineOrder(orderId)');
    expect(dbSource).toContain("httpsCallable(_functions, 'completeOnlineOrder')");
    expect(completion).toContain('window.DB.OnlineOrders.complete(cleanId)');
    expect(completion).not.toContain('DB.Orders.close');
    expect(completion).not.toContain('OnlineOrders?.syncFromPos');
  });
});
