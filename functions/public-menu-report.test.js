const {
  buildPublicMenuMap,
  isPublicMenuSaleable,
  enrichTopItemsWithPublicMenu,
  executeReportQuery,
} = require('./firestoreMegaTools');

describe('public-menu report safety', () => {
  test('keeps only visible live menu products and uses live price', () => {
    const menu = buildPublicMenuMap([
      { id: 'live', data: () => ({ productId: 'live', hidden: false, sell_price: 55000 }) },
      { id: 'hidden', data: () => ({ productId: 'hidden', hidden: true, sell_price: 65000 }) },
    ]);
    const topItems = enrichTopItemsWithPublicMenu([
      { id: 'live', name: 'Món live', qty: 3, revenue: 120000, historicalPrice: 40000 },
      { id: 'hidden', name: 'Món ẩn', qty: 2, revenue: 80000, historicalPrice: 40000 },
      { id: 'deleted', name: 'Món đã xóa', qty: 1, revenue: 30000, historicalPrice: 30000 },
    ], menu);

    expect(isPublicMenuSaleable(menu.get('live'))).toBe(true);
    expect(isPublicMenuSaleable(menu.get('hidden'))).toBe(false);
    expect(isPublicMenuSaleable(menu.get('deleted'))).toBe(false);
    expect(topItems).toEqual([{ id: 'live', name: 'Món live', qty: 3, revenue: 120000, historicalPrice: 40000, livePrice: 55000 }]);
  });

  test('filters hidden top item during report query', async () => {
    const now = new Date();
    const db = { collection(name) {
      const docs = name === 'history' ? [{ id: 'order-1', data: () => ({ paidAt: now, total: 95000, items: [
        { id: 'live', name: 'Món live', qty: 1, price: 40000, cost: 10000 },
        { id: 'hidden', name: 'Món ẩn', qty: 1, price: 55000, cost: 15000 },
      ] }) }] : name === 'public_menu' ? [
        { id: 'live', data: () => ({ productId: 'live', hidden: false, sell_price: 55000 }) },
        { id: 'hidden', data: () => ({ productId: 'hidden', hidden: true, sell_price: 65000 }) },
      ] : [];
      return { get: async () => ({ docs }) };
    }};
    const range = { loai_bao_cao: 'mon_ban_chay', tu_thoi_diem: new Date(now - 60000).toISOString(), den_thoi_diem: new Date(now.getTime() + 60000).toISOString() };
    const report = await executeReportQuery(range, { db });
    expect(report.topItems).toHaveLength(1);
    expect(report.topItems[0]).toMatchObject({ id: 'live', livePrice: 55000 });
  });

  test('fails closed when public menu is unavailable', async () => {
    const db = { collection(name) { return { get: async () => {
      if (name === 'public_menu') throw new Error('permission denied');
      return { docs: [] };
    }}; }};
    const result = await executeReportQuery({ loai_bao_cao: 'mon_ban_chay' }, { db, fallbackBigQuery: true });
    expect(result).toEqual({ ok: false, tool: 'truy_van_bao_cao', error: 'public_menu unavailable' });
  });
});
