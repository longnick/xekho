'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const dbSource = fs.readFileSync(path.join(root, 'db.js'), 'utf8');

function extractFunction(source, name) {
  const marker = `function ${name}`;
  const start = source.indexOf(marker);
  assert(start >= 0, `${name} exists`);
  const paramsEnd = source.indexOf(')', start);
  assert(paramsEnd >= 0, `${name} params end`);
  const bodyStart = source.indexOf('{', paramsEnd);
  assert(bodyStart >= 0, `${name} body start`);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`${name} body end not found`);
}

const helperSource = extractFunction(appSource, 'shouldRequireMenuRecipe');
const sandbox = { ITEM_TYPES: { FINISHED: 'finished_good', RETAIL: 'retail_item' } };
vm.createContext(sandbox);
vm.runInContext(`${helperSource}; this.shouldRequireMenuRecipe = shouldRequireMenuRecipe;`, sandbox);

assert.strictEqual(
  sandbox.shouldRequireMenuRecipe('finished_good', '', []),
  true,
  'new finished item without ingredients still requires recipe'
);
assert.strictEqual(
  sandbox.shouldRequireMenuRecipe('finished_good', 'existing-menu-id', []),
  false,
  'existing finished item without ingredients can still save price edits'
);
assert.strictEqual(
  sandbox.shouldRequireMenuRecipe('finished_good', '', [{ name: 'NL', qty: 1 }]),
  false,
  'new finished item with recipe can save'
);
assert.strictEqual(
  sandbox.shouldRequireMenuRecipe('retail_item', '', []),
  false,
  'retail item does not require recipe'
);

assert(
  appSource.includes('if (shouldRequireMenuRecipe(itemType, id, ingredients))'),
  'submitMenuItem uses recipe gate helper with id-aware edit behavior'
);
assert(
  appSource.includes("? (await window.DB.Menu.update(id, payload), id)"),
  'existing menu items still use DB.Menu.update for price payload'
);
assert(
  dbSource.includes('payload.sell_price = nextPrice;') && dbSource.includes('payload.price = nextPrice;'),
  'DB.Menu.update mirrors price to sell_price and price fields'
);
assert(
  dbSource.includes('sell_price: Number(item.price || 0),\n      price: Number(item.price || 0),'),
  'DB.Menu.add mirrors initial price to sell_price and price fields'
);

console.log('verify-menu-price-save: ok');
