const vm = require('vm');
const fs = require('fs');
const path = require('path');

const errors = [];
function assert(cond, msg) { if (!cond) errors.push(msg); }
function assertEq(actual, expected, msg) {
  if (actual !== expected) errors.push(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const sandbox = {
  window: {
    appState: {
      settings: {
        financial_profile: {
          monthly_fixed_costs: { rent: 5000000, management_salary: 10000000, utilities: 500000, other: 200000 },
          daily_fixed_cost: 0,
          target_monthly_profit: 20000000,
        },
      },
    },
  },
  globalThis: {}, console, Set, Array, String, Number, Math, Object, RegExp, Error,
  isNaN, parseFloat, parseInt, Date, JSON,
};
sandbox.global = sandbox;
vm.createContext(sandbox);

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'utils', 'fixedcost.js'), 'utf-8');
vm.runInContext(src, sandbox);

const fc = sandbox.window.XekhoApp.utils.fixedcost;
assert(fc, 'XekhoApp.utils.fixedcost exists');
assert(typeof fc.getFixedCostProfileForReports === 'function', 'getFixedCostProfileForReports');
assert(typeof fc._getPayrollProfile === 'function', '_getPayrollProfile');

// getFixedCostProfileForReports
const profile = fc.getFixedCostProfileForReports();
assertEq(profile.monthlyManagementSalary, 10000000, 'monthlyManagementSalary');
assertEq(profile.monthlyFixedCostTotal, 15700000, 'monthlyFixedCostTotal (rent + mgmt + utilities + other)');
assert(profile.dailyFixedCost > 0, 'dailyFixedCost calculated');
assert(profile.dailyManagementSalary > 0, 'dailyManagementSalary calculated');
assertEq(profile.targetMonthlyProfit, 20000000, 'targetMonthlyProfit');
assert(profile.isConfigured, 'isConfigured');

// _getPayrollProfile
const payroll = fc._getPayrollProfile();
assertEq(payroll.managementSalary, 10000000, 'payroll managementSalary');
assertEq(payroll.rent, 5000000, 'payroll rent');
assertEq(payroll.utilities, 500000, 'payroll utilities');

console.log(`✅ verify-fixedcost: ${errors.length === 0 ? 'ALL PASSED' : errors.join('; ')}`);
if (errors.length) process.exit(1);
