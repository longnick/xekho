# Sprint 2 — HTTP Function security containment

**Date:** 2026-07-10 11:42 +07
**Scope:** Retire unsafe legacy account creation; authenticate/authorize public browser-facing AI/voice/OCR routes; remove maintenance OAuth fallback; establish executable HTTP security regression tests.
**Release status:** Local verification complete. **No production deploy, config mutation, IAM action, or production endpoint call performed.**

## Findings addressed

1. `functions/createAdminUser.js` accepted a public POST and could create an admin Auth user from request-provided/default credentials.
2. `apiVoice` performed NLP, data reads, and order mutations without Firebase request authentication.
3. `aiRouter` could reach Vertex before caller authentication, payload validation, or quota control.
4. `purchaseOcr` accepted arbitrary data URLs before caller authorization and media validation.
5. `aiStatus` returned a project identifier and raw runtime errors without authentication.
6. `verifyAdminRequest()` accepted a Google OAuth userinfo fallback plus email-based owner inference instead of requiring a verified Firebase ID token.
7. Package `test:rules` invoked Jest without the emulator prerequisite, despite its harness contract.

## Changes

### Safe account provisioning

- Replaced `createAdminUser` with a `410 Gone` retirement handler.
- Removed Admin Auth import, credential parsing/defaults, user creation, and claim assignment from that legacy route.
- Existing authenticated callable `manageUserAccount` remains the intended provisioning boundary.

### Shared HTTP request guard

- Added `functions/utils/httpSecurity.js`:
  - strict Bearer parsing;
  - injected Firebase token/role authorization result;
  - declared content-length guard;
  - decoded base64 media size and MIME allowlist guard;
  - bounded in-memory fixed-window rate limiter.
- Added server-side role lookup via `users/{uid}` after ID-token verification, with custom-claim fallback only for a verified token lacking a user document.

### Hardened routes

- `apiVoice`: Firebase ID token, permitted role, 64 KiB declared size limit, and 30/minute/UID per-instance quota before NLP/catalog/Firestore work.
- `aiRouter`: Firebase ID token, permitted role, 64 KiB declared size limit, 20/minute/UID quota, image/audio MIME allowlists, and decoded media limits before Vertex.
- `purchaseOcr`: manager+ Firebase ID token, declared size guard, strict image data-URL parsing, JPEG/PNG/WebP allowlist, decoded image cap before Vertex OCR.
- `aiStatus`: authenticated permitted role only; removes project ID and raw error output.
- Admin/maintenance routes calling `verifyAdminRequest`: Firebase ID token and server-side role check only; OAuth userinfo/email fallback removed.
- Browser callers (`ai-core.js`, `ai-ui.js`, `app.js`) now obtain a current Firebase ID token and attach `Authorization: Bearer ...` for AI router/status/OCR requests.

### Test execution repair

- Added pure helper tests and source wiring regression tests: `functions/utils/httpSecurity.test.js`, `functions/utils/legacyAdminEndpoint.test.js`, `functions/httpEndpointWiring.test.js`.
- Repaired `npm run test:rules` and `npm run test:rules:red-evidence` to invoke an emulator-only process with project `xekho-rules-test`; added private `*:emulator` helper scripts.
- Updated Rules harness README with the self-contained command contract.

## TDD evidence

- Initial helper RED: exit `1` because `httpSecurity` and legacy retirement helper modules were absent.
- Helper GREEN: `8/8` passed.
- Initial HTTP wiring RED: `5/5` expected failures proving public legacy/admin/AI routes and browser callers were unprotected.
- OCR-specific RED: expected wiring assertion failed until endpoint was guarded.
- Admin fallback RED: expected assertion failed while OAuth/email fallback was present.
- Final focused HTTP GREEN: `15/15` passed.

## Final verification

| Gate | Result |
|---|---:|
| HTTP helper/wiring tests | 3 suites, 15 tests PASS |
| User-management function units | 2 suites, 8 tests PASS |
| Default Jest suite | 9 suites, 47 tests PASS |
| Firestore Rules emulator suite | 4 suites, 15 tests PASS |
| Historical authorization exploit regressions | 1 suite, 4 tests PASS |
| `npm run check` | PASS |
| `npm run build:hosting` | PASS — 92 files, 1.87 MB |
| Node syntax (`functions/index.js`, `createAdminUser.js`) | PASS |
| `git diff --check` | PASS |
| Local browser smoke (`127.0.0.1`) | Login/PIN shell rendered; Firebase signed-out expected; 0 JS errors |

The hosting build emitted pre-existing Vite warnings for legacy non-module script tags. The build completed successfully; this sprint did not introduce a new bundling failure.

## Deliberately out of scope / release notes

- No production deploy or endpoint smoke was run.
- Telegram webhooks, kitchen device feed, and Scriptable finance widget use distinct provider/device/widget authentication contracts. They were inventoried but not converted to browser Firebase-Bearer auth because doing so would require coordinated remote caller changes and production end-to-end verification.
- The rate limiter is per Function instance, not a global WAF/quota. See `SECURITY_HTTP_ENDPOINT_MATRIX.md` for release constraints.
