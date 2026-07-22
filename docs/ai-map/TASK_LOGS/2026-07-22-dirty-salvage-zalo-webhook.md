# Dirty salvage — Zalo webhook MVP

## Scope

Forward-ported only Zalo Bot webhook authentication, outbound text helper, and built-in staff `mở ca` / `đóng ca` / `help` replies from dirty repo onto reviewed `main`.

Included:

- `functions/zalo/webhook.js`
- `functions/zalo/reminder.js`
- `functions/zalo/staffCommands.js`
- focused tests and production wiring test
- narrow `functions/index.js` imports, named Secrets, and `zaloWebhook` export

Excluded:

- custom command catalog and admin frontend
- notification admin/callable/scheduler
- dirty Rules, lockfiles, manifests, and core file copies
- production deployment

## Security boundary

- POST only.
- Declared payload ceiling: 256 KiB.
- Fail closed when webhook secret missing.
- Constant-time webhook secret comparison.
- Named Firebase Secrets: `ZALO_BOT_WEBHOOK_SECRET`, `ZALO_BOT_TOKEN`.
- Reviewed runtime service account retained.
- Group-only command replies.
- Logs metadata only; no message text/raw payload.

`Content-Length` validation runs after framework parsing and is not a full allocation ceiling. Add edge rate limiting/deduplication before sustained public group traffic.

## Verification

- Focused Zalo Jest: 4 suites / 10 tests PASS.
- `npm run check:functions`: PASS.
- `git diff --check`: PASS.
- No new npm dependency or lockfile change.
