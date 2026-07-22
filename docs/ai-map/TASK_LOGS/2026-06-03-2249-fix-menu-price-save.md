# 2026-06-03 22:49 - Fix Inventory Menu Manager price save

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

## User report

`tab con Quản lý món trong tab Kho`: editing/saving menu item price was blocked.

## Root cause

- `submitMenuItem()` rejected every finished-good menu item when the ingredient list was empty.
- That was too strict for existing menu items: changing only the selling price on an old item with no recipe could not reach `window.DB.Menu.update(id, payload)`.
- The Firestore `Menu` adapter wrote `sell_price`; this is the canonical app field, but mirroring `price` keeps legacy/read-only consumers aligned.

## Changes

- `app.js`: added `shouldRequireMenuRecipe(itemType, id, ingredients)` so recipe validation still blocks new finished items without a recipe, but existing items can save price edits even if their recipe list is empty.
- `db.js`: `Menu.add()` / `Menu.update()` now mirror the numeric selling price to both `sell_price` and `price`.
- `scripts/verify-menu-price-save.js`: added deterministic regression checks for the id-aware recipe gate and DB price-field mapping.

## Verification

Passed targeted checks:

```bash
node --check app.js
node --input-type=module --check < db.js
node scripts/verify-menu-price-save.js
```

Full repo gate passed:

```bash
npm run check
npx tsc --noEmit -p jsconfig.json
npx tsc --noEmit -p functions/tsconfig.json
npm test -- --runInBand
npm run lint
node -e "execSync('npx vite build 2>&1')"
for f in scripts/verify-*.js; do node "$f"; done  # 51/51
git diff --check
```

Notes: lint still has 5 pre-existing warnings; Vite still prints expected classic-script warnings.

## Risk / follow-up

- No production database/POS/payment/customer data was read or mutated by the local verification.
- Firestore write permissions still depend on the currently logged-in role; this patch fixes the client-side validation/field-mapping regression.
