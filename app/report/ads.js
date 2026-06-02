(function (global) {
  'use strict';
  var XekhoApp = global.XekhoApp = global.XekhoApp || {};

  function _resolveFmt() {
    if (typeof global.fmt === 'function') return global.fmt;
    if (global.XekhoApp && global.XekhoApp.utils && global.XekhoApp.utils.format && typeof global.XekhoApp.utils.format.compactNumber === 'function') return global.XekhoApp.utils.format.compactNumber;
    return function (v) { return String(v || 0); };
  }

  function buildAdsRevenueReportHtml(summary) {
    summary = summary || {};
    var fmt = _resolveFmt();
    var fmtMoney = function (value) { return fmt(Number(value || 0)) + '\u0111'; };
    var posMargin = Number(summary.posRevenue || 0) > 0
      ? ((Number(summary.grossProfit || 0) / Number(summary.posRevenue || 0)) * 100).toFixed(1)
      : '0.0';
    var roasText = summary.adsSpendTotal > 0
      ? Number(summary.roas || 0).toFixed(2) + 'x'
      : '\u2014';
    var adsDataNote = summary.adsEntriesCount > 0 || summary.snapshotAdsDays > 0
      ? '<div class="report-ads-note">' + (summary.dataSourceNote || '') + '</div>'
      : '<div class="empty-state report-ads-empty">'
        + '<div class="empty-text">Ch\u01B0a c\u00F3 d\u1EEF li\u1EC7u ads trong kho\u1EA3ng n\u00E0y. H\u1EC7 th\u1ED1ng \u01B0u ti\u00EAn daily_revenue_snapshot.ads_spend_today, sau \u0111\u00F3 m\u1EDBi c\u1ED9ng c\u00E1c m\u1EE5c chi ph\u00ED marketing/Facebook/TikTok n\u1EBFu c\u00F3.</div>'
        + '</div>';

    return ''
      + '\n    <div class="report-ads-kpis">'
      + '\n      <div class="stat-card report-ads-kpi">'
      + '\n        <div class="stat-label">Doanh thu POS</div>'
      + '\n        <div class="stat-value report-ads-kpi-value">' + fmtMoney(summary.posRevenue) + '</div>'
      + '\n      </div>'
      + '\n      <div class="stat-card report-ads-kpi">'
      + '\n        <div class="stat-label">\u0110\u01A1n h\u00E0ng</div>'
      + '\n        <div class="stat-value report-ads-kpi-value">' + fmt(summary.orderCount || 0) + '</div>'
      + '\n      </div>'
      + '\n      <div class="stat-card report-ads-kpi">'
      + '\n        <div class="stat-label">Gi\u00E1 v\u1ED1n</div>'
      + '\n        <div class="stat-value report-ads-kpi-value">' + fmtMoney(summary.cogsTotal) + '</div>'
      + '\n      </div>'
      + '\n      <div class="stat-card report-ads-kpi">'
      + '\n        <div class="stat-label">L\u00E3i g\u1ED9p</div>'
      + '\n        <div class="stat-value report-ads-kpi-value" style="color:var(--success)">' + fmtMoney(summary.grossProfit) + '</div>'
      + '\n      </div>'
      + '\n      <div class="stat-card report-ads-kpi">'
      + '\n        <div class="stat-label">Chi ads</div>'
      + '\n        <div class="stat-value report-ads-kpi-value" style="color:var(--warning)">' + fmtMoney(summary.adsSpendTotal) + '</div>'
      + '\n      </div>'
      + '\n      <div class="stat-card report-ads-kpi">'
      + '\n        <div class="stat-label">ROAS</div>'
      + '\n        <div class="stat-value report-ads-kpi-value">' + roasText + '</div>'
      + '\n      </div>'
      + '\n    </div>'
      + '\n'
      + '\n    <div class="report-ads-grid">'
      + '\n      <div class="card report-ads-panel">'
      + '\n        <div class="card-title report-ads-panel-title">T\u00F3m t\u1EAFt kho\u1EA3ng ng\u00E0y</div>'
      + '\n        <div class="report-ads-meta-grid">'
      + '\n          <div class="report-ads-meta-item">'
      + '\n            <div class="report-ads-meta-label">T\u1EEB ng\u00E0y</div>'
      + '\n            <div class="report-ads-meta-value">' + (summary.fromDate || '') + '</div>'
      + '\n          </div>'
      + '\n          <div class="report-ads-meta-item">'
      + '\n            <div class="report-ads-meta-label">\u0110\u1EBFn ng\u00E0y</div>'
      + '\n            <div class="report-ads-meta-value">' + (summary.toDate || '') + '</div>'
      + '\n          </div>'
      + '\n          <div class="report-ads-meta-item">'
      + '\n            <div class="report-ads-meta-label">M\u00F3n \u0111\u00E3 b\u00E1n</div>'
      + '\n            <div class="report-ads-meta-value">' + fmt(summary.itemQty || 0) + ' ph\u1EA7n</div>'
      + '\n          </div>'
      + '\n          <div class="report-ads-meta-item">'
      + '\n            <div class="report-ads-meta-label">Bi\u00EAn l\u00E3i g\u1ED9p</div>'
      + '\n            <div class="report-ads-meta-value">' + posMargin + '%</div>'
      + '\n          </div>'
      + '\n          <div class="report-ads-meta-item">'
      + '\n            <div class="report-ads-meta-label">Chi ph\u00ED c\u1ED1 \u0111\u1ECBnh / ng\u00E0y</div>'
      + '\n            <div class="report-ads-meta-value">' + fmtMoney(summary.fixedCostDaily) + '</div>'
      + '\n          </div>'
      + '\n          <div class="report-ads-meta-item">'
      + '\n            <div class="report-ads-meta-label">S\u1ED1 ng\u00E0y ph\u00E2n b\u1ED5</div>'
      + '\n            <div class="report-ads-meta-value">' + fmt(summary.reportDays || 0) + ' ng\u00E0y</div>'
      + '\n          </div>'
      + '\n        </div>'
      + '\n      </div>'
      + '\n'
      + '\n      <div class="card report-ads-panel">'
      + '\n        <div class="card-title report-ads-panel-title">Chi ph\u00ED & l\u1EE3i nhu\u1EADn</div>'
      + '\n        <div class="report-ads-breakdown">'
      + '\n          <div class="report-ads-row"><span>Facebook Ads</span><strong>' + fmtMoney(summary.facebookAdsSpend) + '</strong></div>'
      + '\n          <div class="report-ads-row"><span>TikTok Ads</span><strong>' + fmtMoney(summary.tiktokAdsSpend) + '</strong></div>'
      + '\n          <div class="report-ads-row"><span>Marketing kh\u00E1c</span><strong>' + fmtMoney(summary.otherAdsSpend) + '</strong></div>'
      + '\n          <div class="report-ads-row"><span>Nh\u1EADp h\u00E0ng</span><strong>' + fmtMoney(summary.purchaseSpend) + '</strong></div>'
      + '\n          <div class="report-ads-row"><span>Chi ph\u00ED kh\u00E1c, g\u1ED3m l\u01B0\u01A1ng nh\u00E2n vi\u00EAn ch\u1EA5m c\u00F4ng</span><strong>' + fmtMoney(summary.otherExpenseSpend) + '</strong></div>'
      + '\n          <div class="report-ads-row"><span>L\u01B0\u01A1ng qu\u1EA3n l\u00FD k\u1EF3 b\u00E1o c\u00E1o</span><strong>' + fmtMoney(summary.managementSalaryTotal) + '</strong></div>'
      + '\n          <div class="report-ads-row"><span>Chi ph\u00ED c\u1ED1 \u0111\u1ECBnh kh\u00E1c k\u1EF3 b\u00E1o c\u00E1o</span><strong>' + fmtMoney(summary.otherFixedCostTotal) + '</strong></div>'
      + '\n          <div class="report-ads-row report-ads-row-total">'
      + '\n            <span>L\u1EE3i nhu\u1EADn sau ads, chi ph\u00ED kh\u00E1c & chi ph\u00ED c\u1ED1 \u0111\u1ECBnh</span>'
      + '\n            <strong style="color:' + (summary.netAfterAdsAndExpenses >= 0 ? 'var(--success)' : 'var(--danger)') + '">' + fmtMoney(summary.netAfterAdsAndExpenses) + '</strong>'
      + '\n          </div>'
      + '\n        </div>'
      + (summary.snapshotAdsDays > 0 ? '\n        <div class="report-ads-pill">Meta Ads snapshot: ' + fmt(summary.snapshotAdsDays) + ' ng\u00E0y</div>' : '')
      + (summary.expenseAdsDays > 0 ? '\n        <div class="report-ads-pill">Chi ph\u00ED n\u1ED9i b\u1ED9: ' + fmt(summary.expenseAdsDays) + ' d\u00F2ng ads</div>' : '')
      + (summary.fixedCostConfigured ? '\n        <div class="report-ads-pill">Chi ph\u00ED c\u1ED1 \u0111\u1ECBnh: ' + fmtMoney(summary.fixedCostDaily) + '/ng\u00E0y, trong \u0111\u00F3 l\u01B0\u01A1ng qu\u1EA3n l\u00FD ' + fmtMoney(summary.dailyManagementSalary) + '/ng\u00E0y</div>' : '\n        <div class="report-ads-pill">Chi ph\u00ED c\u1ED1 \u0111\u1ECBnh: ch\u01B0a c\u1EA5u h\u00ECnh</div>')
      + '\n        ' + adsDataNote
      + '\n      </div>'
      + '\n    </div>'
      + '\n  ';
  }

  XekhoApp.report = XekhoApp.report || {};
  XekhoApp.report.buildAdsRevenueReportHtml = buildAdsRevenueReportHtml;
})(typeof window !== 'undefined' ? window : globalThis);
