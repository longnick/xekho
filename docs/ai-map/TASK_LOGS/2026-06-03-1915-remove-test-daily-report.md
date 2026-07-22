# Remove obsolete Telegram daily report test endpoint

**Time:** 2026-06-03 19:15 Asia/Ho_Chi_Minh
**Repo:** `/home/longnick/projects/xekho`
**Branch:** `test/xe-kho-repo-implementer-skill`

## Goal

Remove the obsolete `testDailyReportTelegram` Cloud Function because it was a legacy manual test endpoint and blocked Firebase deploy with an env ownership conflict.

## Flow check

- Production daily Telegram report remains `scheduledTelegramReport` at the bottom of `functions/index.js`.
- Shared report builders (`buildDailyReportTelegramData`, `buildConfiguredDailyReportTelegramMessage`) remain in place for the scheduler.
- The removed endpoint was only referenced by Settings UI manual test helpers/docs, not by the scheduler.

## Changes

- Removed `exports.testDailyReportTelegram` from `functions/index.js`.
- Removed `getTelegramReportTestUrl()` from `app/utils/storage.js` and the legacy wrapper in `app.js`.
- Removed `testTelegramReportSettings()` and the Settings UI test button from `index.html`.
- Updated `scripts/verify-storage-utils.js` and AI map docs for 33 exported Cloud Functions.

## Verification completed

- Export scan: 33 functions in `functions/index.js`; `testDailyReportTelegram` removed; `scheduledTelegramReport` present.
- Source scan: `app.js`, `app/utils/storage.js`, `index.html`, and `scripts/verify-storage-utils.js` have no old test endpoint/helper/button references.
- `npm run check`: pass.
- Frontend/backend `tsc --noEmit`: pass.
- Jest: 6/6 pass.
- ESLint: 0 errors, 5 pre-existing warnings.
- Vite build: pass with expected classic-script warnings.
- Verify scripts: 49/49 pass.
- Backend syntax checks: pass.
- `git diff --check`: pass.

## Deploy completed

- `npx firebase-tools deploy --only hosting,functions:xekho --force`: success.
- Hosting released: `https://xe-kho.web.app`.
- 33 `xekho` functions updated successfully; no deploy blocker from `testDailyReportTelegram` remains.
- Safe redacted function inventory confirmed `testDailyReportTelegram` is absent and `scheduledTelegramReport` remains ACTIVE under codebase `xekho`.
