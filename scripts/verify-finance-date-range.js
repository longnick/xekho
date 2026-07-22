'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const applyMatch = appSource.match(/function applyDateFilter\(page\) \{[\s\S]*?\n\}/);
assert(applyMatch, 'applyDateFilter(page) not found');
const applyBody = applyMatch[0];

const financeBranchMatch = applyBody.match(/if\(page === 'finance'\) \{[\s\S]*?\} else \{/);
assert(financeBranchMatch, 'finance branch in applyDateFilter not found');
const financeBranch = financeBranchMatch[0];

assert(
  financeBranch.includes('financePeriod = period;'),
  'finance date filter must persist computed period (day/range) before rendering finance UI'
);
assert(
  financeBranch.indexOf('financePeriod = period;') < financeBranch.indexOf('updateFinanceUI(s);'),
  'financePeriod must be assigned before updateFinanceUI(s), because expense breakdown/chart/list use global financePeriod'
);
assert(
  appSource.includes('buildOperationalExpenseBreakdown(financePeriod, financeDateOpts'),
  'source guard: updateFinanceUI still relies on global financePeriod/financeDateOpts for expense breakdown'
);
assert(
  appSource.includes('filterHistory(financePeriod, financeDateOpts).filter(o => o.discount'),
  'discount details must use the same financeDateOpts range as the finance summary'
);

console.log('verify-finance-date-range passed: applyDateFilter keeps financePeriod in sync with range/day date filters and discount details use date opts');
