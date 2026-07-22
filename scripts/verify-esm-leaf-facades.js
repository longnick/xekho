#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function toDataModuleUrl(source) {
  return 'data:text/javascript;base64,' + Buffer.from(source, 'utf8').toString('base64');
}

async function importFacade(relPath) {
  const source = fs.readFileSync(path.join(root, relPath), 'utf8');
  return import(toDataModuleUrl(source));
}

function makeWorksheetStub() {
  const cells = new Map();
  const rows = new Map();
  const columns = new Map();
  return {
    merges: [],
    mergeCells(range) { this.merges.push(range); },
    getCell(address) {
      if (!cells.has(address)) cells.set(address, { address });
      return cells.get(address);
    },
    getRow(index) {
      if (!rows.has(index)) {
        const rowCells = new Map();
        rows.set(index, {
          height: undefined,
          getCell(column) {
            if (!rowCells.has(column)) rowCells.set(column, { column });
            return rowCells.get(column);
          },
        });
      }
      return rows.get(index);
    },
    getColumn(index) {
      if (!columns.has(index)) columns.set(index, { width: undefined });
      return columns.get(index);
    },
  };
}

(async function main() {
  const format = await importFacade('app/esm/utils/format.js');
  const date = await importFacade('app/esm/utils/date.js');
  const excel = await importFacade('app/esm/utils/excel.js');
  const staff = await importFacade('app/esm/auth/staff.js');

  assert(format.compactNumber(1500000) === '1.5M', 'compactNumber million mismatch');
  assert(format.compactNumber(1200) === '1K', 'compactNumber thousand mismatch');
  assert(format.currency(1234567) === '1.234.567đ', 'currency mismatch');
  assert(format.dateTime('2026-06-02T10:30:00+07:00').includes(' '), 'dateTime should combine date and time');
  const formatRoot = { XekhoApp: {} };
  const formatGlobals = format.installGlobalFormatUtils(formatRoot);
  assert(formatGlobals.compactNumber === format.compactNumber, 'format installer should expose compactNumber');
  assert(formatRoot.fmt(1500000) === '1.5M', 'legacy fmt should be installed');
  assert(formatRoot.fmtFull(1000) === '1.000đ', 'legacy fmtFull should be installed');
  assert(typeof formatRoot.today() === 'string', 'legacy today should be installed');

  assert(date.formatLocalDateKey('2026-06-02T12:00:00+07:00') === '2026-06-02', 'formatLocalDateKey mismatch');
  assert(date.getWeekStartKey('2026-06-04T00:00:00Z') === '2026-06-01', 'getWeekStartKey mismatch');
  assert(date.resolvePeriodDateRangePure('day', { date: '2026-06-02' }).fromDate === '2026-06-02', 'day range mismatch');
  assert(date.resolvePeriodDateRangePure('unknown') === null, 'unknown range should return null');
  const dateRoot = { XekhoApp: {} };
  date.installGlobalDateUtils(dateRoot);
  assert(dateRoot.formatLocalDateKey('2026-06-02') === '2026-06-02', 'date global install mismatch');

  assert(excel.excelColLetter(1) === 'A', 'excelColLetter A mismatch');
  assert(excel.excelColLetter(28) === 'AB', 'excelColLetter AB mismatch');
  assert(excel.excelFmtVnInt(1234567).includes('1'), 'excelFmtVnInt mismatch');
  const ws = makeWorksheetStub();
  excel.applyReportTitleBlock(ws, { title: 'Test', periodLabel: 'Today', exportDateStr: '2026-06-02', lastCol: 3 });
  assert(ws.merges[0] === 'A1:C1', 'applyReportTitleBlock merge mismatch');
  assert(ws.getCell('A1').value === 'Test', 'applyReportTitleBlock title mismatch');
  excel.paintExcelHeaderRow(ws, 5, 2);
  assert(ws.getRow(5).getCell(1).border.top.style === 'thin', 'paintExcelHeaderRow border mismatch');
  excel.paintExcelTotalRow(ws, 6, 2);
  excel.setRowBorders(ws, 7, 2);
  const excelRoot = { XekhoApp: {} };
  excel.installGlobalExcelUtils(excelRoot);
  assert(excelRoot.excelColLetter(3) === 'C', 'excel global install mismatch');

  assert(staff.normalizeStaffRole('ADMIN') === 'admin', 'normalizeStaffRole admin mismatch');
  assert(staff.normalizeStaffRole('cashier') === 'staff', 'normalizeStaffRole staff fallback mismatch');
  assert(staff.normalizeStaffStatus('inactive') === 'inactive', 'normalizeStaffStatus inactive mismatch');
  assert(staff.validatePinFormat('1234') === true, 'validatePinFormat true mismatch');
  assert(staff.validatePinFormat('12345') === false, 'validatePinFormat false mismatch');
  const user = staff.buildCurrentUserFromStaff({ staff_id: 's1', full_name: 'Nhân viên A', role: 'admin', status: 'active' }, '4321');
  assert(user.id === 's1' && user.role === 'admin' && user.pin === '4321', 'buildCurrentUserFromStaff mismatch');
  const staffRoot = { XekhoApp: {} };
  staff.installGlobalStaffAuth(staffRoot);
  assert(staffRoot.XekhoApp.auth.getStaffIdentity({ id: 'u1' }) === 'u1', 'staff global install mismatch');

  console.log('verify-esm-leaf-facades passed', {
    format: Object.keys(format).length,
    date: Object.keys(date).length,
    excel: Object.keys(excel).length,
    staff: Object.keys(staff).length,
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
