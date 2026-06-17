# 2026-06-17 - Telegram chart callback prefix regression

## Symptom

Owner pressed the chart button and Telegram replied that the action was not recognized.

## Root cause

The webhook callback handler only recognized `chart_<id>`. Older/variant chart buttons can send callback payloads such as `show_chart_<id>`, `tg_chart_<id>`, or `ve_bieu_do_<id>`, causing the callback to fall through to the generic unknown-callback branch.

A live reproduction with `show_chart_fakeid` returned:

```json
{"ok":true,"skipped":"unknown-callback"}
```

## Fix

- Added `parseTelegramChartCallbackData()`.
- Accepted chart callback prefixes: `chart`, `show_chart`, `tg_chart`, `ve_bieu_do`, `draw_chart`, with `_` or `:` separator.
- Routed recognized chart callbacks to `handleTelegramChartCallback()` before generic confirm/cancel handling.
- Updated chart/menu verifier so future changes must use the parser and support legacy prefixes.

## Verification

Passed:

- `node --check functions/index.js`
- `node --check scripts/verify-telegram-chart-menu-features.js`
- `node scripts/verify-telegram-chart-menu-features.js`
- `node scripts/verify-telegram-bigquery-reporting.js`
- `git diff --check`
- `npx tsc --noEmit -p functions/tsconfig.json`
- `npm test -- --runInBand`
