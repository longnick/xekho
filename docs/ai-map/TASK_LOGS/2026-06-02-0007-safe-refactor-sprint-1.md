# Task Log: Safe refactor Sprint 1 - security baseline and DOM utility extraction

**Date:** 2026-06-02 00:07
**Repo:** `/home/longnick/projects/xekho`
**Branch:** `test/xe-kho-repo-implementer-skill`
**Agent:** Hermes

## Request

User instructed the agent to execute `REFACTOR_PLAN.md` with full autonomy, requiring backups, incremental verification, no mojibake/encoding regressions, and no breakage of currently working flows.

## Safety approach

Because the repo had a large pre-existing dirty tree and production-sensitive paths, this sprint executed only the safest first increments:

1. Path-only security containment without reading secret contents.
2. Baseline syntax/test verification.
3. One small compatibility refactor: DOM HTML escaping utility extraction.
4. AI map updates.

No production DB, migration, POS/payment/customer data, or secret values were read or modified.

## Backup

Created an external backup folder for files touched in this session:

`/home/longnick/backups/xekho-refactor-20260602-000133`

Backed up available pre-edit copies of:

- `REFACTOR_PLAN.md`
- `.gitignore`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`

## Security/path-level containment

Expanded `.gitignore` with explicit patterns for:

- `.env`, `.env.*`, `functions/.env.*`
- service account / Firebase admin SDK JSON names
- credential/secret JSON names
- generated debug artifacts such as `firebase-debug.log`, `functions-list.json`, backup JSONs

Removed the following from Git tracking only with `git rm --cached --ignore-unmatch`, without reading contents:

- `functions/.env.gcloud-completed-order.yaml`
- `functions/.env.pos-v2-909ff`
- `pos-v2-909ff-firebase-adminsdk-fbsvc-abdca8f1c5.json`
- `project-724ee6ef-5290-41f4-892-a47703f4859e.json`

After untracking, the path-only sensitive query returned no tracked matches.

## Baseline/test infra

Initial `npm test -- --runInBand` failed because `jest` was not executable:

```text
sh: 1: jest: Permission denied
```

Fixed local dependency executable bits under `node_modules/.bin/*` and `napi-postinstall` bin files. After that, Jest ran successfully.

## Refactor implemented

### New file: `app/utils/dom.js`

Created an IIFE/global compatibility utility module:

- Namespace: `window.XekhoApp.utils.dom`
- Function: `escapeHtml(text)`
- Escapes `&`, `<`, `>`, double quotes, and apostrophes.
- Preserves the existing non-module browser script model.

### New file: `scripts/verify-dom-utils.js`

Added deterministic Node VM verification for `app/utils/dom.js`:

- Confirms `window.XekhoApp.utils.dom.escapeHtml` exists.
- Verifies nullish inputs become empty string.
- Verifies Vietnamese text `XE KHÔ` passes through unchanged.
- Verifies number input stringification.
- Verifies HTML special character escaping.

### Modified: `app.js`

Changed existing `_escapeHtml(text)` into a compatibility wrapper:

- Delegates to `window.XekhoApp.utils.dom.escapeHtml` when present.
- Keeps the old inline implementation as fallback.

### Modified: `index.html`

Loads `app/utils/dom.js?v=20260601-refactor-dom-utils` after `db.js` and before `app.js`, preserving app startup order.

### Modified: `scripts/verify-offline-runtime.js`

Updated stale assertion/message from Sprint 4 to current `offlineRuntime.js` marker `sprint-19-production`. This made the existing runtime verification align with the current production offline runtime state.

## Verification commands/results

Passed:

```bash
node scripts/verify-dom-utils.js
node --check app/utils/dom.js
node --check app.js
node --check scripts/verify-dom-utils.js
node --check scripts/verify-offline-runtime.js
node scripts/verify-offline-runtime.js
node scripts/verify-offline-status-ui.js
node scripts/verify-offline-backup.js
node scripts/verify-offline-sync.js
node scripts/verify-offline-firestore-adapter.js
node scripts/verify-offline-order-fallback.js
node scripts/verify-offline-order-fallback-devtools.js
npm test -- --runInBand
```

Jest result:

- Test Suites: 1 passed, 1 total.
- Tests: 6 passed, 6 total.

UTF-8/mojibake check passed for touched text files:

- `REFACTOR_PLAN.md`
- `.gitignore`
- `app/utils/dom.js`
- `app.js`
- `index.html`
- `scripts/verify-dom-utils.js`

No Unicode replacement-character mojibake marker was found in those files.

## Files changed by this sprint

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

## Remaining risk / not completed

- Full `REFACTOR_PLAN.md` is intentionally not completed in a single unbounded operation because the repo has a large pre-existing dirty tree and production-sensitive history.
- Credential rotation still requires owner/manual action.
- Git history cleanup is not attempted in this sprint.
- Pre-existing dirty source/config/doc files still need classification before larger refactors.

## Next step

Continue with another small sprint after reviewing the dirty tree. Recommended next sprint: create a dirty-tree classification report or extract pure format helpers with the same compatibility pattern.
