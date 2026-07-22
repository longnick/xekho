# 2026-07-10 16:46 +07 — Security remediation Sprint 5: CI and release gates (local)

## Scope and safety boundary

- Repository: `/home/longnick/projects/xekho`
- Existing dirty tree was preserved; only Sprint 5 CI, verification scripts, policy, and documentation were changed.
- No production endpoint, Firebase project, deploy command, environment file, or secret was accessed.

## Implemented gates

### CI job split

`.github/workflows/ci.yml` now has independent, secret-free jobs:

1. **Frontend** — Node 20/22 syntax, Jest, frontend TypeScript, and ESLint.
2. **Rules** — Firestore Emulator persona matrix plus deny-regression evidence.
3. **Functions security** — Node 22 Functions graph install; authentication, handler, size/rate, and dependency compatibility tests; changed Functions syntax checks.
4. **Hosting artifact/browser** — build, required/forbidden artifact verification, then signed-out mobile Puppeteer smoke.
5. **Dual dependency audit** — root and `functions/` production-lockfile audits under the explicit policy.

The Functions runtime target remains Node 22. The CI gate intentionally uses Node syntax checks and focused Jest coverage for the existing JavaScript Functions modules rather than the pre-existing Functions `tsconfig` scan, which has no typed Jest environment and reports unrelated JS type diagnostics.

### Artifact and browser smoke

- `scripts/verify-hosting-dist.js` requires the 17 runtime files used by Hosting.
- It rejects Functions, docs, scripts, Android outputs, `.env*`, and sensitive-looking JSON artifacts from `dist/`.
- `scripts/ci-browser-smoke.js` serves `dist/` locally, never authenticates, checks the signed-out login lock, renders the non-destructive **Bàn** screen, verifies restricted navigation returns to Bàn, and checks mobile overflow/errors.
- Browser lifecycle cleanup is guarded so failed browser startup cannot leave the local test server open.

### Dependency policy

- `scripts/check-dependency-audit.js` runs both `npm audit --omit=dev --json` graphs.
- An unallowlisted or expired critical advisory fails the gate.
- The narrow temporary exception is `functions/protobufjs` for `GHSA-h755-8qp9-cq85` and `GHSA-xq3m-2v4x-88gg`, expires **2026-08-31**, and requires an owner/justification.
- `scripts/check-dependency-audit.test.js` proves documented exception passes, a new critical advisory fails, and an expired entry fails.
- Policy: `docs/ai-map/DEPENDENCY_AUDIT_POLICY.md`.

## Local evidence

| Gate | Result |
|---|---|
| Root `npm ci --ignore-scripts` | PASS |
| Functions `npm ci --ignore-scripts` | PASS |
| Audit policy + fixture tests | PASS; root `0 critical/7 high/20 total`, Functions `1 critical/10 high/23 total`, known critical allowlisted only |
| Full Jest | PASS — 10 suites / 45 tests |
| Focused Functions security | PASS — 7 suites / 31 tests |
| Rules persona matrix | PASS — 15 tests |
| Rules deny regression evidence | PASS — 4 tests |
| `npm run check` + `npm run check:functions` | PASS |
| `npm run lint` | PASS — 0 errors, 8 pre-existing warnings |
| `npm run build:hosting` + artifact verifier | PASS — 93 files / 1.88 MB |
| Signed-out mobile browser smoke | PASS — Bàn, login lock, four restricted routes blocked, no browser errors/overflow |
| `git diff --check` | PASS |

## Release posture

No deployment was performed. Authenticated POS navigation and real-device QA remain release gates for Sprint 6 and require a separately approved, synthetic-safe plan.
