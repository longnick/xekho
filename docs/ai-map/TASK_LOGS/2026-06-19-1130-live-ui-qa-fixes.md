# 2026-06-19 11:30 +07 — Live UI QA fixes

## Scope

Fixes from read-only live QA of `https://xe-kho.web.app`:

- POS locked login/PIN screen scroll leakage and background exposure in full-page/mobile captures.
- POS iPad/desktop sidebar layout width overflow.
- Touch targets below 44px for compact POS buttons.
- Chief of Staff and Marketing AI mockup mobile horizontal overflow/cut-off action rows/tabs.
- Missing favicon on kitchen/mockup pages.

## Files changed

- `style.css`
  - Added `.auth-locked` scroll/body lock styles.
  - Added coarse-pointer 44px tap target baseline.
  - Raised `.btn-sm` to 44px height.
  - Made desktop/tablet `.main-content` width account for the 80px sidebar.
  - Hardened `.login-screen` viewport/overscroll behavior.
- `app.js`
  - Added `syncAuthScrollLock()` and invoked it when login/PIN screens change and on initial load.
- `index.html`
  - Bumped `style.css` and `app.js` cache keys for Hosting/Safari refresh.
- `chief-of-staff-mockup.html`
  - Added favicon, no horizontal body overflow, 44px buttons, mobile action/timeline grid wrappers.
- `marketing-ai-mockup.html`
  - Added favicon, no horizontal body overflow, 44px buttons, mobile action/tab grid wrappers.
- `kitchen.html`
  - Added favicon.

## Verification

- `node --check app.js` passed.
- `npm run check` passed.
- `npm run build:hosting` passed; Hosting dist prepared with 83 files.
- Local dist smoke via `python3 -m http.server 5189 --directory dist` passed across 4 viewports x 4 pages:
  - `/`
  - `/kitchen.html`
  - `/chief-of-staff-mockup.html`
  - `/marketing-ai-mockup.html`
- Local Puppeteer metrics after fix: no horizontal overflow flags, no lock-screen scroll, no visible tiny tap targets.
- Firebase Hosting deploy completed to `https://xe-kho.web.app`.
- Live no-cache fetch after deploy returned HTTP 200 and `app.js?v=20260619-ui-qa-fixes`.
- Live Puppeteer smoke after deploy passed on the same 4 viewports x 4 pages. One iPhone SE root pass hit transient `net::ERR_NETWORK_CHANGED`; immediate retry was clean with HTTP 200, no console/page/request failures, `authLocked=true`, `scrollY=0`, `scrollWidth=375/clientWidth=375`.

## Safety

- UI/CSS/HTML-only plus small auth scroll-lock helper.
- No `.env`, credentials, Firestore data, POS data, migrations, or destructive commands touched.
