# Task: Attendance + latency release unit

Date: 2026-07-21
Repo: `/home/longnick/projects/xekho-release-canonical`
Branch: `task/release-canonical-20260721`
Agent: Hermes
User request: Hoàn tất attendance + latency release unit; không commit/deploy.

## Before state

- Existing dirty files: `db.js`, `index.html`; untracked attendance/latency verifiers.
- Read-only references: `/home/longnick/projects/xekho` and attendance status snapshot 2026-07-14.
- Existing `db.js` partial: profile-ready auth fast path and atomic attendance DB helpers.

## Goal

Khôi phục unit web attendance đầy đủ, giữ login/PIN nhanh, gom daily + shift check-in thành một batch commit, không đổi Functions.

## Runtime gap fix — re-review

- `firestore.rules`: mapped `users/{uid}.staffId` staff may create own `attendance_daily`, close own open row, then reopen own closed row only for same-day web recheck-in. Reopen preserves identity/date/first check-in, resets checkout fields to `null`, and permits only source/location/updated fields. Payroll/rate/minutes/wage/expense/adjustment fields remain admin-only. Shift create requires exact `${dailyId}_${checkInAtMs}` ID and same-batch daily row open state. Delete stays admin-only. Other collections unchanged.
- `app.js`: second same-day check-in reuses deterministic daily document after checkout and creates a fresh `${dailyId}_${checkInAtMs}` shift. Checkout resolves latest own open `attendance_shifts` across date boundary, then matching open daily row. PIN panel and logged-in status-bar both expose prior-day open shift. Daily accounting remains admin-only for staff; staff checkout writes only operational fields.
- `app.js`: PIN checkout now uses `dataset.pending`, disabled state, `⏳ Đang ra ca...`, and `finally` restore. Status-bar already disables during action and restores through `updateShiftBtnUI()`.
- `tests/firestore-rules/attendance.rules.test.js`: emulator coverage adds own operational daily create/checkout, payroll/expense/admin-field denials, atomic daily+shift batch.
- `scripts/verify-auth-attendance-latency.js` and `scripts/verify-attendance-webapp.js`: regression assertions for overnight resolver, duplicate PIN checkout guard, and narrow Rules path.

## Files changed

- `app.js`: PIN check-in/out, geofence 15m center `11.537108,107.823279`, payroll/overnight/mobile/status-bar checkout restored from approved snapshot; same-day second check-in calls `DB.Attendance.setDailyAndShift` with `${dailyId}_${checkInAtMs}`; failed expense upsert never adds an unpersisted `expenseId` locally and returns `expenseReconcileNeeded`.
- `db.js`: preserved partial fast-path dispatch before non-blocking presence; `setDaily`, `createShift`, `setDailyAndShift` helpers add Firestore `serverTimestamp()` values for Rules timestamp fields.
- `index.html`: attendance controls, PIN card, `db.js`/`app.js` cache keys `20260721-attendance-latency`.
- `style.css`: attendance payroll/mobile action styles.
- `firestore.rules`: narrow mapped-staff create/close/second-web-check-in Rules; exact shift ID anchor; payroll/admin fields stay admin-only.
- `tests/firestore-rules/attendance.rules.test.js`: emulator Rules coverage for atomic first and second same-day daily+shift batches, malicious reopen denials, arbitrary same-owned shift ID denial, timestamp/source contract, and payroll/admin denials.
- `scripts/verify-attendance-webapp.js`: source verifier validates recheck-in reset contract, exact shift ID anchor, and truthful failed-expense local/return state.
- `scripts/verify-auth-attendance-latency.js`: regression verifier for atomic write, overnight resolver, and PIN checkout pending guard.
- This task log.

## Code relations

- `index.html` PIN controls call `app.js` attendance entrypoints.
- `app.js` check-in calls `DB.Attendance.setDailyAndShift()` in `db.js`; Rules validate client payloads plus `serverTimestamp()` transforms.
- `db.js` writes `attendance_daily` and `attendance_shifts`; `firestore.rules` permits second-shift daily reopen only in matching atomic batch.
- Both verifiers inspect source only; Rules Emulator verifies allowed/denied writes without Firebase production access.

## Decisions made

- Preserved multi-shift business behavior: one deterministic daily document, fresh unique shift each check-in.
- Daily reopen remains narrow: only `closed → open` web check-in reset, no identity/date/first-check-in/payroll/admin mutation.
- Expense failure remains non-transactional by design; local/returned state stays unlinked and flags reconciliation.
- No live browser/auth/geolocation test; no production data mutation.

## Verification

Final gates:

- `npm run test:rules` — EXIT 0. Firestore Emulator: 4 suites, 37 tests passed; attendance suite: 27 tests passed.
- `node scripts/verify-attendance-webapp.js` — EXIT 0, 232 assertions passed.
- `node scripts/verify-auth-attendance-latency.js` — EXIT 0.
- `node --check app.js` — EXIT 0.
- `node --input-type=module --check < db.js` — EXIT 0.
- `npm run check` — EXIT 0.
- `npm run build:hosting` — EXIT 0. Dist: 91 files, 1.87 MB. Existing Vite classic-script warnings only.
- `git diff --check` — EXIT 0.
- Scope scan — only allowed attendance unit paths dirty/untracked after removing `firestore-debug.log`.

## Remaining issues

- Browser authenticated/geolocation smoke remains release gate before deploy.
- No commit or deploy requested or performed.

## Next step

Review diff, run device/browser smoke against non-production test environment, then request separate deploy approval if needed.

## Safety notes

No secrets, production database, migration, POS data, or raw media were touched. Firestore Rules changed only for mapped-staff attendance contracts and were tested against the local Emulator; no Rules deployment occurred. No Functions, package/lockfile, deploy, commit, push, reset, stash, or clean action was run.
