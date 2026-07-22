# 2026-07-11 — Authenticated Functions Emulator provisioning regression

## Scope

Local-only Auth + Firestore + Functions Emulator QA for the isolated security release candidate. No production project, credentials, Firebase writes, POS data, or deploy was used.

## Root cause

`manageUserAccount` passed callable Auth verification but returned `500` when generating the timestamp for its new user mapping. The handler resolved the sentinel lazily through `admin.firestore.FieldValue.serverTimestamp()`. In the Functions Emulator handler runtime that namespace was undefined, even though direct Admin SDK component checks succeeded.

## Remediation

- Import `FieldValue` from `firebase-admin/firestore` explicitly in `functions/index.js`.
- Use `FieldValue.serverTimestamp()` only for the managed-user provisioning timestamp factory.
- Add `functions/managedUserTimestamp.test.js` to lock that compatibility boundary.

## RED → GREEN evidence

1. New focused test failed before the import/handler change.
2. `node --check functions/index.js` passed after the change.
3. Focused Jest test passed.
4. Local emulator E2E passed with synthetic owner/staff identities:
   - unauthenticated `apiVoice` → `401`
   - staff token `aiStatus` → `200`
   - owner custom-claim callable provision → `200`
   - synthetic `users/{uid}` mapping role persisted
   - unauthenticated provisioning denied

## Non-production boundary

Temporary emulator config, synthetic identities, and harmless dummy params stay under `/tmp/xekho-auth-e2e` and are not committed.
