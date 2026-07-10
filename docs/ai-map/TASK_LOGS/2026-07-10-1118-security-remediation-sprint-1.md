# Sprint 1 — Firestore authorization containment

- **Time (Asia/Ho_Chi_Minh):** 2026-07-10 11:18 +07
- **Branch:** `task/kilo-fix-20260623-050807`
- **Scope:** local source, synthetic Firestore Emulator data, and local hosting build only.
- **Not performed:** no production Rules/Functions/Hosting deploy; no production Firestore/POS read or write; no IAM, secret, token, or credential action; no stage/commit/reset/stash/clean.

## Dirty-tree discipline

The repository was already dirty before this sprint. Sprint-1-only additions/edits are limited to:

- `firestore.rules`
- `db.js`
- `functions/index.js`
- `functions/userManagementService.js`
- `functions/utils/userManagement.js`
- `functions/userManagementService.test.js`
- `functions/utils/userManagement.test.js`
- `tests/firestore-rules/{helpers.js,users.rules.test.js,pos-data.rules.test.js,attendance.rules.test.js}`
- this task log and the append-only Sprint-1 entries in `docs/ai-map/{TODO_AI,CHANGELOG_AI}.md`

Existing unrelated work remains unstaged and untouched.

## Delivered containment

### Role-bearing user documents

- Browser clients cannot create, delete, or change role-bearing `users/{uid}` documents.
- Only a narrow self-profile allowlist is writable by the matching authenticated UID.
- Removed email-based owner role inference and browser auto-provisioning from `db.js`.
- Added `manageUserAccount` callable. It requires an authenticated custom claim (`admin`/`owner`; `manager` may create only staff/kitchen), creates the Auth user, sets the role claim, writes server-owned fields/audit fields, and deletes the Auth account if the Firestore write fails.
- The callable may persist a validated `staffId` mapping supplied by an authorized manager/admin; the browser cannot mutate that mapping directly.

### Sensitive POS data

- `config` is manager/admin only.
- Menu/inventory/recipe/BOM/unit-conversion writes are manager/admin only while required reads remain available to signed-in POS users.
- Expense, purchase, supplier, and shift-log access is manager/admin only.
- `history` is manager/admin readable, append-only for browser clients, and cannot be updated/deleted from a browser session.

### Attendance and staff privacy

- Staff directory documents are self-only by server-owned UID→`staffId` mapping; manager/admin retain directory access.
- Attendance daily payroll is manager/admin only.
- A Firebase-auth staff user can read only mapped own attendance rows; can create an own open shift and close only an own active shift; cannot rewrite a closed shift or alter own/another person's wage fields.
- `db.js` now uses self-document/self-`staffId` listeners for non-manager accounts rather than subscribing to protected directories.

## Deliberate residual / release prerequisite

1. The legacy public `functions/createAdminUser.js` endpoint remains present and is a **Sprint 2 P0**. Do not deploy Sprint-1 artifacts as a security release until that endpoint is removed/hardened and HTTP authentication tests pass.
2. Existing web attendance identifies a person via PIN under a shared Firebase manager/admin session. Rules cannot bind that PIN actor to `request.auth.uid`. The manager lane remains operational; future individual Firebase staff sessions require a server-provisioned `users.staffId` mapping. A backend/PIN-attestation redesign is needed before claiming PIN actor identity is authenticated.
3. Before a future deploy, bootstrap a trusted owner custom claim through an owner-approved Admin SDK/console procedure, provision needed `users.staffId` records, deploy the scoped Function and Hosting replacement before Rules, and run a synthetic staging smoke. No such production action occurred here.

## TDD and verification evidence

- RED observed for user-role/document attacks, broad config/menu/inventory/finance writes, history rewrites, cross-staff attendance reads/writes, payroll alteration, closed-shift rewrite, and cross-staff directory reads.
- Firestore Emulator regression suite: **4 suites / 15 tests PASS**.
- Function role-management unit suite: **2 suites / 8 tests PASS**.
- Default repository Jest suite: **6 suites / 32 tests PASS**.
- `npm run check`: PASS.
- `node --check functions/index.js`, user-management modules, and module-mode `db.js` syntax: PASS.
- `npm run build:hosting`: PASS — 92 files / 1.87 MB. Existing Vite classic-script notices are non-fatal/pre-existing.
- `git diff --check`: PASS.

## Next

Proceed only to Sprint 2 endpoint authentication and request validation. Obtain an explicit owner release gate before any production deployment, IAM change, claim bootstrap, or live smoke.
