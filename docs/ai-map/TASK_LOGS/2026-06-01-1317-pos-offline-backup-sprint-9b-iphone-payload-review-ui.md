# POS Offline Backup Sprint 9B iPhone Payload Review UI

Time: 2026-06-01 13:17

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

## Goal

Support payload review on iPhone/mobile Safari where the user cannot open a developer console.

## Scope

Implemented an opt-in mobile UI path in `offlineOrderFallbackDevTools.js`:

- If URL contains `?xkPayloadReview=1`, `?payloadReview=1`, or `?offlinePayloadReview=1`, install a floating `Payload Review` button.
- The button opens a full-screen panel with a formatted payload review report.
- Panel actions:
  - `Tạo lại report`
  - `Copy report`
  - `Chọn hết`
  - `Đóng`
- Added `formatPayloadReviewReport()` and `copyPayloadReviewReport()` helpers.

## Safety

This sprint remains side-effect-free:

- No `DB.Orders` wrapping.
- No offline queue writes.
- No Firestore writes.
- No sync enablement.
- No POS/customer/payment data mutation.

The mobile panel only displays generated sample payload shapes.

## Files changed

- `offlineOrderFallbackDevTools.js`
- `scripts/verify-offline-order-fallback-devtools.js`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1317-pos-offline-backup-sprint-9b-iphone-payload-review-ui.md`

## Verification

Commands run:

```bash
node --check offlineOrderFallbackDevTools.js
node --check scripts/verify-offline-order-fallback-devtools.js
node scripts/verify-offline-order-fallback-devtools.js
npx --yes firebase-tools@latest deploy --only hosting --project pos-v2-909ff
python3 live-smoke for https://xe-kho.web.app/?xkPayloadReview=1 and offlineOrderFallbackDevTools.js
```

Result:

```text
✅ offlineOrderFallbackDevTools Sprint 7 verification passed
Deploy complete. Hosting URL: https://xe-kho.web.app
https://xe-kho.web.app/?xkPayloadReview=1 200
https://xe-kho.web.app/offlineOrderFallbackDevTools.js?v=20260601-sprint7 200
payload review marker: yes in deployed devtools asset
```

The Sprint 7 verification script now also covers Sprint 9/9B payload review helpers.

## User instructions

On iPhone:

1. Open deployed POS with query param:
   - `https://xe-kho.web.app/?xkPayloadReview=1`
2. Wait for POS to load.
3. Tap floating `Payload Review` button.
4. Tap `Copy report`.
5. Send/paste the report text back for review.

## Next

After mobile payload review is accepted, add a guarded enable flag for real offline queue writes while keeping auto sync disabled first.
