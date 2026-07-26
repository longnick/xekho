const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Extract a top-level `function name(...) { ... }` block from kitchen.html source
// by brace-matching, so the test exercises the REAL rendering logic, not a copy.
function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start === -1) throw new Error(`function ${name} not found in kitchen.html`);
  const braceOpen = source.indexOf('{', start);
  let depth = 0;
  for (let i = braceOpen; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces for ${name}`);
}

function loadKitchenRender() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'kitchen.html'), 'utf8');
  // Stubs for helpers buildFlatRowMarkup references but the .replace boundary doesn't exercise.
  const sandbox = {
    getHeatLevel: () => '',
    formatElapsed: () => '',
    getStatusChipClass: () => '',
    getStatusLabel: () => '',
  };
  vm.runInNewContext(
    `${extractFunction(source, 'normalizeTableName')}
     ${extractFunction(source, 'buildFlatRowMarkup')}
     this.normalizeTableName = normalizeTableName;
     this.buildFlatRowMarkup = buildFlatRowMarkup;`,
    sandbox
  );
  return sandbox;
}

describe('kitchen Flat List render is crash-safe on legacy table labels', () => {
  const { normalizeTableName, buildFlatRowMarkup } = loadKitchenRender();

  // The regression: Firestore legacy rows can carry a numeric (or object) table
  // name. It flows through normalizeTableName -> row.tableName, and the Flat List
  // markup calls row.tableName.replace(...) -> TypeError -> blank list after alert.
  test.each([
    ['numeric legacy name', { name: 5 }],
    ['numeric legacy tableName', { tableName: 12 }],
    ['object legacy name', { name: { label: 'A1' } }],
  ])('%s does not throw at the .replace boundary', (_label, tableData) => {
    const tableName = normalizeTableName('7', tableData);
    const row = { tableName, orderId: 'o1', tableId: '7', lineKey: 'k', elapsedMs: 0, qty: 1, name: 'Phở', note: '', status: 'pending' };
    expect(() => buildFlatRowMarkup(row)).not.toThrow();
  });

  test('normal string table labels are preserved and shortened as before', () => {
    const row = { tableName: normalizeTableName('3', { name: 'Bàn 3' }), orderId: 'o', tableId: '3', lineKey: 'k', elapsedMs: 0, qty: 1, name: 'Phở', note: '', status: 'pending' };
    expect(buildFlatRowMarkup(row)).toContain('B3');
  });

  test.each([
    [{ name: '', tableName: 'Bàn 9' }, 'Bàn 9'],
    [{ name: '   ', tableName: 'Bàn 8' }, 'Bàn 8'],
    [{ name: { label: 'legacy' }, tableName: 'Bàn 6' }, 'Bàn 6'],
    [{ name: 0 }, '0'],
  ])('uses next usable scalar table label', (tableData, expected) => {
    expect(normalizeTableName('7', tableData)).toBe(expected);
  });
});
