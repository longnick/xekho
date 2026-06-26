# Mobile order action bar redesign

## Context

User approved Mockup A after Puppeteer/iPhone sizing. The old mobile `#order-cart-pill` was a small centered floating pill above the food grid; touch events could feel unreliable because the control visually floated over the menu list.

## Changes

- Reworked `#order-cart-pill` markup in `index.html` into two explicit buttons:
  - `order-cart-pill-btn-cart` opens the cart sheet.
  - `order-cart-pill-btn-bill` opens the bill modal.
- Bumped `style.css` cache key to `20260626-order-actionbar`.
- Updated mobile CSS in `style.css`:
  - Full-width action bar: `left/right: 12px`, `height: 48px`.
  - Button touch targets: `40px` high.
  - Position above bottom tabs: `bottom: calc(var(--nav-height) + var(--safe-bottom) + 8px)`.
  - Menu bottom reserve: `.order-pane-menu` and `.menu-grid` get `72px` bottom space on mobile.
- Added `scripts/verify-order-actionbar-ui.js` to guard markup, sizing, cache key, and removal of the old centered floating pill.

## Puppeteer iPhone measurement

- Device emulation: iPhone 13
- Viewport: `390 x 844 CSS px`, DPR `3`
- Live measured action bar: `366 x 48 px`
- Cart button: `161 x 40 px`
- Bill button: `189 x 40 px`
- Bottom nav: `390 x 70 px`
- Gap action bar to bottom nav: `8 px`
- Menu bottom reserve: `72 px`
- Live screenshot: `/home/longnick/mockups/xekho-order-actionbar-live-iphone13.png`

## Verification

- `node scripts/verify-order-actionbar-ui.js` — passed
- `npm run check` — passed
- `npm test -- --runInBand` — passed, 6 tests
- `npx eslint app.js app/utils/ app/ui/ app/auth/ app/order/ app/report/ scripts/verify-order-actionbar-ui.js` — 0 errors, 5 pre-existing warnings
- `npm run build` via Node `execSync` — passed
- `git diff --check` — passed
- Live host smoke: `curl -I http://127.0.0.1:4175` — 200 OK

## Notes

- `npm run lint` still reports a pre-existing/generated-file blocker from `android/app/build/intermediates/assets/debug/native-bridge.js` referencing unavailable `@typescript-eslint/no-unused-vars`. Targeted lint for touched runtime areas passed with 0 errors.
- No deploy was executed. Local host opened for owner mobile/browser QA first.
