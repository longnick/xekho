// @ts-check
(function (global) {
  'use strict';
  /** @type {any} */
  var _global = global;
  /** @type {any} */
  var XekhoApp = _global.XekhoApp = _global.XekhoApp || {};
  XekhoApp.utils = XekhoApp.utils || {};

  /** @returns {Object} */
  function _getFinancialProfile() {
    return (_global.appState && _global.appState.settings && _global.appState.settings.financial_profile) || {};
  }

  /** @returns {{ monthlyFixedCostTotal: number, dailyFixedCost: number, monthlyManagementSalary: number, dailyManagementSalary: number, targetMonthlyProfit: number, isConfigured: boolean }} */
  function getFixedCostProfileForReports() {
    var financialProfile = _getFinancialProfile();
    var monthly = financialProfile.monthly_fixed_costs || {};
    var monthlyManagementSalary = Number(
      financialProfile.management_salary_monthly
      ?? monthly.management_salary
      ?? monthly.manager_salary
      ?? 0
    ) || 0;
    var itemizedMonthlyFixedCostTotal =
      (Number(monthly.rent || 0) || 0)
      + monthlyManagementSalary
      + (Number(monthly.utilities || 0) || 0)
      + (Number(monthly.other || 0) || 0);
    var monthlyFixedCostTotal = itemizedMonthlyFixedCostTotal || (Number(monthly.total || 0) || 0);
    var dailyFixedCost =
      Number(financialProfile.daily_fixed_cost || 0)
      || (monthlyFixedCostTotal > 0 ? Math.round(monthlyFixedCostTotal / 30) : 0);
    var dailyManagementSalary = monthlyManagementSalary > 0 ? Math.round(monthlyManagementSalary / 30) : 0;
    var targetMonthlyProfit = Number(financialProfile.target_monthly_profit || 0) || 0;

    return {
      monthlyFixedCostTotal: monthlyFixedCostTotal,
      dailyFixedCost: dailyFixedCost,
      monthlyManagementSalary: monthlyManagementSalary,
      dailyManagementSalary: dailyManagementSalary,
      targetMonthlyProfit: targetMonthlyProfit,
      isConfigured: monthlyFixedCostTotal > 0 || dailyFixedCost > 0 || targetMonthlyProfit > 0,
    };
  }

  /** @returns {{ profile: Object, monthly: Object, managementSalary: number, rent: number, utilities: number, other: number }} */
  function _getPayrollProfile() {
    var profile = _getFinancialProfile();
    var monthly = profile.monthly_fixed_costs || {};
    var managementSalary = Number(profile.management_salary_monthly ?? monthly.management_salary ?? monthly.manager_salary ?? 0) || 0;
    return {
      profile: profile,
      monthly: monthly,
      managementSalary: managementSalary,
      rent: Number(monthly.rent || 0) || 0,
      utilities: Number(monthly.utilities || 0) || 0,
      other: Number(monthly.other || 0) || 0,
    };
  }

  XekhoApp.utils.fixedcost = {
    getFixedCostProfileForReports: getFixedCostProfileForReports,
    _getPayrollProfile: _getPayrollProfile,
  };
})(typeof window !== 'undefined' ? window : globalThis);
