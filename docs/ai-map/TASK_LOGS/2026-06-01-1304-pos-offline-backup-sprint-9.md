# POS Offline Backup Sprint 9 Payload Review Helper

Time: 2026-06-01 13:04

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

## User verification received

User reported:

- POS opens successfully.
- Offline badge appears.
- No boot error is visible.

This confirms the deployed Sprint 5 status UI is not breaking browser boot.

## Goal

Continue safely after visual badge QA by adding a payload review helper before enabling any real offline queue writes.

## Scope

Implemented Sprint 9 only:

- Added `buildPayloadReviewReport()` to `offlineOrderFallbackDevTools.js`.
- Added `printPayloadReviewReport()` to log and return the report in browser console.
- The report generates sample payloads for:
  - `open`
  - `addItem`
  - `changeQty`
  - `removeItem`
  - `updateItemNote`
  - `updateMeta`
  - `close`
  - `cancel`
- Added verification assertions for safety flags and payload type coverage.

## Safety

The new helper is side-effect-free:

- Does not wrap `window.DB.Orders`.
- Does not enqueue offline actions.
- Does not write Firestore.
- Does not enable sync.
- Does not mutate POS/customer/payment data.
- Does not touch secrets, env files, service accounts, migrations, or production database data.

## Files changed

- `offlineOrderFallbackDevTools.js`
- `scripts/verify-offline-order-fallback-devtools.js`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1304-pos-offline-backup-sprint-9.md`

## Browser usage

In a controlled browser console test session:

```js
window.XekhoOfflineOrderFallbackDevTools.printPayloadReviewReport()
```

This returns a report containing:

- `safeByDefault: true`
- side-effect flags all false
- generated payload samples for every supported order method
- instructions not to enable real queue writes or auto sync before acceptance

Optional dry-run testing remains separate:

```js
window.XekhoOfflineOrderFallbackDevTools.enableDryRun()
window.XekhoOfflineOrderFallbackDevTools.getDryRunActions()
window.XekhoOfflineOrderFallbackDevTools.disable()
```

## Verification

Commands run:

```bash
node --check offlineOrderFallbackDevTools.js
node --check scripts/verify-offline-order-fallback-devtools.js
node scripts/verify-offline-order-fallback-devtools.js
```

Result:

```text
✅ offlineOrderFallbackDevTools Sprint 7 verification passed
```

The Sprint 7 verification script now also covers the Sprint 9 payload review report.

## Progress estimate

Offline backup feature is now about 75% complete if counting safe foundation + deployed status UI + payload review tooling. Remaining work is the risky production enablement path.

## Next

Review payload report in the deployed browser console. If accepted, add a guarded real queue-write flag in the next sprint, with auto sync still disabled first.
