# POS Offline Backup Sprint 7 Browser Dry-run Dev Tools

Time: 2026-06-01 12:27

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

## Goal

Add an explicit browser/manual dry-run path for testing the POS offline order fallback around live `window.DB.Orders` without enabling queue writes, sync, or Firestore mutations by default.

## Scope

Implemented Sprint 7 only:

- Add `offlineOrderFallbackDevTools.js`.
- Load it from `index.html` after Sprint 6 fallback wrapper.
- Expose `window.XekhoOfflineOrderFallbackDevTools` with:
  - `enableDryRun(db?)`
  - `disable(db?)`
  - `simulateFailure(methodName, args?, error?)`
  - `simulateAllFailures()`
  - `getDryRunActions()`
  - `clearDryRunActions()`
  - `getDefaultArgs(methodName)`
- Add Node verification for:
  - explicit dry-run wrapping
  - capture of offline/server-like failures
  - no capture for successful live methods
  - unwrap/disable behavior
  - simulated payload generation for all `DB.Orders` methods

Not included in this sprint:

- No enabled/live queue writes.
- No auto sync.
- No production Firestore writes.
- No destructive or migration commands.
- No changes to `.env`, service account files, production data, customer/payment data.

## Browser manual usage for Sprint 8

Only in a test session, open browser console and run:

```js
window.XekhoOfflineOrderFallbackDevTools.enableDryRun();
```

After simulating/offlining network failures, inspect captured dry-run payloads:

```js
window.XekhoOfflineOrderFallbackDevTools.getDryRunActions();
```

Disable wrapping after testing:

```js
window.XekhoOfflineOrderFallbackDevTools.disable();
```

For pure simulation without calling live `DB.Orders` methods:

```js
await window.XekhoOfflineOrderFallbackDevTools.simulateAllFailures();
window.XekhoOfflineOrderFallbackDevTools.getDryRunActions();
```

## Files changed

- `index.html`
- `offlineOrderFallbackDevTools.js`
- `scripts/verify-offline-order-fallback-devtools.js`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1227-pos-offline-backup-sprint-7.md`

## Verification

Commands run:

```bash
node --check offlineBackup.js
node --check offlineSync.js
node --check offlineFirestoreAdapter.js
node --check offlineRuntime.js
node --check offlineStatusUI.js
node --check offlineOrderFallback.js
node --check offlineOrderFallbackDevTools.js
node --check scripts/verify-offline-backup.js
node --check scripts/verify-offline-sync.js
node --check scripts/verify-offline-firestore-adapter.js
node --check scripts/verify-offline-runtime.js
node --check scripts/verify-offline-status-ui.js
node --check scripts/verify-offline-order-fallback.js
node --check scripts/verify-offline-order-fallback-devtools.js
node scripts/verify-offline-backup.js
node scripts/verify-offline-sync.js
node scripts/verify-offline-firestore-adapter.js
node scripts/verify-offline-runtime.js
node scripts/verify-offline-status-ui.js
node scripts/verify-offline-order-fallback.js
node scripts/verify-offline-order-fallback-devtools.js
```

Expected/actual result:

```text
✅ offlineBackup Sprint 1 verification passed
✅ offlineSync Sprint 2 verification passed
✅ offlineFirestoreAdapter Sprint 3 verification passed
✅ offlineRuntime Sprint 4 verification passed
✅ offlineStatusUI Sprint 5 verification passed
✅ offlineOrderFallback Sprint 6 verification passed
✅ offlineOrderFallbackDevTools Sprint 7 verification passed
```

The sync verification intentionally simulates one failed action and logs a warning before passing. Sprint 6 verification intentionally logs dry-run and memory-queue save warnings while using memory storage only.

## Progress estimate

After Sprint 7, module work is about 75% complete. The remaining high-risk work is real browser/iPad QA, review of captured dry-run payloads, and explicit enabled fallback/sync hardening.

## Next

Sprint 8 should boot the POS in browser/iPad, manually enable dry-run, inspect payloads from real UI/order flows, then disable. Do not enable real queue writes until these payloads are reviewed.
