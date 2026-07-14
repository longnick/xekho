# Task: Đưa nút chấm công ra vào thanh trạng thái

Date: 2026-07-14 23:01 +07
Repo: /home/longnick/projects/xekho
Branch: task/kilo-fix-20260623-050807
AI/Agent: Hermes
User request: Khi nhân viên đã chấm công vào và đăng nhập app, đưa nút chấm công ra/checkout lên ngay thanh status.

## Before state

- Existing branch: `task/kilo-fix-20260623-050807`.
- Existing uncommitted files: broad pre-existing dirty worktree, including attendance, security, Functions, Rules, and docs changes.
- Relevant AI map files read: `TODO_AI.md`, `CHANGELOG_AI.md`, `FILE_RELATIONS.md`, and the prior attendance checkout task log.
- Relevant source files read: `app.js`, `index.html`, `scripts/verify-attendance-webapp.js`.

## Goal

When a logged-in staff member has a same-day open attendance shift, the dashboard status card must immediately show a distinct checkout button. The action must reuse the canonical attendance checkout write path and must not open the separate POS shift-management modal.

## Files changed

- `app.js`
  - Added `renderStatusBarAttendanceCheckout()` and `statusBarAttendanceCheckoutAction()`.
  - Reuses `_webAttendanceCheckOutForActor(actor, { suppressSuccessToast: true })` so shift/daily/expense writes remain canonical.
  - Refreshes the dashboard action after login/role application, attendance realtime updates, check-in, and checkout.
  - Resets the generic POS shift button state and re-enables it after a checkout refresh.
- `index.html` / `app.js`
  - Removed the duplicate `#tables-checkout-panel`, its legacy renderer/action, and all associated render calls; checkout is now exposed only from the dashboard status card.
- `index.html`
  - Bumped the classic `app.js` cache key to `20260714-attendance-status-checkout`.
- `scripts/verify-attendance-webapp.js`
  - Added Phase J RED→GREEN source checks for the status-bar checkout action, event propagation guard, canonical checkout path, action refresh, re-enable behavior, and cache-key bump.
- `docs/ai-map/*`
  - Recorded this task and source relationships.

## Code relations

- `applyRoleRights()` and the `db:update` attendance branch call `updateShiftBtnUI()`.
- `updateShiftBtnUI()` restores generic POS-shift UI then calls `renderStatusBarAttendanceCheckout()`.
- The renderer detects `attendance_daily.status === 'open'` for `currentUser` and assigns the existing status-card button a checkout action with `event.stopPropagation()`.
- `statusBarAttendanceCheckoutAction()` delegates to `_webAttendanceCheckOutForActor()`, which owns geofence checks, attendance writes, payroll expense updates, and result duration.

## Decisions made

- The existing dashboard status card/button is reused rather than adding a second button, so checkout is visible without making the Bàn page longer.
- Click propagation is stopped because the status card itself retains its legacy `manageShift()` click handler.
- No Firestore schema, Rules, production data, or deployment behavior was changed.

## Verification

- RED: `node scripts/verify-attendance-webapp.js` failed before implementation because all six new Phase J assertions were absent.
- RED edge case: verifier failed until `updateShiftBtnUI()` explicitly re-enabled the status button after a successful checkout.
- RED cache: verifier failed until the `app.js` cache key was bumped.
- GREEN: all Phase J assertions pass.
- `node --check app.js` — passed.
- `node --check scripts/verify-attendance-webapp.js` — passed.
- `npm run check` — passed.
- `npm run build:hosting` — passed; Hosting artifact prepared with 96 files.
- Full attendance verifier remains non-green only because of 3 pre-existing Firestore Rules source assertions in the already dirty tree; Phase J has no failures.

## Deployment and live verification

- Hosting-only deploy succeeded to Firebase Hosting site `xe-kho`: version `f9cb856cda04ffb7`.
- Hosting predeploy produced OTA version `20260714T164318Z` with 96 files.
- Live `https://xe-kho.web.app/` returned HTTP 200, contains the new `app.js` cache key, and has no duplicate Bàn checkout container.
- Live `app.js` contains `renderStatusBarAttendanceCheckout()` and no longer contains `renderTablesCheckoutPanel()`.
- `https://xe-kho.web.app/functions/index.js` returned 404, confirming Functions source is not being published as static Hosting content.
- Signed-out browser smoke had zero console/page errors.

## Remaining issues

- Real-device checkout requires the staff device to allow geolocation and be within the existing 15m shop geofence.
- The broad worktree was already dirty; this task did not isolate or commit unrelated changes.

## Next step

After owner approval for Hosting deployment, deploy Hosting-only and run one on-site staff flow: login PIN → check in → confirm status bar becomes `🏁 Chấm công ra` → checkout → confirm salary expense and attendance row.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched.
