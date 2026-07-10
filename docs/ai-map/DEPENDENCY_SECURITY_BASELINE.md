# Dependency security baseline — Sprint 3

**Captured:** 2026-07-10 12:09 +07
**Scope:** production dependency graphs only (`npm audit --omit=dev`); root and `functions/` lockfiles are assessed independently. No environment files, credentials, or production calls were inspected.

## Audit result

| Graph | Initial baseline | Sprint 3 final | Change |
|---|---:|---:|---:|
| Root | 0 critical, 8 high, 21 total | 0 critical, 7 high, 20 total | -1 high / -1 total |
| `functions/` | 1 critical, 11 high, 24 total | 1 critical, 10 high, 23 total | -1 high / -1 total |

## Runtime dependency and import map

| Graph | Direct package | Runtime/import location | Sprint 3 decision |
|---|---|---|---|
| Functions | `axios` | `functions/index.js`, `functions/telegram/send.js` | Updated from resolved `1.15.2` to `1.18.1`; outside the audited vulnerable range. |
| Functions | `firebase-admin@11` | `index.js`, `firestoreMegaTools.js`, maintenance script | Kept: v14 requires a separate migration. Current `firebase-functions@5.1.1` peer contract admits Admin 11/12 only. |
| Functions | `node-nlp@3.10.2` | lazy `getAiDeps()` / `ensureNlp()` for `apiVoice` | Kept: needed by a live command path. Fixed stale `manager.nlp.settings` use to the v3 API `manager.settings`. |
| Root | `firebase-admin@13` | root maintenance/import scripts | Kept compatible major; lockfile resolves `13.10.0`. Admin v14 removes namespace APIs currently used by these scripts. |
| Root | `node-nlp@5.0.0-alpha.5` | `NLPEngine.js` | Residual: alpha line still pulls vulnerable `xlsx`; do not treat it as a remediation target. |

## High/critical remediation paths and decision log

| Graph | Finding/path | Status | Rationale |
|---|---|---|---|
| Functions | `axios` direct | **Resolved** | `1.18.1` is installed and a compatibility test rejects versions below `1.16.0`. |
| Functions | `firebase-admin → google-gax → protobufjs` (critical/high); plus Firestore/gRPC paths | **Blocked, isolated** | `firebase-admin@14.1.0` requires Node 22 (available), but dry-run produces a peer conflict with `firebase-functions@5.1.1`; forcing it is prohibited. Upgrade Admin and Functions together in a dedicated emulator-backed migration. |
| Functions | `node-nlp → @nlpjs/xtables → xlsx` | **Residual, migration required** | The only npm-proposed target is `5.0.0-alpha.5`. Sandbox intent fixture passed, but the alpha still carries the `xlsx` high findings, so it provides no security reduction. Replace/isolate the NLP adapter only after broader Vietnamese intent and API-voice E2E coverage. |
| Functions | `form-data`, `linkify-it`, `tmp` | **Residual transitive** | A fix exists, but ownership must be mapped before selective override/update; no blind lockfile batch was applied. |
| Root | `node-nlp → @nlpjs/xtables → xlsx` | **Residual, migration required** | Root is already on the alpha line and remains vulnerable through `xlsx`. |
| Root | `protobufjs`, `ws`, `form-data`, `fast-xml-builder` | **Residual transitive** | Fixes are available but their owner/dependency paths require a separately bounded update; do not force transitive overrides without runtime smoke. |

## Compatibility evidence

- `functions/dependencyRuntimeCompatibility.test.js`: Axios version and caller wiring.
- `functions/nodeNlpIntentCompatibility.test.js`: Vietnamese `pos_order`, `pos_checkout`, `query_inventory`, `query_sales`, and `query_import` fixtures; guards the actual Functions v3 `NlpManager.settings` contract.
- Sandboxed `node-nlp@5.0.0-alpha.5` ran the same five intent fixtures successfully, but was intentionally rejected because it remains alpha and does not remove the `xlsx` CVEs.
- A root Admin v14 experiment was reverted after the compatibility probe established that namespace APIs used by root scripts (for example `admin.firestore`) are unavailable.

## Follow-up migration gates

1. Upgrade `firebase-functions` and `firebase-admin` together only with an Admin v14 compatibility test suite, Function emulator E2E, and a staged deployment approval.
2. Move `node-nlp` behind a tested adapter and replace/retire it only after broad Vietnamese intent, failure handling, and `apiVoice` authorization-path fixtures pass.
3. In Sprint 5, enforce both lockfile audits with an explicit temporary allowlist/expiry policy; do not silently ignore the residual findings documented here.

## Sprint 5 policy enforcement

- `scripts/check-dependency-audit.js` now evaluates both production graphs in CI and fails any unallowlisted or expired critical finding.
- The current Functions `protobufjs` critical exception is limited to the two documented GHSA IDs, has an explicit owner/justification, and expires 2026-08-31.
- Current sanitized post-policy counts are unchanged from Sprint 3: root `0 critical / 7 high / 20 total`; Functions `1 critical / 10 high / 23 total`.
