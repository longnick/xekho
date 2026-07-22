# 2026-06-03 23:12 - Fix bill unit-price display for fractional K prices

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

## User report

The order formula/total is correct, but the payment bill shows `Bia Tiger Bạc` unit price as `18K` even though the true unit price is `17.500đ` / `17,5K`.

## Root cause

- `openBillModal()` used the global compact formatter `fmt(i.price)` for the bill `Đ.Giá` column.
- `fmt()` intentionally rounds compact thousands with `.toFixed(0)`, so `17.5K` displayed as `18K`.
- Line total and grand total were already correct (`87.500đ` for `5 x 17.500đ`).

## Changes

- Added `formatBillUnitPrice(value)` in `app.js` for exact bill unit-price display.
- Changed bill `Đ.Giá` column from `fmt(i.price)` to `formatBillUnitPrice(i.price)`.
- Added `scripts/verify-bill-unit-price.js` to assert:
  - `17500` → `17,5K`
  - `18000` → `18K`
  - `17550` → `17,55K`
  - bill markup no longer uses rounding `fmt(i.price)` for unit price.

## Verification

Targeted checks passed:

```bash
node --check app.js
node --check scripts/verify-bill-unit-price.js
node scripts/verify-bill-unit-price.js
```

Full gate passed in this sprint:

```bash
node --check app.js
node --check scripts/verify-bill-unit-price.js
node scripts/verify-bill-unit-price.js
node scripts/verify-menu-price-save.js
npm run check
npx tsc --noEmit -p jsconfig.json
npx tsc --noEmit -p functions/tsconfig.json
npm test -- --runInBand
npm run lint
npx vite build
for f in scripts/verify-*.js; do node "$f"; done
# all verify scripts passed: 52
git diff --check
```

## Scope

- Display-only change for bill unit price clarity.
- Does not change item total, grand total, payment amount, or DB schema.
