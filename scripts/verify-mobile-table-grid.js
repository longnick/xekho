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
  appJs.includes("class=\"table-card ${statusClass}${tableNote ? ' has-note' : ''}\""),
  'table card adds has-note class when a note is present'
);
assert(
  appJs.includes('class="table-note-text"'),
  'table card renders readable table note text instead of a compact icon chip'
);
assert(
  !appJs.includes('class="table-note-chip"'),
  'old table note icon chip markup is removed'
);
assert(
  !appJs.includes('📝 ${safeTableNote}'),
  'table note no longer reserves space for an icon inside the card'
);
assert(
  appJs.includes('tableNote ? `<div class="table-note-text"') && appJs.includes(': `<div class="table-icon">${statusEmoji}</div>`'),
  'table card hides the status icon when a note is present so note text has more room'
);
assert(
  /\.table-title-row\s*\{[\s\S]*display:\s*flex;[\s\S]*min-width:\s*0;/.test(css),
  'table title row is flex and shrink-safe'
);
assert(
  /\.table-card\.has-note\s*\{[\s\S]*gap:\s*3px;/.test(css),
  'noted table cards use tighter spacing'
);
assert(
  /\.table-note-text\s*\{[\s\S]*width:\s*100%;[\s\S]*-webkit-line-clamp:\s*2;[\s\S]*overflow-wrap:\s*anywhere;/.test(css),
  'table note text uses full width, two-line clamp, and safe wrapping'
);
assert(
  !css.includes('.table-note-chip'),
  'old pill-style table note chip CSS is removed'
);

console.log('verify-mobile-table-grid passed');
