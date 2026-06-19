# 2026-06-19 18:21 +07 - POS chatbot Firestore profit report

## Goal
Replace the POS chatbot's primary mock profit report with a read-only live Firestore aggregation while preserving a safe fallback.

## Scope
- Repo: `/home/longnick/projects/xekho`
- Branch: `push-clean-main-20260604-072900`
- Function area: `functions/index.js` (`getProfitReport()` used by `askPosChatbot` and Telegram owner function-calling route)

## Changes
- Added Vietnam-time helper functions for POS report ranges:
  - `today`
  - `current_month`
  - `last_month`
- Updated `getProfitReport()` to read `history` with Admin SDK and existing report visibility/date helpers.
- Aggregated item-level:
  - quantity
  - revenue
  - cost
  - gross profit
- Returned top 5 items sorted by highest/lowest gross profit.
- Kept mock data only as explicit fallback:
  - `mock-empty-live-data`
  - `mock-firestore-error`
- Renamed function-call trace payload from `mockData` to `toolData`.
- Extended verifier markers for read-only Firestore history aggregation and fallback labels.

## Safety
- Read-only Firestore query only.
- No database writes, migrations, env/secret edits, or customer/payment mutation.
- Telegram owner-only guard remains before this path.
- No Functions deploy in this sprint unless separately approved.

## Verification plan
- `node --check functions/index.js`
- `node --check scripts/verify-pos-chatbot-function-calling.js`
- `node scripts/verify-pos-chatbot-function-calling.js`
- `node scripts/verify-telegram-owner-assistant-guard.js`
- `git diff --check`
- `npm run check`
- `npx tsc --noEmit -p functions/tsconfig.json`
- `npm test -- --runInBand`

## Notes
The fallback mock remains to avoid Gemini inventing numbers when live data is unavailable. The returned `dataSource` tells downstream code whether data came from `firestore-history-readonly` or a mock fallback.
