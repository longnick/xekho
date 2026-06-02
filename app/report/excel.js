// @ts-check
(function (global) {
  'use strict';
  /** @type {any} */
  var XekhoApp = global.XekhoApp = global.XekhoApp || {};
  XekhoApp.report = XekhoApp.report || {};

  // Lazy resolvers for dependencies
  /** @returns {function(number): string} */
  function _resolveExcelFmtVnInt() {
    if (global.XekhoApp && global.XekhoApp.utils && global.XekhoApp.utils.excel && typeof global.XekhoApp.utils.excel.excelFmtVnInt === 'function') return global.XekhoApp.utils.excel.excelFmtVnInt;
    if (typeof global.excelFmtVnInt === 'function') return global.excelFmtVnInt;
    return function (n) { return String(n); };
  }
  /** @returns {function(Object, Object): void} */
  function _resolveApplyReportTitleBlock() {
    if (global.XekhoApp && global.XekhoApp.utils && global.XekhoApp.utils.excel && typeof global.XekhoApp.utils.excel.applyReportTitleBlock === 'function') return global.XekhoApp.utils.excel.applyReportTitleBlock;
    if (typeof global.applyReportTitleBlock === 'function') return global.applyReportTitleBlock;
    return function () {};
  }
  /** @returns {function(Object, number, number): void} */
  function _resolvePaintExcelHeaderRow() {
    if (global.XekhoApp && global.XekhoApp.utils && global.XekhoApp.utils.excel && typeof global.XekhoApp.utils.excel.paintExcelHeaderRow === 'function') return global.XekhoApp.utils.excel.paintExcelHeaderRow;
    if (typeof global.paintExcelHeaderRow === 'function') return global.paintExcelHeaderRow;
    return function () {};
  }
  /** @returns {function(Object, number, number): void} */
  function _resolvePaintExcelTotalRow() {
    if (global.XekhoApp && global.XekhoApp.utils && global.XekhoApp.utils.excel && typeof global.XekhoApp.utils.excel.paintExcelTotalRow === 'function') return global.XekhoApp.utils.excel.paintExcelTotalRow;
    if (typeof global.paintExcelTotalRow === 'function') return global.paintExcelTotalRow;
    return function () {};
  }
  /** @returns {function(Object, number, number): void} */
  function _resolveSetRowBorders() {
    if (global.XekhoApp && global.XekhoApp.utils && global.XekhoApp.utils.excel && typeof global.XekhoApp.utils.excel.setRowBorders === 'function') return global.XekhoApp.utils.excel.setRowBorders;
    if (typeof global.setRowBorders === 'function') return global.setRowBorders;
    return function () {};
  }
  /** @returns {function(string, Object): Array} */
  function _resolveFilterHistory() {
    if (typeof global.filterHistory === 'function') return global.filterHistory;
    return function () { return []; };
  }
  /** @returns {function(string, Object): Array} */
  function _resolveFilterExpenses() {
    if (typeof global.filterExpenses === 'function') return global.filterExpenses;
    return function () { return []; };
  }
  /** @returns {function(string, string): void} */
  function _resolveShowToast() {
    if (global.XekhoApp && global.XekhoApp.ui && typeof global.XekhoApp.ui.toast === 'function') return global.XekhoApp.ui.toast;
    if (typeof global.showToast === 'function') return global.showToast;
    return function () {};
  }
  /** @returns {function(Object): Promise<Object>|null} */
  function _resolveUploadToDrive() {
    if (global.XekhoApp && global.XekhoApp.utils && global.XekhoApp.utils.storage && typeof global.XekhoApp.utils.storage.uploadFileToGoogleDriveByEndpoint === 'function') return global.XekhoApp.utils.storage.uploadFileToGoogleDriveByEndpoint;
    if (typeof global.uploadFileToGoogleDriveByEndpoint === 'function') return global.uploadFileToGoogleDriveByEndpoint;
    return null;
  }
  /** @returns {function(): {uploadUrl: string, folderId: string}} */
  function _resolveGetGoogleDriveConfig() {
    if (typeof global.getGoogleDriveConfigFromUi === 'function') return global.getGoogleDriveConfigFromUi;
    return function () { return { uploadUrl: '', folderId: '' }; };
  }

  /**
   * @param {Object} [override]
   * @param {string} [override.type]
   * @param {string} [override.period]
   * @param {string} [override.date]
   * @param {boolean} [override.skipLocalDownload]
   * @param {boolean} [override.uploadToDrive]
   * @returns {Promise<boolean>}
   */
  async function exportReportExcel(override) {
    if (override === undefined) override = {};
    var excelFmtVnInt = _resolveExcelFmtVnInt();
    var applyReportTitleBlock = _resolveApplyReportTitleBlock();
    var paintExcelHeaderRow = _resolvePaintExcelHeaderRow();
    var paintExcelTotalRow = _resolvePaintExcelTotalRow();
    var setRowBorders = _resolveSetRowBorders();
    var filterHistory = _resolveFilterHistory();
    var filterExpenses = _resolveFilterExpenses();
    var showToast = _resolveShowToast();
    var uploadFileToGoogleDriveByEndpoint = _resolveUploadToDrive();
    var getGoogleDriveConfigFromUi = _resolveGetGoogleDriveConfig();
    var Store = global.Store || {};
    /** @type {any} */
    var root = global;

  const typeEl   = /** @type {HTMLInputElement|null} */ (document.getElementById('set-reportExportType'));
  const periodEl = /** @type {HTMLInputElement|null} */ (document.getElementById('set-reportExportPeriod'));
  const dateEl   = /** @type {HTMLInputElement|null} */ (document.getElementById('set-reportExportDate'));

  const typeRaw = override.type || (typeEl ? typeEl.value : 'revenue');
  const type = String(typeRaw || 'revenue').trim().toLowerCase();
  const period = override.period || (periodEl ? periodEl.value : 'today');
  const date   = override.date   || (dateEl   ? dateEl.value   : '');

  const skipLocalDownload = !!override.skipLocalDownload;
  const forceUploadToDrive = override.uploadToDrive === true;

  const ExcelJSLib = root.ExcelJS;
  if(!ExcelJSLib) {
    showToast('Không tải được thư viđơ Excel. Vui lòng tải lại trang.', 'danger');
    return false;
  }

  const opts = {};
  if(period === 'day' && date) opts.date = date;

  const fmtDateCell = (iso, onlyDate = false) => {
    if(!iso) return '';
    const d = new Date(iso);
    if(Number.isNaN(d.getTime())) return '';
    return onlyDate ? d.toISOString().slice(0, 10) : d.toLocaleString('vi-VN');
  };

  const exportDateStr = new Date().toLocaleString('vi-VN');
  const periodLabel = (() => {
    if(period === 'today') return 'Hôm nay';
    if(period === 'day' && date) {
      const d = new Date(`${date}T12:00:00`);
      return Number.isNaN(d.getTime()) ? 'Ngày cụ thể' : `Ngày ${d.toLocaleDateString('vi-VN')}`;
    }
    if(period === 'day') return 'Ngày cụ thể';
    if(period === 'week') return '7 ngày gần nhất';
    if(period === 'month') return 'Tháng hiện tại';
    return 'Tất cả';
  })();

  const getFilteredPurchases = () => {
    const purchases = Store.getPurchases();
    const now = new Date();
    return purchases.filter(p => {
      const d = new Date(p.date);
      if(Number.isNaN(d.getTime())) return false;
      if(period === 'today') return d.toDateString() === now.toDateString();
      if(period === 'day' && date) return d.toDateString() === new Date(date).toDateString();
      if(period === 'week') return (now.getTime() - d.getTime()) / 86400000 <= 7;
      if(period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    });
  };

  const HEADER_ROW = 5;
  const settings = Store.getSettings();
  const vatRate = settings.taxRate != null ? Number(settings.taxRate) : 0; // % VAT from settings

  const fillRevenueSheet = ws => {
    const lastCol = 9;
    applyReportTitleBlock(ws, {
      title: 'BÁO CÁO DOANH THU (THEO MON)',
      periodLabel,
      exportDateStr,
      lastCol,
    });
    const vatLabel = vatRate > 0 ? `Thuế VAT (${vatRate}%)` : 'Thuế VAT (0%)';
    const headers = [
      'TT', 'Ngày bán', 'Mã sản phẩm', 'Tên sản phẩm', 'Sđ lượng bán',
      'Đơn giá (VND)', 'Thành tiền (VND)', vatLabel, 'Sau VAT (VND)',
    ];
    headers.forEach((h, i) => { ws.getRow(HEADER_ROW).getCell(i + 1).value = h; });
    paintExcelHeaderRow(ws, HEADER_ROW, lastCol);
    const hr = ws.getRow(HEADER_ROW);
    hr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    for(let c = 2; c <= 4; c++) hr.getCell(c).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    for(let c = 5; c <= 9; c++) hr.getCell(c).alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };

    const orders = filterHistory(period === 'day' ? 'day' : period, opts);
    let r = HEADER_ROW + 1;
    let stt = 1;
    const totals = { qty: 0, gross: 0, vat: 0, net: 0 };
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        const qty = Number(item.qty || 0);
        const price = Number(item.price || 0);
        const gross = qty * price;
        const vat = vatRate > 0 ? Math.round(gross * vatRate / 100) : 0;
        const net = gross - vat;
        const row = ws.getRow(r);
        row.getCell(1).value = stt++;
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(2).value = fmtDateCell(o.paidAt, true);
        row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(3).value = item.id || '';
        row.getCell(4).value = item.name || '';
        row.getCell(5).value = qty;
        row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
        row.getCell(6).value = excelFmtVnInt(price);
        row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
        row.getCell(7).value = excelFmtVnInt(gross);
        row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
        row.getCell(8).value = excelFmtVnInt(vat);
        row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
        row.getCell(9).value = excelFmtVnInt(net);
        row.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
        setRowBorders(ws, r, lastCol);
        totals.qty += qty;
        totals.gross += gross;
        totals.vat += vat;
        totals.net += net;
        r++;
      });
    });

    ws.mergeCells(r, 1, r, 4);
    const tr = ws.getRow(r);
    tr.getCell(1).value = 'TỔNG';
    tr.getCell(1).font = { bold: true };
    tr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    tr.getCell(5).value = totals.qty;
    tr.getCell(5).font = { bold: true };
    tr.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(6).value = '';
    tr.getCell(7).value = excelFmtVnInt(totals.gross);
    tr.getCell(7).font = { bold: true };
    tr.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(8).value = excelFmtVnInt(totals.vat);
    tr.getCell(8).font = { bold: true };
    tr.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(9).value = excelFmtVnInt(totals.net);
    tr.getCell(9).font = { bold: true };
    tr.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
    paintExcelTotalRow(ws, r, lastCol);

    ws.autoFilter = {
      from: { row: HEADER_ROW, column: 1 },
      to: { row: HEADER_ROW, column: lastCol },
    };
    ws.columns = [
      { width: 6 }, { width: 12 }, { width: 12 }, { width: 32 },
      { width: 14 }, { width: 16 }, { width: 18 }, { width: 16 }, { width: 20 },
    ];
  };

  // Sheet đầy đủ lịch sử đơn hàng (theo đơn, không theo từng món)
  const fillOrdersSheet = ws => {
    const lastCol = 14;
    applyReportTitleBlock(ws, {
      title: 'LỊCH SỬ ĐƠN HÀNG (ĐẦY ĐỦ)',
      periodLabel,
      exportDateStr,
      lastCol,
    });
    const vatLabel = vatRate > 0 ? `VAT (${vatRate}%)` : 'VAT';
    const headers = [
      'TT', 'Mã đơn', 'Thời gian', 'Bàn/Kênh', 'Danh sách món',
      'Tiền hàng (VND)', 'Giảm giá (VND)', 'Phí ship (VND)', vatLabel,
      'Tổng cộng (VND)', 'Giá vốn (VND)', 'Lãi gộp (VND)', 'PT Thanh toán', 'Ghi chú',
    ];
    headers.forEach((h, i) => { ws.getRow(HEADER_ROW).getCell(i + 1).value = h; });
    paintExcelHeaderRow(ws, HEADER_ROW, lastCol);
    const hr = ws.getRow(HEADER_ROW);
    hr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    hr.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    hr.getCell(3).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    hr.getCell(4).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    hr.getCell(5).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    for(let c = 6; c <= 12; c++) hr.getCell(c).alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
    hr.getCell(13).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    hr.getCell(14).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

    const orders = filterHistory(period === 'day' ? 'day' : period, opts);
    let r = HEADER_ROW + 1;
    let stt = 1;
    let totalRevenue = 0, totalDiscount = 0, totalShipping = 0, totalVat = 0, totalCost = 0;
    orders.forEach(o => {
      const itemsTotal = (o.items||[]).reduce((s,i) => s + i.price*i.qty, 0);
      const discount = Number(o.discount || 0);
      const shipping = Number(o.shipping || 0);
      const vatAmt = Number(o.vatAmount || 0);
      const cost = Number(o.cost || 0);
      const total = Number(o.total || 0);
      const gross = total - cost;
      const payLabel = o.payMethod === 'bank' ? 'Chuyển khoản' : 'Tiền mặt';
      const itemsText = (o.items||[]).map(i => `${i.name} x${i.qty} (${excelFmtVnInt(i.price*i.qty)}đ)`).join('; ');

      const row = ws.getRow(r);
      row.getCell(1).value = stt++;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).value = o.id || (o.historyId || '');
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(3).value = fmtDateCell(o.paidAt);
      row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(4).value = o.tableName || '';
      row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(5).value = itemsText;
      row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(6).value = excelFmtVnInt(itemsTotal);
      row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(7).value = excelFmtVnInt(discount);
      row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(8).value = excelFmtVnInt(shipping);
      row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(9).value = excelFmtVnInt(vatAmt);
      row.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(10).value = excelFmtVnInt(total);
      row.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(10).font = { bold: true };
      row.getCell(11).value = excelFmtVnInt(cost);
      row.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(12).value = excelFmtVnInt(gross);
      row.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(13).value = payLabel;
      row.getCell(13).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(14).value = o.note || '';
      row.getCell(14).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      setRowBorders(ws, r, lastCol);
      totalRevenue += total;
      totalDiscount += discount;
      totalShipping += shipping;
      totalVat += vatAmt;
      totalCost += cost;
      r++;
    });

    // Total row
    ws.mergeCells(r, 1, r, 5);
    const tr = ws.getRow(r);
    tr.getCell(1).value = `TỔNG (${orders.length} đơn)`;
    tr.getCell(1).font = { bold: true };
    tr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    tr.getCell(6).value = '';
    tr.getCell(7).value = excelFmtVnInt(totalDiscount);
    tr.getCell(7).font = { bold: true };
    tr.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(8).value = excelFmtVnInt(totalShipping);
    tr.getCell(8).font = { bold: true };
    tr.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(9).value = excelFmtVnInt(totalVat);
    tr.getCell(9).font = { bold: true };
    tr.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(10).value = excelFmtVnInt(totalRevenue);
    tr.getCell(10).font = { bold: true };
    tr.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(11).value = excelFmtVnInt(totalCost);
    tr.getCell(11).font = { bold: true };
    tr.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(12).value = excelFmtVnInt(totalRevenue - totalCost);
    tr.getCell(12).font = { bold: true };
    tr.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(13).value = '';
    tr.getCell(14).value = '';
    paintExcelTotalRow(ws, r, lastCol);

    ws.autoFilter = {
      from: { row: HEADER_ROW, column: 1 },
      to: { row: HEADER_ROW, column: lastCol },
    };
    ws.columns = [
      { width: 6 }, { width: 18 }, { width: 20 }, { width: 16 }, { width: 50 },
      { width: 16 }, { width: 14 }, { width: 14 }, { width: 12 },
      { width: 16 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 24 },
    ];
  };


  const fillExpenseSheet = ws => {
    const lastCol = 6;
    applyReportTitleBlock(ws, {
      title: 'BÁO CÁO CHI PHÍ',
      periodLabel,
      exportDateStr,
      lastCol,
    });
    const headers = ['TT', 'Ngày chi', 'Mã chi phí', 'Nđi dung', 'Danh mục', 'Sđ tiền (VND)'];
    headers.forEach((h, i) => { ws.getRow(HEADER_ROW).getCell(i + 1).value = h; });
    paintExcelHeaderRow(ws, HEADER_ROW, lastCol);
    const hr = ws.getRow(HEADER_ROW);
    hr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    for(let c = 2; c <= 5; c++) hr.getCell(c).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    hr.getCell(6).alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };

    const expenses = filterExpenses(period === 'day' ? 'day' : period, opts);
    let r = HEADER_ROW + 1;
    let stt = 1;
    let total = 0;
    expenses.forEach(e => {
      const amount = Number(e.amount || 0);
      const row = ws.getRow(r);
      row.getCell(1).value = stt++;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).value = fmtDateCell(e.date, true);
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(3).value = e.id || '';
      row.getCell(4).value = e.name || '';
      row.getCell(5).value = e.category || '';
      row.getCell(6).value = excelFmtVnInt(amount);
      row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
      setRowBorders(ws, r, lastCol);
      total += amount;
      r++;
    });
    ws.mergeCells(r, 1, r, 5);
    const tr = ws.getRow(r);
    tr.getCell(1).value = 'TỔNG';
    tr.getCell(1).font = { bold: true };
    tr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    tr.getCell(6).value = excelFmtVnInt(total);
    tr.getCell(6).font = { bold: true };
    tr.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
    paintExcelTotalRow(ws, r, lastCol);

    ws.autoFilter = {
      from: { row: HEADER_ROW, column: 1 },
      to: { row: HEADER_ROW, column: lastCol },
    };
    ws.columns = [{ width: 6 }, { width: 12 }, { width: 12 }, { width: 28 }, { width: 14 }, { width: 18 }];
  };

  const fillPurchaseSheet = ws => {
    const lastCol = 10;
    applyReportTitleBlock(ws, {
      title: 'BÁO CÁO NHẬP HÀNG',
      periodLabel,
      exportDateStr,
      lastCol,
    });
    const headers = [
      'TT', 'Ngày nhập', 'Mã phiếu', 'Nguyên liệu', 'Số lượng', 'Đơn vị',
      'Đơn giá (VND)', 'Thành tiền (VND)', 'Nhà cung cấp', 'Ghi chú',
    ];
    headers.forEach((h, i) => { ws.getRow(HEADER_ROW).getCell(i + 1).value = h; });
    paintExcelHeaderRow(ws, HEADER_ROW, lastCol);
    const hr = ws.getRow(HEADER_ROW);
    hr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    for(let c = 2; c <= 4; c++) hr.getCell(c).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    hr.getCell(5).alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
    hr.getCell(6).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    for(let c = 7; c <= 8; c++) hr.getCell(c).alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
    hr.getCell(9).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    hr.getCell(10).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

    const filtered = getFilteredPurchases();
    let r = HEADER_ROW + 1;
    let stt = 1;
    let totalQty = 0;
    let totalAmount = 0;
    filtered.forEach(p => {
      const qty = Number(p.qty || 0);
      const amount = Number(p.price || 0);
      const cpu = Number(p.costPerUnit || 0);
      const row = ws.getRow(r);
      row.getCell(1).value = stt++;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).value = fmtDateCell(p.date, true);
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(3).value = p.id || '';
      row.getCell(4).value = p.name || '';
      row.getCell(5).value = qty;
      row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(6).value = p.unit || '';
      row.getCell(7).value = excelFmtVnInt(cpu);
      row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(8).value = excelFmtVnInt(amount);
      row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(9).value = p.supplier || '';
      row.getCell(10).value = p.note || '';
      setRowBorders(ws, r, lastCol);
      totalQty += qty;
      totalAmount += amount;
      r++;
    });
    ws.mergeCells(r, 1, r, 4);
    const tr = ws.getRow(r);
    tr.getCell(1).value = 'TỔNG';
    tr.getCell(1).font = { bold: true };
    tr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    tr.getCell(5).value = totalQty;
    tr.getCell(5).font = { bold: true };
    tr.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(6).value = '';
    tr.getCell(7).value = '';
    tr.getCell(8).value = excelFmtVnInt(totalAmount);
    tr.getCell(8).font = { bold: true };
    tr.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(9).value = '';
    tr.getCell(10).value = '';
    paintExcelTotalRow(ws, r, lastCol);

    ws.autoFilter = {
      from: { row: HEADER_ROW, column: 1 },
      to: { row: HEADER_ROW, column: lastCol },
    };
    ws.columns = [
      { width: 6 }, { width: 12 }, { width: 12 }, { width: 24 }, { width: 10 }, { width: 8 },
      { width: 14 }, { width: 16 }, { width: 20 }, { width: 24 },
    ];
  };

  const fillInventorySheet = ws => {
    const lastCol = 9;
    applyReportTitleBlock(ws, {
      title: 'BÁO CÁO TỒN KHO',
      periodLabel,
      exportDateStr,
      lastCol,
    });
    const headers = [
      'TT', 'Mã hàng', 'Tên nguyên liệu', 'Đơn vị', 'Tồn hiện tại', 'Tồn tối thiểu',
      'Giá vốn (VND)', 'Giá trị tồn (VND)', 'Trạng thái',
    ];
    headers.forEach((h, i) => { ws.getRow(HEADER_ROW).getCell(i + 1).value = h; });
    paintExcelHeaderRow(ws, HEADER_ROW, lastCol);
    const hr = ws.getRow(HEADER_ROW);
    hr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    for(let c = 2; c <= 4; c++) hr.getCell(c).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    for(let c = 5; c <= 7; c++) hr.getCell(c).alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
    hr.getCell(8).alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
    hr.getCell(9).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

    const inv = Store.getInventory() || [];
    let r = HEADER_ROW + 1;
    let stt = 1;
    let totalValue = 0;
    inv.forEach(i => {
      const qty = Number(i.qty || 0);
      const min = Number(i.minQty || 0);
      const cost = Number(i.costPerUnit || 0);
      const value = qty * cost;
      const status = qty <= 0 ? 'Hết hàng' : (qty <= min ? 'Sắp hết' : 'Bình thường');
      const row = ws.getRow(r);
      row.getCell(1).value = stt++;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).value = i.id || '';
      row.getCell(3).value = i.name || '';
      row.getCell(4).value = i.unit || '';
      row.getCell(5).value = qty;
      row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(6).value = min;
      row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(7).value = excelFmtVnInt(cost);
      row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(8).value = excelFmtVnInt(value);
      row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(9).value = status;
      setRowBorders(ws, r, lastCol);
      totalValue += value;
      r++;
    });
    ws.mergeCells(r, 1, r, 7);
    const tr = ws.getRow(r);
    tr.getCell(1).value = 'TỔNG';
    tr.getCell(1).font = { bold: true };
    tr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    tr.getCell(8).value = excelFmtVnInt(totalValue);
    tr.getCell(8).font = { bold: true };
    tr.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(9).value = '';
    paintExcelTotalRow(ws, r, lastCol);

    ws.autoFilter = {
      from: { row: HEADER_ROW, column: 1 },
      to: { row: HEADER_ROW, column: lastCol },
    };
    ws.columns = [{ width: 6 }, { width: 12 }, { width: 28 }, { width: 8 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 18 }, { width: 14 }];
  };

  const workbook = new ExcelJSLib.Workbook();
  workbook.creator = 'Ganh Kho POS';
  let filename = 'bao_cao_tong_hop';

  if(type === 'revenue') {
    fillOrdersSheet(workbook.addWorksheet('LichSuDon', { views: [{ showGridLines: true }] }));
    fillRevenueSheet(workbook.addWorksheet('DoanhThu_TheoMon', { views: [{ showGridLines: true }] }));
    filename = 'bao_cao_doanh_thu';
  } else if(type === 'orders') {
    fillOrdersSheet(workbook.addWorksheet('LichSuDon', { views: [{ showGridLines: true }] }));
    filename = 'lich_su_don_hang';
  } else if(type === 'expense') {
    fillExpenseSheet(workbook.addWorksheet('ChiPhi', { views: [{ showGridLines: true }] }));
    filename = 'bao_cao_chi_phi';
  } else if(type === 'purchase') {
    fillPurchaseSheet(workbook.addWorksheet('NhapHang', { views: [{ showGridLines: true }] }));
    filename = 'bao_cao_nhap_hang';
  } else if(type === 'inventory') {
    fillInventorySheet(workbook.addWorksheet('TonKho', { views: [{ showGridLines: true }] }));
    filename = 'bao_cao_ton_kho';
  } else if(type === 'all') {
    fillOrdersSheet(workbook.addWorksheet('LichSuDon', { views: [{ showGridLines: true }] }));
    fillRevenueSheet(workbook.addWorksheet('DoanhThu_TheoMon', { views: [{ showGridLines: true }] }));
    fillExpenseSheet(workbook.addWorksheet('ChiPhi', { views: [{ showGridLines: true }] }));
    fillPurchaseSheet(workbook.addWorksheet('NhapHang', { views: [{ showGridLines: true }] }));
    fillInventorySheet(workbook.addWorksheet('TonKho', { views: [{ showGridLines: true }] }));
    filename = 'bao_cao_tong_hop';
  } else {
    fillOrdersSheet(workbook.addWorksheet('LichSuDon', { views: [{ showGridLines: true }] }));
    fillRevenueSheet(workbook.addWorksheet('DoanhThu_TheoMon', { views: [{ showGridLines: true }] }));
    filename = 'bao_cao_doanh_thu';
  }

  const wbout = await workbook.xlsx.writeBuffer();
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const dateStr = new Date().toISOString().slice(0,10);
  const downloadName = `${filename}_${dateStr}.xlsx`;
  const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  if(!skipLocalDownload) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);
  }

  const s = Store.getSettings();
  const wantsUpload = forceUploadToDrive || (override.uploadToDrive !== false && s.autoUploadToGoogleDrive);
  let uploadOk = null;
  let uploadDriveOpaque = false;

  if(wantsUpload) {
    const { uploadUrl, folderId } = getGoogleDriveConfigFromUi();
    if(!uploadUrl || !folderId) {
      if(forceUploadToDrive) {
        showToast('Thiếu URL Web App hoặc ID thư mục Google Drive.', 'warning');
        return false;
      }
      if(s.autoUploadToGoogleDrive && !skipLocalDownload) {
        showToast('⚠️ Bật tự đẩy sau xuất nhưng thiếu URL hoặc ID thư mục Google Drive.', 'warning');
      }
    } else {
      try {
        const up = await uploadFileToGoogleDriveByEndpoint({
          uploadUrl,
          folderId,
          filename: downloadName,
          mimeType,
          blob,
        });
        uploadOk = true;
        uploadDriveOpaque = !!(up && up.opaque);
      } catch(err) {
        console.warn('uploadFileToGoogleDrive error', err);
        uploadOk = false;
        uploadDriveOpaque = false;
        if(forceUploadToDrive) {
          showToast('⚠️ Đẩy lên Google Drive thất bại: ' + (err.message || err), 'warning');
          return false;
        }
        showToast('⚠️ Upload Google Drive thất bại: ' + (err.message || err), 'warning');
      }
    }
  }

  if(!skipLocalDownload) {
    if(uploadOk === true && s.autoUploadToGoogleDrive) {
      showToast(uploadDriveOpaque
        ? 'Đã xuất Excel. Đã gửi bản sao lên Drive — vui lòng kiểm tra thư mục (trình duyệt có thể không đọc được phản hồi).'
        : 'Đã xuất file báo cáo Excel và đẩy bản .xlsx lên Google Drive.', 'success');
    } else {
      showToast('Đã xuất file báo cáo Excel.', 'success');
    }
  } else if(uploadOk === true) {
    showToast(uploadDriveOpaque
      ? '✅ Đã gửi file .xlsx lên Drive. Mọi thư mục đã chọn đã xác nhận (chế độ tương thích CORS: không đọc được phản hồi chi tiết).'
      : '✅ Đã đẩy file báo cáo (.xlsx) lên thư mục Google Drive đã chọn.', 'success');
  }

  return true;

  }

  XekhoApp.report.exportReportExcel = exportReportExcel;
  if (typeof global.exportReportExcel !== 'function') {
    global.exportReportExcel = exportReportExcel;
  }

})(typeof window !== 'undefined' ? window : globalThis);
