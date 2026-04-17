const { localNLPEngine, _normalizeAIText } = require('./ai-core.js');
const { preprocessAIText } = require('./ai-ui.js');

describe('AI Offline NLP (localNLPEngine)', () => {
  const menu = [
    { id: '1', name: 'Bia Tiger', price: 20000 },
    { id: '2', name: 'Mực khô nướng', price: 100000 },
    { id: '3', name: 'Trà đá', price: 5000 }
  ];
  
  const tables = [
    { id: '1', name: 'Bàn 1', status: 'empty' },
    { id: '2', name: 'Bàn 2', status: 'serving' }
  ];

  beforeAll(() => {
    // Mock global Store and other functions used by ai-core
    global.Store = {
      getInventory: () => [
        { id: '101', name: 'Bia Tiger', unit: 'lon' }
      ]
    };
    global.getRevenueSummary = () => ({ revenue: 0, orders: 0 });
    global.parseViDateFromText = () => null;
  });

  test('Nhận diện gọi món cơ bản', () => {
    const text = preprocessAIText("Bàn 1 gọi 2 bia tiger, 1 mực khô nướng");
    const res = localNLPEngine(text, menu, tables);
    
    expect(res).not.toBeNull();
    expect(res.actions).toBeDefined();
    expect(res.actions[0].type).toBe('order');
    expect(res.actions[0].tableId).toBe('1');
    expect(res.actions[0].items.length).toBe(2);
    
    const items = res.actions[0].items;
    expect(items.find(i => i.id === '1').qty).toBe(2);
    expect(items.find(i => i.id === '2').qty).toBe(1);
  });

  test('Nhận diện hủy/bớt món', () => {
    const text = preprocessAIText("Bớt 1 bia tiger bàn 1");
    const res = localNLPEngine(text, menu, tables);
    
    expect(res).not.toBeNull();
    expect(res.actions).toBeDefined();
    expect(res.actions[0].type).toBe('remove');
    expect(res.actions[0].tableId).toBe('1');
    expect(res.actions[0].itemId).toBe('1');
    expect(res.actions[0].qty).toBe(1);
  });

  test('Nhận diện tính tiền/mở bill', () => {
    const text = preprocessAIText("Tính tiền bàn 2");
    const res = localNLPEngine(text, menu, tables);
    
    expect(res).not.toBeNull();
    expect(res.actions).toBeDefined();
    expect(res.actions[0].type).toBe('pay');
    expect(res.actions[0].tableId).toBe('2');
  });

  test('Không nhận diện khi không có thông tin rõ ràng', () => {
    const text = preprocessAIText("Thời tiết hôm nay thế nào");
    const res = localNLPEngine(text, menu, tables);
    expect(res).toBeNull();
  });

  test('Nhận diện số bằng chữ', () => {
    const text = preprocessAIText("Bàn 2 gọi hai mươi lăm bia tiger, ba mực khô nướng");
    const res = localNLPEngine(text, menu, tables);
    
    expect(res).not.toBeNull();
    const items = res.actions[0].items;
    expect(items.find(i => i.id === '1').qty).toBe(25);
    expect(items.find(i => i.id === '2').qty).toBe(3);
  });

  test('Sử dụng context memory cho câu tiếp theo', () => {
    // first command
    const res1 = localNLPEngine(_normalizeAIText("Bàn 2 gọi 1 bia tiger"), menu, tables);
    expect(res1.actions[0].tableId).toBe('2');
    
    // follow-up command without table id
    const res2 = localNLPEngine(_normalizeAIText("thêm 1 mực khô nướng"), menu, tables);
    expect(res2.actions[0].tableId).toBe('2');
    expect(res2.actions[0].type).toBe('order');
    expect(res2.actions[0].items[0].id).toBe('2');
  });
});