'use strict';
/**
 * verify-attendance-webapp.js
 * Deterministic Phase A verifier for the attendance admin dashboard.
 * Reads source files and asserts markers/features without network or DB access.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const dbJs = fs.readFileSync(path.join(root, 'db.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

// ─────────────────────────────────────────────
// 1. index.html DOM ids for Phase A filters
// ─────────────────────────────────────────────
console.log('\n[1] index.html attendance filter DOM ids');
assert(
  indexHtml.includes('id="attendance-staff-filter"'),
  'attendance-staff-filter select exists in index.html'
);
assert(
  indexHtml.includes('id="attendance-status-filter"'),
  'attendance-status-filter select exists in index.html'
);
assert(
  indexHtml.includes('id="attendance-from-date"'),
  'attendance-from-date input exists in index.html'
);
assert(
  indexHtml.includes('id="attendance-to-date"'),
  'attendance-to-date input exists in index.html'
);
assert(
  indexHtml.includes('id="attendance-summary"'),
  'attendance-summary container exists in index.html'
);
assert(
  indexHtml.includes('id="attendance-management-list"'),
  'attendance-management-list container exists in index.html'
);
// Status filter options: all/open/closed/adjusted
assert(
  indexHtml.includes('value="open"') && indexHtml.includes('value="closed"') && indexHtml.includes('value="adjusted"'),
  'attendance-status-filter has open/closed/adjusted options'
);

// ─────────────────────────────────────────────
// 2. db.js listeners + DB.Attendance helpers
// ─────────────────────────────────────────────
console.log('\n[2] db.js attendance listeners and helpers');
assert(
  dbJs.includes("_col('attendance_daily')") || dbJs.includes('"attendance_daily"') || dbJs.includes("'attendance_daily'"),
  'db.js listens to attendance_daily collection'
);
assert(
  dbJs.includes("_col('attendance_shifts')") || dbJs.includes('"attendance_shifts"') || dbJs.includes("'attendance_shifts'"),
  'db.js listens to attendance_shifts collection'
);
assert(
  dbJs.includes('attendanceDaily'),
  'db.js populates appState.attendanceDaily'
);
assert(
  dbJs.includes('attendanceShifts'),
  'db.js populates appState.attendanceShifts'
);
assert(
  dbJs.includes('async updateDaily(') || dbJs.includes('updateDaily('),
  'DB.Attendance.updateDaily helper present in db.js'
);
assert(
  dbJs.includes('async updateShift(') || dbJs.includes('updateShift('),
  'DB.Attendance.updateShift helper present in db.js'
);

// ─────────────────────────────────────────────
// 3. app.js renderAttendanceManagement Phase A markers
// ─────────────────────────────────────────────
console.log('\n[3] app.js renderAttendanceManagement Phase A markers');
assert(
  appJs.includes('PHASE_A_ATTENDANCE_DASHBOARD'),
  'Phase A start marker PHASE_A_ATTENDANCE_DASHBOARD present'
);
assert(
  appJs.includes('END_PHASE_A_ATTENDANCE_DASHBOARD'),
  'Phase A end marker END_PHASE_A_ATTENDANCE_DASHBOARD present'
);
assert(
  appJs.includes('PHASE_A_FILTER_STAFF_STATUS'),
  'Phase A filter marker PHASE_A_FILTER_STAFF_STATUS present in renderAttendanceManagement'
);
assert(
  appJs.includes('function renderAttendanceManagement()'),
  'renderAttendanceManagement function exists'
);
assert(
  appJs.includes('isAdminUser()'),
  'renderAttendanceManagement checks isAdminUser()'
);
// Filter logic: staff filter
assert(
  appJs.includes('attendance-staff-filter') && appJs.includes('staffFilterVal'),
  'renderAttendanceManagement reads and applies staff filter'
);
// Filter logic: status filter
assert(
  appJs.includes('attendance-status-filter') && appJs.includes('statusFilterVal'),
  'renderAttendanceManagement reads and applies status filter'
);
assert(
  appJs.includes("row.status || 'closed'"),
  'status filter treats missing attendance status as closed for legacy rows'
);
// Filter logic: date range
assert(
  appJs.includes('_attendanceDateFilterRange()') && appJs.includes('fromDate') && appJs.includes('toDate'),
  'renderAttendanceManagement applies date range filter via _attendanceDateFilterRange'
);
// Summary cards: staff count, open shifts, payable hours, total wage, actual hours
assert(
  appJs.includes('uniqueStaffIds') && appJs.includes('openCount') && appJs.includes('payableMinutes') && appJs.includes('totalWage') && appJs.includes('totalMinutes'),
  'renderAttendanceManagement computes summary: staff count, open shifts, payable/actual hours, total wage'
);
// Missing expense indicator
assert(
  appJs.includes('missingExpenseCount'),
  'renderAttendanceManagement tracks missing expense count in summary'
);
// Row cards: status badge for adjusted
assert(
  appJs.includes("status === 'adjusted'"),
  'row card renders adjusted status badge'
);
// Row cards: payable hours, actual hours, hourly rate, wage
assert(
  appJs.includes('payableHoursVal') && appJs.includes('actualHours') && appJs.includes('hourlyRate') && appJs.includes('wage'),
  'row card shows payable hours, actual hours, hourly rate, and wage'
);
// Expense line per row
assert(
  (appJs.includes('expenseLine') || appJs.includes('statusCell')) && appJs.includes('expenseId'),
  'row card shows linked expense state (expenseLine or statusCell referencing expenseId)'
);
// Degraded/loading/empty states
assert(
  appJs.includes('Đang kết nối cơ sở dữ liệu'),
  'renderAttendanceManagement has degraded DB state message'
);
assert(
  appJs.includes('Đang tải dữ liệu chấm công'),
  'renderAttendanceManagement has loading state message'
);
assert(
  appJs.includes('Chưa có nhân viên'),
  'renderAttendanceManagement has no-staff state message'
);
assert(
  appJs.includes('Chưa có dòng chấm công phù hợp bộ lọc này'),
  'renderAttendanceManagement has empty filtered rows state message'
);
// adjustAttendanceDaily preserved
assert(
  appJs.includes('function adjustAttendanceDaily('),
  'adjustAttendanceDaily function preserved (Phase B owns modal)'
);

// ─────────────────────────────────────────────
// Phase B verifications
// ─────────────────────────────────────────────
console.log('\n[3b] app.js Phase B: shift detail, modal, audit, guard');

// 3b-1: expandable detail toggle marker and function
assert(
  appJs.includes('PHASE_B_SHIFT_DETAIL'),
  'Phase B shift detail start marker PHASE_B_SHIFT_DETAIL present'
);
assert(
  appJs.includes('END_PHASE_B_SHIFT_DETAIL'),
  'Phase B shift detail end marker END_PHASE_B_SHIFT_DETAIL present'
);
assert(
  appJs.includes('function toggleAttendanceShiftDetail('),
  'toggleAttendanceShiftDetail function exists (expandable detail)'
);
assert(
  appJs.includes('function _attendanceDetailPanelId(') && appJs.includes('replace(/[^a-zA-Z0-9_-]/g'),
  'Shift detail panel id is sanitized consistently for DOM lookup'
);
assert(
  appJs.includes('attendance-detail-toggle'),
  'Detail toggle button uses attendance-detail-toggle class'
);

// 3b-2: reads appState.attendanceShifts
assert(
  appJs.includes('PHASE_B_READS_ATTENDANCE_SHIFTS'),
  'Phase B reads attendanceShifts marker present'
);
assert(
  appJs.includes('appState.attendanceShifts'),
  '_renderAttendanceShiftDetailHtml reads appState.attendanceShifts'
);

// 3b-3: defensive shift matching dailyId OR staffId+dateKey
assert(
  appJs.includes('PHASE_B_DEFENSIVE_SHIFT_MATCH'),
  'Phase B defensive shift match marker present'
);
assert(
  appJs.includes('s.dailyId') && appJs.includes('s.staffId') && appJs.includes('s.dateKey'),
  'Shift match checks s.dailyId exact first, then s.staffId+s.dateKey fallback'
);
assert(
  appJs.includes('`${r.staffId}_${r.dateKey}`'),
  'Daily row lookup also supports computed staffId_dateKey fallback ids'
);

// 3b-4: modal replaces prompt — no prompt(...) inside adjustAttendanceDaily
// Extract adjustAttendanceDaily body and assert no prompt() call inside it
{
  const fnStart = appJs.indexOf('function adjustAttendanceDaily(');
  const fnEnd = appJs.indexOf('// END_PHASE_B_ADJUST_MODAL', fnStart);
  const adjustBody = fnStart !== -1 && fnEnd !== -1 ? appJs.slice(fnStart, fnEnd) : '';
  assert(
    adjustBody.length > 0,
    'adjustAttendanceDaily body is extractable between PHASE_B markers'
  );
  assert(
    !(/\bprompt\s*\(/.test(adjustBody)),
    'No prompt(...) call inside adjustAttendanceDaily (modal replaced prompt)'
  );
}

// 3b-5: reason required validation marker
assert(
  appJs.includes('PHASE_B_REASON_REQUIRED_VALIDATION'),
  'Phase B reason-required validation marker present'
);
assert(
  appJs.includes('adj-reason') && appJs.includes('adj-reason-error'),
  'Adjustment modal has reason textarea and error element'
);
assert(
  appJs.includes('function _escapeJsString(') && appJs.includes("JSON.stringify(String(text ??"),
  'Inline modal/toggle handlers use JSON-based JS string escaping'
);

// 3b-6: preview wage delta marker
assert(
  appJs.includes('PHASE_B_PREVIEW_WAGE_DELTA'),
  'Phase B preview wage delta marker present'
);
assert(
  appJs.includes('adj-preview-new') && appJs.includes('adj-preview-delta'),
  'Adjustment modal shows new wage and delta preview elements'
);

// 3b-7: expense update includes adjust reason in note
assert(
  appJs.includes('PHASE_B_EXPENSE_UPDATE_WITH_REASON'),
  'Phase B expense-update-with-reason marker present'
);
// Confirm the note includes both the hours/rate text and the reason variable
assert(
  appJs.includes('(admin chỉnh) — ${reason}'),
  'Expense update note includes adjust reason variable'
);

// 3b-8: audit display markers
assert(
  appJs.includes('PHASE_B_AUDIT_DISPLAY'),
  'Phase B audit display marker present (adjustedBy/adjustedAt shown in row)'
);

// 3b-9: shift empty state
assert(
  appJs.includes('PHASE_B_SHIFT_EMPTY_STATE'),
  'Phase B shift detail has empty-state marker when no shifts found'
);

// 3b-10: admin-only guard marker inside modal flow
assert(
  appJs.includes('PHASE_B_ADMIN_ONLY_GUARD'),
  'Phase B admin-only guard marker present in adjustAttendanceDaily'
);

// 3b-11: source display (Telegram badge)
assert(
  appJs.includes('PHASE_B_SOURCE_DISPLAY'),
  'Phase B source display marker present (Telegram badge in shift detail)'
);
assert(
  appJs.includes("=== 'telegram'"),
  "Shift detail shows Telegram badge when source === 'telegram'"
);

// ─────────────────────────────────────────────
// PHASE_C_QA_ATTENDANCE_SAMPLE assertions
// ─────────────────────────────────────────────
console.log('\n[3c] Phase C QA attendance sample mode');

// 3c-a: qaAttendance URL query gate marker and check
assert(
  appJs.includes('PHASE_C_QA_ATTENDANCE_SAMPLE') || appJs.includes('QA_ATTENDANCE_SAMPLE_MODE'),
  'Phase C QA start marker PHASE_C_QA_ATTENDANCE_SAMPLE present'
);
assert(
  appJs.includes("get('qaAttendance')") || appJs.includes("qaAttendance=1") || appJs.includes("qaAttendance"),
  'qaAttendance URL query parameter gate present'
);
assert(
  appJs.includes("=== '1'") || appJs.includes("qaAttendance"),
  "qaAttendance === '1' check (or equivalent) in gate logic"
);

// 3c-b: sample loader function
assert(
  appJs.includes('function _loadQaAttendanceSample(') || appJs.includes('function loadQaAttendanceSample('),
  'QA sample loader function (_loadQaAttendanceSample or loadQaAttendanceSample) exists'
);

// 3c-c: sample data contains today/yesterday/multi-date and open/closed/adjusted statuses
assert(
  appJs.includes('QA_ATTENDANCE_LOCAL_ONLY'),
  'QA_ATTENDANCE_LOCAL_ONLY marker present inside sample loader'
);
assert(
  // today and yesterday computed dynamically from Date, or literal "yesterday" comment
  appJs.includes('qa-attendance-') && appJs.includes("status: 'open'") && appJs.includes("status: 'closed'") && appJs.includes("status: 'adjusted'"),
  'Sample data has qa-attendance- prefix rows with open/closed/adjusted statuses'
);
// today and yesterday must appear as computed date keys or as qa-attendance row dateKey
assert(
  (appJs.includes('todayKey') || appJs.includes('today =') || appJs.includes('today=')) &&
  (appJs.includes('yesterdayKey') || appJs.includes('yesterday') ),
  'Sample loader computes today and yesterday date keys for sample rows'
);
// at least 3 different date values: today, yesterday, and a third
assert(
  appJs.includes('olderKey') || appJs.includes('older') || appJs.includes('daysAgo') || appJs.includes('dateKey3') || appJs.includes('day-3') || appJs.includes('3 days'),
  'Sample data has a third dateKey beyond today/yesterday'
);

// 3c-d: qaSample flag and id prefix
assert(
  appJs.includes('qaSample: true'),
  'Sample rows/shifts/staff are tagged with qaSample: true'
);
assert(
  appJs.includes('qa-attendance-daily') && appJs.includes('qa-attendance-shift') && appJs.includes('qa-attendance-staff'),
  'Sample staff ids, shift ids, and daily ids all use qa-attendance- prefix'
);

// 3c-e: sample loader has NO DB.Attendance / DB.Expenses / fetch / localStorage calls
// Extract function body of _loadQaAttendanceSample
{
  const loaderStart = appJs.indexOf('function _loadQaAttendanceSample(');
  // Find the matching closing brace by scanning forward from start marker
  // We'll check the QA_ATTENDANCE_LOCAL_ONLY bounded section
  const loaderEnd = appJs.indexOf('// END_PHASE_C_QA_ATTENDANCE_SAMPLE', loaderStart);
  const loaderBody = loaderStart !== -1 && loaderEnd !== -1
    ? appJs.slice(loaderStart, loaderEnd)
    : (loaderStart !== -1 ? appJs.slice(loaderStart, loaderStart + 6000) : '');
  assert(
    loaderBody.length > 100,
    'QA sample loader body is extractable'
  );
  assert(
    !(/\bDB\.Attendance\b/.test(loaderBody)),
    'Sample loader body does NOT call DB.Attendance'
  );
  assert(
    !(/\bDB\.Expenses\b/.test(loaderBody)),
    'Sample loader body does NOT call DB.Expenses'
  );
  assert(
    !(/\bfetch\s*\(/.test(loaderBody)),
    'Sample loader body does NOT call fetch()'
  );
  assert(
    !(/\blocalStorage\b/.test(loaderBody)),
    'Sample loader body does NOT access localStorage'
  );
  assert(
    !(/\bgetFirestore\b|\bfirebase\.app\b|\binitializeApp\b/.test(loaderBody)),
    'Sample loader body does NOT call Firebase SDK APIs (getFirestore/initializeApp)'
  );
}

// 3c-f: adjust/confirm flow has qaSample write guard
assert(
  appJs.includes('QA_ATTENDANCE_NO_FIRESTORE_WRITE_GUARD'),
  'QA_ATTENDANCE_NO_FIRESTORE_WRITE_GUARD marker present in adjust/confirm flow'
);
// The guard should prevent writes when row.qaSample is true
assert(
  appJs.includes('row.qaSample') || appJs.includes('.qaSample'),
  'Adjust/confirm flow checks .qaSample flag to block Firestore writes'
);

// 3c-g: reset/clear button removes only qaSample items
assert(
  appJs.includes('function _resetQaAttendanceSample(') || appJs.includes('resetQaAttendance'),
  'QA reset/clear function (_resetQaAttendanceSample or resetQaAttendance) exists'
);
assert(
  appJs.includes('qaSample') && (appJs.includes('.filter(') || appJs.includes('.filter (')),
  'Reset function filters out qaSample items from appState'
);

// 3c-h: UI banner / warning inside attendance section
assert(
  appJs.includes('Dữ liệu mẫu cục bộ') || appJs.includes('d\\u1eef li\\u1ec7u m\\u1eabu'),
  'QA banner text "Dữ liệu mẫu cục bộ" present in app.js'
);
assert(
  appJs.includes('không ghi Firestore') || appJs.includes('ch\\u1ec9 \\u0111\\u1ec3 test'),
  'QA banner warning about no Firestore writes present'
);

// ─────────────────────────────────────────────
// 4. Phase D: direct web attendance check-in/check-out
// ─────────────────────────────────────────────
console.log('\n[4] Phase D: web attendance check-in/check-out');

// 4a) index.html DOM ids + placement at PIN screen
assert(
  indexHtml.includes('id="web-attendance-card"'),
  'index.html has web-attendance-card id'
);
assert(
  indexHtml.includes('id="web-attendance-status"'),
  'index.html has web-attendance-status id'
);
assert(
  indexHtml.includes('id="web-attendance-checkin-btn"'),
  'index.html has web-attendance-checkin-btn id'
);
assert(
  indexHtml.includes('id="web-attendance-checkout-btn"'),
  'index.html has web-attendance-checkout-btn id'
);
{
  const lockStart = indexHtml.indexOf('id="lock-screen"');
  const scriptsStart = indexHtml.indexOf('<!-- Scripts -->', lockStart > -1 ? lockStart : 0);
  const lockSection = lockStart !== -1 && scriptsStart !== -1 ? indexHtml.slice(lockStart, scriptsStart) : '';
  const tablesStart = indexHtml.indexOf('id="page-tables"');
  const ordersStart = indexHtml.indexOf('id="page-orders"', tablesStart > -1 ? tablesStart : 0);
  const tablesSection = tablesStart !== -1 && ordersStart !== -1 ? indexHtml.slice(tablesStart, ordersStart) : '';
  assert(
    lockSection.includes('id="web-attendance-card"'),
    'web attendance card is placed inside PIN lock screen'
  );
  assert(
    !tablesSection.includes('id="web-attendance-card"'),
    'web attendance card is no longer on page-tables'
  );
}

// 4b) app.js phase markers
assert(
  appJs.includes('PHASE_D_WEB_ATTENDANCE_CHECKIN'),
  'app.js has PHASE_D_WEB_ATTENDANCE_CHECKIN marker'
);
assert(
  appJs.includes('PHASE_D_WEB_ATTENDANCE_CHECKOUT'),
  'app.js has PHASE_D_WEB_ATTENDANCE_CHECKOUT marker'
);

// 4c) app.js functions
assert(
  appJs.includes('function webAttendanceCheckIn('),
  'app.js has webAttendanceCheckIn function'
);
assert(
  appJs.includes('function webAttendanceCheckOut('),
  'app.js has webAttendanceCheckOut function'
);
assert(
  appJs.includes('function renderWebAttendancePanel('),
  'app.js has renderWebAttendancePanel function'
);
assert(
  appJs.includes('function webAttendanceCheckInFromPin('),
  'app.js has webAttendanceCheckInFromPin function'
);
assert(
  appJs.includes('function webAttendanceCheckOutFromPin('),
  'app.js has webAttendanceCheckOutFromPin function'
);
assert(
  appJs.includes('function _getAttendanceStaffFromPinInput('),
  'app.js resolves attendance staff directly from PIN input'
);

// 4d) deterministic dailyId = staffId + dateKey
assert(
  appJs.includes('`${staffId}_${dateKey}`') || appJs.includes("staffId + '_' + dateKey") || appJs.includes('`${currentUser') && appJs.includes('_${dateKey}`'),
  'dailyId uses staffId_dateKey deterministic pattern (one row per staff/day)'
);

// 4e) source 'web' written to attendance_daily and attendance_shifts
{
  const checkInStart = appJs.indexOf('// PHASE_D_WEB_ATTENDANCE_CHECKIN');
  const checkInEnd   = appJs.indexOf('// PHASE_D_WEB_ATTENDANCE_CHECKOUT', checkInStart > -1 ? checkInStart : 0);
  const checkInBody  = checkInStart !== -1 && checkInEnd !== -1
    ? appJs.slice(checkInStart, checkInEnd)
    : '';
  assert(
    checkInBody.includes("source: 'web'"),
    "webAttendanceCheckIn writes source: 'web' to attendance records"
  );
}

// 4f) checkout computes durationMinutes, payableMinutes, payableHours, totalWage
{
  const checkOutStart = appJs.indexOf('// PHASE_D_WEB_ATTENDANCE_CHECKOUT');
  const checkOutEnd   = appJs.indexOf('// END_PHASE_D', checkOutStart > -1 ? checkOutStart : 0);
  const checkOutBody  = checkOutStart !== -1 && checkOutEnd !== -1
    ? appJs.slice(checkOutStart, checkOutEnd)
    : '';
  assert(
    checkOutBody.includes('durationMinutes'),
    'webAttendanceCheckOut computes durationMinutes'
  );
  assert(
    checkOutBody.includes('payableMinutes'),
    'webAttendanceCheckOut computes payableMinutes'
  );
  assert(
    checkOutBody.includes('payableHours'),
    'webAttendanceCheckOut computes payableHours'
  );
  assert(
    checkOutBody.includes('totalWage'),
    'webAttendanceCheckOut computes totalWage'
  );
  assert(
    appJs.includes('function _roundAttendancePayableMinutes('),
    'attendance rounding helper exists'
  );
  assert(
    checkOutBody.includes('_roundAttendancePayableMinutes(totalMinutes)'),
    'checkout rounds total daily minutes into payableMinutes'
  );
}

// 4f.1) rounding rule: leftover minutes <30 drop, 30-54 = 0.5h, 55-59 = 1h
{
  const helperMatch = appJs.match(/function _roundAttendancePayableMinutes\(totalMinutes\)\s*\{([\s\S]*?)\n\}/);
  let roundFn = null;
  try {
    roundFn = helperMatch
      ? new Function(`return function _roundAttendancePayableMinutes(totalMinutes) {${helperMatch[1]}\n}`)()
      : null;
  } catch (_) {
    roundFn = null;
  }
  assert(typeof roundFn === 'function', 'rounding helper can be evaluated by verifier');
  if (typeof roundFn === 'function') {
    const cases = [
      [0, 0], [29, 0], [30, 30], [31, 30], [54, 30], [55, 60], [59, 60],
      [60, 60], [89, 60], [90, 90], [114, 90], [115, 120], [121, 120],
    ];
    for (const [input, expected] of cases) {
      assert(
        roundFn(input) === expected,
        `rounding helper maps ${input} minutes to ${expected} payable minutes`
      );
    }
  }
}

// 4g) expense category/name/note markers
assert(
  appJs.includes('Lương nhân viên'),
  'app.js uses "Lương nhân viên" expense category for daily salary sync'
);
{
  const checkOutStart = appJs.indexOf('// PHASE_D_WEB_ATTENDANCE_CHECKOUT');
  const checkOutEnd   = appJs.indexOf('// END_PHASE_D', checkOutStart > -1 ? checkOutStart : 0);
  const checkOutBody  = checkOutStart !== -1 && checkOutEnd !== -1
    ? appJs.slice(checkOutStart, checkOutEnd)
    : '';
  assert(
    checkOutBody.includes('expenseId'),
    'webAttendanceCheckOut syncs expense and saves expenseId'
  );
  assert(
    checkOutBody.includes('const linkedExpenseId = expenseSaved ? expenseId : persistedExpenseId')
      && checkOutBody.includes("...(linkedExpenseId ? { expenseId: linkedExpenseId } : { expenseId: null, expenseReconcileNeeded })"),
    'failed expense upsert leaves local daily row unlinked and marked for reconciliation'
  );
  assert(
    checkOutBody.includes('expenseId: linkedExpenseId, expenseSaved, expenseReconcileNeeded'),
    'checkout return reports only persisted expense ID and reconciliation state'
  );
}

// 4h) DB.Attendance has create/set helpers beyond just update
assert(
  dbJs.includes('async setDaily(') || dbJs.includes('setDaily('),
  'DB.Attendance has setDaily helper (not just updateDaily)'
);
assert(
  dbJs.includes('async createShift(') || dbJs.includes('createShift('),
  'DB.Attendance has createShift helper'
);

// 4i) Firestore Rules permit only mapped staff operational daily writes; payroll stays admin-only.
const rulesJs = fs.readFileSync(require('path').join(root, 'firestore.rules'), 'utf8');
{
  const dailyMatch = rulesJs.match(/match \/attendance_daily\/\{docId\}\s*\{([^}]+)\}/s);
  const dailyBlock = dailyMatch ? dailyMatch[1] : '';
  assert(
    dailyBlock.includes('validOwnDailyCreate(docId)') && dailyBlock.includes('validOwnDailyOperationalUpdate()'),
    'firestore.rules attendance_daily permits mapped staff operational check-in/checkout'
  );
  assert(
    /allow\s+delete\s*:\s*if\s+isAdmin\(\)/.test(dailyBlock),
    'firestore.rules attendance_daily delete remains admin-only'
  );
  assert(
    rulesJs.includes('function validOwnDailyCreate(docId)') && rulesJs.includes('function validOwnDailyOperationalUpdate()')
      && rulesJs.includes("request.resource.data.dailyId == request.resource.data.staffId + '_' + request.resource.data.dateKey")
      && rulesJs.includes('request.resource.data.keys().hasAll(['),
    'daily Rules require exact deterministic ID and complete contract'
  );
  assert(
    rulesJs.includes("resource.data.status == 'closed'\n          && request.resource.data.status == 'open'")
      && rulesJs.includes("request.resource.data.lastCheckOutAt == null")
      && rulesJs.includes("request.resource.data.lastCheckOutAtMs == null")
      && rulesJs.includes("request.resource.data.source == 'web'"),
    'daily Rules permit only closed-to-open web recheck-in with reset checkout fields'
  );
}
{
  // Extract attendance_shifts rule block
  const shiftsMatch = rulesJs.match(/match \/attendance_shifts\/\{docId\}\s*\{([^}]+)\}/s);
  const shiftsBlock = shiftsMatch ? shiftsMatch[1] : '';
  assert(
    /allow\s+create\s*:\s*if\s+isAdmin\(\)\s*\|\|\s*validOwnShiftCreate\(docId\)/.test(shiftsBlock) &&
    /allow\s+update\s*:\s*if\s+isAdmin\(\)\s*\|\|\s*validOwnShiftClose\(\)/.test(shiftsBlock),
    'firestore.rules attendance_shifts permits only validated own staff create/close'
  );
  assert(
    rulesJs.includes('function validOwnShiftCreate(docId)')
      && rulesJs.includes('docId == request.resource.data.shiftId')
      && rulesJs.includes("request.resource.data.dailyId == request.resource.data.staffId + '_' + request.resource.data.dateKey")
      && rulesJs.includes("request.resource.data.shiftId == request.resource.data.dailyId + '_' + string(request.resource.data.checkInAtMs)"),
    'shift Rules require ID anchored to deterministic daily ID plus checkInAtMs'
  );
  assert(
    /allow\s+delete\s*:\s*if\s+isAdmin/.test(shiftsBlock),
    'firestore.rules attendance_shifts delete remains admin-only'
  );
}

// 4j) geolocation gate: only allow attendance within 15m of shop
{
  const phaseDStart = appJs.indexOf('// PHASE_D_WEB_ATTENDANCE_CHECKIN');
  const phaseDEnd   = appJs.indexOf('// END_PHASE_D', phaseDStart > -1 ? phaseDStart : 0);
  const phaseDBody  = phaseDStart !== -1 && phaseDEnd !== -1
    ? appJs.slice(phaseDStart, phaseDEnd)
    : '';
  assert(
    appJs.includes('SHOP_LOCATION_LAT') && appJs.includes('11.537108'),
    'Phase D defines canonical shop latitude 11.537108'
  );
  assert(
    appJs.includes('SHOP_LOCATION_LNG') && appJs.includes('107.823279'),
    'Phase D defines canonical shop longitude 107.823279'
  );
  assert(
    appJs.includes('ATTENDANCE_MAX_DISTANCE_METERS') && appJs.includes('15'),
    'Phase D defines max attendance distance as 15 meters'
  );
  assert(
    appJs.includes('function _requireAttendanceLocationGate('),
    'Phase D has _requireAttendanceLocationGate function'
  );
  assert(
    appJs.includes('function _distanceMetersBetween('),
    'Phase D has distance calculation helper'
  );
  assert(
    phaseDBody.includes('navigator.geolocation.getCurrentPosition'),
    'Phase D requests browser geolocation before attendance writes'
  );
  assert(
    phaseDBody.includes('distanceMeters > ATTENDANCE_MAX_DISTANCE_METERS'),
    'Phase D blocks attendance when distance is above 15m'
  );
  assert(
    !phaseDBody.includes('getUserMedia'),
    'Phase D still does not implement photo capture'
  );
}

// 4k) QA sample write guard still exists
assert(
  appJs.includes('QA_ATTENDANCE_NO_FIRESTORE_WRITE_GUARD'),
  'QA_ATTENDANCE_NO_FIRESTORE_WRITE_GUARD still present (Phase C QA guard preserved)'
);

// ─────────────────────────────────────────────
// PHASE_E assertions: payroll table, no-data message, overnight helpers
// ─────────────────────────────────────────────
console.log('\n[5] Phase E: payroll table, no-data message, overnight helpers');
// 5e-1: payroll table marker and table element
assert(
  appJs.includes('PHASE_E_PAYROLL_TABLE'),
  'PHASE_E_PAYROLL_TABLE marker present in renderAttendanceManagement'
);
assert(
  appJs.includes('attendance-payroll-table'),
  'attendance-payroll-table class used in payroll table'
);
assert(
  appJs.includes('attendance-payroll-tbody'),
  'attendance-payroll-tbody id used in payroll table tbody'
);
// Required columns
assert(
  appJs.includes('Ngày / ca') && appJs.includes('Nhân viên'),
  'Payroll table has "Ngày / ca" and "Nhân viên" column headers'
);
assert(
  appJs.includes('Giờ thực tế') && appJs.includes('Giờ tính lương'),
  'Payroll table has "Giờ thực tế" and "Giờ tính lương" column headers'
);
assert(
  appJs.includes('Lương/giờ') && appJs.includes('Tiền lương'),
  'Payroll table has "Lương/giờ" and "Tiền lương" column headers'
);
assert(
  appJs.includes('Trạng thái / chi phí'),
  'Payroll table has "Trạng thái / chi phí" column header'
);

// 5e-2: no-data message (distinct from filter-empty)
assert(
  appJs.includes('PHASE_E_NO_DATA_MESSAGE'),
  'PHASE_E_NO_DATA_MESSAGE marker present'
);
assert(
  appJs.includes('attendance-no-data-msg'),
  'No-data state uses id="attendance-no-data-msg"'
);
assert(
  appJs.includes('Chưa có dữ liệu chấm công'),
  '"Chưa có dữ liệu chấm công" no-data message present'
);
// The no-data check must be on allDailyRows (unfiltered), not the filtered rows array
{
  const fnStart = appJs.indexOf('function renderAttendanceManagement(');
  const fnEnd = appJs.indexOf('// END_PHASE_A_ATTENDANCE_DASHBOARD', fnStart);
  const fnBody = fnStart !== -1 && fnEnd !== -1 ? appJs.slice(fnStart, fnEnd) : '';
  const noDataIdx = fnBody.indexOf('Chưa có dữ liệu chấm công');
  const noDataContext = noDataIdx !== -1 ? fnBody.slice(Math.max(0, noDataIdx - 200), noDataIdx + 80) : '';
  assert(
    noDataContext.includes('allDailyRows.length === 0'),
    'No-data message is shown when allDailyRows.length === 0 (unfiltered)'
  );
  assert(
    noDataContext.indexOf('allDailyRows.length === 0') < noDataContext.indexOf('Chưa có dữ liệu chấm công') + 200,
    'No-data check precedes the no-data message text'
  );
}

// 5e-3: overnight helpers
assert(
  appJs.includes('PHASE_E_OVERNIGHT_HELPERS'),
  'PHASE_E_OVERNIGHT_HELPERS marker present'
);
assert(
  appJs.includes('END_PHASE_E_OVERNIGHT_HELPERS'),
  'END_PHASE_E_OVERNIGHT_HELPERS end marker present'
);
assert(
  appJs.includes('function _computeAttendanceRowMinutes('),
  '_computeAttendanceRowMinutes helper function exists'
);
assert(
  appJs.includes('function _computeShiftDurationMinutes('),
  '_computeShiftDurationMinutes helper function exists'
);

// Verify overnight helper logic via evaluation
{
  const blockStart = appJs.indexOf('// PHASE_E_OVERNIGHT_HELPERS');
  const blockEnd = appJs.indexOf('// END_PHASE_E_OVERNIGHT_HELPERS', blockStart);
  const helperBlock = blockStart !== -1 && blockEnd !== -1 ? appJs.slice(blockStart, blockEnd) : '';
  let helpers = null;
  try {
    const roundMatch = appJs.match(/function _roundAttendancePayableMinutes\(totalMinutes\)\s*\{([\s\S]*?)\n\}/);
    const roundHelper = roundMatch ? `function _roundAttendancePayableMinutes(totalMinutes) {${roundMatch[1]}\n}` : '';
    helpers = helperBlock
      ? new Function(`${roundHelper}\n${helperBlock}\nreturn { _computeAttendanceRowMinutes, _computeAttendancePayableMinutes, _computeAttendanceWage, _computeShiftDurationMinutes };`)()
      : null;
  } catch (_) { helpers = null; }
  assert(!!helpers && typeof helpers._computeAttendanceRowMinutes === 'function', '_computeAttendanceRowMinutes can be evaluated by verifier');
  assert(!!helpers && typeof helpers._computeAttendancePayableMinutes === 'function', '_computeAttendancePayableMinutes can be evaluated by verifier');
  assert(!!helpers && typeof helpers._computeAttendanceWage === 'function', '_computeAttendanceWage can be evaluated by verifier');
  assert(!!helpers && typeof helpers._computeShiftDurationMinutes === 'function', '_computeShiftDurationMinutes can be evaluated by verifier');
  if (helpers) {
    const inMs = new Date('2025-01-01T20:00:00Z').getTime();
    const outMs = new Date('2025-01-02T03:00:00Z').getTime(); // 7h later
    assert(helpers._computeAttendanceRowMinutes({ totalMinutes: 120 }) === 120, '_computeAttendanceRowMinutes returns stored when > 0');
    assert(
      helpers._computeAttendanceRowMinutes({ totalMinutes: 0, firstCheckInAt: new Date(inMs).toISOString(), lastCheckOutAt: new Date(outMs).toISOString() }) === 420,
      '_computeAttendanceRowMinutes derives 420 min for overnight 20:00→03:00 shift'
    );
    assert(
      helpers._computeAttendanceRowMinutes({ totalMinutes: -5, firstCheckInAt: new Date(inMs).toISOString(), lastCheckOutAt: new Date(outMs).toISOString() }) === 420,
      '_computeAttendanceRowMinutes ignores negative stored value and derives from timestamps'
    );
    assert(
      helpers._computeAttendanceRowMinutes({ totalMinutes: 0, firstCheckInAt: new Date(inMs).toISOString() }) === 0,
      '_computeAttendanceRowMinutes returns 0 for open shift with no checkout'
    );
    assert(
      helpers._computeAttendancePayableMinutes({ payableMinutes: 0, totalMinutes: 0, firstCheckInAt: new Date(inMs).toISOString(), lastCheckOutAt: new Date(outMs).toISOString() }) > 0,
      '_computeAttendancePayableMinutes derives payable minutes when stored zero but overnight timestamps exist'
    );
    assert(
      helpers._computeAttendanceWage({ totalWage: 0, payableMinutes: 0, hourlyRate: 30000, firstCheckInAt: new Date(inMs).toISOString(), lastCheckOutAt: new Date(outMs).toISOString() }) > 0,
      '_computeAttendanceWage derives salary when stored wage is zero but overnight timestamps exist'
    );

    const inShiftMs = new Date('2025-01-01T21:00:00Z').getTime();
    const outShiftMs = new Date('2025-01-02T05:00:00Z').getTime(); // 8h
    assert(helpers._computeShiftDurationMinutes({ durationMinutes: 90 }) === 90, '_computeShiftDurationMinutes returns stored 90 when present');
    assert(
      helpers._computeShiftDurationMinutes({ durationMinutes: 0, checkInAtMs: inShiftMs, checkOutAtMs: outShiftMs }) === 480,
      '_computeShiftDurationMinutes derives 480 min for overnight shift when stored duration is zero'
    );
    assert(
      helpers._computeShiftDurationMinutes({ checkInAtMs: inShiftMs }) === -1,
      '_computeShiftDurationMinutes returns -1 for open shift'
    );
    assert(
      helpers._computeShiftDurationMinutes({ checkInAtMs: outShiftMs, checkOutAtMs: inShiftMs }) >= 0,
      '_computeShiftDurationMinutes does not return negative when timestamps are inverted'
    );
  }
}

// 5e-4: overnight guard in table rendering
assert(
  appJs.includes('PHASE_E_OVERNIGHT_GUARD'),
  'PHASE_E_OVERNIGHT_GUARD marker present in table row rendering'
);
assert(
  appJs.includes('_computeAttendanceRowMinutes(row)') && appJs.includes('_computeAttendancePayableMinutes(row)') && appJs.includes('_computeAttendanceWage(row)'),
  'Summary/table rendering uses overnight-safe helpers for total minutes, payable minutes, and wage'
);

// 5e-5: overnight indicator in table row and shift detail
assert(
  (appJs.match(/🌙\+1/g) || []).length >= 2,
  'Overnight 🌙+1 indicator appears in both table row and shift detail rendering'
);
assert(
  appJs.includes('PHASE_E_SHIFT_OVERNIGHT_DURATION'),
  'PHASE_E_SHIFT_OVERNIGHT_DURATION marker present in shift detail renderer'
);
assert(
  appJs.includes('_computeShiftDurationMinutes(s)'),
  'Shift detail uses _computeShiftDurationMinutes for duration display'
);

// 5e-6: open shift shows "Đang làm" / "--:--" in duration, not negative
assert(
  appJs.includes('Đang làm') && appJs.includes("'--:--'"),
  'Open shift renders "Đang làm" placeholder and "--:--" time, not negative numbers'
);

// ─────────────────────────────────────────────
// PHASE_F assertions: view actions, reset helpers, clear-filter button in empty state
// ─────────────────────────────────────────────
console.log('\n[5f] Phase F: attendance view actions and reset helpers');

assert(
  appJs.includes('PHASE_F_ATTENDANCE_VIEW_ACTIONS'),
  'PHASE_F_ATTENDANCE_VIEW_ACTIONS marker present in app.js'
);
assert(
  appJs.includes('END_PHASE_F_ATTENDANCE_VIEW_ACTIONS'),
  'END_PHASE_F_ATTENDANCE_VIEW_ACTIONS end marker present in app.js'
);

// resetAttendanceFilters helper
assert(
  appJs.includes('function resetAttendanceFilters('),
  'resetAttendanceFilters function exists in app.js'
);
// Must reset status filter to ''
{
  const fnStart = appJs.indexOf('function resetAttendanceFilters(');
  const fnEnd   = appJs.indexOf('\n}', fnStart);
  const fnBody  = fnStart !== -1 && fnEnd !== -1 ? appJs.slice(fnStart, fnEnd) : '';
  assert(
    fnBody.includes("statusEl.value = ''") || fnBody.includes("statusEl.value=''"),
    'resetAttendanceFilters clears statusEl to empty string'
  );
  assert(
    fnBody.includes("staffEl.value  = ''") || fnBody.includes("staffEl.value = ''") || fnBody.includes("staffEl.value=''"),
    'resetAttendanceFilters clears staffEl to empty string'
  );
  assert(
    fnBody.includes('renderAttendanceManagement()'),
    'resetAttendanceFilters calls renderAttendanceManagement()'
  );
}

// showAttendanceResults helper
assert(
  appJs.includes('function showAttendanceResults('),
  'showAttendanceResults function exists in app.js'
);
{
  const fnStart = appJs.indexOf('function showAttendanceResults(');
  const fnEnd   = appJs.indexOf('\n}', fnStart);
  const fnBody  = fnStart !== -1 && fnEnd !== -1 ? appJs.slice(fnStart, fnEnd) : '';
  assert(
    fnBody.includes('renderAttendanceManagement()'),
    'showAttendanceResults calls renderAttendanceManagement()'
  );
  assert(
    fnBody.includes('scrollIntoView'),
    'showAttendanceResults calls scrollIntoView to bring results into view'
  );
}

// Clear-filter button in filter-empty state
assert(
  appJs.includes('attendance-clear-filter-btn'),
  'filter-empty state has attendance-clear-filter-btn class button'
);
assert(
  appJs.includes('resetAttendanceFilters()') &&
  appJs.includes('attendance-clear-filter-btn'),
  'clear-filter button in empty state calls resetAttendanceFilters()'
);
assert(
  appJs.includes('attendance-filter-empty-state'),
  'filter-empty state uses attendance-filter-empty-state class'
);

// index.html: action row DOM
assert(
  indexHtml.includes('id="attendance-view-actions"'),
  'index.html has attendance-view-actions container id'
);
assert(
  indexHtml.includes('showAttendanceResults()'),
  'index.html has showAttendanceResults() call in action row'
);
assert(
  indexHtml.includes('resetAttendanceFilters()'),
  'index.html has resetAttendanceFilters() call in action row'
);
assert(
  indexHtml.includes('Xem bảng chấm công'),
  'index.html action row has "Xem bảng chấm công" primary button label'
);
assert(
  indexHtml.includes('Bỏ lọc'),
  'index.html action row has "Bỏ lọc" secondary button label'
);

// ─────────────────────────────────────────────
// PHASE_G assertions: staff fallback, no-staff does not block attendance rows
// ─────────────────────────────────────────────
console.log('\n[5g] Phase G: attendance staff fallback (PHASE_G_ATTENDANCE_STAFF_FALLBACK)');

// G-1: helper function exists with correct marker
assert(
  appJs.includes('PHASE_G_ATTENDANCE_STAFF_FALLBACK'),
  'PHASE_G_ATTENDANCE_STAFF_FALLBACK marker present in app.js'
);
assert(
  appJs.includes('END_PHASE_G_ATTENDANCE_STAFF_FALLBACK'),
  'END_PHASE_G_ATTENDANCE_STAFF_FALLBACK end marker present in app.js'
);
assert(
  appJs.includes('function _getAttendanceStaffOptions('),
  '_getAttendanceStaffOptions helper function exists'
);

// G-2: helper merges Staff collection + attendance rows
{
  const helperStart = appJs.indexOf('function _getAttendanceStaffOptions(');
  const helperEnd   = appJs.indexOf('// END_PHASE_G_ATTENDANCE_STAFF_FALLBACK', helperStart);
  const helperBody  = helperStart !== -1 && helperEnd !== -1 ? appJs.slice(helperStart, helperEnd) : '';
  assert(helperBody.length > 50, '_getAttendanceStaffOptions body is extractable');
  assert(
    helperBody.includes('appState?.staff') || helperBody.includes('appState.staff'),
    '_getAttendanceStaffOptions reads appState.staff (Staff collection)'
  );
  assert(
    helperBody.includes('attendanceDaily') || helperBody.includes('attendance_daily'),
    '_getAttendanceStaffOptions reads attendance_daily rows as fallback source'
  );
  assert(
    helperBody.includes('attendanceShifts') || helperBody.includes('attendance_shifts'),
    '_getAttendanceStaffOptions reads attendance_shifts rows as fallback source'
  );
  assert(
    helperBody.includes('staffId') && helperBody.includes('staffName'),
    '_getAttendanceStaffOptions extracts staffId and staffName from attendance rows'
  );
}

// G-3: renderAttendanceManagement uses _getAttendanceStaffOptions for dropdown
{
  const fnStart = appJs.indexOf('function renderAttendanceManagement(');
  const fnEnd   = appJs.indexOf('// END_PHASE_A_ATTENDANCE_DASHBOARD', fnStart);
  const fnBody  = fnStart !== -1 && fnEnd !== -1 ? appJs.slice(fnStart, fnEnd) : '';
  assert(
    fnBody.includes('_getAttendanceStaffOptions()'),
    'renderAttendanceManagement calls _getAttendanceStaffOptions() for dropdown'
  );
}

// G-4: no-staff gate only fires when BOTH staff and attendanceDaily are empty
{
  const fnStart = appJs.indexOf('function renderAttendanceManagement(');
  const fnEnd   = appJs.indexOf('// END_PHASE_A_ATTENDANCE_DASHBOARD', fnStart);
  const fnBody  = fnStart !== -1 && fnEnd !== -1 ? appJs.slice(fnStart, fnEnd) : '';
  assert(
    fnBody.includes('allStaff.length === 0 && !attendanceHasRows'),
    'No-staff gate checks allStaff.length === 0 && !attendanceHasRows (does not block when attendance rows exist)'
  );
  assert(
    !fnBody.match(/if\s*\(\s*allStaff\.length\s*===\s*0\s*\)\s*\{[\s\S]*?Chưa có nhân viên/),
    'No-staff gate does NOT simply check allStaff.length === 0 alone (regression guard)'
  );
}

// G-5: warning banner when Staff is empty but attendance rows exist
assert(
  appJs.includes('attendance-staff-fallback-banner'),
  'attendance-staff-fallback-banner element id used for staff fallback warning'
);
assert(
  appJs.includes('Không tải được danh sách nhân viên từ Staff, đang dùng dữ liệu chấm công'),
  'Staff fallback warning message text present in app.js'
);

// G-6: showAttendanceResults gives visible feedback when list is empty after render
assert(
  appJs.includes('PHASE_G_SHOW_RESULTS_FEEDBACK'),
  'PHASE_G_SHOW_RESULTS_FEEDBACK marker present in showAttendanceResults'
);
{
  const fnStart = appJs.indexOf('function showAttendanceResults(');
  const fnEnd   = appJs.indexOf('\n}', fnStart);
  const fnBody  = fnStart !== -1 && fnEnd !== -1 ? appJs.slice(fnStart, fnEnd) : '';
  assert(
    fnBody.includes('showToast('),
    'showAttendanceResults calls showToast when list is empty after render'
  );
  assert(
    fnBody.includes('scrollIntoView'),
    'showAttendanceResults still scrolls into view (not broken by G changes)'
  );
}

// G-7: _getAttendanceStaffOptions deduplicates by id (Map pattern)
{
  const helperStart = appJs.indexOf('function _getAttendanceStaffOptions(');
  const helperEnd   = appJs.indexOf('// END_PHASE_G_ATTENDANCE_STAFF_FALLBACK', helperStart);
  const helperBody  = helperStart !== -1 && helperEnd !== -1 ? appJs.slice(helperStart, helperEnd) : '';
  assert(
    helperBody.includes('new Map(') || helperBody.includes('Map()'),
    '_getAttendanceStaffOptions uses Map for deduplication'
  );
  assert(
    helperBody.includes('map.has(') && helperBody.includes('map.set('),
    '_getAttendanceStaffOptions uses map.has/set for dedup guard'
  );
}

// ─────────────────────────────────────────────
// PHASE_H assertions: real-browser selector regression
// ─────────────────────────────────────────────
console.log('\n[5h] Phase H: attendance real-browser selector fix');
assert(
  appJs.includes('PHASE_H_ATTENDANCE_SELECTOR_FIX'),
  'PHASE_H_ATTENDANCE_SELECTOR_FIX marker present in app.js'
);
assert(
  !appJs.includes('option[value!=""]'),
  'app.js no longer uses invalid CSS selector option[value!=""]'
);
assert(
  appJs.includes('option:not([value=""])'),
  'app.js uses valid CSS selector option:not([value=""]) for non-empty options'
);
assert(
  appJs.includes("querySelectorAll('option:not([value=\"\"])')") || appJs.includes('querySelectorAll("option:not([value='),
  'renderAttendanceManagement uses the valid :not([value=""]) selector in querySelectorAll'
);
assert(
  appJs.includes('PHASE_H_ATTENDANCE_DEFAULT_MONTH_RANGE'),
  'PHASE_H_ATTENDANCE_DEFAULT_MONTH_RANGE marker present in _attendanceDateFilterRange'
);
assert(
  appJs.includes('const monthStart') && appJs.includes('fromEl && !fromEl.value') && appJs.includes('fromEl.value = monthStart'),
  '_attendanceDateFilterRange defaults blank from-date to current month start, not today'
);


// ─────────────────────────────────────────────
// 5i. Phase I: check-in geofence copy + Bàn tab checkout panel
// ─────────────────────────────────────────────
console.log('\n[5i] Phase I: attendance geofence copy + Bàn checkout panel');
assert(
  appJs.includes('PHASE_D_GEOFENCE_ERROR_MSG'),
  'PHASE_D_GEOFENCE_ERROR_MSG marker present in app.js'
);
assert(
  appJs.includes('bạn đang ở quá xa vị trí chấm công cho phép'),
  'out-of-range check-in shows exact required Vietnamese message'
);
assert(
  !indexHtml.includes('id="tables-checkout-panel"'),
  'Bàn tab no longer renders a duplicate checkout card below the table grid'
);
assert(
  !appJs.includes('function renderTablesCheckoutPanel()') && !appJs.includes('function tablesCheckoutAction()'),
  'legacy Bàn checkout card renderer and action are removed'
);
assert(
  appJs.includes('function renderStatusBarAttendanceCheckout()') && appJs.includes('function statusBarAttendanceCheckoutAction()'),
  'the status-bar checkout remains the single logged-in staff checkout entrypoint'
);
assert(
  appJs.includes('PHASE_J_STATUS_BAR_ATTENDANCE_CHECKOUT'),
  'status-bar checkout marker remains present after removing the duplicate Bàn card'
);
assert(
  appJs.includes('bạn đã checkout thành công, tổng giờ làm ca này là'),
  'status-bar checkout success message includes the required duration prefix'
);
assert(
  appJs.includes('_webAttendanceCheckOutForActor(actor, { suppressSuccessToast: true })'),
  'status-bar checkout uses shared checkout with duplicate generic toast suppressed'
);
assert(
  appJs.includes('return { ok: true, staffId, staffName, dailyId, shiftId, durationMinutes'),
  'shared checkout returns authoritative duration result'
);

// ─────────────────────────────────────────────
// 5j. Phase J: dashboard status-bar checkout for a logged-in staff member
// ─────────────────────────────────────────────
console.log('\n[5j] Phase J: status-bar checkout after staff login');
assert(
  appJs.includes('PHASE_J_STATUS_BAR_ATTENDANCE_CHECKOUT'),
  'PHASE_J_STATUS_BAR_ATTENDANCE_CHECKOUT marker present in app.js'
);
assert(
  appJs.includes('function renderStatusBarAttendanceCheckout()') && appJs.includes('function statusBarAttendanceCheckoutAction()'),
  'status-bar attendance renderer and checkout action exist'
);
assert(
  appJs.includes('data-attendance-status-checkout'),
  'status bar marks its explicit checkout button while an open staff shift exists'
);
assert(
  appJs.includes('event.stopPropagation()') && appJs.includes('statusBarAttendanceCheckoutAction()'),
  'status-bar checkout click does not also open the POS shift modal'
);
assert(
  appJs.includes('_webAttendanceCheckOutForActor(actor, { suppressSuccessToast: true })'),
  'status-bar checkout reuses the canonical checkout write path'
);
assert(
  appJs.includes('renderStatusBarAttendanceCheckout();'),
  'attendance status bar is refreshed after app state/render updates'
);
const statusBarUpdateStart = appJs.indexOf('function updateShiftBtnUI()');
const statusBarUpdateEnd = appJs.indexOf('function openShiftModal(', statusBarUpdateStart);
const statusBarUpdateBody = statusBarUpdateStart !== -1 && statusBarUpdateEnd !== -1
  ? appJs.slice(statusBarUpdateStart, statusBarUpdateEnd)
  : '';
assert(
  statusBarUpdateBody.includes('btn.disabled = false;'),
  'status-bar button is re-enabled after checkout refresh'
);
assert(
  indexHtml.includes('app.js?v=20260721-attendance-latency'),
  'index.html cache key is bumped for the attendance latency UI'
);

// ─────────────────────────────────────────────
// 6. No secrets / env access in source files
// ─────────────────────────────────────────────
console.log('\n[6] No secrets / env access');
// process.env access in app.js or index.html would be unexpected for browser code
assert(
  !appJs.includes('process.env.'),
  'app.js does not reference process.env (browser file, no secrets)'
);
assert(
  !indexHtml.includes('process.env.'),
  'index.html does not reference process.env (browser file, no secrets)'
);

// ─────────────────────────────────────────────
// Result
// ─────────────────────────────────────────────
console.log(`\n───────────────────────────────────────────`);
if (failed === 0) {
  console.log(`verify-attendance-webapp PASSED (${passed} assertions)`);
  process.exit(0);
} else {
  console.error(`verify-attendance-webapp FAILED: ${failed} assertion(s) failed (${passed} passed)`);
  process.exit(1);
}
