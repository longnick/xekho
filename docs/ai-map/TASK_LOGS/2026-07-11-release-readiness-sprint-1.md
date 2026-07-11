# 2026-07-11 - Release Readiness Sprint 1: Telegram webhook authenticity + callback owner authorization

Worktree: `/home/longnick/projects/xekho-release-readiness`
Branch: `task/release-readiness-20260711`
Base commit R0: `9b5e38b4248817dc2a6e829a1151b0ff28613ee8`

## Objective
Make forged HTTP callback payloads unable to mutate orders, payments, drafts, or pending AI actions
(R1 unit of the release readiness master plan).

## What changed
### New files
- `functions/telegram/webhookSecurity.js` — pure helpers (no Firebase imports):
  - `safeEqualString(a, b)` — constant-time compare via `crypto.timingSafeEqual` with length guard, fail-closed on empty.
  - `extractTelegramWebhookSecret(req)` — case-insensitive read of `x-telegram-bot-api-secret-token`.
  - `isAuthenticTelegramWebhook({ configuredSecret, providedSecret })` — true only when both non-empty and match; fails closed.
  - `isTelegramWebhookBodySizeAllowed(req, maxBytes=262144)` — reuses `httpSecurity.isContentLengthAllowed` (256 KiB default).
  - `isAuthorizedTelegramWriteActor({ allowlist, chatId, userId })` — allowlist membership by chat or user id.
  - `isTelegramWriteCallbackData(callbackData)` — classifies mutating callback prefixes.
  - re-exports `createRateLimiter` from `../utils/httpSecurity`.
- `functions/telegram/webhookSecurity.test.js` — 7 unit tests (all passing), including the forged-callback matrix (missing/wrong secret → fail closed; owner allowlist match; non-owner denial; write-callback classification).
- `functions/telegram/webhookWiring.test.js` — 5 source-wiring tests proving guard order in `functions/index.js`.

### Modified files
- `functions/index.js` (minimal security wiring for `exports.telegramWebhook` only):
  - Imports the new helpers.
  - Declares `TELEGRAM_WEBHOOK_SECRET = defineString('TELEGRAM_WEBHOOK_SECRET', { default: '' })` (empty default; no hardcoded value).
  - Module-scope `telegramWebhookRateLimiter = createTelegramRateLimiter({ limit: 120, windowMs: 60000 })`.
  - At start of POST handler (after method checks, before logging / any DB work):
    1. Resolve configured secret from param, falling back to `process.env.TELEGRAM_WEBHOOK_SECRET` for local/emulator.
    2. Extract header secret; if not authentic → `401 { ok:false, error:'Unauthorized' }`, zero DB writes.
    3. Body-size cap → `413` when exceeded.
    4. Per-IP rate limit (x-forwarded-for/req.ip) → `429` when exceeded.
  - Before write-callback branches: `isTelegramWriteCallbackData(callbackData) && !isAuthorizedTelegramWriteActor({ allowlist: getTelegramOwnerChatIds(), chatId, userId })`
    (wired via the helper, fail-closed when allowlist empty) → answerCallback with denial + return `200 { ok:false, skipped:'unauthorized-write-callback' }`, no mutation.
    `isAuthorizedTelegramWriteActor` is the production guard (owner chat/user IDs allowlist); `isTelegramOwnerContext` remains for text-command owner checks.
- `package.json`:
  - `test:functions-security` now includes `functions/telegram/webhookSecurity.test.js` and `functions/telegram/webhookWiring.test.js`.
  - `check:functions` now includes `node --check functions/telegram/webhookSecurity.js`.

## Guard order in telegramWebhook
OPTIONS/method check → authenticity (401) → body size (413) → rate limit (429) → parse body →
write-callback owner guard (before approve/reject/draft/payment/pending-action mutations) → existing routing.

## Verification (all passing)
- `node --check functions/index.js` — OK
- `node --check functions/telegram/webhookSecurity.js` — OK
- `npm run check:functions` — OK
- `functions/telegram/webhookSecurity.test.js` — 7/7 pass (incl. forged-callback matrix)
- `functions/telegram/webhookWiring.test.js` — 5/5 pass
- Full `test:functions-security` file set — 43/43 tests, 9/9 suites pass
- `git diff --check` — clean

## Constraints honored
- No deploy, no setWebhook, no secret rotation, no real secret values committed.
- Minimal hunks in `functions/index.js`; no unrelated Telegram feature refactors.
- Mojibake in existing messages left untouched.
- Not committed — parent will commit after reviews.
