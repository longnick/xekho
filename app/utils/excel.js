// @ts-check
(function (global) {
  'use strict';
  /** @type {any} */
  var _global = global;
  /** @type {any} */
  var XekhoApp = _global.XekhoApp = _global.XekhoApp || {};
  XekhoApp.utils = XekhoApp.utils || {};

  /** @returns {{ top: Object, left: Object, bottom: Object, right: Object }} */
  function excelThinBorder() {
    var color = { argb: 'FFAAAAAA' };
    return {
      top: { style: 'thin', color: color },
      left: { style: 'thin', color: color },
      bottom: { style: 'thin', color: color },
      right: { style: 'thin', color: color },
    };
  }

  /** @param {number} n @returns {string} */
  function excelColLetter(n) {
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
  function excelFmtVnInt(n) {
    return (Math.round(Number(n) || 0)).toLocaleString('vi-VN');
  }

  /** @param {Object} ws @param {{ title?: string, periodLabel?: string, exportDateStr?: string, lastCol?: number }} [opts] @returns {void} */
  function applyReportTitleBlock(ws, opts) {
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

    ws.getCell('A2').value = 'K\u1ef3 b\u00e1o c\u00e1o:';
    ws.getCell('B2').value = periodLabel;
    ws.getCell('A3').value = 'Ng\u00e0y xu\u1ea5t:';
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
  function paintExcelHeaderRow(ws, rowIndex, colCount) {
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
  function paintExcelTotalRow(ws, rowIndex, colCount) {
    var row = ws.getRow(rowIndex);
    for (var c = 1; c <= colCount; c++) {
      var cell = row.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFCC' } };
      cell.border = excelThinBorder();
    }
  }

  /** @param {Object} ws @param {number} rowIndex @param {number} colCount @returns {void} */
  function setRowBorders(ws, rowIndex, colCount) {
    for (var c = 1; c <= colCount; c++) {
      ws.getRow(rowIndex).getCell(c).border = excelThinBorder();
    }
  }

  XekhoApp.utils.excel = {
    excelThinBorder: excelThinBorder,
    excelColLetter: excelColLetter,
    excelFmtVnInt: excelFmtVnInt,
    applyReportTitleBlock: applyReportTitleBlock,
    paintExcelHeaderRow: paintExcelHeaderRow,
    paintExcelTotalRow: paintExcelTotalRow,
    setRowBorders: setRowBorders,
  };

  if (typeof global.excelThinBorder !== 'function') global.excelThinBorder = excelThinBorder;
  if (typeof global.excelColLetter !== 'function') global.excelColLetter = excelColLetter;
  if (typeof global.excelFmtVnInt !== 'function') global.excelFmtVnInt = excelFmtVnInt;
  if (typeof global.applyReportTitleBlock !== 'function') global.applyReportTitleBlock = applyReportTitleBlock;
  if (typeof global.paintExcelHeaderRow !== 'function') global.paintExcelHeaderRow = paintExcelHeaderRow;
  if (typeof global.paintExcelTotalRow !== 'function') global.paintExcelTotalRow = paintExcelTotalRow;
  if (typeof global.setRowBorders !== 'function') global.setRowBorders = setRowBorders;

})(typeof window !== 'undefined' ? window : globalThis);
