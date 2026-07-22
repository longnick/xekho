# R2 callable authorization — 2026-07-21

## Scope

- Canonical worktree: `/home/longnick/projects/xekho-release-canonical`
- Base: `cf925ec`
- No commit, push, deploy, reset, stash, or clean.
- Selected R2 only: `manageUserAccount`, `askPosChatbot`, `approveOnlineOrder`, `rejectOnlineOrder`.

## Authorization contract

`functions/callableHandlers.js` contains executable handler boundary. `index.js` only wires Firebase `onCall` exports to it.

- Authorization runs before every payload read or business function.
- Missing identity: `HttpsError('unauthenticated')`.
- Server role source: `users/{uid}.role`; verified custom claim only when document missing.
- Firestore `users/{uid}` lookup rejection fails closed. No `auth.getUser()` fallback.
- Existing blank/invalid document role denies. No custom-claim fallback.
- Permission denial is generic: `Bạn không có quyền thực hiện thao tác này.` No role leak.
- `manageUserAccount` passes resolved `{ uid, role }` actor to `createManagedUser`; service rejects absent/mismatched actor. Request token role is never used for assignment policy.
- `admin`, `owner`, `superadmin` can assign privileged roles. `manager` only `staff`/`kitchen`.
- Order-ID validation executes after authorization. Existing approve/reject idempotency remains source-tested.

## TDD evidence

RED:

```text
npm test -- --runInBand functions/callableHandlers.test.js
FAIL functions/callableHandlers.test.js
Cannot find module './callableHandlers' from 'functions/callableHandlers.test.js'
```

Additional RED after strengthening service/role tests:

```text
FAIL functions/callableHandlers.test.js  Cannot find module './callableHandlers'
FAIL functions/utils/userManagement.test.js  superadmin denied
FAIL functions/userManagementService.test.js  request.auth.token.role still authorized assignment
```

GREEN:

```text
npm test -- --runInBand functions/callableHandlers.test.js functions/callableAuthorization.test.js functions/callableAuthorizationWiring.test.js functions/userManagementService.test.js functions/utils/userManagement.test.js
PASS 5 suites, 42 tests

npm run test:functions-security
PASS 12 suites, 85 tests

npm run check:functions
exit 0

git diff --check
exit 0
```

Executable coverage: all four handlers block unauthenticated and unauthorized requests before throwing `request.data` Proxy access or business calls; authorized payload reaches expected business call; invalid approve/reject IDs fail after authorization; resolved actor overrides token role; missing-document claim fallback allowed/denied; Firestore role lookup rejection fails closed without `auth.getUser`.

## Emulator E2E status

Not run. Not claimed as plan exit.

Exact blocker: repository `firebase.json` configures only Firestore Emulator (`127.0.0.1:8088`); no Auth or Functions Emulator config/script/client exists. Existing Functions module initializes production-shaped dependencies at module load. Safe Auth + Firestore + Functions callable E2E needs temporary external emulator config, harmless non-secret function params, synthetic Auth identities/custom claims, emulator Admin seeding, callable client, and startup isolation. No production access attempted. Unit handler tests use synthetic identities only.

## Changed paths

- `functions/index.js`
- `functions/callableHandlers.js`
- `functions/callableHandlers.test.js`
- `functions/utils/callableAuthorization.js`
- `functions/callableAuthorization.test.js`
- `functions/callableAuthorizationWiring.test.js`
- `functions/userManagementService.js`
- `functions/userManagementService.test.js`
- `functions/utils/userManagement.js`
- `functions/utils/userManagement.test.js`
- `package.json`
- `docs/ai-map/TASK_LOGS/2026-07-21-r2-callable-authorization.md`

No deploy authority.
