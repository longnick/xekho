# 2026-07-14 23:01 +07 - Attendance status-bar checkout
- Added a staff-only dashboard status-card checkout action that appears after a same-day check-in and PIN login; removed the duplicate checkout card below the Bàn table grid.
- The action stops card-click propagation, delegates to the canonical geofenced checkout/payroll write path, and resets safely to normal POS shift UI after completion.
- Added Phase J RED→GREEN verifier coverage and bumped the classic `app.js` cache key. Local syntax, `npm run check`, and Hosting build pass; no deploy.
- DEPLOYED: Hosting-only to `xe-kho.web.app`, version `f9cb856cda04ffb7`; live smoke confirms the duplicate Bàn card/renderer are absent and the status-bar checkout code/cache key are live.
- Task log: `docs/ai-map/TASK_LOGS/2026-07-14-2301-status-bar-attendance-checkout.md`.

# 2026-07-12 - Zalo Bot command admin + local simulator
- Added a manager/admin-only `Cài đặt → Bot nhân viên` catalog for safe text-reply Zalo group commands. Admins can create/edit/enable/disable/delete aliases and simulate replies locally without sending a Zalo message.
- Added validated `functions/zalo/commandCatalog.js`; built-in `mở ca` / `đóng ca` / `help` commands retain precedence, custom enabled replies are read only after no built-in match, and message/reply content stays out of runtime logs.
- Fixed independent-review BLOCK: capital `Đ` was not normalized (dropped the `đ` glyph), breaking `Đóng ca` and capitalized custom triggers; now handled in Functions + browser simulator with regression tests.
- Added Firestore `zalo_bot_commands` manager/admin-only Rules, DB adapter, TDD resolver/wiring/UI tests, capitalization + webhook integration tests, Emulator Rules access test, Settings-tab verifier update, local browser simulator probe, and cache-key bumps for db/app classic scripts.
- No deploy or production command write. Task log: `docs/ai-map/TASK_LOGS/2026-07-12-zalo-command-admin.md`.

# 2026-07-11 02:32 +07 - Security remediation Sprint 6: local release rehearsal
- Clean root/Functions installs and all local release gates passed: full Jest 13/53, Functions security 10/39, Rules Emulator 15/15, authorization deny controls 4/4, syntax, lint (0 errors), dual audit policy, Hosting artifact/browser smoke, and diff check.
- No production action was run. Rollout remains blocked on scoped reviewed commits plus authenticated synthetic-safe Function and real mobile/POS QA.
- Task log: `docs/ai-map/TASK_LOGS/2026-07-11-0232-security-remediation-sprint-6-release-rehearsal.md`.

# 2026-07-10 16:46 +07 - Security remediation Sprint 5: CI + release gates
- Added separate secret-free CI jobs for frontend Node 20/22 checks, Rules Emulator deny regressions, Functions security tests, Hosting artifact/browser smoke, and dual-lockfile dependency policy.
- Added Hosting artifact verifier, signed-out mobile Puppeteer smoke, critical-audit allowlist enforcement, and regression fixtures for new/expired advisories.
- Verified local reproducibility with root/functions `npm ci --ignore-scripts`, full suite, Rules Emulator, build, browser smoke, and diff check. No deployment.

# 2026-07-10 16:08 +07 - Security remediation Sprint 4 P1: image render boundaries + real browser E2E
- Hardened selected menu, order-photo, purchase-photo/batch, and history-photo paths with strict image URL validation and DOM-safe viewer assignment; menu names/IDs are now escaped at selected dynamic event/text boundaries.
- Verified real Puppeteer E2E at 375×667 and 1440×900: malicious `javascript:` input rejected, valid raster images render, no overflow, and zero console/page errors.
- Full suite: 9 Jest suites / 42 tests, Firestore Rules emulator 15/15, authorization evidence 4/4, Hosting build, syntax, and diff checks all pass. No deployment performed.
- Task log: `docs/ai-map/TASK_LOGS/2026-07-10-1542-security-remediation-sprint-4-render-boundaries.md`.

# 2026-07-10 15:42 +07 - Security remediation Sprint 4: frontend render boundary hardening
- Added a documented DOM-sink inventory, trusted-data policy, and context-specific rendering rules in `docs/ai-map/FRONTEND_RENDER_BOUNDARIES.md`.
- Replaced raw persisted store-logo `innerHTML` interpolation in the header and Settings preview with validated DOM-created image nodes.
- Added strict HTTPS / raster data-image URL validation; `javascript:`, HTML data URLs, SVG, and other schemes are rejected and retain the safe emoji fallback.
- Added render-safety TDD coverage and cache-key updates for classic scripts.
- Corrected the Jest script so generated `dist/`/Android asset copies do not run duplicate tests; verification is focused 4/4 render-safety tests and 9 source suites / 41 tests, plus Rules emulator 15/15, authorization evidence 4/4, syntax/check/build/diff check, and local browser runtime smoke with 0 JS errors. No deployment performed.
- Task log: `docs/ai-map/TASK_LOGS/2026-07-10-1542-security-remediation-sprint-4-render-boundaries.md`.

# 2026-07-10 12:12 +07 - Security remediation Sprint 3: dependency compatibility and audit baseline
- Updated Functions `axios` to resolved `1.18.1`; production audit reduced Functions high findings 11→10.
- Added Axios caller/version compatibility coverage and Vietnamese NLP intent fixtures (order, checkout, inventory, sales, import).
- Fixed a real Functions `node-nlp@3` compatibility fault in `ensureNlp()` (`manager.settings`, replacing stale `manager.nlp.settings`).
- Root compatible Firebase Admin lock resolution advanced to v13.10.0; production audit reduced root high findings 8→7.
- Rejected two unsafe upgrade routes with evidence: Admin v14 conflicts with the current Functions peer/API contract, and `node-nlp@5` remains alpha and does not remove its xlsx findings.
- Verification: clean `npm ci` in both projects; Jest 55/55; Rules emulator 15/15; authorization evidence 4/4; check/build/syntax/diff check; local browser smoke has 0 JS errors. No deployment performed.
- Baseline: `docs/ai-map/DEPENDENCY_SECURITY_BASELINE.md`; task log: `docs/ai-map/TASK_LOGS/2026-07-10-1212-security-remediation-sprint-3.md`.

# 2026-07-10 11:42 +07 - Security remediation Sprint 2: HTTP Function containment
- Retired the public legacy `createAdminUser` credential-provisioning endpoint with a static `410 Gone` response; authenticated `manageUserAccount` remains the only intended provisioning boundary.
- Added a tested shared HTTP security helper and wired Firebase ID-token/server-side-role checks into voice, AI router/status, OCR, and maintenance routes.
- Added request-size, decoded base64 MIME/size, and bounded per-instance UID-rate limits before NLP/Firestore/Vertex/OCR calls.
- Removed OAuth userinfo and owner-email inference fallback from administrative request verification.
- Updated retained browser AI/OCR callers to send Firebase Authorization headers and made Rules package commands emulator self-contained.
- Verification: HTTP 15/15, function unit 8/8, Jest 47/47, Firestore emulator 15/15, authorization exploit regression 4/4, local browser smoke 0 JS errors. No deploy was performed.
- Task log: `docs/ai-map/TASK_LOGS/2026-07-10-1142-security-remediation-sprint-2.md`; endpoint matrix: `docs/ai-map/SECURITY_HTTP_ENDPOINT_MATRIX.md`.

# 2026-07-04 01:20 +07 - DEPLOY: Attendance rounding rule
- Deployed payable-time rounding rule to Firebase Hosting site `xe-kho` on project `pos-v2-909ff`.
- Deploy command: `npx firebase-tools deploy --only hosting --project pos-v2-909ff --json` → success, Hosting version `projects/774115283908/sites/xe-kho/versions/a8aca59f6b27304a`.
- Hosting predeploy published OTA version `20260704T012045Z`, SHA256 `b6fd5e7d8648eb9400d2d83b782a653b871ee3cbcbac6a2932028d3ca822a33c`.
- Live smoke: `_roundAttendancePayableMinutes` exists and maps `[29,30,54,55,89,90,115]` to `[0,30,30,60,60,90,120]`; PIN attendance card remains in `#lock-screen`; browser console has 0 JS errors.

# 2026-07-04 01:18 +07 - IMPL: Attendance payable-time rounding rule
- Updated web attendance salary calculation to round daily total minutes before computing payable hours and wage.
- Rule: leftover minutes `<30` are dropped; `30–54` count as `0.5h`; `55–59` count as `1h`.
- Added `_roundAttendancePayableMinutes(totalMinutes)` and changed checkout to compute `payableMinutes = _roundAttendancePayableMinutes(totalMinutes)`.
- Extended `scripts/verify-attendance-webapp.js` with executable rounding cases; verifier now covers examples like `89→60`, `90→90`, `114→90`, `115→120` payable minutes.

# 2026-07-04 00:48 +07 - DEPLOY: PIN-screen attendance geofence
- Deployed PIN-screen web attendance + 15m location gate to Firebase Hosting site `xe-kho` on project `pos-v2-909ff`.
- Deploy command: `npx firebase-tools deploy --only hosting --project pos-v2-909ff --json` → success, Hosting version `projects/774115283908/sites/xe-kho/versions/8797f05a68a38541`.
- Hosting predeploy published OTA version `20260703T174833Z`, SHA256 `896b81ae818f077681c6c0d173d4aabc3c1b7b7d9a1c91e96730f0ad654a7772`.
- Live smoke: `https://xe-kho.web.app/?qaAttendance=1` loads; `#web-attendance-card` is inside `#lock-screen`, absent from `#page-tables`; PIN attendance functions and location helpers are loaded; browser console has 0 JS errors on signed-out screen.
- Real success path still needs on-site manual QA because browser geolocation must report within 15m of the shop.

# 2026-07-04 00:45 +07 - IMPL: PIN-screen attendance + 15m location gate
- Moved `Chấm công web` UI from `page-tables` into the Staff PIN lock screen (`#lock-screen`) directly under the 4-digit PIN form.
- Added PIN-based attendance actions `webAttendanceCheckInFromPin()` / `webAttendanceCheckOutFromPin()`; employees can chấm công from the PIN screen without first unlocking the POS UI.
- Added shop geofence constants using canonical shop coordinates `11.537108, 107.823279` and `ATTENDANCE_MAX_DISTANCE_METERS = 15`.
- Added `_requireAttendanceLocationGate()` using `navigator.geolocation.getCurrentPosition`; check-in/check-out write only after distance is within 15m.
- Saved location audit metadata (`location`, `checkoutLocation`, `locationDistanceMeters`, `lastLocationAt`) on attendance rows/shifts.
- Extended `scripts/verify-attendance-webapp.js` to 117 assertions covering PIN-screen placement and 15m geolocation gate.
- Verification: `node scripts/verify-attendance-webapp.js` → 117/117 ✅, `npm run check` ✅, `npm test -- --runInBand` ✅ (6 tests), `npm run lint` ✅ (0 errors, 6 pre-existing warnings), `npm run build` ✅, `git diff --check` ✅.
- Task log: `docs/ai-map/TASK_LOGS/2026-07-04-0045-pin-location-attendance.md`.

# 2026-07-04 00:32 +07 - DEPLOY: Direct web attendance + Firestore rules
- Deployed direct web attendance to Firebase Hosting site `xe-kho` on project `pos-v2-909ff`.
- Deploy command: `npx firebase-tools deploy --only hosting,firestore:rules --project pos-v2-909ff --json` → success, Hosting version `projects/774115283908/sites/xe-kho/versions/271b7186ba8634e4`; followed by `npx firebase-tools deploy --only firestore:rules --project pos-v2-909ff --json` → success.
- Hosting predeploy published OTA version `20260703T173203Z`, SHA256 `ead8eae8237b6917346f11318b733731678a509c838ac38c9d5b12b2f5241ff7`.
- Live smoke: `https://xe-kho.web.app/?qaAttendance=1` HTTP 200; live DOM contains `#web-attendance-card`; live `app.js` contains Phase D markers/functions, `Lương nhân viên`, and QA write guard; browser console has 0 JS errors on signed-out screen.
- Manual Safari/staff-PIN QA remains next: login, confirm `Chấm công web` card, test `Vào ca` → `Ra ca`, verify `Cài đặt → Chấm công` daily row and Finance expense `Lương nhân viên`.

# 2026-07-04 00:05 +07 - IMPL: Direct web attendance check-in/out + daily salary expense
- Implemented user decision: no admin approval before finance; salary is calculated as a daily staff expense and synced directly to `expenses` on checkout.
- Added `page-tables` staff/admin quick card `#web-attendance-card` with `#web-attendance-status`, `#web-attendance-checkin-btn`, and `#web-attendance-checkout-btn`.
- Added `renderWebAttendancePanel()`, `webAttendanceCheckIn()`, and `webAttendanceCheckOut()` in `app.js` with Phase D markers.
- Check-in creates/merges deterministic same-day `attendance_daily` (`${staffId}_${dateKey}`) plus a `source:'web'` open `attendance_shifts` row.
- Check-out closes the latest open web shift, accumulates same-day minutes, computes `payableMinutes/payableHours/totalWage`, and creates/updates category `Lương nhân viên` expense without approval.
- Added `DB.Attendance.setDaily()` and `DB.Attendance.createShift()` helpers; Firestore rules now allow staff create/update for attendance collections while keeping delete admin-only.
- Extended `scripts/verify-attendance-webapp.js` to 105 assertions covering Phase D DOM/function/DB/rules/finance-sync guards while preserving QA sample no-write guard.
- Verification: `node scripts/verify-attendance-webapp.js` → 105/105 ✅, `npm run check` ✅, `npm test -- --runInBand` ✅ (6 tests), `npm run lint` ✅ (0 errors, 6 pre-existing warnings), `npm run build` ✅, `git diff --check` ✅.
- Task log: `docs/ai-map/TASK_LOGS/2026-07-04-0005-web-attendance-direct.md`.

# 2026-07-03 23:56 +07 - DEPLOY: Attendance QA sample mode
- Deployed QA sample-data mode to Firebase Hosting site `xe-kho` on project `pos-v2-909ff`.
- Deploy command: `npx firebase-tools deploy --only hosting --project pos-v2-909ff --json` → success, Hosting version `projects/774115283908/sites/xe-kho/versions/d3eca9af07507684`.
- Hosting predeploy published OTA version `20260703T165615Z`, SHA256 `0045be5347a2b20402164d3d51dae0389c7352ba1600070a742cd160dd698e6e`.
- Live smoke: `https://xe-kho.web.app/?qaAttendance=1` HTTP 200; live `app.js` contains QA markers and sample IDs; browser console has 0 JS errors on signed-out screen.
- Runtime probe: `_isQaAttendanceMode()` returns `true`; `_loadQaAttendanceSample`, `_resetQaAttendanceSample`, and `_confirmAdjustAttendanceDaily` are loaded as functions.
- Task log: `docs/ai-map/TASK_LOGS/2026-07-03-2356-attendance-qa-sample-deploy.md`.

# 2026-07-03 23:45 +07 - IMPL: Attendance QA sample data mode for date-filter testing
- Added URL-gated QA mode for attendance dashboard: append `?qaAttendance=1` to the app URL, then admin sees a `Dữ liệu mẫu cục bộ` banner in `Cài đặt → Chấm công`.
- Added `_loadQaAttendanceSample()` in `app.js`: injects deterministic in-memory sample staff/daily/shifts only into `window.appState`; no Firestore, DB helpers, fetch, localStorage, Telegram, or network writes.
- Sample coverage: 2 active sample staff, 4 attendance daily rows across today/yesterday/older date, statuses `open`/`closed`/`adjusted`, and 3 shifts including one `staffId + dateKey` fallback match.
- Added `_resetQaAttendanceSample()` to remove only `qaSample` rows/shifts/staff, and `QA_ATTENDANCE_NO_FIRESTORE_WRITE_GUARD` so sample rows cannot be saved to Firestore from the adjustment modal.
- Extended `scripts/verify-attendance-webapp.js` to 83 assertions; verifier covers QA gate, sample shape, local-only constraints, write guard, and existing Phase A/B guards.
- Hermes fix-up after Kiro: changed sample staff IDs to `qa-attendance-staff-*` and strengthened verifier so staff/shift/daily sample IDs all use the `qa-attendance-` prefix.
- Verification: `node scripts/verify-attendance-webapp.js` → 83/83 ✅, `npm run check` ✅, `npm test -- --runInBand` ✅ (6 tests), `npm run lint` ✅ (0 errors, 6 pre-existing warnings), `npm run build` ✅, `git diff --check` ✅.
- Task log: `docs/ai-map/TASK_LOGS/2026-07-03-phase-c-qa-attendance-sample.md`.

# 2026-07-03 23:31 +07 - DEPLOY: Attendance Phase A/B to Firebase Hosting
- Deployed verified attendance Phase A/B changes to Firebase Hosting site `xe-kho` on project `pos-v2-909ff`.
- Deploy command: `npx firebase-tools deploy --only hosting --project pos-v2-909ff --json` → success, Hosting version `projects/774115283908/sites/xe-kho/versions/8687436f8f87d637`.
- Hosting predeploy ran `npm run cap:ota:bundle`; OTA latest version is `20260703T163113Z`, SHA256 `ee6894326e46e2bb2cb4c08ac05ab7b21b33036f55faaefce0a4f3492f5976f8`.
- Live smoke: `https://xe-kho.web.app/` HTTP 200; live `app.js` contains Phase B markers (`PHASE_B_SHIFT_DETAIL`, `PHASE_B_ADJUST_MODAL`, `_escapeJsString`, `PHASE_B_REASON_REQUIRED_VALIDATION`).
- Browser smoke: login/PIN screen renders, console has no JS errors, Phase B runtime functions are loaded; authenticated Safari/admin QA remains manual.
- Task log: `docs/ai-map/TASK_LOGS/2026-07-03-2331-attendance-phase-ab-hosting-deploy.md`.

# 2026-07-03 23:15 +07 - IMPL: Phase B attendance web app — shift drilldown + audit-safe adjustment modal
- Added expandable per-day shift detail in `app.js#renderAttendanceManagement()`:
  - Each daily row now has a "Chi tiết" toggle button (`attendance-detail-toggle`) that expands/collapses a `#attendance-detail-{dailyId}` panel.
  - `toggleAttendanceShiftDetail(dailyId)` reads `appState.attendanceShifts` and calls `_renderAttendanceShiftDetailHtml(dailyId)`.
  - Defensive shift matching: exact `dailyId` if present, otherwise falls back to `staffId + dateKey`.
  - Shift rows show check-in/out times, duration in minutes, source badge (Telegram blue tag when `source==='telegram'`), and optional geo/photo/device meta icons.
  - Empty-state message when no shifts found for a day.
- Replaced prompt-based `adjustAttendanceDaily()` with audit-safe modal (`PHASE_B_ADJUST_MODAL`):
  - Modal injected dynamically into `document.body` (same pattern as `shift-modal`; no static `index.html` changes needed).
  - Fields: payable-hours number input (defaulted from existing `payableMinutes`/`payableHours`/`totalMinutes`), reason textarea (required, inline error shown if empty), live wage preview (old wage / new wage / delta with colour).
  - `_updateAdjustWagePreview()` recalculates new wage and delta on every input event.
  - `_confirmAdjustAttendanceDaily()` validates hours ≥ 0 and reason non-empty; writes `payableMinutes`, `payableHours`, `totalWage`, `status:'adjusted'`, `adjustReason`, `adjustedBy`, `adjustedAt` to `attendance_daily`.
  - Linked expense update includes adjust reason in note string when `row.expenseId` and `DB.Expenses.update` exist.
  - Re-renders dashboard and removes modal on success.
  - Admin-only guard preserved; no writes for non-admin.
- Added `adjustedBy`/`adjustedAt` audit display line in every daily row card.
- Extended `scripts/verify-attendance-webapp.js`: added Phase B assertions (61 total); asserts no `prompt()` inside `adjustAttendanceDaily`, safe detail-panel ids, computed daily-id fallback, and JS-string escaping for inline handlers.
- Hermes review fix-ups after Kiro: clarified default-hours fallback, made shift matching true `dailyId OR staffId+dateKey`, sanitized detail panel ids, and replaced inline handler args with `_escapeJsString()`.
- Updated docs: CHANGELOG_AI.md, TODO_AI.md, CODE_MAP.md, FILE_RELATIONS.md, ATTENDANCE_WEBAPP_PLAN.md; created task log.
- Verification: `node scripts/verify-attendance-webapp.js` → 61/61 ✅, `npm run check` ✅, `npm test -- --runInBand` ✅ (6 tests), `npm run lint` ✅ (0 errors, 6 pre-existing warnings), `npm run build` ✅, `git diff --check` ✅.
- Task log: `docs/ai-map/TASK_LOGS/2026-07-03-2315-attendance-phase-b.md`.

# 2026-07-03 23:00 +07 - IMPL: Phase A attendance web app dashboard
- Upgraded `Cài đặt → Chấm công` admin tab into a full attendance dashboard in `index.html` and `app.js`.
- Added staff filter (`#attendance-staff-filter`) and status filter (`#attendance-status-filter`: all/open/closed/adjusted) to `#settings-attendance-management` in `index.html`; date range filters (`#attendance-from-date`, `#attendance-to-date`) preserved.
- Rewrote `renderAttendanceManagement()` in `app.js` with Phase A markers (`PHASE_A_ATTENDANCE_DASHBOARD` / `END_PHASE_A_ATTENDANCE_DASHBOARD`):
  - Degraded states: DB not ready, listeners loading, no staff configured.
  - Staff filter dropdown populated dynamically from `_getManagedStaff(true)`.
  - Filtering by date range + staff id + status without page reload.
  - Summary cards: staff count, open shifts, payable hours, total wage, actual hours, missing-expense count.
  - Row cards: status badge (open/closed/adjusted), first in / last out, actual/payable hours, hourly rate, wage, expense id/state, adjust reason.
  - `adjustAttendanceDaily()` (prompt-based) preserved unchanged; Phase B owns modal.
- Telegram check-in/out flow untouched; no web check-in/out added (Phase D deferred).
- Created `scripts/verify-attendance-webapp.js` (37 assertions): DOM ids, db.js listeners/helpers, renderer markers/filter/summary logic, legacy missing-status fallback, scope-creep guard, no secrets.
- Added `eslint.config.mjs` generated-artifact ignores (`android/**`, `android-native/**`, `dist/**`, `.understand-anything/**`) so lint does not fail on built/generated files.
- Verification: `node scripts/verify-attendance-webapp.js` → 37/37 ✅, `npm run check` ✅, `npm test -- --runInBand` ✅ (6 tests), `npm run lint` ✅ (0 errors, 6 pre-existing warnings), `git diff --check` ✅.
- Task log: `docs/ai-map/TASK_LOGS/2026-07-03-2245-attendance-phase-a.md`.

# 2026-07-03 22:43 +07 - PLAN: Attendance web app rollout
- Added `docs/ai-map/ATTENDANCE_WEBAPP_PLAN.md` after inspecting existing Staff/attendance scaffolding in `index.html`, `app.js`, `db.js`, and `firestore.rules`.
- Recommended Phase A as the safe first implementation sprint: admin dashboard filters/summary/row badges/empty states plus `scripts/verify-attendance-webapp.js`; no Telegram flow change and no deploy in the planning sprint.
- Task log: `docs/ai-map/TASK_LOGS/2026-07-03-2243-attendance-webapp-plan.md`.

# 2026-06-26 05:00 +07 - Capacitor Android OTA and brand icon
- Added `@capgo/capacitor-updater@6.45.10` live update foundation for Capacitor 6 and configured `autoUpdate: false` in `capacitor.config.ts`.
- Changed `compileSdkVersion` to `35` and `minSdkVersion` to `23` in `android/variables.gradle` to resolve dependency requirements.
- Configured Xe Khô brand app icon with `#7A2B18` background color and the yellow-to-orange gradient bowl logo matching `kitchen-icon.svg`.
- Added `scripts/verify-android-capacitor.js` to guard the configuration and resources.
- Added `npm run cap:ota:bundle` + `scripts/build-capacitor-ota-bundle.py` to create a manual OTA zip/manifest from `dist/` without storing upload/API secrets.
- Task log: `docs/ai-map/TASK_LOGS/2026-06-26-0500-capacitor-android-ota-icon.md`

# 2026-06-26 03:12 +07 - Capacitor Android app replaces native rewrite direction
- Paused the separate Kotlin `android-native/` track and added a standard Capacitor `android/` project that packages the existing web UI from `dist`, preserving current `xe-kho.web.app` UI/UX instead of redesigning it.
- Added Capacitor dependencies/config/scripts: `@capacitor/core`, `@capacitor/android`, `@capacitor/cli`, `capacitor.config.ts`, `npm run cap:sync`, and `npm run cap:build`.
- Updated `scripts/build-hosting-dist.js` to exclude both `android/` and `android-native/` so generated Android/webview assets are not recursively copied into Hosting or the APK.
- Added Jest ignore patterns for `dist/`, `android/`, and `android-native/` so copied web assets do not duplicate test execution.
- Verification passed: Capacitor sync/build, debug APK scan/checksum, legacy syntax check, Jest, and Hosting dist exclusion checks.
- Task log: `docs/ai-map/TASK_LOGS/2026-06-25-1955-capacitor-android-app-path.md`

# 2026-06-26 02:52 +07 - Android native real-data read-only direction gate Sprint 28
- Added a guarded `Real data direction Sprint 28` domain/UI path to visibly move toward real Firebase/POS data while keeping all execution/write/sync flags false.
- Added `GuardedRealDataDirectionGate` plus tests for blocked default state, partial prerequisites, all-prerequisite one-time approval-held state, and no writes/sync.
- Updated native server smoke harness to require Sprint 28 real-data gate markers.
- No Firestore instance/query/get/listener, no `google-services.json`, no production rows, no writes, and no sync added.
- Task log: `docs/ai-map/TASK_LOGS/2026-06-26-0252-android-native-real-data-readonly-gate.md`

# 2026-06-26 02:33 +07 - Android native manual QA result template Sprint 27
- Added test-only `NativeManualQaResultTemplateReporter` and `NativeManualQaResultTemplateTest` for structured QA result capture metadata.
- Added `docs/android-native-manual-qa-result-template.md` and executable `android-native/scripts/native-qa-result-template.sh` to create timestamped manual QA result drafts with APK SHA256 prefilled when available.
- Updated `docs/android-native-manual-qa.md` to use the structured Sprint 27 pass/fail capture template.
- Verification passed: targeted RED/GREEN, shell syntax check, template generation, clean native unit test, debug APK build, APK report/scan, and legacy web `check/test/build:hosting` regression.
- Current APK SHA256 remains `f583466d09c3b47fef5b7094585a2eef50b52edd6c67115b99fc20080c73b120`.
- Task log: `docs/ai-map/TASK_LOGS/2026-06-26-0233-android-native-manual-qa-result-template.md`

# 2026-06-26 02:23 +07 - Android native manual QA checklist Sprint 26
- Added test-only `NativeManualQaChecklistReporter` and `NativeManualQaChecklistTest` to guard safe install steps, core real-device smoke path, and blocked Firestore/production flags.
- Added `docs/android-native-manual-qa.md` with Android install instructions, Demo PIN, tab/card smoke checklist, blocked items, and pass/fail note template.
- Verification passed: targeted RED/GREEN, clean native unit test, debug APK build, APK report/scan, and legacy web `check/test/build:hosting` regression.
- Current APK SHA256 remains `f583466d09c3b47fef5b7094585a2eef50b52edd6c67115b99fc20080c73b120`.
- Task log: `docs/ai-map/TASK_LOGS/2026-06-26-0223-android-native-manual-qa-checklist.md`

# 2026-06-26 02:08 +07 - Android native APK delivery report command Sprint 25
- Added executable `android-native/scripts/native-apk-report.sh` to print a copyable debug APK report with version, size, SHA256, targeted scan result, and Telegram `MEDIA:` line.
- Extended `NativeArtifactReporter` and `NativeArtifactReportTest` with delivery script/report path/copyable Telegram markdown metadata.
- Generated report path: `android-native/app/build/outputs/apk/debug/xekho-native-debug-apk-report.md` (ignored build output).
- Verification passed: targeted RED/GREEN, shell syntax check, script execution, clean native unit test, debug APK build, APK scan, and legacy web `check/test/build:hosting` regression.
- Current APK SHA256 remains `f583466d09c3b47fef5b7094585a2eef50b52edd6c67115b99fc20080c73b120`.
- Task log: `docs/ai-map/TASK_LOGS/2026-06-26-0208-android-native-apk-delivery-report-command.md`

# 2026-06-26 01:51 +07 - Android native artifact report + expanded smoke Sprint 24
- Bumped native debug/pre-alpha metadata to `versionCode = 24`, `versionName = 0.24.0-alpha24`.
- Added test-only `NativeArtifactReporter` and `NativeArtifactReportTest` to report app id/version/debug APK path/scan pattern while keeping release signing and production writes blocked.
- Expanded `NativeUiServerSmokeHarness` to cover Settings/Inventory/Finance markers and decode `\uXXXX` source escapes for Vietnamese UI text.
- Verification passed: targeted RED/GREEN, clean native unit test, debug APK build, APK config/secret scan, and legacy web `check/test/build:hosting` regression.
- APK artifact: `android-native/app/build/outputs/apk/debug/app-debug.apk`, SHA256 `f583466d09c3b47fef5b7094585a2eef50b52edd6c67115b99fc20080c73b120`, size 14M.
- Task log: `docs/ai-map/TASK_LOGS/2026-06-26-0151-android-native-artifact-report-expanded-smoke.md`

# 2026-06-26 01:37 +07 - Android native server-side UI smoke harness Sprint 23
- Added test-only `NativeUiServerSmokeHarness` and `NativeUiServerSmokeHarnessTest` so core native UI markers can be checked on this server without emulator or APK install.
- Smoke coverage includes brand/PIN, POS local multi-table flow, payment/queue cards, Sprint 21 Firestore UI mapping, and Sprint 22 Firestore approval checklist.
- Added forbidden marker checks for Firestore/write/sync enabled copy and retained fail-closed read/write/sync report flags.
- Verification passed: targeted RED/GREEN, clean native unit test, debug APK build, APK config/secret scan, and legacy web `check/test/build:hosting` regression.
- Task log: `docs/ai-map/TASK_LOGS/2026-06-26-0137-android-native-server-ui-smoke-harness.md`

# 2026-06-26 01:24 +07 - Android native Firestore read-only approval checklist Sprint 22
- Added `GuardedFirestoreReadOnlyApprovalChecklist` plus checklist DTOs in `Models.kt` for owner approval/local config/SDK/contract/repository readiness.
- Added `FirestoreReadOnlyApprovalChecklistTest` covering blocked defaults, missing approval, all-flags approval-held, and fail-closed item guards.
- Wired `AppRoot.kt` Tables UI with `Firestore approval checklist Sprint 22` while keeping real Firestore execution disabled.
- Verification passed: targeted RED/GREEN, clean native unit test, debug APK build, APK config/secret scan, and legacy web `check/test/build:hosting` regression.
- Task log: `docs/ai-map/TASK_LOGS/2026-06-26-0124-android-native-firestore-readonly-approval-checklist.md`

# 2026-06-25 07:39 +07 - Auto stock compact ordering summary
- Reworked `Định mức tồn kho tự động` from a long metrics table into a compact clickable card: collapsed state shows action summary and projected purchase total; clicking opens the item list.
- Added purchase conversion logic for beer/can items: `lon` recommendations round up to whole 24-can cases and costs use the rounded order quantity.
- Example verified by Playwright seeded data: `Bia Heineken 45 Lon = 2 thùng 770.016đ`, `Bia Tiger Bạc 20 Lon = 1 thùng 295.008đ`, total `1.065.024đ`.
- Removed the old filter dropdown/table from the compact card, added per-item `<details>` for drill-down, bumped cache keys to `20260625-auto-stock-summary`, deployed Hosting-only, and live-smoked mobile 390×844 with no overflow/errors.
- Task log: `docs/ai-map/TASK_LOGS/2026-06-25-0739-auto-stock-summary-card.md`

# 2026-06-25 07:14 +07 - Auto stock norm mobile layout
- Fixed the `Định mức tồn kho tự động` board mobile layout: status badge now sits inline beside the dish name instead of as a separate trailing column.
- Added `Cần nhập đề xuất` as a dedicated column/field, computed as `max(0, ceil(par - currentStock))` for mapped inventory rows.
- Added responsive `.auto-stock-norm-*` CSS: desktop keeps a scrollable table; mobile converts rows into cards to avoid horizontal overflow.
- Bumped `style.css` and `app.js` cache keys to `20260625-auto-stock-mobile`, deployed Hosting-only, and verified local/live with Playwright at 390×844 (`scrollWidth=innerWidth=390`, no overflowing elements, no console/page errors).
- Task log: `docs/ai-map/TASK_LOGS/2026-06-25-0714-auto-stock-mobile-layout.md`

# 2026-06-25 06:45 +07 - Auto stock norm board in Kho
- Added a read-only **Kho → TỒN KHO** card named `Định mức tồn kho tự động`.
- The board reads visible live order history already streamed in `window.appState.history`, computes a 56-day daily demand series, ABC class, P75/P90/P95, and recommended `Tối thiểu / Chuẩn / Tối đa` per sold item.
- The UI compares recommended levels to current inventory when it can map by `linkedInventoryId`, item id, or normalized name, and flags `Cần nhập`, `Theo dõi`, `Dư tồn`, or `Chưa map kho`.
- Kept the feature read-only: no Firestore writes, no auto-changing `minQty`.
- Added `scripts/verify-auto-stock-norm.js`, bumped `app.js` cache key, and deployed Hosting-only to `https://xe-kho.web.app`.
- Verification passed: `node --check app.js`, `node scripts/verify-auto-stock-norm.js`, `npm run check`, `npm run build:hosting`, deploy, local/live browser marker smoke.
- Task log: `docs/ai-map/TASK_LOGS/2026-06-25-0645-auto-stock-norm-board.md`

# 2026-06-22 22:18 +07 - Fix Kho inventory type save
- Fixed the **Kho** inventory edit flow so changing an item between `Nguyên liệu` and `Hàng bán thẳng` persists correctly.
- `submitInvEdit()` now sends both app-level `itemType` and master/reporting `inv_type`; added a local `_appInventoryTypeToMaster()` helper in `app.js`.
- Bumped the `app.js` cache key and added `scripts/verify-inventory-type-save.js`.
- Verification passed: targeted verifier, `npm run check`, `node --input-type=module --check < db.js`, and `npm run build:hosting`.
- Task log: `docs/ai-map/TASK_LOGS/2026-06-22-2218-inventory-type-save.md`

# 2026-06-19 18:21 +07 - POS chatbot Firestore profit report fallback
- Replaced the primary `getProfitReport()` mock path with read-only Firestore `history` aggregation for Telegram/callable Gemini function calling.
- The report now computes item-level revenue, cost, and gross profit for `today/current_month/last_month` in Vietnam time, returning top items plus range metadata; mock data remains only as an explicitly labeled fallback when Firestore read fails or live data is empty.

# 2026-06-19 18:09 +07 - Telegram route for POS chatbot function calling
- Wired owner-only Telegram text AI fallback into `tryAnswerTelegramPosChatbotFunctionCalling()` so natural report questions such as top/highest profit can use the Gemini 2.5 Flash `getProfitReportTool` flow before the generic Firestore tool loop.
- Hardened `@google/genai` initialization with API-key and Vertex AI runtime fallbacks while retaining the `const ai = new GoogleGenAI()` fallback required by the implementation request.

# 2026-06-19 17:26 +07 - POS chatbot Gemini function calling
- Added callable Cloud Function `askPosChatbot` using `@google/genai` + `gemini-2.5-flash` with `getProfitReportTool` function declarations.
- The callable requires Firebase Auth, accepts `userMessage`, lets Gemini request `getProfitReportTool`, feeds mock POS profit data back as a function response turn, then returns a natural Vietnamese answer.
- Added verifier `scripts/verify-pos-chatbot-function-calling.js`; no deploy was run in this implementation step.

# 2026-06-19 16:58 +07 - Fix stale Table special cards
- Fixed tab Ban special cards so cancelled/completed/rejected/expired online orders no longer keep `Ban Online` occupied.
- Prevented stale cloud `takeaway` orders from overriding the local-only `Khach Mang Ve` cart.
- Added verifier `scripts/verify-table-special-cards-cleanup.js`; checks/build passed.

# AI Changelog

## 2026-06-19 16:35 - Finance date-range report sync

Repo: `/home/longnick/projects/xekho`
Branch: `push-clean-main-20260604-072900`

Fixed the Finance tab custom range flow so choosing a range such as 2026-06-01 to 2026-06-18 persists `financePeriod = range` before rendering. Revenue, operational expenses, fixed-cost day counts, charts/lists, and discount details now read the same `financeDateOpts`. Added `scripts/verify-finance-date-range.js` and bumped the `app.js` cache key.

Task log: `docs/ai-map/TASK_LOGS/2026-06-19-1635-finance-date-range.md`


## 2026-06-17 - Telegram chart callback prefix regression

Fixed chart button callbacks falling into unknown-callback when the payload uses legacy/variant prefixes. The webhook now recognizes `chart`, `show_chart`, `tg_chart`, `ve_bieu_do`, and `draw_chart` payloads and routes them to the chart renderer.

Task log: `docs/ai-map/TASK_LOGS/2026-06-17-telegram-chart-callback-prefix-regression.md`

## 2026-06-17 - Telegram month revenue zero regression

Fixed bot regression where `Doanh thu tháng này?` returned `0đ` after BigQuery was made the preferred report source. Direct Telegram report answers now use Firestore/POS first; BigQuery remains read-only tool/fallback and cannot override with zero summaries.

Task log: `docs/ai-map/TASK_LOGS/2026-06-17-telegram-month-revenue-zero-regression.md`

## 2026-06-17 - Telegram BigQuery reporting + month revenue fix

Allowed Telegram owner assistant to use read-only BigQuery reporting for data answers. `doanh thu tháng này?` is verified as a smart report and deterministic reports now prefer BigQuery when available, with Firestore fallback.

Task log: `docs/ai-map/TASK_LOGS/2026-06-17-telegram-bigquery-reporting-month-revenue.md`


## 2026-06-17 - Telegram owner assistant proactive/menu/chart expansion

Repo: `/home/longnick/projects/xekho`
Branch: `push-clean-main-20260604-072900`

Expanded Telegram owner assistant with proactive business warnings/comparisons, menu price/image lookup from Firebase menu data, and chart inline-button flow for report answers. Chart callbacks render SVG to PNG with `sharp` and send the chart as a Telegram photo.

Task log: `docs/ai-map/TASK_LOGS/2026-06-17-telegram-owner-assistant-proactive-menu-charts.md`


## 2026-06-17 01:07 - Telegram open-ended Firebase assistant

Repo: `/home/longnick/projects/xekho`
Branch: `push-clean-main-20260604-072900`

Improved Telegram owner assistant so natural questions such as `Hôm qua bán bao nhiêu bia?` parse as item quantity reports against Firebase/POS data, and `Bạn có thể làm gì?` returns a deterministic capability response instead of depending on command-only behavior. Strengthened Gemini prompt to call read tools for non-fixed data questions.

Task log: `docs/ai-map/TASK_LOGS/2026-06-17-0107-telegram-open-ended-firebase-assistant.md`


## 2026-06-17 00:49 - Telegram shop name and 18h-yesterday smart range

Repo: `/home/longnick/projects/xekho`
Branch: `push-clean-main-20260604-072900`

Corrected Telegram AI prompt shop name to `Xe Khô Chữa Lành` and fixed smart-report parsing so `Doanh thu từ 18h hôm qua đến bây giờ?` is treated as a range-only revenue query instead of an item-scoped query. Added verifier coverage.

Task log: `docs/ai-map/TASK_LOGS/2026-06-17-0049-telegram-shop-name-smart-range.md`


## 2026-06-17 00:32 - Deploy Telegram owner assistant guard

Repo: `/home/longnick/projects/xekho`
Branch: `push-clean-main-20260604-072900`

Deployed `xekho:telegramWebhook` after owner guard and Gemini thought-signature fixes. Smoke tests passed for GET 405, OPTIONS 204, missing-chat safe skip, and owner revenue webhook path returning `ok: true`.


## 2026-06-17 00:24 - Preserve Gemini function-call thought signatures

Repo: `/home/longnick/projects/xekho`
Branch: `push-clean-main-20260604-072900`

Fixed post-deploy Telegram owner-assistant tool calling with newer Gemini/Vertex models by preserving the original function-call `part` (including thought-signature metadata) when sending tool responses. Added `scripts/verify-gemini-function-call-thought-signature.js`.

Task log: `docs/ai-map/TASK_LOGS/2026-06-17-0024-gemini-function-call-thought-signature.md`


## 2026-06-17 00:13 - Telegram owner assistant guard

Repo: `/home/longnick/projects/xekho`
Branch: `push-clean-main-20260604-072900`

Tightened the Telegram open AI/revenue/report assistant path:

- `telegramWebhook` now uses an assistant/report bot token resolver that does not fall back to the kitchen-ready bot token.
- Open text AI, voice/audio AI, non-order photo OCR/import AI, and ads/revenue report commands are owner-only.
- Owner allowlist includes the configured `TELEGRAM_OWNER_CHAT_ID` plus the current owner Telegram ID `6496387732`.
- Added a deterministic guard verifier: `scripts/verify-telegram-owner-assistant-guard.js`.

Task log: `docs/ai-map/TASK_LOGS/2026-06-17-0013-telegram-owner-assistant-guard.md`

## 2026-06-14 21:11 - xekho_v2 item-scoped inventory action parity note

Documented follow-up: `xekho_v2` now scopes Kho vận add/edit/delete buttons to the exact selected inventory/menu/supplier/document row and uses audited soft-hide for delete. Legacy runtime code remains unchanged.

## 2026-06-14 20:06 - xekho_v2 Kho vận Function bridge parity note

Repo: `/home/longnick/projects/xekho`

Documented cross-repo compatibility for the new `xekho_v2` Kho vận Cloud Functions: writes remain aligned with legacy collections/fields (`Inventory_Items.current_stock/stockQty`, `purchases`, `stocktakes`, `suppliers`, `Product_Catalog.cost`) and add audit-only `inventoryOpsAudit` in `xekho_v2`. No legacy runtime files were changed.

Task log: `docs/ai-map/TASK_LOGS/2026-06-14-2006-xekho-v2-inventory-functions-parity.md`

## 2026-06-07 11:19 - Speed up Firebase Hosting deploys

Repo: `/home/longnick/projects/xekho`
Branch: `push-clean-main-20260604-072900`

Optimized Hosting deploys while preserving the legacy classic-script runtime:

- `firebase.json` now deploys Hosting from `dist` instead of repo root `.`.
- `scripts/build-hosting-dist.js` builds Vite output and copies required runtime static assets into `dist`.
- `package.json` adds `build:hosting` and `deploy:hosting:fast`.
- Firebase Hosting `predeploy` prepares `dist` automatically for `npx firebase-tools deploy --only hosting`.
- Measured deploy output changed from the prior 238 root files to 83 `dist` files; deploy completed in 12 seconds including predeploy build.

Task log: `docs/ai-map/TASK_LOGS/2026-06-07-1119-hosting-deploy-speed.md`

## 2026-06-07 10:35 - Gemini 3.5 Flash routing defaults

Repo: `/home/longnick/projects/xekho`
Branch: `push-clean-main-20260604-072900`

Updated Gemini text model defaults and local coding config:

- `functions/index.js` now defaults `VERTEX_TEXT_MODEL`, runtime fallback text model, text fallback list, and `adminProbeVertex` probe model to `gemini-3.5-flash`.
- `functions/vertexAi.js` now prefers `gemini-3.5-flash` in the default text fallback list.
- `opencode.json` now points the Google provider config to `google/gemini-3.5-flash`.
- Runtime/config search found no remaining active `gemini-2.5-flash` / `gemini-2.5-pro` outside excluded docs/artifacts/backups/env paths.

Task log: `docs/ai-map/TASK_LOGS/2026-06-07-1035-gemini-35-flash-routing.md`

## 2026-06-06 20:24 - Keep stocktake modal height fixed while filtering results

Repo: `/home/longnick/projects/xekho`
Branch: `push-clean-main-20260604-072900`

Refined the stocktake item search layout after mobile/iPhone QA feedback:

- The `Kiểm kê kho` modal sheet now keeps a fixed viewport height instead of shrinking around the filtered result count.
- The search input remains in the top panel of the modal.
- Only the result list has a smaller dedicated scroll window, reducing keyboard overlap risk on iPhone while keeping filtered rows visible.
- `scripts/verify-inventory-item-search.js` now guards the fixed-height sheet, top search panel, and dedicated result-scroll layout.

Task log: `docs/ai-map/TASK_LOGS/2026-06-06-2024-stocktake-search-layout.md`

## 2026-06-06 20:11 - Add inventory item search in purchase and stocktake modals

Repo: `/home/longnick/projects/xekho`
Branch: `push-clean-main-20260604-072900`

Added focused search fields so staff can find items faster in both inventory entry flows:

Changes:

- `index.html` adds `#pur-item-search` above the purchase item picker in the `Nhập hàng mới` modal.
- `index.html` adds `#stocktake-item-search` above the stocktake item list in the `Kiểm kê kho` modal.
- `app.js` adds shared inventory search text helpers, filtered purchase select rendering, and stocktake row filtering that hides rows without removing typed quantity inputs.
- `style.css` adds reusable modal search/hint styles.
- `scripts/verify-inventory-item-search.js` guards the new DOM markers, JS helpers, and CSS markers.

Task log: `docs/ai-map/TASK_LOGS/2026-06-06-2011-inventory-item-search.md`

## 2026-06-04 10:17 - Fix inventory stock display

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Fixed the POS `TỒN KHO` tab showing no stock products when the derived `appState.inventory` list is empty but Firestore master `Inventory_Items` has data.

Changes:

- `_getInventory()` now falls back to `window.appState.masterData.inventoryItems` before local storage.
- Inventory normalization maps master fields `material_name`, `base_unit`, `current_stock`, `min_alert`, and `inv_type` into POS fields `name`, `unit`, `qty`, `minQty`, and `itemType`.
- Mirrored the same mapping in `app/order/helpers.js`, because `app.js` delegates to the extracted helper when loaded.
- Added `scripts/verify-inventory-stock-display.js` to guard the stock-list fallback and field mappings.

Task log: `docs/ai-map/TASK_LOGS/2026-06-04-1017-fix-inventory-stock-display.md`

## 2026-06-04 09:54 - Compact mobile POS header/status bar

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Redesigned the POS mobile header/status bar after the screenshot showed the brand, offline badge, username, mic, and reload buttons overflowing the top frame.

Changes:

- Replaced the wide inline current-user chip with reusable `.header-user-chip` / `.header-user-name` classes.
- Made `.app-header`, `.header-logo`, and `.header-actions` shrink-safe with viewport caps, overflow clipping, and ellipsis.
- Added a `max-width: 430px` mobile breakpoint that tightens brand/actions for iPhone widths.
- Shortened the offline backup badge label from `Offline: OK` to `OK` and bounded its width.
- Added `scripts/verify-mobile-pos-header.js` to guard the compact header layout.

Task log: `docs/ai-map/TASK_LOGS/2026-06-04-0954-mobile-pos-header-compact.md`

## 2026-06-04 08:52 - Make table-card notes readable

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Improved the `Bàn` tab note display after the mobile screenshot showed table 2 as unreadable `📝 To...`.

Changes:

- Removed the note icon/pill from physical table cards.
- Cards with a note now use `has-note` and replace the status emoji with full-width `.table-note-text`.
- Note text is still escaped with `_escapeHtml()` and now gets up to two centered lines with safe wrapping.
- `scripts/verify-mobile-table-grid.js` guards against reintroducing the compact icon chip.

Task log: `docs/ai-map/TASK_LOGS/2026-06-04-0852-readable-table-note.md`


## 2026-06-04 08:27 - Show table note inside table cards

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Added a compact note chip directly inside each physical table card in the `Bàn` tab so staff can see the table note/name before opening the order.

Changes:

- `app.js#renderTables()` renders `table.note` with `orderExtras` fallback beside the table number.
- The rendered note is escaped with `_escapeHtml()` before insertion.
- `style.css` adds shrink-safe `.table-title-row` and ellipsized `.table-note-chip` styling for mobile cards.
- `scripts/verify-mobile-table-grid.js` now guards the table-note chip behavior and CSS.

Task log: `docs/ai-map/TASK_LOGS/2026-06-04-0827-table-card-note-chip.md`


## 2026-06-04 08:17 - Add quick table note in order header

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Added a quick `Ghi chú` input beside the order table title (`Bàn X`) so staff can see/type the table name or note while choosing dishes.

Changes:

- `index.html` adds `#order-table-note` next to `#order-table-title`.
- `style.css` makes the note field responsive beside the table title and wrap-safe on mobile.
- `app.js` syncs the new header note with the existing cart note, `orderExtras.note`, local `table.note`, and queued cloud table-note update when available.
- `scripts/verify-order-table-note-ui.js` guards the UI, handler, mobile CSS, and note-sync source markers.

Task log: `docs/ai-map/TASK_LOGS/2026-06-04-0817-order-table-note-header.md`



## 2026-06-04 08:00 - Exact fractional-K price display across UI

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Fixed the remaining `17.500đ` → `18K` display regression outside the printed bill by updating the shared compact formatter used by the POS menu grid, cart rows, menu admin list, and other UI surfaces.

Changes:

- `app/utils/format.js#compactNumber()` now preserves fractional thousands: `17500` → `17,5K`, `17550` → `17,55K`, `18000` → `18K`.
- `store.js` fallback `fmt` now uses the same exact fractional-K behavior if the extracted formatter is unavailable.
- `index.html` bumps the `app/utils/format.js` cache key to `20260604-exact-price-ui` for deployed/mobile clients.
- `scripts/verify-format-utils.js` now guards against reintroducing `toFixed(0)` rounding in the compact thousand formatter.

Task log: `docs/ai-map/TASK_LOGS/2026-06-04-0800-exact-price-ui.md`

## 2026-06-03 23:28 - Deploy bill unit-price fix with app.js cache bust

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Deployed the bill unit-price fix to Firebase and bumped the production `app.js` cache key from `20260509-online-complete` to `20260603-bill-unit-price` so mobile browsers fetch the fixed formatter immediately.

Verification: full deploy-readiness gate passed before deploy; hosting returned HTTP 200 after deploy.

Task log: `docs/ai-map/TASK_LOGS/2026-06-03-2328-deploy-bill-price-cachebust.md`

## 2026-06-03 23:12 - Fix bill unit-price display for fractional K prices

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Fixed the payment/print bill `Đ.Giá` column so true fractional-thousand menu prices remain visible to customers:

- Added `formatBillUnitPrice()` for exact bill unit-price display.
- Replaced bill unit-price `fmt(i.price)` with `formatBillUnitPrice(i.price)` so `17.500đ` displays as `17,5K`, not rounded to `18K`.
- Added `scripts/verify-bill-unit-price.js` to assert exact unit price formatting and prevent the bill from using rounding compact formatting again.

Verification target: syntax checks, targeted bill verifier, full repo check/test/lint/build gate, all verify scripts, and `git diff --check`.

## 2026-06-03 22:55 - Fix Vietnamese thousands menu price input

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Fixed the clarified `Kho` → `Quản lý món` price-input regression where entering `17.500đ` for `Bia Tiger bạc` was interpreted as decimal `17.5` and then displayed/charged around `18k`:

- Changed `#menu-item-price` from `type="number"` to text + `inputmode="numeric"` so Vietnamese thousand separators are accepted.
- Added `parseVietnameseMoneyInput()` and wired `submitMenuItem()` to parse `17.500`, `17.500đ`, `17,500`, `17.5`, and `17500` as `17500`.
- Expanded `scripts/verify-menu-price-save.js` to lock the regression.

Verification target: syntax checks, targeted menu price verifier, full repo check/test/lint/build gate, all verify scripts, and `git diff --check`.


## 2026-06-03 22:49 - Fix Inventory Menu Manager price save

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Fixed the `Kho` → `Quản lý món` price-save regression:

- `submitMenuItem()` now uses an id-aware recipe gate: new finished-good items still require a recipe, but existing items can save selling-price edits even if their recipe list is currently empty.
- `db.js` now mirrors menu selling price to both `sell_price` and `price` on add/update so canonical and legacy consumers stay aligned.
- Added `scripts/verify-menu-price-save.js` to guard the regression.

Verification target: syntax checks, menu price verifier, repo check/test/lint/build gate, and `git diff --check`.


## 2026-06-03 21:38 - Fix mobile table overflow and duplicate takeaway tile

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Fixed two mobile table-screen regressions reported from iPhone screenshot:

- Removed the duplicate physical-grid `takeaway` tile by filtering persisted `takeaway` table records out of `renderTables()` while keeping the dedicated full-width `Khách mang về` card and `openTakeaway()` flow intact.
- Reworked the dedicated `Khách mang về` and `Bàn online` rows to use shared `table-card-wide` / `table-summary-*` classes instead of wide inline flex styles.
- Hardened `.table-grid` with `repeat(..., minmax(0, 1fr))`, `max-width: 100%`, and shrink/ellipsis rules on table cards and summary rows so long labels/totals no longer push cards past the mobile viewport.
- Added `scripts/verify-mobile-table-grid.js` to assert the source-level layout guardrails and prevent the duplicate takeaway tile regression from returning.

Verification passed: `node --check app.js`, `node --check scripts/verify-mobile-table-grid.js`, `node scripts/verify-mobile-table-grid.js`, `npm run check`, frontend/backend `tsc`, Jest `6/6`, `npm run lint` with 5 existing warnings, Vite build with expected classic-script warnings, all `scripts/verify-*.js` (`50/50`), and `git diff --check`.
## 2026-06-03 20:36 - Fix order menu search and completed-order Telegram payload

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Fixed two production UI/notification regressions reported after deploy:

- Restored the POS order menu search field (`#order-search`) by making `renderMenuItems()` read the live input value directly and sync the legacy `menuSearch` variable before filtering. This avoids the ESM delegated handler writing only to `window.menuSearch` while `app.js` keeps `menuSearch` as a top-level lexical variable.
- Fixed completed-order Telegram normalization wrappers in `functions/index.js`; the wrappers now pass the real `order` / `items` arguments to `functions/telegram/orders.js` instead of resetting them to `{}` / `[]`. This prevents messages like `Bàn/Kênh: Không rõ`, `Món: Không có chi tiết`, and `TỔNG CỘNG: 0đ` for real completed orders.
- Expanded deterministic verifiers:
  - `scripts/verify-esm-admin-render-controls.js` now asserts `app.js` reads `#order-search` and uses `activeMenuSearch`.
  - `scripts/verify-telegram-orders.js` now asserts the compatibility wrappers pass real arguments and no longer contain the argument-reset bug.

Verification passed: `node --check app.js`, `node --check functions/index.js`, targeted ESM/admin + Telegram order verifiers, all `scripts/verify-*.js`, `npm run check`, frontend/backend `tsc`, Jest `6/6`, `npm run lint` with 5 existing warnings, Vite build with expected classic-script warnings, and `git diff --check`.

## 2026-06-03 20:02 - Remove unused admin tabs before deploy

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Completed deploy-bound UI cleanup after user confirmed the missing AI-map/task-log step:

- Removed obsolete top-level admin UI pages for Menu, AI Insights, and Media from `index.html`.
- Removed direct More-modal navigation entries for `menu`, `insights`, and `media`; post-edit marker scan shows all removed page/navigation markers at 0.
- Removed obsolete Media Refinery page rendering functions/styles from `app.js` and `style.css` while preserving shared backend/data helpers and production-safe modules.
- Added explicit `canAccessPage()` denial for `menu`, `insights`, and `media` so stale direct navigation cannot open deleted pages.
- Updated ESM verifier expectations after removing the Media refresh controls and one deleted admin Menu render control.

Evidence: `app.js` is now 11,565 lines / 366 function declarations, `index.html` has 129 inline handlers, `data-esm-render-refresh` count is now 9, and `data-esm-admin-render` count is now 4.

Verification target: full deploy readiness gate before Firebase deploy — syntax checks, all verification scripts, `npm run check`, frontend/backend `tsc`, Jest, lint, Vite build, and `git diff --check`.

## 2026-06-03 — Remove obsolete Telegram daily report test endpoint

- Removed `exports.testDailyReportTelegram` from `functions/index.js`; scheduled production flow remains `scheduledTelegramReport`.
- Removed the Settings UI test button and legacy frontend URL helper that called the deleted endpoint.
- Updated storage utility verification and AI map docs so deploy no longer attempts the obsolete test-only function.

## 2026-06-02 15:29 - Deep extraction D4 small utility cleanup outside E phase

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Completed one bounded non-ESM cleanup sprint after re-reading `REFACTOR_PLAN.md`, `DEEP_EXTRACTION_PLAN.md`, `ESM_CONVERSION_PLAN.md`, current AI-map docs, and recent git history:

- Extended `app/utils/storage.js` with `getTelegramReportTestUrl()` and kept the legacy global fallback in `app.js` as a thin delegate.
- Extended `app/auth/staff.js` with `getCurrentOrderActorMetaFromUser(posUser)` and kept `getCurrentOrderActorMeta()` in `app.js` as a state-reading wrapper.
- Removed unreachable dead fallback code from `getFinanceExpenseRows()` after its existing early return to `buildOperationalExpenseBreakdown()`.
- Expanded `scripts/verify-storage-utils.js` and `scripts/verify-auth-staff.js` to assert the new exports.

Progress note: this completes the safe D4 small-utility part that was still actionable outside the E phase. Remaining `DEEP_EXTRACTION_PLAN.md` candidates are mostly mixed/stateful POS/report functions and should be handled only as separate QA-backed sprints, not as a one-shot rewrite.

Verification passed: syntax checks, storage/auth verifiers, app.js delegation/dead-code smoke, `npm run check`, frontend/backend `tsc`, Jest, `npm run lint` with 5 existing warnings, Vite build with expected classic-script warnings, all 49 `scripts/verify-*.js`, and `git diff --check`.

## 2026-06-02 14:58 - ESM Phase E5.11 admin render delegated controls

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Completed another bounded safe Phase E5 island after user said `ok làm đi`:

- Added `app/esm/ui/admin-render-controls.js` with allowlisted delegated handlers for low-risk admin render/search calls.
- Converted 6 inline handlers: `renderTables` x1, `renderStockList` x2, `renderMenuAdmin` x2, and the menu item search assignment/render pair x1.
- Updated `app/esm/main.js` to install/publish `adminRenderControls` and bumped the ESM cache/version to `20260602-e5-admin-render-controls`.
- Added `scripts/verify-esm-admin-render-controls.js` and expanded `scripts/verify-esm-entry.js`.

Current E5 evidence: inline handler count reduced from 147 to 141. Remaining handlers are mostly submit/save/reset/POS/payment/customer/media/upload/import/export/cleanup flows and stay BLOCKED for safe autonomous one-shot migration pending browser/mobile QA or explicit higher-risk approval.

Verification passed: ESM syntax checks, all ESM verification scripts, `npm run check`, frontend/backend `tsc`, Jest, lint with 5 existing warnings, Vite build, and `git diff --check`.

## 2026-06-02 14:50 - ESM Phase E5.10 render/filter refresh delegated controls

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Completed another bounded safe Phase E5 island after user approved continuing:

- Added `app/esm/ui/render-refresh-controls.js` with an allowlisted delegated handler for low-risk render/filter refresh calls only.
- Converted 12 inline handlers to `data-esm-render-refresh`: `renderLedger` x3, `renderMediaRefinery` x3, `renderAttendanceManagement` x3, and `applyStocktakeHistoryFilter` x3.
- Updated `app/esm/main.js` to install/publish `renderRefreshControls` and bumped the ESM cache/version to `20260602-e5-render-refresh-controls`.
- Added `scripts/verify-esm-render-refresh-controls.js` and expanded `scripts/verify-esm-entry.js`.

Current E5 evidence: inline handler count reduced from 159 to 147. Remaining handlers are mostly submit/save/reset/POS/payment/customer/media/upload/import/export/cleanup flows and stay BLOCKED for safe autonomous one-shot migration pending browser/mobile QA or explicit higher-risk approval.

Verification passed: ESM syntax checks, all ESM verification scripts, `npm run check`, frontend/backend `tsc`, Jest, lint with 5 existing warnings, Vite build, and `git diff --check`.

## 2026-06-02 14:20 - ESM Phase E5.9 modal overlay and close delegated controls

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Completed another safe Phase E5 inline-handler island:

- Added `app/esm/ui/modal-overlay-controls.js` with delegated click handling for modal overlay self-dismiss, modal close buttons, purchase photo batch self-close, and image zoom reset/close/detach controls.
- Converted 15 simple modal overlay self-dismiss handlers to `data-esm-modal-self-dismiss`.
- Converted 19 modal close buttons to `data-esm-modal-close`.
- Converted 1 modal self-close-by-id overlay to `data-esm-modal-close-self`.
- Converted 2 image zoom overlay self-dismiss handlers, 2 image zoom reset buttons, and 2 image zoom close buttons to `data-esm-image-zoom-*` attributes.
- Updated `app/esm/main.js` to install/publish `modalOverlayControls` and bumped the ESM cache/version to `20260602-e5-modal-close-controls`.
- Added `scripts/verify-esm-modal-overlay-controls.js` and expanded `scripts/verify-esm-entry.js`.

Current E5 evidence: inline handler count reduced from 200 to 159; 31 local classic scripts remain. Remaining inline handlers include higher-risk submit/save/reset/data/POS/media flows and should not be one-shot migrated without QA.

Verification passed: ESM syntax checks, modal-overlay-controls and entry verification, frontend/backend `tsc`, Jest, lint with 5 existing warnings, and `git diff --check`.

## 2026-06-02 14:05 - ESM Phase E5.8 report filter control delegated handlers

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Completed the eighth safe Phase E5 inline-handler island:

- Added `app/esm/ui/report-filter-controls.js` with delegated change/click handling for report menu filter selects and reset buttons.
- Converted two report menu filter selects from inline `onchange="setReportMenuFilter(this.value)"` to `data-esm-report-menu-filter`.
- Converted two report reset buttons from inline `onclick="resetReportFilters()"` to `data-esm-report-filter-reset`.
- Updated `app/esm/main.js` to import/install `reportFilterControls` under `window.XekhoApp.esm.ui.reportFilterControls`.
- Bumped ESM entry cache/version to `20260602-e5-report-filter-controls`.
- Added `scripts/verify-esm-report-filter-controls.js` and expanded `scripts/verify-esm-entry.js`.
- Kept legacy `setReportMenuFilter` and `resetReportFilters` untouched; the ESM island delegates to them at change/click time.

Current E5 evidence: inline handler count reduced from 204 to 200; 31 local classic scripts remain. Continue E5 one small UI island at a time with mobile/browser QA for riskier flows.

Verification passed: ESM syntax checks, report-filter-controls/report-transaction-filters/finance-period/inventory-tabs/report-date-controls/settings-tabs/report-tabs/header-actions/image-zoom/runtime/leaf/dom/entry verification scripts, `npm run check`, frontend/backend `tsc`, Jest, lint with 5 existing warnings, Vite build with expected classic-script warnings, and `git diff --check`.

## 2026-06-02 14:00 - ESM Phase E5.7 report transaction filter delegated handlers

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Completed the seventh safe Phase E5 inline-handler island:

- Added `app/esm/ui/report-transaction-filters.js` with delegated change handling for report transaction filter checkboxes.
- Converted six report transaction filter inputs from inline `onchange="setReportTransactionFilter(..., this.checked)"` to `data-esm-report-transaction-filter`: sales, purchases, expenses across the duplicated filter layouts.
- Updated `app/esm/main.js` to import/install `reportTransactionFilters` under `window.XekhoApp.esm.ui.reportTransactionFilters`.
- Bumped ESM entry cache/version to `20260602-e5-report-transaction-filters`.
- Added `scripts/verify-esm-report-transaction-filters.js` and expanded `scripts/verify-esm-entry.js`.
- Kept legacy `setReportTransactionFilter` untouched; the ESM island delegates to it at change time.

Current E5 evidence: inline handler count reduced from 210 to 204; 31 local classic scripts remain. Continue E5 one small UI island at a time with mobile/browser QA for riskier flows.

Verification passed: ESM syntax checks, report-transaction-filters/finance-period/inventory-tabs/report-date-controls/settings-tabs/report-tabs/header-actions/image-zoom/runtime/leaf/dom/entry verification scripts, `npm run check`, frontend/backend `tsc`, Jest, lint with 5 existing warnings, Vite build with expected classic-script warnings, and `git diff --check`.

## 2026-06-02 13:55 - ESM Phase E5.6 finance period delegated handlers

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Completed the sixth safe Phase E5 inline-handler island:

- Added `app/esm/ui/finance-period.js` with delegated click handling for finance period buttons.
- Converted five finance period buttons from inline `onclick="setFinancePeriod(...)"` to `data-esm-finance-period`: today, day, week, month, all.
- Updated `app/esm/main.js` to import/install `financePeriod` under `window.XekhoApp.esm.ui.financePeriod`; also kept inventory tab publishing in the aggregate ESM UI namespace.
- Bumped ESM entry cache/version to `20260602-e5-finance-period`.
- Added `scripts/verify-esm-finance-period.js` and expanded `scripts/verify-esm-entry.js`.
- Kept legacy `setFinancePeriod` untouched; the ESM island delegates to it at click time.

Current E5 evidence: inline handler count reduced from 215 to 210; 31 local classic scripts remain. Continue E5 one small UI island at a time with mobile/browser QA for riskier flows.

Verification passed: ESM syntax checks, finance-period/inventory-tabs/report-date-controls/settings-tabs/report-tabs/header-actions/image-zoom/runtime/leaf/dom/entry verification scripts, `npm run check`, frontend/backend `tsc`, Jest, lint with 5 existing warnings, Vite build with expected classic-script warnings, and `git diff --check`.

## 2026-06-02 13:45 - ESM Phase E5.5 inventory tab delegated handlers

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Completed the fifth safe Phase E5 inline-handler island:

- Added `app/esm/ui/inventory-tabs.js` with delegated click handling for inventory tab controls.
- Converted five inventory tab buttons from inline `onclick="switchInvTab(..., this)"` to `data-esm-inventory-tab`: stock, menu, purchase, ledger, stocktake.
- Updated `app/esm/main.js` to import/install `inventoryTabs` under `window.XekhoApp.esm.ui.inventoryTabs`.
- Bumped ESM entry cache/version to `20260602-e5-inventory-tabs`.
- Added `scripts/verify-esm-inventory-tabs.js` and expanded `scripts/verify-esm-entry.js`.
- Kept legacy `switchInvTab` and the inventory more modal handler untouched; the ESM island delegates to `switchInvTab` at click time.

Current E5 evidence: inline handler count reduced from 220 to 215; 31 local classic scripts remain. Continue E5 one small UI island at a time with mobile/browser QA for riskier flows.

Verification passed: ESM syntax checks, inventory-tabs/report-date-controls/settings-tabs/report-tabs/header-actions/image-zoom/runtime/leaf/dom/entry verification scripts, `npm run check`, frontend/backend `tsc`, Jest, lint with 5 existing warnings, Vite build with expected classic-script warnings, and `git diff --check`.

## 2026-06-02 13:35 - ESM Phase E5.4 report date controls delegated handlers

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Completed the fourth safe Phase E5 inline-handler island:

- Added `app/esm/ui/report-date-controls.js` with delegated click handling for report period/date mode controls.
- Converted five report period buttons from inline `onclick="setReportPeriod(...)"` to `data-esm-report-period`: today, day, week, month, all.
- Converted two report date mode buttons from inline `onclick="setDateMode('report', ..., this)"` to `data-esm-report-date-mode`: single, range.
- Updated `app/esm/main.js` to import/install `reportDateControls` under `window.XekhoApp.esm.ui.reportDateControls`.
- Bumped ESM entry cache/version to `20260602-e5-report-date-controls`.
- Added `scripts/verify-esm-report-date-controls.js` and expanded `scripts/verify-esm-entry.js`.
- Kept legacy `setReportPeriod` and `setDateMode` untouched; the ESM island delegates to them at click time.

Current E5 evidence: inline handler count reduced from 227 to 220; 31 local classic scripts remain. Continue E5 one small UI island at a time with mobile/browser QA for riskier flows.

Verification passed: ESM syntax checks, report-date-controls/settings-tabs/report-tabs/header-actions/image-zoom/runtime/leaf/dom/entry verification scripts, `npm run check`, frontend/backend `tsc`, Jest, lint with 5 existing warnings, Vite build with expected classic-script warnings, and `git diff --check`.

## 2026-06-02 13:25 - ESM Phase E5.3 settings tab delegated handlers

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Completed the third safe Phase E5 inline-handler island:

- Added `app/esm/ui/settings-tabs.js` with delegated click handling for static settings tab buttons.
- Converted seven settings tab buttons from inline `onclick="switchSettingsTab(..., this)"` to `data-esm-settings-tab`: store, theme, users, attendance, payment, ai, data.
- Updated `app/esm/main.js` to import/install `settingsTabs` under `window.XekhoApp.esm.ui.settingsTabs`.
- Bumped ESM entry cache/version to `20260602-e5-settings-tabs`.
- Added `scripts/verify-esm-settings-tabs.js` and expanded `scripts/verify-esm-entry.js`.
- Kept legacy `switchSettingsTab` untouched; the ESM island delegates to it at click time.

Current E5 evidence: inline handler count reduced from 234 to 227; 31 local classic scripts remain. Continue E5 one small UI island at a time with mobile/browser QA for riskier flows.

Verification passed: ESM syntax checks, settings-tabs/report-tabs/header-actions/image-zoom/runtime/leaf/dom/entry verification scripts, `npm run check`, frontend/backend `tsc`, Jest, lint with 5 existing warnings, Vite build with expected classic-script warnings, and `git diff --check`.

## 2026-06-02 12:55 - ESM Phase E5.2 report tab delegated handlers

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Completed the second safe Phase E5 inline-handler island:

- Added `app/esm/ui/report-tabs.js` with delegated click handling for static report tab buttons.
- Converted four report tab buttons from inline `onclick="switchReportTab(..., this)"` to `data-esm-report-tab`: revenue, ads, purchase, history.
- Updated `app/esm/main.js` to import/install `reportTabs` under `window.XekhoApp.esm.ui.reportTabs`.
- Bumped ESM entry cache/version to `20260602-e5-report-tabs`.
- Added `scripts/verify-esm-report-tabs.js` and expanded `scripts/verify-esm-entry.js`.
- Relaxed `scripts/verify-esm-header-actions.js` to accept later E5 cache keys while still verifying header delegation.

Current E5 evidence: inline handler count reduced from 238 to 234; 31 local classic scripts remain. Continue E5 one island at a time with mobile/browser QA.

Verification passed: ESM syntax checks, report-tabs/header-actions/image-zoom/runtime/leaf/dom/entry verification scripts, `npm run check`, frontend/backend `tsc`, Jest, lint with 5 existing warnings, Vite build with expected classic-script warnings, and `git diff --check`.

## 2026-06-02 12:42 - ESM Phase E5.1 header actions delegated handlers

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Completed the first safe Phase E5 inline-handler island:

- Added `app/esm/ui/header-actions.js` with delegated click handling for static header actions.
- Converted four header buttons from inline `onclick` to `data-esm-header-action`: AI assistant, stock alert, hard reload, logout.
- Updated `app/esm/main.js` to import/install `headerActions` under `window.XekhoApp.esm.ui.headerActions`.
- Bumped ESM entry cache/version to `20260602-e5-header-actions`.
- Added `scripts/verify-esm-header-actions.js` and expanded `scripts/verify-esm-entry.js`.

Current E5 evidence: inline handler count reduced from 243 to 238; 31 local classic scripts and most POS/report/settings handlers remain. Continue E5 one island at a time with mobile/browser QA.

Verification passed: ESM syntax checks, header-actions/image-zoom/runtime/leaf/entry verification scripts, `npm run check`, frontend/backend `tsc`, Jest, lint with 5 existing warnings, Vite build with expected classic-script warnings, and `git diff --check`.

## 2026-06-02 11:56 - ESM Phase E4 image zoom UI island complete

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Completed the next safe ESM phase after E3 runtime adapters:

- Added `app/esm/ui/image-zoom.js`, an importable image zoom/pan controller with `installGlobalImageZoom()`.
- Updated classic `ImgZoom` in `app.js` to delegate `attach()`, `detach()`, and `reset()` to `window.XekhoApp.esm.ui.imageZoom` when the ESM module is ready, while retaining fallback logic.
- Updated `app/esm/main.js` to import/install the UI island and mark `window.XekhoApp.esm.facades.uiIslands.imageZoom`.
- Updated `index.html` cache key to `20260602-e4-ui-image-zoom`.
- Added `scripts/verify-esm-ui-image-zoom.js` and expanded `scripts/verify-esm-entry.js`.

Phase status after this sprint: E0/E1/E2/E3/E4 complete. E5/E6 remain intentionally blocked/deferred for safety: current audit shows 243 inline handlers and 31 local classic scripts, so inline handler cleanup and package-type strategy require separate island-by-island/mobile QA sprints. No E7/E8 exists in the current ESM plan.

Verification passed: ESM syntax checks, image-zoom/runtime/leaf/entry verification scripts, `npm run check`, frontend/backend `tsc`, Jest, lint with 5 existing warnings, Vite build with expected classic-script warnings, and `git diff --check`.

## 2026-06-02 11:39 - ESM Phase E3 runtime adapters complete

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Completed the next safe ESM phase without converting `app.js`, changing root `package.json`, or touching POS/backend/data flows:

- Added `app/esm/adapters/dom.js` for importable DOM query/event helpers.
- Added `app/esm/adapters/store.js` for read-only access to classic `window.Store` and `window.appState`.
- Added `app/esm/adapters/db.js` for promise-based `window.DB` readiness and safe method access wrappers.
- Updated `app/esm/main.js` to install adapters under `window.XekhoApp.esm.adapters.*` and mark `window.XekhoApp.esm.facades.runtimeAdapters`.
- Updated `index.html` cache key to `20260602-e3-runtime-adapters`.
- Added `scripts/verify-esm-runtime-adapters.js` and expanded `scripts/verify-esm-entry.js`.

Verification passed: adapter/leaf/entry ESM scripts, `npm run check`, frontend/backend `tsc`, Jest, lint with 5 existing warnings, Vite build with expected classic-script warnings, and `git diff --check`.

## 2026-06-02 11:26 - ESM Phase E2 leaf facades complete

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Completed the safe E2 leaf facade set without touching `app.js`, POS order flow, backend Cloud Functions, or runtime data:

- Added importable ESM facades for `app/utils/format.js`, `app/utils/date.js`, `app/utils/excel.js`, and `app/auth/staff.js`.
- Updated `app/esm/main.js` to import/install DOM + format + date + Excel + staff facades and mark `window.XekhoApp.esm.facades.*` readiness.
- Preserved classic compatibility globals/namespaces: `window.XekhoApp.utils.*`, `window.XekhoApp.auth.*`, formatter globals (`fmt`, `fmtFull`, `fmtDate`, `fmtTime`, `fmtDateTime`, `today`), date globals, and Excel helper globals.
- Updated `index.html` module cache key to `20260602-e2-leaf-facades`.
- Added `scripts/verify-esm-leaf-facades.js` and expanded `scripts/verify-esm-entry.js` for the full E2 facade set.

Verification passed: ESM facade scripts, `npm run check`, frontend/backend `tsc`, Jest, lint with 5 existing warnings, Vite build with expected classic-script warnings, and `git diff --check`.

## 2026-06-02 10:31 - ESM Phase E2 DOM facade

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Started Phase E2 with the safest leaf utility:

- Added `app/esm/utils/dom.js` with importable `escapeHtml()` and `installGlobalDomUtils()` exports.
- Updated `app/esm/main.js` to import the DOM facade and mark `window.XekhoApp.esm.facades.dom` readiness.
- Updated `index.html` cache key to `20260602-e2-dom`.
- Updated ESM verification to account for the imported facade and added `scripts/verify-esm-dom-utils.js`.
- Updated `app/esm/README.md`, ESM audit, progress, TODO, code map, file relations, and task log.

Compatibility preserved: `window.XekhoApp.utils.dom.escapeHtml()` remains available; `app.js` and POS runtime/order/data flows were not changed.

## 2026-06-02 10:22 - Safe dirty tree cleanup

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Cleaned the dirty tree using explicit safe commit groups:

- Group 1: tooling/typecheck cleanup and backend ads dependency injection fix.
- Group 2: ESM audit + E1 compatibility harness + AI map documentation.
- Added `docs/ai-map/STAGING_REVIEW.md` and `docs/ai-map/TASK_LOGS/2026-06-02-1022-safe-dirty-cleanup.md`.

Safety: no `git add -A`, no secrets read/staged, no deploy, no production DB/POS/payment/customer data touched.

## 2026-06-02 10:08 - ESM Phase E1 compatibility harness

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Implemented the first non-invasive ESM bridge:

- Added `app/esm/main.js` as a type-checked browser module harness.
- Added `app/esm/README.md` with migration rules and next dual-export candidates.
- Loaded `<script type="module" src="app/esm/main.js?v=20260602-e1"></script>` after existing classic runtime scripts and before inline DOM helper scripts.
- Added `scripts/verify-esm-entry.js` to assert script order, readiness marker, and `xekho:esm-ready` event behavior in a VM sandbox.
- Verification passed: ESM verify script, `npm run check`, frontend/backend `tsc`, Vite build, and `npm run lint` with existing warnings only.

This keeps `package.json` as `commonjs` and does not convert or remove any `window.XekhoApp.*` compatibility globals.

## 2026-06-02 09:31 - ESM conversion audit

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Audited ESM/Vite conversion readiness against the current refactor state and `REFACTOR_PLAN.md`:

- Verified Vite config loads and `npx vite build` succeeds while preserving classic scripts as expected.
- Scanned JS files, script tags, ESM/CommonJS usage, and global coupling hotspots.
- Documented why the repo is not safe for one-shot ESM conversion yet: `app.js` remains a global runtime host, `index.html` still loads 31 local classic scripts, `db.js` is the only module script but still exposes `window.DB`, and backend/scripts remain CommonJS.
- Created a staged frontend-first ESM plan: E0 audit, E1 ESM compatibility harness, E2 dual-export leaf utilities, E3 runtime adapters, E4 UI islands, E5 inline-handler removal, E6 package type strategy.

New doc: `docs/ai-map/ESM_AUDIT.md`.

## 2026-06-02 09:07 - Tooling cleanup: restore lint and TypeScript checks

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Fixed the actionable tooling regressions found during the refactor audit:

- Added local `eslint` devDependency so `npm run lint` no longer depends on an implicit/global binary.
- Added `ignoreDeprecations: "6.0"` to frontend/backend TypeScript configs to unblock TypeScript 6 deprecation handling.
- Fixed frontend `@ts-check` issues in extracted modules:
  - `app/report/excel.js`: DOM input casts, `ExcelJS` global access through typed root, date arithmetic via `getTime()`.
  - `app/report/expense.js`: typed row arrays and date arithmetic via `getTime()`.
  - `app/modules/media-refinery/index.js`: typed `window` export assignment.
- Fixed backend `@ts-check` issues in extracted modules:
  - `functions/telegram/send.js`: typed axios CommonJS import as `any` for `.post()` / `.get()`.
  - `functions/telegram/reports.js`: date arithmetic via `getTime()`.
  - `functions/telegram/ads.js`: added explicit dependency injection for stateful ads data loaders (`setAdsRevenueDataDependencies`) and wired it from `functions/index.js`.
- Verification now passes: syntax checks, Jest 6/6, frontend/backend `tsc`, `npm run lint`, backend module ESLint via `npx`, 33 verification scripts, and an ads dependency-injection smoke test.

Remaining warnings are non-blocking ESLint warnings in existing code: 5 frontend warnings from `npm run lint`; 3 backend warnings from `npx eslint functions/utils/ functions/telegram/`.

## 2026-06-02 - Phase 14 Complete: Backend @ts-check, CI type checking, CODE_MAP expansion, DATA_SCHEMA

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Phase 14 completed four sprints: backend `@ts-check` + JSDoc for all 8 Cloud Functions modules, `tsc --noEmit` added to CI pipeline, `CODE_MAP.md` expanded from 210→474 lines covering all 34 Cloud Functions and 27 modules with data flows, and `DATA_SCHEMA.md` created (855 lines) documenting 33+ Firestore collections.

- Sprint 14.1: Backend `@ts-check` + JSDoc annotations for all 8 backend modules (`functions/utils/text.js`, `functions/utils/general.js`, `functions/telegram/send.js`, `functions/telegram/kitchen.js`, `functions/telegram/reports.js`, `functions/telegram/ads.js`, `functions/telegram/orders.js`, `functions/telegram/online-orders.js`)
- Sprint 14.2: `tsc --noEmit` added to CI pipeline for both frontend and backend type checking
- Sprint 14.3: `CODE_MAP.md` expanded (210→474 lines) — all 34 Cloud Functions documented, all 27 modules mapped, data flow diagrams added
- Sprint 14.4: `DATA_SCHEMA.md` created (855 lines) — 33+ Firestore collections documented with field schemas, indexes, and security rules

Current state after Phase 14:
- `app.js`: 11,895 lines (397 functions, 73 with delegation wrappers)
- `functions/index.js`: 5,702 lines (200 functions, 100 with delegation wrappers)
- 28 extracted modules (8 backend + 20 frontend)
- ~150+ exported functions with JSDoc annotations (frontend + backend)
- 34 Cloud Functions documented in CODE_MAP.md
- 33+ Firestore collections documented in DATA_SCHEMA.md
- `tsc --noEmit` passes with 0 type errors (frontend + backend)
- CI pipeline includes type checking
- 33+ verification scripts — all pass
- Jest 6/6 pass

Progress: ~65% total / ~72% core / ~99% near-term.

## 2026-06-02 - Phase 13 Complete: TypeScript JSDoc migration (@ts-check + JSDoc annotations)

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Phase 13 added TypeScript type checking via JSDoc + `@ts-check` annotation pattern — no code rewrite to `.ts` files. Created `jsconfig.json`, added `// @ts-check` to all 18 frontend modules, added JSDoc annotations to ~150+ exported functions across all modules. `tsc --noEmit` passes with 0 type errors.

- Sprint 13.1: Created `jsconfig.json`, added `@ts-check` to all 18 frontend modules
- Sprint 13.2: Added JSDoc annotations to 3 complex modules (`app/order/helpers.js`, `app/report/excel.js`, `app/report/expense.js`)
- All 18 frontend modules have `@ts-check` + JSDoc annotations on exports
- `tsc --noEmit` — 0 type errors
- 33 verification scripts — all pass
- Jest 6/6 pass

Current state after Phase 13:
- `app.js`: 11,895 lines (397 functions, 73 with delegation wrappers)
- `functions/index.js`: 5,702 lines (200 functions, 100 with delegation wrappers)
- 28 extracted modules (8 backend + 20 frontend)
- ~150+ exported functions with JSDoc annotations
- 33 verification scripts — all pass
- `jsconfig.json` for type checking
- Vite dev server available
- Jest 6/6 pass

Progress: ~58% total / ~65% core / ~97% near-term.

## 2026-06-02 - Phase 12 Complete: Vite spike merged into working branch

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Rebased `spike/vite-build-tooling` onto main (fast-forward), then merged into `test/xe-kho-repo-implementer-skill` (fast-forward). Vite build confirmed working: `dist/` produces `index.html`, `main.js` (103KB), `main.css` (57KB), and manifest. Dev server config (`vite.config.mjs`) serves existing IIFE files as static assets — no ES module bundling yet, preserving script-order/browser-global runtime behavior.

Current state after Phase 12:
- `app.js`: 11,895 lines (397 functions, 73 with delegation wrappers)
- `functions/index.js`: 5,702 lines (200 functions, 100 with delegation wrappers)
- 28 extracted modules (8 backend + 20 frontend)
- ~150+ exported functions
- 33 verification scripts — all pass
- Jest 6/6 pass
- Vite spike merged (dev server + future build config)
- Git tree clean

Progress: ~52% total / ~60% core / ~95% near-term.

## 2026-06-02 - Phase 10 Complete: Full backend + frontend function extraction

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Phase 10 extracted 48+ pure functions from `functions/index.js` into 4 new modules and cleaned 4 duplicate declarations. `functions/index.js` reduced to 5702 lines (from ~7280 original = -1578 lines total). 8 backend modules + 20 frontend modules now active with 150+ total exports across 28 modules.

- Sprint 10.1: 11 Telegram report helpers → `functions/telegram/reports.js` (already committed)
- Sprint 10.2: 22 ads/date/NLP helpers → `functions/telegram/ads.js`
- Sprint 10.3a: 11 order helpers → `functions/telegram/orders.js`
- Sprint 10.3a: 9 online order helpers → `functions/telegram/online-orders.js`
- Sprint 10.3b: 6 general utilities → `functions/utils/general.js`
- Sprint 10.4: Removed 4 duplicate declarations (-221 lines)

Backend modules (8): `functions/utils/text.js` (11), `functions/utils/general.js` (6), `functions/telegram/send.js` (9), `functions/telegram/kitchen.js` (10), `functions/telegram/reports.js` (19), `functions/telegram/ads.js` (22), `functions/telegram/orders.js` (11), `functions/telegram/online-orders.js` (9)

Frontend modules (20): `app/utils/{dom,format,excel,date,print,storage,parser,categorize,fixedcost}.js`, `app/ui/{toast,theme,modal}.js`, `app/auth/staff.js`, `app/order/helpers.js`, `app/report/{helpers,ads,expense,excel}.js`

Verification: 33 scripts (29 existing + 4 new), Jest 6/6, ESLint 0 errors. Total lines extracted: ~1782.

## 2026-06-02 - Phase 10 Sprint 10.1: Telegram report helpers batch 2

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

Extended `functions/telegram/reports.js` with 11 new pure functions/constants: `coerceHistoryDate`, `formatTelegramDateTimeVi`, `getTelegramPayMethodLabel`, `isTelegramBankPayMethod`, `formatTelegramSmartRangeLabel`, `parseTelegramSmartReportIntent`, `DEFAULT_TELEGRAM_REPORT_SETTINGS`, `getVietnamBusinessReportRange`, `getTelegramReportSettings`, `getTelegramReportRangeKey`, `shouldSendTelegramReportNow`. Delegation wrappers in `functions/index.js`. Module now has 19 exports. `functions/index.js` reduced by 115 lines (6816→6701). Fixed VM sandbox `instanceof Date` pitfall.

## 2026-06-02 02:28 - Safe refactor Phase 2 complete (Sprints 10-12): Telegram send, kitchen, reports extraction

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

- Sprint 2.3 (Sprint 10): Extracted 9 Telegram message sending functions into `functions/telegram/send.js`: `sendTelegramHtmlMessage`, `sendTelegramTextMessage`, `sendTelegramActionConfirmation`, `sendTelegramInlineMessage`, `sendTelegramPhotoMessage`, `answerTelegramCallback`, `editTelegramMessage`, `editTelegramInlineMessage`, `getTelegramPhotoAsBase64`. All are async, depend only on axios + text utils. Thin wrappers in `functions/index.js`.
- Sprint 2.4 (Sprint 11): Extracted 10 kitchen notification functions into `functions/telegram/kitchen.js`: `normalizeTelegramTableLabel`, `buildKitchenNotifMessage`, `parseKitchenItemSummary`, `buildTelegramFoodReadyMessage`, `isKitchenOrderItemForTelegram`, `getKitchenOrderItemKey`, `getNewPendingKitchenItems`, `buildTelegramNewKitchenOrderMessage`, `buildTelegramFoodReadyMessageClean`, `buildTelegramNewKitchenOrderMessageClean`. Pure helpers with no external deps. Thin wrappers in `functions/index.js`.
- Sprint 2.5 (Sprint 12): Extracted 8 pure report helper utilities into `functions/telegram/reports.js`: `getVietnamDateParts`, `normalizeTelegramSmartReportText`, `normalizeTelegramWildcardText`, `buildTelegramWildcardRegex`, `parseTelegramLooseDateTime`, `getInclusiveVietnamDateCount`, `formatAchievementPercent`, `buildMorningRevenueMood`. No external deps beyond Intl APIs. Thin wrappers in `functions/index.js`.
- Phase 2 total: 4 new modules (`functions/utils/text.js`, `functions/telegram/send.js`, `functions/telegram/kitchen.js`, `functions/telegram/reports.js`), 38 functions extracted, `functions/index.js` reduced from ~7280 to ~6816 lines (-464 lines).
- All 10 verification scripts pass, all 7 offline scripts pass, Jest 6/6.
- UTF-8/mojibake encoding pitfall noted for `write_file` tool: must use terminal `cat` heredoc for Vietnamese string literals in IIFE/CJS modules.

## 2026-06-02 01:44 - Safe refactor Sprint 9 Phase 2 mapping + text utils extraction

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Sprint 2.1: Mapped all 35 exports and ~241 helper functions in `functions/index.js` into `docs/ai-map/CODE_MAP.md`. Sprint 2.2: Extracted 11 pure text/formatting utilities into `functions/utils/text.js` CommonJS module. `functions/index.js` now requires the module and delegates through thin wrappers.

Files:
- Created `functions/utils/text.js`
- Created `scripts/verify-text-utils.js`
- Modified `functions/index.js` (require + 11 delegation wrappers)
- Modified `docs/ai-map/CODE_MAP.md` (endpoint/API section)

## 2026-06-02 01:38 - Safe refactor Sprint 8 auth/staff helper extraction

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Extracted pure staff helper functions (`_normalizeStaffRole`, `_normalizeStaffStatus`, `_getStaffIdentity`, `_buildCurrentUserFromStaff`) from `app.js` into `app/auth/staff.js` IIFE module. Added `validatePinFormat` utility. Login/logout/lock/unlock/idle-timer stay in app.js (state-dependent, production risk).

Files:
- Created `app/auth/staff.js`
- Created `scripts/verify-auth-staff.js`
- Modified `app.js` (4 compatibility wrappers)
- Modified `index.html` (script load order)

## 2026-06-02 01:36 - Safe refactor Sprint 7 modal helper extraction

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Extracted generic `openModal`/`closeModal`/`isModalOpen` from app.js modal pattern into `app/ui/modal.js` IIFE. 6 existing modal functions in app.js now delegate to the generic helpers.

Files:
- Created `app/ui/modal.js`
- Created `scripts/verify-modal-ui.js`
- Modified `app.js` (6 compatibility wrappers)
- Modified `index.html` (script load order)

## 2026-06-02 01:32 - Safe refactor Sprint 6 theme helper extraction

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Extracted `applyTheme()` from `app.js` into standalone IIFE module `app/ui/theme.js`. Module exports via `window.XekhoApp.ui.applyTheme`. app.js wrapper delegates to IIFE with inline fallback.

Files:
- Created `app/ui/theme.js`
- Created `scripts/verify-theme-ui.js`
- Modified `app.js` (compatibility wrapper)
- Modified `index.html` (script load order)

## 2026-06-02 01:25 - Safe refactor Sprint 5 toast/notification UI extraction

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Extracted `showToast()` and `repairVietnameseText()` from `app.js` into standalone IIFE module `app/ui/toast.js`. Module exports via `window.XekhoApp.ui.*` namespace. app.js wrappers delegate to IIFE with inline fallback. Added deterministic verification script.

Files:
- Created `app/ui/toast.js`
- Created `scripts/verify-toast-ui.js`
- Modified `app.js` (compatibility wrappers)
- Modified `index.html` (script load order)

## 2026-06-02 00:44 - Safe refactor Sprint 4 explicit staging review

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Executed Sprint 4 direction 1. Reviewed the dirty tree path-by-path, staged only explicit security/docs/refactor paths with specific `git add` arguments and partial cached patches, and documented staged vs unstaged groups in `docs/ai-map/STAGING_REVIEW.md`. Did not use `git add -A`, did not commit, did not deploy, and did not read secret contents.

Staged groups:

- Sensitive paths as staged Git deletions only, preserving local files where present.
- `.gitignore` secret/generated ignore rules.
- `REFACTOR_PLAN.md` and `docs/ai-map/`.
- Safe compatibility modules: `app/utils/dom.js`, `app/utils/format.js`, `store.js`.
- Partial staged hunks only for `app.js` `_escapeHtml()` delegation and `index.html` script-load seam.
- Verification scripts: `scripts/verify-dom-utils.js`, `scripts/verify-format-utils.js`, `scripts/verify-offline-runtime.js`.

Left unstaged:

- Generated/cache/log artifacts.
- High-impact runtime/backend files with broad pre-existing changes.
- Import/backfill/data scripts.
- Unrelated root planning docs, media refinery modules, brand/prompts, and remaining mixed hunks in `app.js`/`index.html`.

Files changed:

- `docs/ai-map/STAGING_REVIEW.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/REFACTOR_PROGRESS.md`
- `docs/ai-map/TASK_LOGS/2026-06-02-0044-safe-refactor-sprint-4-staging-review.md`

Verification:

- Reviewed `git diff --cached --stat` and `git diff --cached --name-status`.
- Ran safe syntax/verification/test commands after staging.
- Ran UTF-8/mojibake scan on touched Sprint 4 docs.

Next:
Review/commit only the explicit staged set if approved, or continue splitting remaining dirty paths into smaller reviewed scopes.

## 2026-06-02 00:32 - Safe refactor Sprint 3 format utility extraction

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Continued executing `REFACTOR_PLAN.md` with one bounded compatibility refactor. Added `app/utils/format.js` under the existing `window.XekhoApp.utils` namespace, loaded it before `store.js`, and kept legacy formatter names in `store.js` as wrappers/delegates with fallbacks. Added deterministic Node VM verification for the new utility and updated progress tracking.

Progress estimate:

- Total long-term `REFACTOR_PLAN.md` including optional TypeScript/CI/build-tooling: ~15% complete.
- Core non-optional refactor/security/testing plan: ~19% complete.
- Near-term safe-execution track: ~36% complete.

Files changed:

- `app/utils/format.js`
- `store.js`
- `index.html`
- `scripts/verify-format-utils.js`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/REFACTOR_PROGRESS.md`
- `docs/ai-map/TASK_LOGS/2026-06-02-0032-safe-refactor-sprint-3-format-utils.md`

Verification:

- `node scripts/verify-format-utils.js` passed.
- Syntax checks for touched JS passed.
- Existing DOM/offline verification scripts passed.
- `npm test -- --runInBand` passed: 1 suite, 6 tests.
- UTF-8/mojibake scan passed for touched text files.

Next:
Continue with one more bounded compatibility extraction around a small app.js UI/helper seam, or pause to review/stage explicit security/docs/refactor paths before larger work.

## 2026-06-02 00:16 - Safe refactor Sprint 2 dirty-tree classification and progress tracking

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Continued executing `REFACTOR_PLAN.md` with a docs-only safety sprint before further source refactors. Created `docs/ai-map/REFACTOR_PROGRESS.md` to track conservative completion percentages and classify the full dirty working tree by path-only categories: security-untracked paths, generated/cache/log artifacts, docs/plans, high-impact runtime files, backend functions, import/data scripts, offline/POS modules, repo config, new app modules, and other assets. Also cleaned a duplicate `scripts/verify-offline-runtime.js` entry from `CODE_MAP.md`. This sprint did not touch runtime source code and did not read secret contents.

Progress estimate:

- Total long-term `REFACTOR_PLAN.md` including optional TypeScript/CI/build-tooling: ~14% complete.
- Core non-optional refactor/security/testing plan: ~18% complete.
- Near-term safe-execution track: ~32% complete.

Files changed:

- `docs/ai-map/REFACTOR_PROGRESS.md`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-02-0016-safe-refactor-sprint-2-dirty-tree-progress.md`

Verification:

- Read the generated progress/classification report.
- Ran safe syntax/test checks already used by the refactor track.
- Ran UTF-8/mojibake scan on touched docs.

Next:
Use the classification report to decide whether to stage/review security/docs first or continue with one small compatibility extraction such as format helpers after confirming actual ownership in `store.js`/`app.js`.

## 2026-06-02 00:07 - Safe refactor Sprint 1 security baseline and DOM utility extraction

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Started executing `REFACTOR_PLAN.md` with the safest first increments. Created an external backup folder for files touched in this session, performed path-only sensitive inventory without reading secret contents, expanded `.gitignore` secret/generated patterns, and removed known sensitive paths from Git tracking with `git rm --cached` so local env files remain on disk but are no longer in the index. Fixed the Jest permission blocker by making `node_modules/.bin/*` executable; `npm test -- --runInBand` now passes. Implemented the first compatibility refactor by adding `app/utils/dom.js` with `window.XekhoApp.utils.dom.escapeHtml()`, loading it before `app.js`, and changing the existing `_escapeHtml()` wrapper to delegate to the utility while keeping the fallback implementation. Also updated `scripts/verify-offline-runtime.js` to match the current Sprint 19 runtime version marker.

Files changed:

- `.gitignore`
- `app/utils/dom.js`
- `app.js`
- `index.html`
- `scripts/verify-dom-utils.js`
- `scripts/verify-offline-runtime.js`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/TASK_LOGS/2026-06-02-0007-safe-refactor-sprint-1.md`

Sensitive path handling:

- Removed from Git tracking only, without reading contents: `functions/.env.gcloud-completed-order.yaml`, `functions/.env.pos-v2-909ff`, `pos-v2-909ff-firebase-adminsdk-fbsvc-abdca8f1c5.json`, `project-724ee6ef-5290-41f4-892-a47703f4859e.json`.
- Verified tracked sensitive-looking path query returns no matches after untracking.

Verification:

- `node scripts/verify-dom-utils.js` passed.
- `node --check app/utils/dom.js`, `node --check app.js`, `node --check scripts/verify-dom-utils.js`, and `node --check scripts/verify-offline-runtime.js` passed.
- `node scripts/verify-offline-runtime.js`, `node scripts/verify-offline-status-ui.js`, `node scripts/verify-offline-backup.js`, `node scripts/verify-offline-sync.js`, `node scripts/verify-offline-firestore-adapter.js`, `node scripts/verify-offline-order-fallback.js`, and `node scripts/verify-offline-order-fallback-devtools.js` passed.
- `npm test -- --runInBand` passed: 1 suite, 6 tests.
- UTF-8 decode/replacement-character scan passed for touched text files.

Next:
Continue with the next small compatibility refactor only after reviewing the still-dirty pre-existing working tree; candidate next sprint is extracting format helpers or creating a dirty-tree classification report.

## 2026-06-01 18:58 - Safe refactor plan rewrite

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Rewrote `REFACTOR_PLAN.md` from a high-level refactor outline into a sprint-safe production refactor plan. The new version adds security containment first, a baseline stabilization phase before any code split, path-only handling rules for sensitive files, corrected `functions/firestoreMegaTools.js` sizing, compatibility-first frontend modularization, Cloud Functions export mapping before behavior changes, and explicit verification/AI-map requirements for every refactor sprint. The plan avoids immediate ES module/Vite migration and recommends IIFE/global namespace compatibility while the POS app remains dependent on script order/global browser runtime behavior.

Files changed:

- `REFACTOR_PLAN.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1858-safe-refactor-plan-rewrite.md`

Verification:

- Read the rewritten `REFACTOR_PLAN.md` after writing.
- Ran `git diff --stat` to confirm the scope was docs/plan-only plus AI map updates.

Next:
Start with security inventory/path-only review and baseline dirty-tree classification before any source refactor.

## 2026-06-01 18:30 - POS offline backup Sprint 19 production with auto sync

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Production release: enabled auto sync and cleaned up review-phase UI. `offlineRuntime.js` now creates the runtime with `enableSync: true` and calls `startAutoSync(60000)` (60-second interval). The offline status modal no longer shows "Copy queue report" button, textarea, or copy-status (these were for the review/debug phase). The modal now shows "Auto sync đang chạy" when sync is enabled, with "Đồng bộ thủ công" available for manual retry of failed actions. The `?xkPayloadReview=1` devtools page still works for debugging but is not linked from the production UI.

Files changed:

- `offlineRuntime.js`
- `offlineStatusUI.js`
- `index.html`
- `scripts/verify-offline-status-ui.js`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`

Verification:

- Ran `node --check offlineRuntime.js`, `node --check offlineStatusUI.js`, `node --check offlineFirestoreAdapter.js` — passed.
- Ran `node scripts/verify-offline-status-ui.js` — Sprint 19 verification passed.
- Ran `node scripts/verify-offline-firestore-adapter.js` — Sprint 3 verification passed.
- Deployed Sprint 19 hosting-only.

Next:
Monitor production for sync behavior. Auto sync runs every 60s, retries failed actions with backoff. "Đồng bộ thủ công" still available for immediate retry.

## 2026-06-01 18:20 - POS offline backup Sprint 18 persistent orderId resolution

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Sprint 17 fix (in-memory `clientOrderIdToOrderId` mapping) didn't work because the mapping only lives in the current session. When the user reloads the page and retries the failed `add_item`, the adapter creates a new instance with an empty mapping → `resolveOrderId` returns the offline ID unchanged → same error. Fixed by adding `db.Orders.findByClientOrderId()` method that queries Firestore directly for orders with the matching `clientOrderId` field (written during `open_order` via `updateMeta`). The adapter's `resolveOrderId` is now async and checks: (1) in-memory cache, (2) Firestore query via `findByClientOrderId`, (3) fallback to original orderId. This persists across page loads because the `clientOrderId` field lives in the Firestore order document.

Files changed:

- `db.js` (added `findByClientOrderId`)
- `offlineFirestoreAdapter.js` (async `resolveOrderId` with Firestore fallback)
- `index.html`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`

Verification:

- Ran `node --check offlineFirestoreAdapter.js` and `node scripts/verify-offline-firestore-adapter.js` — passed.
- Ran `node --check offlineStatusUI.js` and `node scripts/verify-offline-status-ui.js` — passed.
- Deployed Sprint 18 hosting-only.

Next:
Ask user to retry the failed `add_item` on iPhone. The adapter will now query Firestore to find the real order ID by `clientOrderId`, even across page loads.

## 2026-06-01 18:15 - POS offline backup Sprint 17 idempotent orderId resolution

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Fixed the root cause of the `add_item` sync failure: `db.Orders.open()` creates an order with ID `ORD-{tableId}-{timestamp}` in Firestore, but offline `add_item`/`update_meta`/`close_order`/`cancel_order` actions reference `orderId: "offline_order_..."` (the offline clientOrderId). The adapter now tracks a `clientOrderId → firestoreOrderId` mapping after `open_order` succeeds, and all subsequent action apply methods use `resolveOrderId()` to translate the ID before calling Firestore operations. Additionally, after opening the order, the adapter writes `clientOrderId` + `offlineDeviceId` + `offlineCreatedAt` to the order document via `updateMeta`, enabling `findExistingByClientOrderId` to find it for idempotency checks.

Files changed:

- `offlineFirestoreAdapter.js`
- `index.html`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`

Verification:

- Ran `node --check offlineFirestoreAdapter.js` and `node scripts/verify-offline-firestore-adapter.js` — passed.
- Ran `node --check offlineStatusUI.js` and `node scripts/verify-offline-status-ui.js` — passed.
- Deployed Sprint 17 hosting-only.

Next:
Ask user to retry the failed `add_item` action on iPhone via `Đồng bộ thủ công` → `Xác nhận đồng bộ 1 lần`. The adapter will now resolve `offline_order_...` to the real Firestore order ID.

## 2026-06-01 18:05 - POS offline backup Sprint 16 bugfixes

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Fixed two bugs from iPhone guarded manual sync test: (1) Clipboard API on mobile Safari rejects `writeText` in non-user-gesture context; the outer catch was swallowing the error and showing "Không tạo được queue report" even though the report was already rendered in the textarea. Now clipboard call has its own try-catch, and the textarea always shows the report regardless of clipboard permission. (2) `formatQueueReviewReport` assumed `report.pending.length` and `report.failed.length` always existed, but the sync result report has a different shape (`syncResult` instead of `pending`/`failed` arrays). Now the formatter checks `Array.isArray()` before accessing, and adds a `## Sync result` section when present.

Files changed:

- `index.html`
- `offlineStatusUI.js`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`

Verification:

- Ran `node --check offlineStatusUI.js` and verification script passes.
- Deployed Sprint 16 hosting-only.

Next:
Ask user to reload iPhone and retest `Đồng bộ thủ công` -> retry failed action if needed. The failed `add_item` error `Đơn không tồn tại` is likely a Firestore adapter issue with idempotency check or order creation order.

## 2026-06-01 17:55 - POS offline backup Sprint 15 guarded manual sync

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
After the iPhone queue review report was accepted with 4 real pending actions, added a guarded manual sync button to the offline status modal. Tapping `Đồng bộ thủ công` shows a confirmation panel; after tapping `Xác nhận đồng bộ 1 lần`, the UI creates a temporary sync engine using `XekhoOfflineSync` + `XekhoOfflineFirestoreAdapter`, replays pending actions to Firestore once, shows per-action results, and refreshes the summary. Auto sync remains disabled.

Files changed:

- `index.html`
- `offlineStatusUI.js`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`

Verification:

- Ran `node --check offlineStatusUI.js` and verification script passes.
- Re-ran `node --check offlineOrderFallbackDevTools.js` and its verification script.

Next:
Deploy Sprint 15 hosting-only, ask user to tap `Đồng bộ thủ công` -> `Xác nhận đồng bộ 1 lần` on iPhone, then verify synced count in modal and check Firestore.

## 2026-06-01 16:32 - POS offline backup Sprint 14 mobile queue review report

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
After the iPhone status modal refresh was confirmed working, added the next read-only review gate: the status modal can now generate/copy a local pending queue report from `XekhoOfflineBackupRuntime.listPendingActions()` and `listFailedActions()`. The report is explicitly `queue-review-read-only` and states no DB wrap, no enqueue, no Firestore, and no sync. The modal shows a textarea fallback for iPhone manual copy if Clipboard API is unavailable. Cache-busted offline scripts to Sprint 14.

Files changed:

- `index.html`
- `offlineStatusUI.js`
- `scripts/verify-offline-status-ui.js`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`

Verification:

- Ran `node --check offlineStatusUI.js`.
- Ran `node --check scripts/verify-offline-status-ui.js`.
- Ran `node scripts/verify-offline-status-ui.js` and verified the generated queue review report includes one pending `add_item`, side-effect-free mode, and copy/manual-copy UI state.
- Re-ran `node --check offlineOrderFallbackDevTools.js` and `node scripts/verify-offline-order-fallback-devtools.js`; guarded queue-write helper still passes.
- Deployed Sprint 14 hosting-only and smoke-checked `https://xe-kho.web.app/?xkQueueWriteGuard=1` plus `offlineStatusUI.js?v=20260601-sprint14`; live asset contains `Copy queue report`, `queue-review-read-only`, and the side-effect-free marker.

Next:
Ask the user to reload iPhone and send the copied queue report for review before any sync enablement.

## 2026-06-01 16:20 - POS offline backup Sprint 13 status refresh feedback

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
After the iPhone guarded queue-write test showed `Offline: 1 chờ`, the user reported the status modal `Cập nhật` button did not appear clickable. Patched `offlineStatusUI.js` so refresh clicks prevent bubbling, resolve the nearest `[data-action]`, temporarily show `Đang cập nhật...`, restore the button text, and display `Cập nhật lần cuối: HH:MM:SS` after each refresh. Also fixed the test-only `intervalMs: 0` option to avoid creating a timer and cache-busted offline script URLs to Sprint 13.

Files changed:

- `index.html`
- `offlineStatusUI.js`
- `scripts/verify-offline-status-ui.js`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`

Verification:

- Ran `node --check offlineStatusUI.js`.
- Ran `node --check scripts/verify-offline-status-ui.js`.
- Ran `node scripts/verify-offline-status-ui.js` and verified refresh click updates counts and last-updated text.
- Re-ran `node --check offlineOrderFallbackDevTools.js` and `node scripts/verify-offline-order-fallback-devtools.js` to ensure guarded queue-write helper still passes.
- Deployed Sprint 13 hosting-only and smoke-checked `https://xe-kho.web.app/?xkQueueWriteGuard=1` plus `offlineStatusUI.js?v=20260601-sprint13`; live asset contains the Sprint 13 marker, `Cập nhật lần cuối`, and `Đang cập nhật...`.

Next:
Ask the user to reload the iPhone page and retest `Cập nhật`. Auto sync remains disabled.

## 2026-06-01 16:04 - POS offline backup Sprint 12 guarded queue-write helper

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Deployed Sprint 11 hosting-only, then added Sprint 12 guarded queue-write enablement. `offlineOrderFallbackDevTools.js` now exposes `enableQueueWriteGuarded({ confirmation: 'ENABLE_OFFLINE_QUEUE_WRITE' })`, which explicitly wraps `DB.Orders` in enabled fallback mode only after confirmation and requires `window.XekhoOfflineBackupRuntime.savePendingOrderAction`; auto sync remains disabled. The mobile helper panel is also available through `?xkQueueWriteGuard=1` for iPhone testing. `index.html` cache-busts offline scripts with Sprint 12 query strings.

Files changed:

- `index.html`
- `offlineOrderFallbackDevTools.js`
- `scripts/verify-offline-order-fallback-devtools.js`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1604-pos-offline-backup-sprint-12.md`

Verification:

- Deployed Sprint 11 to Firebase Hosting and smoke-checked live assets.
- Ran targeted syntax checks and offline verification scripts.
- Verified guarded queue-write helper refuses to enable without confirmation and queues fake runtime actions only when explicitly confirmed, while `autoSyncEnabled` remains false.
- Reviewed iPhone payload report generated at `2026-06-01T16:13:46.779Z`; no pre-enable blockers seen in submitted payload shapes: stable `deviceId`, nonblank table IDs, nonempty `close_order.items`, close table metadata, and explicit `remove_item` without sentinel delta.

Next:
Sprint 12 has been deployed hosting-only and the copied iPhone payload review passed shape review. Run the controlled guarded queue-write test with `https://xe-kho.web.app/?xkQueueWriteGuard=1`, then inspect pending queue/status badge before considering any sync enablement. Keep auto sync disabled until queued real-device actions are reviewed.

Task log:
`docs/ai-map/TASK_LOGS/2026-06-01-1604-pos-offline-backup-sprint-12.md`

## 2026-06-01 15:55 - POS offline backup Sprint 11 stable device ID and safe removeItem

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Codex

Summary:
Fixed the Sprint 10 pre-enable blockers while keeping real queue writes and auto sync disabled by default. `offlineOrderFallback.js` now creates a stable localStorage-backed `deviceId` when no explicit device ID is injected, falls back to an in-memory device ID if storage is unavailable, and maps `Orders.removeItem` to an explicit `remove_item` payload with `removeMode: line_item` instead of a sentinel quantity decrement. The backup validator and Firestore adapter memory path now understand `remove_item`, and payload review warnings continue to catch regressions without warning on the fixed sample report.

Files changed:

- `offlineBackup.js`
- `offlineOrderFallback.js`
- `offlineOrderFallbackDevTools.js`
- `offlineFirestoreAdapter.js`
- `scripts/verify-offline-order-fallback.js`
- `scripts/verify-offline-order-fallback-devtools.js`
- `scripts/verify-offline-firestore-adapter.js`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1555-pos-offline-backup-sprint-11.md`

Verification:

- Ran required syntax checks for fallback/devtools modules and verifier scripts.
- Ran required fallback/devtools verification scripts.
- Ran the Firestore adapter verifier to cover `remove_item` adapter routing.

Next:
Re-run mobile payload review on the deployed POS after a hosting deploy is explicitly requested. Only after the fixed report is accepted should guarded real queue writes be added; auto sync should remain disabled until queue data is validated.

Task log:
`docs/ai-map/TASK_LOGS/2026-06-01-1555-pos-offline-backup-sprint-11.md`

## 2026-06-01 13:28 - POS offline backup Sprint 10 payload report review fixes

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Reviewed the iPhone payload report submitted from `?xkPayloadReview=1`. Found expected pre-enable risks: `device_unknown`, blank table IDs on non-open sample actions, empty `close_order.items`, and a sentinel `removeItem` delta. Updated the side-effect-free payload review helper to fill dry-run table IDs, include close sample items/table metadata, surface validation warnings directly in the mobile report, and let `close_order` payloads derive items from `payInfo.items`.

Files changed:

- `offlineOrderFallback.js`
- `offlineOrderFallbackDevTools.js`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1328-pos-offline-backup-sprint-10.md`

Verification:

- Ran targeted syntax checks for offline modules/scripts.
- Ran targeted offline verification scripts.
- Confirmed generated report now has dry-run table IDs for all sample actions and `close_order.items.length === 1`.

Next:
Before enabling real queue writes, resolve `device_unknown` and replace/confirm the `removeItem` sentinel behavior so sync removes the intended line item instead of applying a large decrement.

Task log:
`docs/ai-map/TASK_LOGS/2026-06-01-1328-pos-offline-backup-sprint-10.md`

## 2026-06-01 13:17 - POS offline backup Sprint 9B iPhone payload review UI

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Added an iPhone-friendly payload review path because mobile Safari cannot open a developer console. `offlineOrderFallbackDevTools.js` can now expose a floating `Payload Review` button when the POS URL includes `?xkPayloadReview=1` or when localStorage flag `xekho:payload-review-ui` is set to `1`. The panel displays the formatted dry-run payload report and supports copy/select-all. This remains side-effect-free: no DB wrapping, no offline queue writes, no Firestore writes, and no sync enablement.

Files changed:

- `offlineOrderFallbackDevTools.js`
- `scripts/verify-offline-order-fallback-devtools.js`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1317-pos-offline-backup-sprint-9b-iphone-payload-review-ui.md`

Verification:

- `node --check offlineOrderFallbackDevTools.js`
- `node --check scripts/verify-offline-order-fallback-devtools.js`
- `node scripts/verify-offline-order-fallback-devtools.js`
- Deployed hosting-only with `npx --yes firebase-tools@latest deploy --only hosting --project pos-v2-909ff`
- Live smoke: `https://xe-kho.web.app/?xkPayloadReview=1` returned HTTP 200 and deployed `offlineOrderFallbackDevTools.js` contains the payload review UI marker.

Next:
Ask the iPhone user to open the deployed POS URL with `?xkPayloadReview=1`, tap `Payload Review`, then copy/share the report text for review before enabling real offline queue writes.

Task log:
`docs/ai-map/TASK_LOGS/2026-06-01-1317-pos-offline-backup-sprint-9b-iphone-payload-review-ui.md`

## 2026-06-01 13:04 - POS offline backup Sprint 9 payload review helper

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
User confirmed the deployed POS opens, the offline badge appears, and there is no boot error. Added a side-effect-free payload review helper to `offlineOrderFallbackDevTools.js`: `buildPayloadReviewReport()` and `printPayloadReviewReport()` generate sample open/add/change/remove/update/close/cancel offline payloads for review without wrapping `DB.Orders`, enqueuing actions, writing Firestore, or enabling sync. Verification now asserts the report's safety flags and payload types.

Files changed:

- `offlineOrderFallbackDevTools.js`
- `scripts/verify-offline-order-fallback-devtools.js`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1304-pos-offline-backup-sprint-9.md`

Verification:

- Ran syntax checks for the devtools module and verification script.
- Ran Sprint 7 devtools verification covering Sprint 9 payload review report.

Next:
Open browser console on the deployed POS and run `window.XekhoOfflineOrderFallbackDevTools.printPayloadReviewReport()` to review payload shapes. Only after acceptance should a guarded real queue-write flag be added, still with auto sync disabled first.

Task log:
`docs/ai-map/TASK_LOGS/2026-06-01-1304-pos-offline-backup-sprint-9.md`

## 2026-06-01 12:38 - POS offline backup Sprint 8 smoke QA + hosting deploy

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Ran Sprint 8 smoke QA for the POS offline backup stack and deployed Firebase Hosting only. Local static smoke confirmed the POS HTML and offline backup assets are served. Targeted Sprint 1-7 verification passed. Firebase Hosting deploy completed for project `pos-v2-909ff`, site `xe-kho`, with live URL `https://xe-kho.web.app`; post-deploy HTTPS smoke confirmed the deployed POS and offline assets return HTTP 200.

Files changed:

- `.firebase/hosting..cache`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1238-pos-offline-backup-sprint-8-smoke-deploy.md`

Verification:

- Ran local static smoke on `http://127.0.0.1:4173/` and offline JS assets.
- Ran syntax checks and Sprint 1-7 targeted verification scripts.
- `node node_modules/jest/bin/jest.js --runInBand` remains blocked by repo/tooling dependency state: `napi-postinstall: Permission denied` and missing `jest-circus/build/runner.js`.
- Deployed with `npx --yes firebase-tools@latest deploy --only hosting --project pos-v2-909ff`.
- Ran live HTTPS smoke on `https://xe-kho.web.app/` and offline JS assets.

Next:
Real iPad/operator visual QA should still open the deployed POS, confirm login/table boot, and optionally run `window.XekhoOfflineOrderFallbackDevTools.enableDryRun()` in a test browser session before any real offline queue writes are enabled.

Task log:
`docs/ai-map/TASK_LOGS/2026-06-01-1238-pos-offline-backup-sprint-8-smoke-deploy.md`

## 2026-06-01 12:27 - POS offline backup Sprint 7 browser dry-run dev tools

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Added `offlineOrderFallbackDevTools.js`, explicit browser/manual dry-run helpers for the POS offline order fallback. The script exposes `window.XekhoOfflineOrderFallbackDevTools` with `enableDryRun()`, `disable()`, `simulateFailure()`, `simulateAllFailures()`, and dry-run action inspection. Loading the file is safe by default: it does not wrap live `DB.Orders`, enqueue queue actions, sync, or write Firestore until a developer manually calls the dry-run helper; dry-run still captures only offline/server-like failures and rethrows errors.

Files changed:

- `index.html`
- `offlineOrderFallbackDevTools.js`
- `scripts/verify-offline-order-fallback-devtools.js`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1227-pos-offline-backup-sprint-7.md`

Verification:

- Ran syntax checks for offline backup/runtime/status/fallback/devtools files and verify scripts.
- Ran Sprint 1-7 verification scripts.

Next:
Sprint 8 should do actual browser/iPad manual QA: boot POS, call `window.XekhoOfflineOrderFallbackDevTools.enableDryRun()` only in a test session, simulate network failures, inspect `getDryRunActions()`, then disable. Do not enable real queue writes until these dry-run payloads are reviewed.

Task log:
`docs/ai-map/TASK_LOGS/2026-06-01-1227-pos-offline-backup-sprint-7.md`

## 2026-06-01 12:17 - POS offline backup Sprint 6 disabled/dry-run order fallback wrapper

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Added `offlineOrderFallback.js`, a safe POS order fallback wrapper/payload builder. The module builds offline queue actions for order open/add/change/remove/update-meta/update-item/close/cancel, but auto-installs in disabled mode so it does not wrap live `window.DB.Orders`, write Firestore, or enqueue production actions by default. Added Node verification for payload shape, disabled mode, dry-run capture, and explicit enabled memory-queue save.

Files changed:

- `index.html`
- `offlineOrderFallback.js`
- `scripts/verify-offline-order-fallback.js`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1217-pos-offline-backup-sprint-6.md`

Verification:

- Ran syntax checks for offline backup/runtime/status/fallback files and verify scripts.
- Ran Sprint 1-6 verification scripts.

Next:
Sprint 7 should do browser/manual dry-run integration around live `window.DB.Orders` behind an explicit dev-only install path, still without enabling queue writes or auto sync by default.

Task log:
`docs/ai-map/TASK_LOGS/2026-06-01-1217-pos-offline-backup-sprint-6.md`

## 2026-06-01 12:08 - POS offline backup Sprint 5 visible status UI

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Added a read-only POS offline backup status badge/panel. `offlineStatusUI.js` injects a header badge and popup panel that reads `window.XekhoOfflineBackupRuntime.getSummary()`, showing online/offline state plus pending/failed/synced/total counts. This remains non-invasive: sync is still disabled by default, no Firestore writes, and no live order methods are wrapped.

Files changed:

- `index.html`
- `offlineStatusUI.js`
- `scripts/verify-offline-status-ui.js`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1208-pos-offline-backup-sprint-5.md`

Verification:

- Ran syntax checks for offline backup/runtime/status files and verify scripts.
- Ran Sprint 1-5 verification scripts.

Next:
Sprint 6 should create the live POS order fallback wrapper in disabled/dry-run mode first, then enable fallback only after validating action payloads for open/add/change/close/cancel.

Task log:
`docs/ai-map/TASK_LOGS/2026-06-01-1208-pos-offline-backup-sprint-5.md`

## 2026-06-01 12:03 - POS offline backup Sprint 4 non-invasive browser runtime

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Added non-invasive browser runtime for the POS offline backup foundation. `index.html` now loads the offline backup foundation scripts, and `offlineRuntime.js` auto-installs `window.XekhoOfflineBackupRuntime` with sync disabled by default. This exposes queue status APIs without wrapping live order methods or writing Firestore.

Files changed:

- `index.html`
- `offlineRuntime.js`
- `scripts/verify-offline-runtime.js`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1203-pos-offline-backup-sprint-4.md`

Verification:

- Ran syntax checks for `offlineBackup.js`, `offlineSync.js`, `offlineFirestoreAdapter.js`, `offlineRuntime.js`, and verify scripts.
- Ran Sprint 1-4 verification scripts.

Next:
Sprint 5 should add a small visible POS offline status badge/panel using `window.XekhoOfflineBackupRuntime.getSummary()`, still without wrapping live order methods.

Task log:
`docs/ai-map/TASK_LOGS/2026-06-01-1203-pos-offline-backup-sprint-4.md`

## 2026-06-01 11:40 - POS offline backup Sprint 3 Firestore adapter foundation

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Added the Firestore/POS adapter foundation for offline sync. The adapter bridges `offlineSync.js` actions to injected Firestore/POS operations, maps `close_order` actions to completed-history payloads, checks existing `history`/`orders`/`online_orders` by `clientOrderId`, and remains safe because verification uses memory operations only. No live Firestore writes or POS flow integration were added.

Files changed:

- `offlineFirestoreAdapter.js`
- `scripts/verify-offline-firestore-adapter.js`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1140-pos-offline-backup-sprint-3.md`

Verification:

- Ran `node --check offlineBackup.js`.
- Ran `node --check offlineSync.js`.
- Ran `node --check offlineFirestoreAdapter.js`.
- Ran `node --check scripts/verify-offline-backup.js`.
- Ran `node --check scripts/verify-offline-sync.js`.
- Ran `node --check scripts/verify-offline-firestore-adapter.js`.
- Ran `node scripts/verify-offline-backup.js`.
- Ran `node scripts/verify-offline-sync.js`.
- Ran `node scripts/verify-offline-firestore-adapter.js`.

Next:
Sprint 4 should integrate the offline foundation into the browser safely: add script tags and initialize queue/sync in non-invasive mode, then add UI status before wrapping live order actions.

Task log:
`docs/ai-map/TASK_LOGS/2026-06-01-1140-pos-offline-backup-sprint-3.md`

## 2026-06-01 11:35 - POS offline backup Sprint 2 sync engine foundation

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Added the adapter-based offline sync engine foundation for POS offline backup. The sync engine processes pending/failed queue actions via an injected adapter, supports idempotency checks by `clientOrderId`, retry/backoff rules, offline skipping, and a single-flight lock. This sprint still does not write to Firestore or alter the live POS flow.

Files changed:

- `offlineSync.js`
- `scripts/verify-offline-sync.js`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1135-pos-offline-backup-sprint-2.md`

Verification:

- Ran `node --check offlineBackup.js`.
- Ran `node --check offlineSync.js`.
- Ran `node --check scripts/verify-offline-backup.js`.
- Ran `node --check scripts/verify-offline-sync.js`.
- Ran `node scripts/verify-offline-backup.js`.
- Ran `node scripts/verify-offline-sync.js`.

Next:
Build Sprint 3 Firestore sync adapter around `offlineSync.js`, then integrate with live POS order flow after adapter verification.

Task log:
`docs/ai-map/TASK_LOGS/2026-06-01-1135-pos-offline-backup-sprint-2.md`

## 2026-06-01 11:30 - POS offline backup Sprint 1 foundation

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Added the safe foundation for POS offline backup: an IndexedDB-backed pending order action queue with in-memory storage for verification. This sprint does not change the live POS order flow and does not sync to Firestore yet.

Files changed:

- `offlineBackup.js`
- `scripts/verify-offline-backup.js`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1130-pos-offline-backup-sprint-1.md`

Verification:

- Ran `node --check offlineBackup.js`.
- Ran `node --check scripts/verify-offline-backup.js`.
- Ran `node scripts/verify-offline-backup.js`.
- Ran `git status --short`.

Next:
Build Sprint 2 sync engine around this queue, then integrate with POS order flow only after queue/sync verification.

Task log:
`docs/ai-map/TASK_LOGS/2026-06-01-1130-pos-offline-backup-sprint-1.md`

## 2026-05-31 09:35 - Initialize AI code map

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

Summary:
Created the initial AI-readable map under `docs/ai-map/` for faster future handoff between Hermes/Codex/Gemini/DeepSeek/MiMo. No source code was changed.

Files changed:

- `docs/ai-map/PROJECT_OVERVIEW.md`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/DECISIONS.md`
- `docs/ai-map/TASK_LOGS/2026-05-31-0935-initialize-ai-code-map.md`

Verification:

- Ran `git branch --show-current`.
- Ran `git status --short` before and after.
- Ran `git diff --stat` before creation.
- Read repo structure to depth 2.
- Read root `package.json`, `functions/package.json`, and `README.md`.

Next:
Review existing dirty working tree before any code edits. Several pre-existing source/config/sensitive paths were already modified or untracked before this AI map was created.

Task log:
`docs/ai-map/TASK_LOGS/2026-05-31-0935-initialize-ai-code-map.md`

## Phase 6 — 2026-06-02 — parser, categorize, report helpers
- Sprint 6.1: `app/utils/parser.js` — 5 pure functions (parsePurchaseText, parsePurchaseJson, getKitchenRoutingLabel, tokenSimilarity, getMenuItemImageUrl)
- Sprint 6.2: `app/utils/categorize.js` — 5 pure functions (normalizeExpenseCategoryLabel, detectAdsExpensePlatform, isAdsExpenseEntry, mediaRefineryStatusClass, countInclusiveReportDays)
- Sprint 6.3: `app/report/helpers.js` — 6 pure functions (getReportMenuIngredientKeys, doesOrderMatchReportMenuItem, doesPurchaseMatchReportMenuItem, doesExpenseMatchReportMenuItem, getIngredientMergeSuggestions, getDailyRevenueSnapshotsInRange)
- All use lazy dependency resolution for cross-module deps
- Commit: 73081b8

## Phase 7 — 2026-06-02 — ads report, fixed cost, dish cost normalization
- Sprint 7.1: `app/report/ads.js` — `buildAdsRevenueReportHtml` (96-line pure HTML builder, string concatenation)
- Sprint 7.2: `app/utils/fixedcost.js` — `getFixedCostProfileForReports` + `_getPayrollProfile` (reads global.appState)
- Sprint 7.3: extend `app/order/helpers.js` — `_resolveDishCostPerUnit` + `normalizeMenuItemModel` (23 total exports)
- Commit: 6c8df9f

## 2026-06-02 04:15 - Phase 8 complete (Sprints 8.1-8.3): Excel report, expense breakdown, Drive upload extraction

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

- Sprint 8.1: Extracted `uploadFileToGoogleDriveByEndpoint` (94 lines) into existing `app/utils/storage.js`. Pure HTTP upload utility, all dependencies already in the module. 6 exports total.
- Sprint 8.2: Extracted `exportReportExcel` (573 lines — LARGEST function in app.js) into new `app/report/excel.js` IIFE module. Contains 5 sheet builders (revenue, orders, expense, purchase, inventory) + workbook assembly + download/upload logic. 10 lazy resolvers for dependencies.
- Sprint 8.3: Extracted `buildOperationalExpenseBreakdown` (86 lines) into new `app/report/expense.js` IIFE module. Mixed-purity report builder with 12 lazy resolvers.
- Phase 8 total: 3 functions extracted (683 lines), 2 new modules (`app/report/excel.js`, `app/report/expense.js`), 1 extended module (`app/utils/storage.js`).
- All 29 verification scripts pass, Jest 6/6, ESLint 0 errors.
- Progress update: ~35% total / ~40% core / ~80% near-term safe-execution.

## 2026-06-02 04:30 - Phase 9 Sprint 9.1: ESLint duplicate declaration cleanup

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

- Removed 3 duplicate function declarations in app.js: showKitchenToast, renderCategoryChart, openAddMenuModal
- Kept newer versions of each (null-safe, Map-based lookup, ASCII text)
- app.js reduced from 11,999 to 11,895 lines (-104 lines)
- ESLint: 1 parsing error → 0 errors
- All 29 verification scripts pass, Jest 6/6

## 2026-06-02 05:00 - CI/CD + Vite spike

Repo: `/home/longnick/projects/xekho`

- CI/CD: GitHub Actions workflow (Node 20/22 matrix, Jest, ESLint). Added .nvmrc, npm scripts (lint, check).
- Vite spike: `spike/vite-build-tooling` branch with vite.config.mjs, npm scripts (dev, build, preview). Config validated. Not merged — spike only.


## 2026-06-26 11:35 - Mobile order action bar redesign

Repo: `/home/longnick/projects/xekho`
Branch: `task/kilo-fix-20260623-050807`

- Replaced the mobile order screen's small centered floating cart/bill pill with a full-width action bar positioned above the bottom navigation.
- Added explicit cart and bill buttons with approved iPhone 13 sizing: action bar `366 x 48 px`, buttons `161/189 x 40 px`, `8 px` gap to the `70 px` bottom nav.
- Added `72 px` bottom reserve to the mobile menu pane/grid so dish cards do not sit underneath the action bar.
- Added `scripts/verify-order-actionbar-ui.js` and verified with Puppeteer iPhone measurement plus repo checks.
- Task log: `docs/ai-map/TASK_LOGS/2026-06-26-1135-order-actionbar-mobile.md`

## 2026-07-08 19:22 +07 — Attendance geofence copy, Bàn checkout panel, Telegram attendance report bot

- Changed web attendance geofence failure copy to the required exact message: “bạn đang ở quá xa vị trí chấm công cho phép”.
- Added a Bàn-tab checkout card (`#tables-checkout-panel`) rendered by `renderTablesCheckoutPanel()` for staff with an open shift today.
- Added `tablesCheckoutAction()` success toast: “bạn đã checkout thành công, tổng giờ làm ca này là …” using the actual checkout duration returned by `_webAttendanceCheckOutForActor()`.
- Added `TELEGRAM_ATTENDANCE_BOT_TOKEN` config param and `telegramAttendanceWebhook` for owner-only `/chamcong` attendance reports; no raw bot token is hardcoded.
- Added `scripts/verify-telegram-attendance-report.js` and Phase I checks in `scripts/verify-attendance-webapp.js`.
- Verified: node syntax checks, attendance verifier (219 assertions), Telegram attendance verifier (16 assertions), `npm run check`, `npm run build:hosting`, `npm test -- --runInBand`, `git diff --check`.

## 2026-07-08 19:59 +07 — Production deploy: Telegram attendance bot

Repo: `/home/longnick/projects/xekho`
Branch: `task/kilo-fix-20260623-050807`
Agent: Hermes
Summary:
- Deployed `xekho:telegramAttendanceWebhook(asia-southeast1)` to production and registered the Telegram webhook URL.
- First deploy failed at 256MiB startup; patched function memory to `HEAVY_FUNCTION_MEMORY` (512MiB).
- Public HTTP smoke initially returned 403; patched `invoker: 'public'` because Telegram webhooks must be unauthenticated at Cloud Run while app logic remains owner-only.
- Live smoke passed: GET 405, OPTIONS 204, POST missing chat safe-skip 200, Telegram `getMe` OK, `setWebhook` OK, `getWebhookInfo` URL matches/no error, owner `/chatid` and `/chamcong` simulated POSTs returned OK and sent messages.
Files changed:
- `functions/index.js`
- `docs/ai-map/TASK_LOGS/2026-07-08-1959-attendance-telegram-production-deploy.md`
- `docs/ai-map/CHANGELOG_AI.md`, `docs/ai-map/TODO_AI.md`, `docs/ai-map/FILE_RELATIONS.md`
Verification:
- `node --check functions/index.js`
- `node scripts/verify-telegram-attendance-report.js`
- `git diff --check`
- Firebase deploy + live webhook smoke.
Next:
- Owner should send `/chamcong` directly to the bot to confirm real inbound Telegram delivery from Telegram servers.
Task log: `docs/ai-map/TASK_LOGS/2026-07-08-1959-attendance-telegram-production-deploy.md`

## 2026-07-08 20:11 +07 — Fix Telegram attendance Firestore index error

Repo: `/home/longnick/projects/xekho`
Branch: `task/kilo-fix-20260623-050807`
Agent: Hermes
Summary:
- Fixed production `/chamcong` error `FAILED_PRECONDITION: The query requires an index` by removing `.orderBy('staffName')` from the `attendance_daily` Firestore query.
- `_buildAttendanceSummaryText(dateKey)` now queries by `dateKey` only, limits to 100 rows, sorts by `staffName || staffId` in memory, and sends the first 30 rows.
- Added verifier assertions to prevent reintroducing the composite-index requirement.
- Redeployed `xekho:telegramAttendanceWebhook` and smoke-tested production owner `/chamcong` POST successfully.
Files changed:
- `functions/index.js`
- `scripts/verify-telegram-attendance-report.js`
- `docs/ai-map/TASK_LOGS/2026-07-08-2011-attendance-telegram-indexless-query.md`
Verification:
- `node --check functions/index.js`
- `node scripts/verify-telegram-attendance-report.js` (18 assertions)
- indexless mock E2E script
- Firebase Functions deploy + production smoke.
Next:
- Owner should retry `/chamcong` directly in Telegram.
Task log: `docs/ai-map/TASK_LOGS/2026-07-08-2011-attendance-telegram-indexless-query.md`

## 2026-07-09 00:22 +07 — Telegram attendance real-time notifications

Repo: `/home/longnick/projects/xekho`
Branch: `task/kilo-fix-20260623-050807`
Agent: Hermes
Summary:
- Added production Firestore triggers so the attendance Telegram bot sends a detailed message when staff checks in and another message when checkout closes the daily row.
- Check-in notification includes staff, date, check-in time, source, distance, and shift ID.
- Checkout notification includes staff, date, checkout time, total worked time, payable hours, estimated wage, checkout distance, and shift ID.
- Deployed `telegramAttendanceOnShiftCreated` and `telegramAttendanceOnDailyClosed` to `pos-v2-909ff`.
Files changed:
- `functions/index.js`
- `scripts/verify-telegram-attendance-report.js`
- `docs/ai-map/TASK_LOGS/2026-07-09-0022-attendance-telegram-realtime-notifications.md`
Verification:
- `node --check functions/index.js`
- `node scripts/verify-telegram-attendance-report.js` (28 assertions)
- `/tmp/xekho-attendance-notification-e2e.js` mock trigger E2E
- `node scripts/verify-attendance-webapp.js`
- `npm run check`
- `npm test -- --runInBand`
- `git diff --check`
- Firebase deploy and log health check.
Next:
- Ask staff/owner to perform one real check-in and checkout to verify production Eventarc delivery.
Task log: `docs/ai-map/TASK_LOGS/2026-07-09-0022-attendance-telegram-realtime-notifications.md`
- Follow-up: added owner-only `/testchamcong` no-write Telegram sample command, deployed `telegramAttendanceWebhook`, and sent one live test (`attendance-test`).

## 2026-07-09 09:14 +07 — Live production smoke confirmed real-time Telegram attendance delivery

- With user approval, created temporary production attendance test docs and verified both Firestore triggers sent Telegram messages to owner chat (`kind=checkin`, `kind=checkout`, `chatCount=1`).
- Deleted all temporary test attendance docs after verification.
- No production expense/customer/order data was touched.
Task log: `docs/ai-map/TASK_LOGS/2026-07-09-0022-attendance-telegram-realtime-notifications.md`

## 2026-07-09 09:39 +07 — Scriptable finance widget Variant A

Repo: `/home/longnick/projects/xekho`
Branch: `task/kilo-fix-20260623-050807`
Agent: Hermes
Summary:
- Implemented approved Variant A Owner glance as an iOS Scriptable finance widget for small/medium/large widget families.
- Added read-only, token-guarded Cloud Function `scriptableFinanceWidgetData` returning compact JSON for revenue, COGS, operating expense, fixed cost, profit, margin, cash/bank, 7-day trend, and expense breakdown.
- Deployed the new backend endpoint to `pos-v2-909ff`; unauthorized smoke returns 401 and authorized smoke returns ok/read-only payload.
Files changed:
- `functions/index.js`
- `functions/scriptableFinanceWidget.js`
- `scripts/scriptable/xekho-finance-widget.js`
- `scripts/scriptable/README.md`
- `scripts/verify-scriptable-finance-widget.js`
- `docs/ai-map/TASK_LOGS/2026-07-09-0939-scriptable-finance-widget-variant-a.md`
Verification:
- `node --check` for changed JS files.
- `node scripts/verify-scriptable-finance-widget.js` (15 assertions).
- `npm run check`.
- `npm test -- --runInBand`.
- `npm run build:hosting`.
- `git diff --check`.
- Production unauthorized/authorized endpoint smoke.
Next:
- Install the Scriptable script on iPhone and configure widget parameter with the endpoint and token from the local non-repo secret file.
Task log: `docs/ai-map/TASK_LOGS/2026-07-09-0939-scriptable-finance-widget-variant-a.md`

## 2026-07-09 10:14 +07 — Scriptable finance large widget UI fix

Repo: `/home/longnick/projects/xekho`
Branch: `task/kilo-fix-20260623-050807`
Agent: Hermes + Kiro
Summary:
- Analyzed user screenshot: large Scriptable finance widget was visually broken by a left-heavy layout, tiny KPI tiles, disconnected red/dark bars, and detached breakdown values.
- Used Kiro as bounded coding worker, then Hermes reviewed/patched/verified.
- Reworked `scripts/scriptable/xekho-finance-widget.js#buildLarge()` into a balanced two-column layout with profit + DrawContext sparkline on the left and contained KPI/breakdown cards on the right.
- Added Scriptable runtime stub smoke coverage and old-layout regression assertions to `scripts/verify-scriptable-finance-widget.js`.
Verification:
- `node --check scripts/scriptable/xekho-finance-widget.js`
- `node --check scripts/verify-scriptable-finance-widget.js`
- `node scripts/verify-scriptable-finance-widget.js` (27 assertions)
- `npm run check`
- `git diff --check`
Task log: `docs/ai-map/TASK_LOGS/2026-07-09-1014-scriptable-finance-widget-large-ui-fix.md`

## 2026-07-09 10:25 +07 — Prefill Scriptable finance widget token

Repo: `/home/longnick/projects/xekho`
Branch: `task/kilo-fix-20260623-050807`
Summary:
- Owner explicitly approved embedding the private Scriptable finance widget token for single-user use.
- Filled `CONFIG.token` in `scripts/scriptable/xekho-finance-widget.js` from the local secret file so iPhone Scriptable can fetch live data without widget-parameter setup.
- Updated README and verifier to reflect the approved private-token mode while keeping Firebase credential guards.
Verification:
- `node --check scripts/scriptable/xekho-finance-widget.js`
- `node --check scripts/verify-scriptable-finance-widget.js`
- `node scripts/verify-scriptable-finance-widget.js` (28 assertions)
- Live endpoint smoke with Authorization header returned `ok: true`, `source: firestore-readonly`, `series_len: 7`, `breakdown_len: 4`.
- `git diff --check`
- Token occurrence scan: one repo occurrence, only `scripts/scriptable/xekho-finance-widget.js`.
Task log: `docs/ai-map/TASK_LOGS/2026-07-09-1025-scriptable-finance-widget-prefill-token.md`

## 2026-07-10 11:18 +07 — Security remediation Sprint 1

Repo: `/home/longnick/projects/xekho`
Branch: `task/kilo-fix-20260623-050807`
Agent: Hermes

Summary:
- Removed the browser path for provisioning/deleting/changing privilege-bearing user documents; introduced custom-claim-gated, rollback-safe `manageUserAccount` server provisioning with optional server-owned `staffId` mapping.
- Hardened Firestore authorization for config, finance input, catalog/inventory/BOM, staff directory, attendance, and immutable browser history.
- Added TDD regression suites covering privilege escalation, broad POS writes, staff attendance/payroll cross-access, and closed-shift rewrite.
- Updated `db.js` listeners to select manager/admin directories versus self-only mapped documents for non-manager accounts.

Verification:
- Firestore Emulator: 4 suites / 15 tests PASS.
- Function management tests: 2 suites / 8 tests PASS.
- Default Jest: 6 suites / 32 tests PASS.
- `npm run check`, function/db syntax checks, `npm run build:hosting`, and `git diff --check`: PASS.
- No deploy, staging, commit, secret/IAM action, or production data interaction occurred.

Security release note:
- Legacy `functions/createAdminUser.js` remains a Sprint-2 P0 endpoint. Do not treat these source changes as deployment-ready authorization containment until endpoint hardening and release prerequisites are completed.

Task log: `docs/ai-map/TASK_LOGS/2026-07-10-1118-security-remediation-sprint-1.md`
# 2026-07-11 - Release readiness master plan
- Added `RELEASE_READINESS_MASTER_PLAN.md` defining the complete source-to-production path for Web POS, Functions, Rules and Capacitor.
- Prioritized Telegram webhook authenticity/callback authorization and privileged callable role guards as P0 containment before other release work.
- Defined clean-worktree release units, dual-lockfile dependency gates, synthetic authenticated E2E, real-device QA, staged deployment order and rollback criteria.
- Kept `android-native/` explicitly paused/non-release; no source behavior or production state changed.
