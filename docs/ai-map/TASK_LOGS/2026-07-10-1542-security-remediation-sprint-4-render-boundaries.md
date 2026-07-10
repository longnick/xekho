# 2026-07-10 16:08 +07 — Security remediation Sprint 4: render-boundary + P1 image batch (local)

## Scope and safety boundary

- Repository: `/home/longnick/projects/xekho`
- Existing working tree was already dirty; no reset, stash, clean, staging, commit, deployment, production data read/write, credential, Rules, or Functions mutation was performed.
- This is a bounded render-safety batch. The broader legacy template surface is intentionally not claimed safe.

## Inventory and selected boundaries

The initial static inventory recorded 156 `innerHTML` / `outerHTML` / `insertAdjacentHTML` runtime uses. The work first removed raw persisted `settings.storeLogo` interpolation in the header and Settings preview. The approved P1 batch then covered:

- order-menu name and ID interpolation;
- menu-admin thumbnail and menu-editor preview URLs;
- order photo thumbnails and receipt print images;
- current purchase-photo thumbnails/viewers and purchase batch gallery/full viewer;
- history order-photo gallery/full viewer.

The policy and remaining migration map are in `docs/ai-map/FRONTEND_RENDER_BOUNDARIES.md`.

## TDD evidence

1. Added `tests/renderSafety.test.js` before the logo helper implementation.
2. Observed RED: `safeImageUrl` and `setSafeImageSource` were absent (`TypeError: ... is not a function`).
3. Implemented minimal classic-script/IIFE-compatible DOM helpers.
4. Added the P1 caller-wiring expectation and observed RED because the selected menu/purchase boundaries were not yet routed through safe helpers.
5. GREEN: 5 focused render-safety assertions pass.

## Changes

| File | Change |
|---|---|
| `app/utils/dom.js` | `safeImageUrl` / `setSafeImageSource`: allow only HTTPS and constrained raster data URLs (`png/jpeg/gif/webp`); reject `javascript:`, HTML data URLs, SVG, and other schemes. |
| `app.js` | Added `_safeImageUrl`, `_setSafeImageSource`, and DOM-created image rendering. Removed raw persisted logo interpolation. Escaped menu name/ID boundaries. Routed selected menu/order/purchase/history image URLs and viewer assignments through the URL allowlist. |
| `index.html` | Bumped classic-script cache keys for `app/utils/dom.js` and `app.js`. |
| `package.json` | Corrected Jest discovery to exclude generated `dist/` and Android asset copies. |
| `tests/renderSafety.test.js` | Covers text escaping, URL policy, safe `src` assignment, logo caller wiring, and P1 menu/purchase source wiring. |
| `docs/ai-map/FRONTEND_RENDER_BOUNDARIES.md` | Inventory, source-of-data policy, priority map, and remaining migration gate. |

## Verification

| Check | Result |
|---|---|
| RED before logo helper | expected fail — missing `safeImageUrl` / `setSafeImageSource` |
| RED before P1 wiring | expected fail — selected menu/purchase boundaries not yet safe-routed |
| Focused render safety | 5/5 pass |
| Full Jest | 9 source suites / 42 tests pass |
| JS syntax | `npm run check` plus Functions syntax checks pass |
| Firestore Rules emulator | 15/15 pass |
| Authorization regression evidence | 4/4 pass |
| Hosting build | pass; 93 files, 1.88 MB |
| Diff whitespace | `git diff --check` pass |
| Puppeteer E2E: logo path | 375×667 mobile + 1440×900 desktop: malicious `javascript:` rejected, HTTPS image accepted, no horizontal overflow, 0 console/page/network errors |
| Puppeteer E2E: P1 menu/purchase path | 375×667 mobile + 1440×900 desktop: menu and purchase malicious URL rejected, raster image accepted, no horizontal overflow, 0 console/page errors |

Puppeteer artifacts (outside repository):

```text
/tmp/xekho-puppeteer-qa/output/sprint4-render-safety-report.json
/tmp/xekho-puppeteer-qa/output/sprint4-p1-render-safety-report.json
/tmp/xekho-puppeteer-qa/output/mobile-375x667.png
/tmp/xekho-puppeteer-qa/output/desktop-1440x900.png
/tmp/xekho-puppeteer-qa/output/p1-mobile-375x667.png
/tmp/xekho-puppeteer-qa/output/p1-desktop-1440x900.png
```

## Release status and residual risk

- The real browser E2E tests exercised the signed-out local app shell and actual rendering functions at mobile and desktop viewports. They did not authenticate, create POS records, or write Firebase data.
- No Hosting deployment is requested or performed. Authenticated device/POS workflow QA remains a release gate.
- Most legacy string-template sinks remain intentionally untouched; do not treat the full application as comprehensively XSS-remediated.
