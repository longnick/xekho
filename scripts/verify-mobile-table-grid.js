'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

assert(
  appJs.includes("String(t.id).toLowerCase() !== 'takeaway'"),
  'renderTables filters the persisted takeaway table from the physical table grid'
);
assert(
  appJs.includes('id="table-card-takeaway"'),
  'dedicated takeaway card remains available'
);
assert(
  appJs.includes('table-card table-card-wide takeaway'),
  'takeaway summary uses the wide table-card layout class'
);
assert(
  appJs.includes('table-card table-card-wide occupied'),
  'online orders summary uses the wide table-card layout class'
);
assert(
  !appJs.includes('style="grid-column:1/-1;aspect-ratio:auto;padding:12px;flex-direction:row;justify-content:flex-start;gap:12px"'),
  'old inline wide-card style is removed'
);
assert(
  /\.table-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/.test(css),
  'base table grid uses minmax(0, 1fr) to avoid mobile overflow'
);
assert(
  /\.table-card\s*\{[\s\S]*min-width:\s*0;[\s\S]*overflow:\s*hidden;/.test(css),
  'table cards can shrink and clip long content inside the grid'
);
assert(
  /\.table-summary-body\s*\{[\s\S]*min-width:\s*0;[\s\S]*overflow:\s*hidden;/.test(css),
  'wide card body can shrink instead of pushing totals outside the card'
);
assert(
  /\.table-summary-meta\s*\{[\s\S]*max-width:\s*38%;[\s\S]*text-overflow:\s*ellipsis;/.test(css),
  'wide card amount is constrained and ellipsized'
);

assert(
  /const tableNote = String\(t\.note \|\| getOrderExtrasForTable\(t\.id\)\.note \|\| ''\)\.trim\(\);/.test(appJs),
  'table card note uses table.note with orderExtras fallback'
);
assert(
  appJs.includes('const safeTableNote = _escapeHtml(tableNote);'),
  'table card note is escaped before rendering'
);
assert(
  appJs.includes('class="table-title-row"'),
  'table card wraps table number and note in a title row'
);
assert(
  appJs.includes('class="table-note-chip"'),
  'table card renders table note chip beside the table number'
);
assert(
  /\.table-title-row\s*\{[\s\S]*display:\s*flex;[\s\S]*min-width:\s*0;/.test(css),
  'table title row is flex and shrink-safe'
);
assert(
  /\.table-note-chip\s*\{[\s\S]*max-width:\s*58%;[\s\S]*text-overflow:\s*ellipsis;[\s\S]*white-space:\s*nowrap;/.test(css),
  'table note chip is constrained and ellipsized inside table card'
);

console.log('verify-mobile-table-grid passed');
