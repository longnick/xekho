# Sprint 3 — dependency remediation and reproducible builds

**Date:** 2026-07-10 12:12 +07
**Scope:** Audit and patch direct low-risk dependencies; prove dual-lockfile reproducibility; establish Admin/NLP compatibility evidence.
**Release status:** Local verification complete. **No deploy, Firebase config/IAM change, credential read, or production endpoint call performed.**

## Baseline and reduction

`npm audit --omit=dev --json` was captured separately for root and `functions/`.

| Graph | Initial | Final | Result |
|---|---:|---:|---|
| Root | 0 critical, 8 high, 21 total | 0 critical, 7 high, 20 total | One high/total reduced |
| Functions | 1 critical, 11 high, 24 total | 1 critical, 10 high, 23 total | One high/total reduced |

The full sanitized inventory, paths, decisions, and residuals are in `docs/ai-map/DEPENDENCY_SECURITY_BASELINE.md`.

## Changes

1. Updated Functions direct `axios` from resolved `1.15.2` to `1.18.1` (`functions/package.json`, `functions/package-lock.json`).
   - Adds `functions/dependencyRuntimeCompatibility.test.js` to reject Axios below `1.16.0` and assert the outbound HTTP caller wiring remains on Axios.
2. Added Vietnamese `node-nlp` intent fixtures for `pos_order`, `pos_checkout`, `query_inventory`, `query_sales`, and `query_import`.
3. The fixture found and isolated a real Functions runtime compatibility bug: `node-nlp@3.10.2` exposes `manager.settings`, not `manager.nlp.settings`.
   - Fixed `functions/index.js#ensureNlp()` to use `manager.settings.autoSave = false`.
   - The five intent fixtures and source wiring guard now pass.
4. Root compatible `firebase-admin` lock resolution advanced within the existing v13 range to `13.10.0`.
   - A v14 experiment was immediately reverted: root maintenance scripts rely on namespace APIs such as `admin.firestore`, unavailable under the attempted v14 surface.

## Explicitly not force-upgraded

| Family | Evidence | Decision |
|---|---|---|
| Functions `firebase-admin@11 → 14` | Node 22 satisfies Admin v14, but `firebase-functions@5.1.1` dry-run reports an Admin peer conflict. | Blocked for a dedicated Admin + Functions migration with emulator E2E; no peer override. |
| `node-nlp@3 → 5 alpha` in Functions | Sandbox v5 alpha passed the five fixtures, but it still carries the `xlsx` high findings and is pre-release. | Rejected: no security reduction, increased release risk. |
| Root `node-nlp@5 alpha` and its `xlsx` chain | Root is already on alpha and remains vulnerable. | Residual pending adapter replacement/retirement decision. |
| Other transitive fixable packages | Ownership/path needs bounded runtime tests. | No blind `npm audit fix`/override batch. |

## Verification

| Gate | Result |
|---|---:|
| Functions Axios + HTTP + Vietnamese intent focused tests | 15/15 PASS |
| Default Jest | 11 suites, 55 tests PASS |
| Firestore Rules emulator | 4 suites, 15 tests PASS |
| Historical authorization exploit regressions | 1 suite, 4 tests PASS |
| `npm ci` root | PASS — 805 packages installed |
| `npm ci` Functions | PASS — 514 packages installed |
| `npm run check` | PASS |
| `npm run build:hosting` | PASS — 92 files, 1.87 MB |
| Function syntax checks | PASS |
| `git diff --check` | PASS |
| Local browser smoke | Login/PIN shell rendered; signed-out Firebase state expected; 0 JavaScript errors |

The hosting build continues to emit existing Vite warnings for legacy non-module scripts; it completed successfully and no new dependency load failure was observed.

## Next migration gate

Do not deploy this dependency work alone. Before an owner-approved staging/canary rollout, either:
1. migrate `firebase-functions` + `firebase-admin` together with Admin v14 API compatibility tests and Function emulator E2E; and/or
2. replace/retire `node-nlp` behind an adapter after broad Vietnamese command and `apiVoice` end-to-end fixtures establish behavior parity.
