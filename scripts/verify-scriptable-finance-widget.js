'use strict';

const fs = require('fs');
const path = require('path');
const widget = require('../functions/scriptableFinanceWidget');

let passed = 0;
let failed = 0;
function assert(condition, label) {
  if (condition) { console.log(`  ✅ ${label}`); passed += 1; }
  else { console.error(`  ❌ ${label}`); failed += 1; }
}

function makeSnap(rows) {
  return { docs: rows.map((row, idx) => ({ id: row.id || `row-${idx}`, data: () => row })) };
}

const collections = {
  history: [
    { id: 'h1', status: 'completed', paidAt: '2026-07-08T03:00:00.000Z', payMethod: 'bank', total: 200000, discount: 10000, items: [{ name: 'A', price: 100000, qty: 2, cost: 30000 }] },
    { id: 'h2', status: 'closed', paidAt: '2026-07-08T06:00:00.000Z', payMethod: 'cash', total: 150000, items: [{ name: 'B', price: 150000, qty: 1, cost: 50000 }] },
    { id: 'cancel', status: 'cancelled', paidAt: '2026-07-08T07:00:00.000Z', total: 999999, items: [{ price: 999999, qty: 1, cost: 1 }] },
  ],
  expenses: [
    { id: 'e1', date: '2026-07-08T05:00:00.000Z', category: 'Điện nước', amount: 40000 },
    { id: 'e2', date: '2026-07-08T06:00:00.000Z', category: 'Nhập hàng', amount: 777777 },
  ],
  purchases: [
    { id: 'p1', date: '2026-07-08T04:00:00.000Z', price: 120000 },
  ],
  settings: [],
};
const fakeDb = {
  collection(name) {
    return {
      get: async () => makeSnap(collections[name] || []),
      doc(id) {
        return {
          get: async () => ({ exists: id === 'financial_profile', data: () => ({ daily_fixed_cost: 30000 }) }),
        };
      },
    };
  },
};

function countNodes(node) {
  if (!node) return 0;
  return 1 + (node.children || []).reduce((sum, child) => sum + countNodes(child), 0);
}

async function runScriptableRenderSmoke(family) {
  const scriptableFile = fs.readFileSync(path.join(__dirname, 'scriptable', 'xekho-finance-widget.js'), 'utf8');
  class MockColor { constructor(hex, alpha) { this.hex = hex; this.alpha = alpha == null ? 1 : alpha; } }
  class MockFont {
    static systemFont(size) { return { kind: 'system', size }; }
    static mediumSystemFont(size) { return { kind: 'medium', size }; }
    static boldSystemFont(size) { return { kind: 'bold', size }; }
    static blackSystemFont(size) { return { kind: 'black', size }; }
  }
  class MockSize { constructor(width, height) { this.width = width; this.height = height; } }
  class MockPoint { constructor(x, y) { this.x = x; this.y = y; } }
  class MockRect { constructor(x, y, width, height) { Object.assign(this, { x, y, width, height }); } }
  class MockPath { addRoundedRect() {} addEllipse() {} move() {} addLine() {} }
  class MockDrawContext {
    setFillColor() {}
    setStrokeColor() {}
    setLineWidth() {}
    setFont() {}
    setTextColor() {}
    addPath() {}
    fillPath() {}
    fillRect() {}
    fillEllipse() {}
    strokeEllipse() {}
    strokePath() {}
    drawTextInRect() {}
    getImage() { return { kind: 'drawn-image' }; }
  }
  class MockGradient { constructor() { this.colors = []; this.locations = []; } }
  class MockStack {
    constructor(kind = 'stack') { this.kind = kind; this.children = []; this.spacers = []; }
    addStack() { const child = new MockStack(); this.children.push(child); return child; }
    addText(text) { const child = new MockStack('text'); child.text = String(text || ''); this.children.push(child); return child; }
    addImage(image) { const child = new MockStack('image'); child.image = image; this.children.push(child); return child; }
    addSpacer(value = null) { this.spacers.push(value); this.children.push({ kind: 'spacer', value, children: [] }); }
    layoutHorizontally() { this.layout = 'h'; }
    layoutVertically() { this.layout = 'v'; }
    centerAlignContent() { this.align = 'center'; }
    bottomAlignContent() { this.align = 'bottom'; }
    setPadding(t, l, b, r) { this.padding = [t, l, b, r]; }
    presentMedium() { this.presented = true; }
  }
  class MockWidget extends MockStack { constructor() { super('widget'); } }
  let renderedWidget = null;
  Object.assign(global, {
    args: { widgetParameter: '' },
    config: { widgetFamily: family, runsInWidget: true },
    Color: MockColor,
    Font: MockFont,
    Size: MockSize,
    Point: MockPoint,
    Rect: MockRect,
    Path: MockPath,
    DrawContext: MockDrawContext,
    LinearGradient: MockGradient,
    ListWidget: MockWidget,
    Script: {
      setWidget(widget) { renderedWidget = widget; },
      complete() { global.__scriptableComplete = true; },
    },
  });
  await eval(`(async()=>{${scriptableFile}\nawait new Promise(resolve => setImmediate(resolve));})()`);
  return renderedWidget;
}

(async () => {
  console.log('\n[1] Pure finance formula');
  const payload = await widget.buildFinanceWidgetPayload({ db: fakeDb, rangeKey: 'today', now: new Date('2026-07-08T10:00:00.000Z') });
  assert(payload.ok === true, 'payload ok');
  assert(payload.revenue === 340000, 'netSales = grossSales - discountTotal');
  assert(payload.cogs === 110000, 'cogs sums item cost * qty');
  assert(payload.grossProfit === 230000, 'grossProfit = netSales - cogs');
  assert(payload.operatingExpense === 40000, 'operating expense excludes nhập hàng rows');
  assert(payload.purchaseTotal === 120000, 'purchaseTotal sums purchases');
  assert(payload.fixedCost === 30000, 'fixedCost applies daily fixed cost');
  assert(payload.profit === 160000, 'profit = grossProfit - operatingExpense - fixedCost');
  assert(payload.bank === 200000 && payload.cash === 150000, 'cash/bank split from paid totals');
  assert(payload.seriesDays === 30 && payload.series.length === 30, 'payload has 30 daily revenue points');

  console.log('\n[2] Source guards and Scriptable file');
  const functionsIndex = fs.readFileSync(path.join(__dirname, '..', 'functions', 'index.js'), 'utf8');
  const scriptableFile = fs.readFileSync(path.join(__dirname, 'scriptable', 'xekho-finance-widget.js'), 'utf8');
  assert(functionsIndex.includes('SCRIPTABLE_FINANCE_WIDGET_TOKEN'), 'endpoint has token parameter');
  assert(functionsIndex.includes('exports.scriptableFinanceWidgetData'), 'Cloud Function endpoint exported');
  assert(scriptableFile.includes('modern dark revenue trend'), 'Scriptable file is modern dark revenue variant');
  assert(scriptableFile.includes('buildSmall') && scriptableFile.includes('buildMedium') && scriptableFile.includes('buildLarge'), 'Scriptable supports small/medium/large');
  assert(scriptableFile.includes('const CONFIG') && !scriptableFile.includes("token: ''"), 'private Scriptable copy has a widget token');
  assert(!/firebase-adminsdk|private_key|BEGIN PRIVATE KEY/.test(scriptableFile), 'Scriptable file does not embed Firebase credentials');

  console.log('\n[3] Modern 30-day revenue chart assertions');
  assert(scriptableFile.includes('MODERN_REVENUE_30D_LINE_CHART'), 'widget has modern 30-day revenue chart marker');
  assert(scriptableFile.includes('slice(-30)') && scriptableFile.includes('seriesDays || 30') && scriptableFile.includes('ngày gần nhất'), 'widget renders latest 30 days');
  assert(scriptableFile.includes('drawRevenueTrendChart') && scriptableFile.includes('context.addPath(line);') && scriptableFile.includes('context.strokePath();'), 'widget draws connected revenue line with native Scriptable path API');
  assert(scriptableFile.includes('addEllipse') && scriptableFile.includes('MODERN_DARK_FOUR_METRIC_LAYOUT'), 'widget uses modern dark cards and visible line points');

  // Old bar renderer must not be called by a production family.
  const buildLargeBody = scriptableFile.slice(scriptableFile.indexOf('function buildLarge'));
  const nextFnIdx = buildLargeBody.indexOf('\nfunction ', 1);
  const largeFnSrc = nextFnIdx > 0 ? buildLargeBody.slice(0, nextFnIdx) : buildLargeBody;
  assert(!scriptableFile.includes('function addBars') && !largeFnSrc.includes('addBars('), 'widget does not retain disconnected bar chart renderer');


  console.log('\n[4] Scriptable runtime stub smoke');
  const largeWidget = await runScriptableRenderSmoke('large');
  assert(largeWidget && largeWidget.kind === 'widget', 'large Scriptable widget renders with stubs');
  assert(countNodes(largeWidget) >= 40, 'large widget renders a dense balanced node tree');
  assert(JSON.stringify(largeWidget).includes('drawn-image'), 'large widget includes DrawContext image output');

  if (failed) {
    console.error(`\nverify-scriptable-finance-widget FAILED (${failed} failed, ${passed} passed)`);
    process.exit(1);
  }
  console.log(`\nverify-scriptable-finance-widget PASSED (${passed} assertions)`);
})();
