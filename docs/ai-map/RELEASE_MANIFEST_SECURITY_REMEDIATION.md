# XE KHÔ security-remediation release manifest

**Created:** 2026-07-11 02:32 +07
**Branch:** `task/kilo-fix-20260623-050807`
**Status:** packaging only — no deployment authority.

## Purpose

This manifest separates the completed local security remediation from an already broad dirty tree. It is a staging/review map, not an authorization to deploy Rules, Functions, Hosting, credentials, or production data.

## Packaged commit series (local only)

| SHA | Unit | Release constraint |
|---|---|---|
| `d909b58` | R2 Rules harness/containment | Rules remains last; do not deploy alone |
| `f399924` | R2b managed-user provisioning | Requires owner-reviewed live UID/role/staffId mappings |
| `55e70d9` | R3 Functions HTTP containment | Deploy only with compatible Hosting auth callers |
| `e66f5b3` | R4 Hosting render containment | Requires authenticated mobile/POS QA |
| `8dd9377` | R5 dependency compatibility | Residual allowlist expires 2026-08-31 |
| `994b76f` | R1 CI/audit/artifact/browser gates | CI only; no runtime deployment |
| `336fd1b` | R6 authenticated provisioning emulator compatibility | Local-only evidence; no production authority |

## Verified release units

| Unit | Intended scope | Required local evidence | Deployment constraint |
|---|---|---|---|
| R1 — CI and audit policy | `.github/workflows/ci.yml`, audit/artifact/browser scripts, emulator config, focused docs/tests | clean root + Functions installs, audit policy, artifact/browser smoke | Source/CI only; safe to merge independently after dependency script/package hunks are isolated |
| R2 — Firestore Rules containment | `firestore.rules`, Rules harness/persona tests, access matrix | Rules Emulator 15/15 plus deny evidence 4/4 | Do not deploy alone; requires verified user role/staff mapping and coordinated callers |
| R3 — Functions HTTP containment | selected `functions/index.js` and `createAdminUser.js` security hunks plus HTTP helper/tests | Functions security suite 10/39 and Node 22 syntax | Deploy only with compatible Hosting auth callers; do not include webhook/Zalo/Scriptable work |
| R4 — Hosting auth/render containment | selected `app.js`, `app/utils/dom.js`, `index.html`, render tests | full Jest, artifact check, signed-out mobile smoke | Requires authenticated mobile/POS QA before release |
| R5 — dependency compatibility | selected root/Functions package and lockfile dependency hunks, compatibility tests, audit baseline | dual clean installs and audit policy | No forced Firebase major or alpha NLP upgrade; residual allowlist expires 2026-08-31 |

## Current path classification

### Fully attributable untracked remediation paths

- Rules: `tests/firestore-rules/**`, `docs/ai-map/SECURITY_ACCESS_MATRIX.md`, Sprint 0/1 task logs.
- Functions security: `functions/httpEndpointWiring.test.js`, `functions/utils/httpSecurity.*`, `functions/utils/legacyAdminEndpoint.*`, `functions/userManagementService.*`, `functions/utils/userManagement.*`, `docs/ai-map/SECURITY_HTTP_ENDPOINT_MATRIX.md`, Sprint 2 task log.
- Dependency/CI: `functions/dependencyRuntimeCompatibility.test.js`, `functions/nodeNlpIntentCompatibility.test.js`, `scripts/check-dependency-audit.*`, `scripts/dependency-audit-allowlist.json`, `scripts/verify-hosting-dist.js`, `scripts/ci-browser-smoke.js`, audit/baseline docs, Sprint 3/5 task logs.
- Render safety: `tests/renderSafety.test.js`, `docs/ai-map/FRONTEND_RENDER_BOUNDARIES.md`, Sprint 4 task log.
- Rehearsal: Sprint 6 task log.

### Mixed tracked files — require hunk-level review; never blanket-stage

| Path | Mixed concerns observed |
|---|---|
| `app.js` / `db.js` / `index.html` / `style.css` | attendance and UX work coexist with selected browser auth/render-safety changes |
| `functions/index.js` / `functions/createAdminUser.js` | HTTP containment coexists with operational integrations; exclude non-security endpoint behavior |
| `firestore.rules` | Rules containment coexists with attendance workflow rules |
| `package.json` / `package-lock.json` | CI/security dependencies coexist with legacy metadata, Capacitor, and unrelated scripts/dependency history |
| `functions/package.json` / lockfile | Axios security update must be separated from unrelated Functions work |
| `docs/ai-map/CHANGELOG_AI.md`, `TODO_AI.md`, `FILE_RELATIONS.md`, `CODE_MAP.md` | multiple prior workstreams share these files |
| `vite.config.mjs` | temporary tunnel host allowance is unrelated to this security release |

### Excluded from these release units

- `.understand-anything/**`, `.hermes/**`, `firestore-debug.log`, build/cache artifacts.
- Zalo, Scriptable, attendance feature work, sketches, and any production configuration/secret path.

## Safe packaging sequence

1. Commit this manifest alone to establish the reviewed boundary.
2. Use hunk-level staging only for R1–R5; never stage whole mixed files merely because a security hunk exists within them.
3. Run the unit-specific local gates after each isolated commit.
4. Create a release table against exact commit SHAs.
5. Require owner approval separately for CI, Hosting, Functions, and Rules. Rules remain last.

## Production blockers retained

- Authenticated synthetic-safe Functions E2E is evidenced locally in the dedicated temporary Emulator harness; it is not production validation.
- Real mobile/POS authenticated QA is not yet evidenced.
- Live role/staff mapping must be reviewed before Rules deployment.
- `protobufjs` Functions residual is allowlisted only until 2026-08-31.
