# XE KHÔ Release Unit Ledger

**Created:** 2026-07-11 10:06 +07
**Status:** Sprint 0 documentation scope passed; overall release gate is **blocked** by P0 security items and the R7 canonical Capacitor wrapper/file-mode issue. No deployment authority.

## Reviewed base and worktree

| Field | Value |
|---|---|
| Reviewed base SHA | `5b103bfc853639d1b237084c42fc9ab23a0d9900` |
| Integration branch | `task/release-readiness-20260711` |
| Clean integration worktree | `/home/longnick/projects/xekho-release-readiness` |
| Source dirty tree (read-only) | `/home/longnick/projects/xekho` |
| Approved master plan source | `/home/longnick/projects/xekho/docs/ai-map/RELEASE_READINESS_MASTER_PLAN.md` |
| Copied master plan target | `docs/ai-map/RELEASE_READINESS_MASTER_PLAN.md` |
| Existing manifest | `docs/ai-map/RELEASE_MANIFEST_SECURITY_REMEDIATION.md` |
| Dirty classification | `docs/ai-map/INTEGRATION_DIRTY_TREE_CLASSIFICATION.md` |

## Dirty-source rescan evidence

Read-only rescan of `/home/longnick/projects/xekho` for Sprint 0 planning recorded:

- 86 dirty-source entries total.
- 22 tracked entries.
- 64 untracked entries.
- 13 tracked paths differ from the clean candidate/integration worktree.
- Excluded local/generated paths: `.hermes/`, `.understand-anything/`, `firestore-debug.log`.

This evidence is documentation/classification only; it does not authorize copying broad dirty-tree changes into release units.

## Release target

In scope for the release-readiness series:

- Web POS / Firebase Hosting.
- Cloud Functions required by Web POS and existing integrations.
- Firestore Rules security containment.
- Capacitor Android wrapper built from verified Hosting artifact.
- CI/test/artifact/dependency policy and release documentation.

Out of scope:

- `android-native/` Kotlin/Compose native app is **paused/non-release**.
- New features, UI redesign, production DB migration/backfill, production data cleanup, secret rotation/history rewrite unless separately approved.

## Release units R0-R8

| Unit | Definition | Included paths / expected future paths | Mixed files requiring hunk staging | Excluded paths/workstreams | Current status |
|---|---|---|---|---|---|
| R0 | Manifest, ledger, plan, ignore policy | `docs/ai-map/RELEASE_READINESS_MASTER_PLAN.md`, `docs/ai-map/RELEASE_MANIFEST_SECURITY_REMEDIATION.md`, `docs/ai-map/RELEASE_UNIT_LEDGER.md`, `docs/ai-map/INTEGRATION_DIRTY_TREE_CLASSIFICATION.md`, `docs/ai-map/TODO_AI.md`, `docs/ai-map/CHANGELOG_AI.md`, `docs/ai-map/FILE_RELATIONS.md`, `docs/ai-map/TASK_LOGS/2026-07-11-release-readiness-sprint-0.md`, `.gitignore` | AI-map shared docs are append-only/multi-workstream; stage only Sprint 0 entries. `.gitignore` only adds `.hermes/`, `.understand-anything/`, `firestore-debug.log`. | Runtime source, dependencies, Rules, Functions, Hosting config, production state. | **Sprint 0 docs scope passed**; no runtime/config/deps/Rules/Functions/Hosting/Capacitor edits in this correction. |
| R1 | Telegram webhook + callable containment | Expected: `functions/index.js` selected hunks, `functions/telegram/webhookSecurity.js`, `functions/telegram/webhookSecurity.test.js`, callable auth tests/helpers, deployment/verifier docs. | `functions/index.js` is mixed with operational integrations; stage only webhook authenticity, owner/group authorization and callable role hunks. | Zalo, Scriptable, attendance feature work, unrelated Telegram feature changes. | Prior candidate units inherited/unverified against new P0 findings; must be revalidated. |
| R2 | Firestore public/signed-in Rules + tests | Expected: `firestore.rules`, `tests/firestore-rules/**`, `docs/ai-map/SECURITY_ACCESS_MATRIX.md`. | `firestore.rules` may contain attendance workflow rules; hunk-stage exact security containment. | Rules deployment, production role/staff mapping changes, data backfill. | Prior candidate units inherited/unverified against new P0 findings; pending fresh review. |
| R3 | HTTP/paid-AI containment + browser token callers | Expected: `functions/utils/httpSecurity.js`, selected `functions/index.js` HTTP route hunks, browser caller token attachment hunks, `functions/httpEndpointWiring.test.js`. | `functions/index.js`, `app.js`, `db.js`, `index.html` may be mixed; stage exact auth/size/rate/CORS/token hunks only. | Provider webhook behavior unrelated to the classified security boundary; new AI features. | Pending. |
| R4 | Dependency families + compatibility tests | Expected: root `package.json`, `package-lock.json`, `functions/package.json`, `functions/package-lock.json`, `scripts/check-dependency-audit.js`, `scripts/dependency-audit-allowlist.json`, compatibility tests and `DEPENDENCY_SECURITY_BASELINE.md`. | Package/lockfiles require isolated review; do not copy broad dirty lockfiles wholesale. | Capacitor/history dependency churn unless part of verified release family; alpha-only migrations without risk reduction. | Pending. |
| R5 | Hosting auth/render containment + artifact boundary | Expected: selected `app.js`, `app/utils/dom.js`, `index.html`, `style.css` if needed, `tests/renderSafety.test.js`, `scripts/build-hosting-dist.js`, `scripts/verify-hosting-dist.js`, frontend boundary docs. | `app.js`, `db.js`, `index.html`, `style.css` are mixed with attendance/mobile UX; hunk-stage only release security/render/artifact changes. | UX redesigns, attendance UI, sketches, unrelated ESM cleanup. | Pending. |
| R6 | CI only after all referenced scripts/tests exist | Expected: `.github/workflows/ci.yml`, root/functions scripts that already exist in prior units, CI provenance checks. | `package.json` script hunks only after referenced files are present. | CI jobs for paused `android-native/`; references to absent Zalo/Scriptable/attendance work. | Pending. |
| R7 | Capacitor build metadata/artifact verification | Expected: `capacitor.config.ts`, `android/` metadata/config paths, Capacitor verifier scripts, APK artifact report docs; only after verified Hosting artifact. | `package.json`/lockfile Cap dependencies if not already stable; hunk-stage only reproducible Capacitor release metadata. | `android-native/` paused/non-release; OTA publication/auto-update unless separately approved. | **Blocked:** canonical `npm run cap:build` fails because tracked `android/gradlew` mode is `100644`; canonical script/file-mode fix required before release gate can be all-green. |
| R8 | Release notes, rollback table, deploy checklist | Expected: final release notes, deploy checklist, rollback table, ledger SHA updates, task logs. | Shared AI-map docs append only; exact release-note hunks. | Any deploy command, production state mutation, credential printing. | Pending. |

## P0 blockers

1. Telegram webhook authenticity and owner/callback authorization: the listed callback mutation paths below must not be reachable without authentic Telegram delivery plus authorized owner/group/user binding before every mutation:
   - online-order approve/reject;
   - draft confirm/cancel;
   - payment finalize/cancel;
   - customer request status updates;
   - pending AI action execute/cancel.
2. Approve/reject callable auth/role: privileged callable paths must require verified Firebase Auth and server-derived role before business data mutation.

These are blockers before release candidate approval. Existing candidate units are inherited as historical context only until rechecked against these P0 findings.

## Gates

Sprint/unit gates from the approved master plan include:

```bash
git diff --check
node --check functions/index.js
node --check functions/telegram/webhookSecurity.js
npm test -- --runInBand functions/telegram/webhookSecurity.test.js functions/httpEndpointWiring.test.js
npm run test:functions-security
npm run check:functions
npm run test:rules
npm run test:rules:red-evidence
npm ci --ignore-scripts
npm --prefix functions ci --ignore-scripts
npm run check
npx tsc --noEmit -p jsconfig.json
npm run lint
npm test -- --runInBand
npm run check:dependency-audit
npm run build:hosting
npm run verify:hosting-dist
npm run test:browser-smoke
npm run cap:build
git status --short
```

## Sprint 0 verification evidence

Sprint 0 did not edit application runtime source, dependencies, Firestore Rules, Cloud Functions, Hosting config, Capacitor config, production state, or secrets. Verification evidence observed for the clean integration candidate:

- Clean root/functions install and all gates before canonical `cap:build` passed under `set -e`.
- canonical `npm run cap:build` failed because tracked `android/gradlew` mode is `100644` and cannot be executed directly by the npm script.
- Direct bash wrapper attempt under the default incomplete Java 21 failed because `jlink` was missing.
- `JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 bash ./gradlew assembleDebug --no-daemon` passed from `android/`: 108 actionable tasks; APK exists at `android/app/build/outputs/apk/debug/app-debug.apk`; observed size `7,096,863` bytes.
- Result: do **not** claim all-green. The canonical script/file-mode issue is the R7 blocker; P0 security items remain release blockers.

## Rollback prerequisites

Before any deploy-capable unit can be considered release-ready, record:

- exact commit SHA for the unit in this ledger;
- gate output and date;
- impacted deploy surface: source-only, Functions, Hosting, Rules, Capacitor;
- prior known-good Functions source/revision or rollback handle;
- prior known-good Hosting artifact/rollback handle;
- prior Rules file/commit;
- Telegram webhook secret/setWebhook rollback procedure if R1 changes are deployed;
- owner approval checkpoint for each deploy surface.

## Commit SHA placeholders

| Unit | Commit SHA | Gate evidence | Rollback prerequisite recorded |
|---|---|---|---|
| R0 | `PENDING_SPRINT_0_NO_COMMIT_YET` | Sprint 0 docs checks plus recorded clean-candidate gate evidence: root/functions install and gates before canonical `cap:build` passed; canonical `npm run cap:build` failed on tracked `android/gradlew` mode `100644`; direct Java 21 bash wrapper failed missing `jlink`; Java 17 bash wrapper `assembleDebug` passed with 108 actionable tasks and APK size `7,096,863` bytes; dirty-source rescan recorded 86 entries (22 tracked, 64 untracked, 13 tracked paths differ), excluding `.hermes/`, `.understand-anything/`, `firestore-debug.log`. | Documentation-only; no deploy rollback required. |
| R1 | `eb2477a01cce59cae39f95541e2cb1d95088492d` | Sprint 1 telegram webhook authenticity + write-callback owner authorization implemented in `functions/index.js` `exports.telegramWebhook` with new pure helpers `functions/telegram/webhookSecurity.js`. Ordered start-of-POST gate: authenticity `401` (constant-time secret compare, fail-closed) → body-size `413` (256 KiB) → per-IP rate-limit `429` (120/min) before any logging/DB work; owner guard wired via `isAuthorizedTelegramWriteActor({allowlist:getTelegramOwnerChatIds(),...})` (fail-closed when allowlist empty) before every write callback (online-order approve/reject, draft confirm/edit/cancel, customer payment/order/service, pending AI confirm/cancel). `isTelegramWriteCallbackData` classifies all mutating prefixes; forged/unauthorized callbacks are denied with zero DB writes. `TELEGRAM_WEBHOOK_SECRET` param empty default (+ `process.env` local fallback); no secret values committed. Unit tests include a forged-callback matrix (missing/wrong secret → fail closed; owner allowlist match; non-owner denial; write-callback classification). Evidence: `node --check functions/index.js` OK, `node --check functions/telegram/webhookSecurity.js` OK, `npm run check:functions` OK, `webhookSecurity.test.js` 7/7, `webhookWiring.test.js` 5/5, `test:functions-security` file set 43/43 across 9 suites, `git diff --check` clean. | Revert Sprint 1 hunks in `functions/index.js` + new `functions/telegram/webhookSecurity*.js` and `package.json` script additions; no deploy/`setWebhook`/secret rotation performed, so no runtime rollback required. |
| R2 | `PENDING` | `PENDING` | `PENDING` |
| R3 | `PENDING` | `PENDING` | `PENDING` |
| R4 | `PENDING` | `PENDING` | `PENDING` |
| R5 | `PENDING` | `PENDING` | `PENDING` |
| R6 | `PENDING` | `PENDING` | `PENDING` |
| R7 | `PENDING` | Blocked until canonical `npm run cap:build` works without relying on a manual bash wrapper; tracked `android/gradlew` mode is `100644`. | `PENDING` |
| R8 | `PENDING` | `PENDING` | `PENDING` |

## No deploy authority

This ledger does not approve deployment, production database reads/writes, Rules publication, Functions deployment, Hosting deployment, Capacitor APK/OTA publication, Telegram webhook rotation, or secret changes. Owner approval is required separately for each deploy surface.
