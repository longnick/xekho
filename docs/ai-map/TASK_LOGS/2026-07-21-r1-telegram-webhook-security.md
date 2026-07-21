# Task Log: R1 Telegram Webhook Security Reconstruction

**Date:** 2026-07-21
**Task:** Reconstruct R1 Telegram webhook authenticity + callback authorization from reviewed commit 42c4ae6 into canonical branch task/release-canonical-20260721.
**Source:** Commit 42c4ae6 on task/release-readiness-20260711 (Sprint 1 / R1).
**Model:** GLM 5.2 via 9Router.

## Files Created

| File | Purpose |
|------|---------|
| `functions/telegram/webhookSecurity.js` | Runtime: constant-time secret compare, header extraction, body-size guard, write-callback classification, owner authorization |
| `functions/telegram/webhookSecurity.test.js` | Unit tests covering constant-time comparison, header extraction, fail-closed authenticity/authorization, raw-body cap, rate-key behavior, callback prefixes, and forged callbacks |
| `functions/telegram/webhookWiring.test.js` | Wiring tests requiring Secret Manager binding, first-handler raw-body gate, trusted rate key, configured-only owner allowlist, and authorization before mutations |

## Files Modified

| File | Change |
|------|--------|
| `functions/index.js` | +9 lines import webhookSecurity; +2 lines TELEGRAM_WEBHOOK_SECRET param + rate limiter; +23 lines authenticity/body/rate gate before logging; +15 lines write-callback authorization guard before mutations |
| `package.json` | Added `functions/telegram/webhookSecurity.test.js` and `functions/telegram/webhookWiring.test.js` to `test:functions-security`; added `functions/telegram/webhookSecurity.js` to `check:functions` |

## Security Contract Verification

1. ✅ Authentic Telegram request requires a bound Secret Manager value plus constant-time comparison of `X-Telegram-Bot-Api-Secret-Token`. Actual `rawBody` size is checked before any `req.body` access, application logging, DB work, or callback action. Firebase framework parsing occurs before the handler, so this is not pre-allocation protection.
2. ✅ Owner/group/user authorization via `isAuthorizedTelegramWriteActor` + `getTelegramOwnerChatIds()` before every mutation path: online-order approve/reject, draft confirm/cancel, payment finalize/cancel, customer request status, pending AI execute/cancel
3. ✅ No hardcoded secret/token; `TELEGRAM_WEBHOOK_SECRET = defineSecret('TELEGRAM_WEBHOOK_SECRET')` and `telegramWebhook` binds it in `secrets`.
4. ✅ No secret rotation/setWebhook/deploy code
5. ✅ Unrelated attendance/Zalo/Scriptable behavior preserved — no broad replacement of functions/index.js

## TDD Evidence

- **RED phase:** 12 tests (7 unit + 5 wiring) all FAIL before runtime applied — webhookSecurity.js module not found, index.js missing security code
- **GREEN phase:** focused Telegram tests and full Functions security suite pass after runtime hardening.

## Gate Results

| Gate | Status |
|------|--------|
| `node --check functions/index.js` | ✅ PASS |
| `node --check functions/telegram/webhookSecurity.js` | ✅ PASS |
| `npm run check:functions` | ✅ PASS |
| `npm run test:functions-security` | ✅ PASS — 9 suites, 50 tests |
| `git diff --check` | ✅ PASS (no whitespace errors) |
| Scope scan | ✅ Only R1 runtime/helper/tests, minimal package scripts, and this task log modified |

## Not Done (by design)

- No commit, push, or deploy
- No edits to shared docs (CHANGELOG_AI, TODO_AI, FILE_RELATIONS, RELEASE_UNIT_LEDGER)
- No package-lock or functions/package.json changes
- No Zalo/Scriptable/attendance feature edits
