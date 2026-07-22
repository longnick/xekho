# POS Offline Backup Sprint 10 Payload Report Review Fixes

Time: 2026-06-01 13:28

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

## Input reviewed

User submitted an iPhone/mobile payload report generated from:

`https://xe-kho.web.app/?xkPayloadReview=1`

Report mode was correct:

- `payload-review-only`
- no DB wrap
- no enqueue
- no Firestore
- no sync

## Findings

The report showed several pre-enable risks that should be fixed before real queue writes:

- `deviceId` was `device_unknown` for every payload.
- Non-open dry-run samples had blank `tableId`.
- `close_order.items` was empty even though close sync/history needs item rows.
- `close_order.tableName` was blank in the sample.
- `removeItem` used a sentinel `delta: -999999`; this must be handled as a delete/remove semantics, not a normal decrement.

## Changes made

- `offlineOrderFallbackDevTools.js`
  - Added payload review validation warnings directly in generated reports.
  - Added dry-run table ID resolver fallback so sample non-open actions include `dryrun-table-1`.
  - Added close sample `payInfo.tableId`, `tableName`, and `items`.
  - Formatted warning section into the mobile/copyable report.

- `offlineOrderFallback.js`
  - `buildCloseOrderAction()` now accepts `payInfo.items` when explicit `input.items` is absent.

- `docs/ai-map/*`
  - Updated code map, file relations, changelog, TODO, and this task log.

## Verification

Commands run during the sprint:

```bash
node --check offlineOrderFallback.js
node --check offlineOrderFallbackDevTools.js
node scripts/verify-offline-order-fallback.js
node scripts/verify-offline-order-fallback-devtools.js
node - <<'NODE'
const fallbackLib = require('./offlineOrderFallback.js');
global.XekhoOfflineOrderFallback = fallbackLib;
const toolsLib = require('./offlineOrderFallbackDevTools.js');
const tools = toolsLib.createOfflineOrderFallbackDevTools({ fallbackLib, logger: {info(){}, warn(){}, error(){}} });
const report = tools.buildPayloadReviewReport();
console.log(JSON.stringify({warnings: report.warnings, tableIds: report.actions.map(a => [a.methodName, a.payload.tableId]), closeItems: report.actions.find(a=>a.methodName==='close').payload.items.length}, null, 2));
NODE
```

Observed:

- Sprint 6 fallback verification passed.
- Sprint 7/9/10 devtools verification passed.
- Dry-run table IDs now resolve to `dryrun-table-1` for all sample actions.
- `close_order.items.length` is now `1` in generated review output.
- Warnings still intentionally flag `device_unknown` and `removeItem` sentinel behavior.

## Safety

Still not enabled:

- real offline queue writes
- auto sync
- Firestore writes from fallback
- POS order method wrapping by default

## Progress estimate

About 77-78% after this sprint. Remaining work is primarily guarded enablement and real-device offline queue validation.

## Next

- Add/confirm stable browser/device ID before queue writes.
- Replace or explicitly handle `removeItem` sentinel semantics.
- Re-run mobile payload review.
- Then add guarded real queue-write flag, keeping auto sync disabled.
