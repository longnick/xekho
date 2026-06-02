// @ts-check
/**
 * ESM facade for pure Excel worksheet formatting helpers from `app/utils/excel.js`.
 */

/** @returns {{ top: Object, left: Object, bottom: Object, right: Object }} */
export function excelThinBorder() {
  var color = { argb: 'FFAAAAAA' };
  return {
    top: { style: 'thin', color: color },
    left: { style: 'thin', color: color },
    bottom: { style: 'thin', color: color },
    right: { style: 'thin', color: color },
  };
}

/** @param {number} n @returns {string} */
export function excelColLetter(n) {
  var s = '';
  var x = n;
  while (x > 0) {
    var r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

/** @param {*} n @returns {string} */
export function excelFmtVnInt(n) {
  return (Math.round(Number(n) || 0)).toLocaleString('vi-VN');
}

/** @param {Object} ws @param {{ title?: string, periodLabel?: string, exportDateStr?: string, lastCol?: number }} [opts] @returns {void} */
export function applyReportTitleBlock(ws, opts) {
  opts = opts || {};
  var title = opts.title || '';
  var periodLabel = opts.periodLabel || '';
  var exportDateStr = opts.exportDateStr || '';
  var lastCol = opts.lastCol || 1;
  var end = excelColLetter(lastCol);
  ws.mergeCells('A1:' + end + '1');
  var t = ws.getCell('A1');
  t.value = title;
  t.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
  t.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  ws.getRow(1).height = 28;

  ws.getCell('A2').value = 'Kỳ báo cáo:';
  ws.getCell('B2').value = periodLabel;
  ws.getCell('A3').value = 'Ngày xuất:';
  ws.getCell('B3').value = exportDateStr;
  ws.getCell('A2').font = { bold: true, size: 11 };
  ws.getCell('A3').font = { bold: true, size: 11 };
  ws.getCell('B2').font = { size: 11 };
  ws.getCell('B3').font = { size: 11 };
  ['A2', 'B2', 'A3', 'B3'].forEach(function (a) {
    ws.getCell(a).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  });
  ws.getColumn(1).width = Math.max(ws.getColumn(1).width || 0, 14);
  ws.getColumn(2).width = Math.max(ws.getColumn(2).width || 0, 30);
  ws.getRow(4).height = 6;
}

/** @param {Object} ws @param {number} rowIndex @param {number} colCount @returns {void} */
export function paintExcelHeaderRow(ws, rowIndex, colCount) {
  var row = ws.getRow(rowIndex);
  for (var c = 1; c <= colCount; c++) {
    var cell = row.getCell(c);
    cell.font = { bold: true, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    cell.border = excelThinBorder();
  }
  row.height = 22;
}

/** @param {Object} ws @param {number} rowIndex @param {number} colCount @returns {void} */
export function paintExcelTotalRow(ws, rowIndex, colCount) {
  var row = ws.getRow(rowIndex);
  for (var c = 1; c <= colCount; c++) {
    var cell = row.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFCC' } };
    cell.border = excelThinBorder();
  }
}

/** @param {Object} ws @param {number} rowIndex @param {number} colCount @returns {void} */
export function setRowBorders(ws, rowIndex, colCount) {
  for (var c = 1; c <= colCount; c++) {
    ws.getRow(rowIndex).getCell(c).border = excelThinBorder();
  }
}

/**
 * Install/refresh classic Excel helper globals.
 * @param {any} [globalScope]
 * @returns {{ excelThinBorder: Function, excelColLetter: Function, excelFmtVnInt: Function, applyReportTitleBlock: Function, paintExcelHeaderRow: Function, paintExcelTotalRow: Function, setRowBorders: Function }}
 */
export function installGlobalExcelUtils(globalScope) {
  /** @type {any} */
  var root = globalScope || (typeof window !== 'undefined' ? window : globalThis);
  /** @type {any} */
  var XekhoApp = root.XekhoApp = root.XekhoApp || {};
  XekhoApp.utils = XekhoApp.utils || {};
  XekhoApp.utils.excel = Object.assign({}, XekhoApp.utils.excel, {
    excelThinBorder: excelThinBorder,
    excelColLetter: excelColLetter,
    excelFmtVnInt: excelFmtVnInt,
    applyReportTitleBlock: applyReportTitleBlock,
    paintExcelHeaderRow: paintExcelHeaderRow,
    paintExcelTotalRow: paintExcelTotalRow,
    setRowBorders: setRowBorders,
  });
  if (typeof root.excelThinBorder !== 'function') root.excelThinBorder = excelThinBorder;
  if (typeof root.excelColLetter !== 'function') root.excelColLetter = excelColLetter;
  if (typeof root.excelFmtVnInt !== 'function') root.excelFmtVnInt = excelFmtVnInt;
  if (typeof root.applyReportTitleBlock !== 'function') root.applyReportTitleBlock = applyReportTitleBlock;
  if (typeof root.paintExcelHeaderRow !== 'function') root.paintExcelHeaderRow = paintExcelHeaderRow;
  if (typeof root.paintExcelTotalRow !== 'function') root.paintExcelTotalRow = paintExcelTotalRow;
  if (typeof root.setRowBorders !== 'function') root.setRowBorders = setRowBorders;
  return XekhoApp.utils.excel;
}
