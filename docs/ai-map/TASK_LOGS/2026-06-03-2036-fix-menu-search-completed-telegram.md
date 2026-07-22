# 2026-06-03 20:36 - Fix menu search and completed-order Telegram payload

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

## User report

1. `ô tìm kiếm trong giao diện chọn món không hoạt động`
2. Completed-order Telegram notification shows missing table/time/payment/items and `0đ` totals for bill `KOUKJ2fgr05cALwXNAZF`.

## Root cause

- POS search: the ESM delegated handler wrote `root.menuSearch`, but `app.js` declares `let menuSearch`, which is not the same as `window.menuSearch` in the browser classic script/global lexical environment. `renderMenuItems()` therefore kept filtering with the stale lexical value.
- Telegram completed order: three compatibility wrappers in `functions/index.js` accidentally called extracted helpers with `order = {}` / `items = []`, resetting real payloads before normalization.

## Changes

- `app.js`: `renderMenuItems()` now reads `#order-search` directly, stores that into the legacy `menuSearch` variable, and filters against `activeMenuSearch`.
- `functions/index.js`: fixed `normalizeCompletedOrderItems`, `calculateCompletedOrderSubtotal`, and `normalizeCompletedOrderForTelegram` wrappers to pass real arguments.
- `scripts/verify-esm-admin-render-controls.js`: added source assertion that the menu search path reads `#order-search`.
- `scripts/verify-telegram-orders.js`: added wrapper regression assertions for the completed-order Telegram normalization path.
- `docs/ai-map`: updated changelog, TODO, code map, file relations, and this task log.

## Verification

Passed:

```bash
node --check app.js
node --check functions/index.js
node scripts/verify-esm-admin-render-controls.js
node scripts/verify-telegram-orders.js
for f in scripts/verify-*.js; do node "$f"; done
npm run check
npx tsc --noEmit -p jsconfig.json
npx tsc --noEmit -p functions/tsconfig.json
npm test -- --runInBand
npm run lint
node - <<'NODE'
const { execSync } = require('child_process');
console.log(execSync('npx vite build 2>&1', { timeout: 30000, encoding: 'utf8' }));
NODE
git diff --check
```

Notes: lint still has 5 pre-existing warnings; Vite still prints expected classic-script warnings.

## Risk / follow-up

- No production DB/POS/payment/customer data was read or mutated.
- Firebase Functions need deploy before the Telegram completed-order fix is live remotely.
- Hosting deploy is needed before the POS order search fix is live remotely.
