# XE KHÔ Release Readiness Master Plan

> **For Hermes:** Execute task-by-task with `subagent-driven-development`; require spec review and code-quality/security review after every sprint.

**Goal:** Đưa repo `xekho` từ dirty remediation tree thành một release candidate có nguồn gốc commit rõ ràng, kiểm thử tái lập, bảo mật chấp nhận được, có rollback và đủ bằng chứng để owner quyết định deploy.

**Architecture:** Không sửa/phát hành trực tiếp từ working tree hiện tại. Giữ nguyên dirty tree làm nguồn tham khảo, hoàn thiện từng security component bằng TDD, rồi tái dựng các release unit trong worktree tích hợp sạch. Backend tương thích ngược được triển khai trước, Hosting sau, Firestore Rules cuối cùng.

**Tech stack:** Legacy classic-script/IIFE frontend, Vite hosting build, Firebase Hosting/Auth/Firestore/Cloud Functions v2, Node 22, Jest, Firestore Emulator, Puppeteer, Capacitor Android.

**Created:** 2026-07-11 +07
**Source branch:** `task/kilo-fix-20260623-050807`
**Status:** PLAN — no deployment authority.

---

## 1. Release scope decision

### In scope for this release

1. Web POS / Firebase Hosting.
2. Cloud Functions required by the Web POS and existing Telegram/Zalo/attendance integrations.
3. Firestore Rules security containment.
4. Capacitor Android wrapper built from the verified Hosting artifact.
5. CI, test harnesses, artifact verification, dependency policy and release documentation.

### Explicitly out of scope

- `android-native/` Kotlin/Compose application: **paused/non-release**. Its current JDK compiler failure is tracked but does not block this Web + Capacitor release.
- Full ESM/Vite rewrite, full `app.js` or `functions/index.js` modularization.
- New product features, UI redesign, database migration/backfill, production data cleanup.
- Secret rotation/history rewrite unless the credential owner separately approves exact scope.

### Release invariants

- Never release from a dirty working tree.
- Never use `git add -A`, `git add .`, `git commit -a`, force push, hard reset, or blanket lockfile staging.
- No production DB writes during validation.
- No Rules/Functions/Hosting deploy without separate explicit owner approval.
- Rules deploy last and only after compatible callers and role/staff mappings are verified.

---

## 2. Severity and acceptance policy

| Severity | Release rule |
|---|---|
| P0 | Must be fixed and covered by executable regression/E2E tests. Zero open P0. |
| P1 | Must be fixed, or explicitly accepted by owner with owner, rationale, compensating control and expiry. |
| Critical dependency | Must be removed or covered by a specific, non-expired advisory allowlist plus isolated migration evidence. |
| High dependency | Must be visible; release gate fails unless fixed or individually time-bound/owned. |
| P2/P3 | May be deferred if documented, non-regressive and not on a privileged write/paid-AI boundary. |

---

# Sprint 0 — Freeze scope and establish a clean integration base

**Objective:** Prevent unrelated attendance/Zalo/Scriptable/Android work from contaminating the security release.

**Files:**
- Modify: `docs/ai-map/RELEASE_MANIFEST_SECURITY_REMEDIATION.md`
- Create: `docs/ai-map/RELEASE_UNIT_LEDGER.md`
- Modify: `.gitignore` only for local/generated paths after reviewing exact changes.

**Steps:**

1. Record source baseline:
   ```bash
   git branch --show-current
   git status --short
   git diff --stat
   git diff --cached --name-only
   git worktree list --porcelain
   ```
   Expected: staged set empty; broad dirty tree documented.
2. Classify every modified/untracked path into R0–R8, unrelated workstream, generated artifact, or blocked/sensitive path.
3. Declare `android-native/` paused/non-release in the ledger; retain Capacitor `android/` as the Android release target.
4. Add ignore/cleanup policy for `.hermes/`, `.understand-anything/`, and `firestore-debug.log`; do not remove files destructively during this sprint.
5. Create a clean integration worktree from the manifest commit/base:
   ```bash
   git worktree add -b task/release-readiness-20260711 \
     /home/longnick/projects/xekho-release-readiness <reviewed-base-sha>
   ```
6. Run baseline gates in the clean worktree before applying any unit.

**Exit gate:** clean integration worktree; release ledger names every unit and excluded path; no source behavior changed.

**Commit:** `docs: define release readiness scope and units`

---

# Sprint 1 — P0 Telegram webhook authenticity and callback authorization

**Objective:** Make forged HTTP callback payloads unable to mutate orders, payments, drafts or pending AI actions.

**Files:**
- Modify: `functions/index.js:4365-4720`
- Create: `functions/telegram/webhookSecurity.js`
- Create: `functions/telegram/webhookSecurity.test.js`
- Modify/Create: source-wiring test under `functions/`
- Modify: relevant Telegram deploy/verifier documentation.

**TDD steps:**

1. Add failing unit tests for constant-time secret comparison and missing/invalid secret rejection.
2. Add failing source-wiring tests proving the secret check and owner/group authorization precede every write callback branch.
3. Implement `TELEGRAM_WEBHOOK_SECRET` as a Firebase secret/parameter; never hard-code it.
4. Reject missing/invalid `X-Telegram-Bot-Api-Secret-Token` before logging/parsing actionable content.
5. Add request body cap and safe per-IP/provider rate protection before callback work.
6. Require owner or explicitly configured operational group/user authorization before:
   - online-order approve/reject;
   - draft cancel/confirm;
   - payment finalize/cancel;
   - customer request status changes;
   - pending AI action execute/cancel.
7. Bind callback record to expected chat/user/creator where the stored model supports it.
8. Keep public `/chatid` and non-sensitive flows only if intentionally permitted; they still require authentic Telegram delivery.

**Focused verification:**
```bash
node --check functions/index.js
node --check functions/telegram/webhookSecurity.js
npm test -- --runInBand functions/telegram/webhookSecurity.test.js functions/httpEndpointWiring.test.js
```

**Synthetic E2E:** local Functions Emulator or direct handler harness:
- missing secret → `401/403`, zero writes;
- wrong secret → `401/403`, zero writes;
- valid secret + unauthorized user → safe denial, zero reads/writes before guard;
- valid secret + owner + valid callback → exactly one expected mutation;
- replayed callback → idempotent/no duplicate action.

**Exit gate:** zero callback write path reachable before authenticity + authorization; tests RED→GREEN.

**Commit:** `fix: authenticate and authorize Telegram callback writes`

**Deploy dependency:** secret creation + `setWebhook(secret_token=...)` require explicit owner approval; never rotate blindly.

---

# Sprint 2 — P0/P1 callable authorization

**Objective:** Require verified Firebase identity and server-derived roles for online-order approval/rejection and every privileged callable.

**Files:**
- Modify: `functions/index.js:3507-3593`
- Modify/Create: `functions/userManagementService.test.js` or dedicated callable authorization test.
- Create: callable handler factory/pure authorization helper only if needed for testability.

**Steps:**

1. Write failing tests: unauthenticated denied; staff denied; manager/admin allowed.
2. Require `request.auth` before reading or mutating business data.
3. Resolve role from `users/{uid}` server-side; verified custom-claim fallback only when the user document is absent.
4. Validate request ID and allowed status transition before mutation.
5. Add idempotency tests for already-approved/rejected requests.
6. Run an Auth + Firestore + Functions Emulator E2E using synthetic `@example.com` identities.

**Verification:**
```bash
npm run test:functions-security
npm run check:functions
```

**Exit gate:** every privileged callable has unauthenticated, unauthorized and authorized executable cases.

**Commit:** `fix: enforce role guards on privileged callables`

---

# Sprint 3 — Public customer-request abuse containment

**Objective:** Preserve customer ordering while preventing malformed/spam documents from triggering operational workflows.

**Files:**
- Modify: `firestore.rules:75-131`
- Modify: `tests/firestore-rules/*`
- Modify: customer request triggers in `functions/index.js:5252-5470` only if server validation is added.
- Modify: `docs/ai-map/SECURITY_ACCESS_MATRIX.md`.

**Steps:**

1. Add RED Rules tests for extra fields, wrong types, negative totals, oversized item arrays/strings, invalid table/status/source and unauthorized transitions.
2. Replace create validators with `keys().hasOnly(...)` + exact required/optional fields.
3. Add primitive type, length, item-count, quantity and price bounds.
4. Do not trust customer `totalPrice`; server-side approval must recalculate from canonical menu IDs/prices.
5. Restrict staff updates to allowed status-transition field sets; admin-only delete.
6. Add server-trigger payload validation before Telegram/log/paid work.
7. Decide and implement one abuse boundary: App Check, signed table/customer session, or gateway rate limit. CAPTCHA/stealth bypass is prohibited.

**Verification:**
```bash
npm run test:rules
npm run test:rules:red-evidence
npm test -- --runInBand
```

**Exit gate:** malformed public documents denied; valid webapp-menu payload remains compatible; trigger spam path bounded.

**Commit:** `fix: constrain public customer request contracts`

---

# Sprint 4 — Firestore signed-in authorization closure

**Objective:** Remove broad authenticated write/read access that exceeds the role model.

**Files:**
- Modify: `firestore.rules`
- Modify: `tests/firestore-rules/pos-data.rules.test.js`
- Modify: caller code only when required for compatibility.

**Required decisions/tests:**

1. `tables` / `orders`: allow only explicit operational roles; keep kitchen field-limited transition.
2. `kitchen_notifications`: update only allowed acknowledgement/status fields by appropriate roles.
3. `aiHistory`: scope by owner UID or move writes through backend.
4. `pending_users`: self/request-only create with field allowlist; manager/admin/backend read/update/delete.
5. `System_Logs`: cap append fields and bind actor UID where browser append remains necessary.
6. Test anonymous, ordinary authenticated, staff, kitchen, manager/admin personas for every changed collection.
7. Confirm live UID → role → staffId mappings read-only before any Rules deployment.

**Exit gate:** ordinary authenticated user cannot mutate another user, privileged POS/finance state or global AI/pending-user records; legitimate POS/kitchen/attendance paths pass Emulator tests.

**Commit:** `fix: close signed-in Firestore privilege gaps`

---

# Sprint 5 — HTTP, paid-AI, upload and SSRF hardening

**Objective:** Apply a consistent application-layer policy to sensitive `onRequest` endpoints.

**Files:**
- Modify: `functions/utils/httpSecurity.js`
- Modify: `functions/index.js` endpoint blocks
- Modify/Create: `functions/httpEndpointWiring.test.js`, helper tests.

**Steps:**

1. Add route-specific CORS allowlist for browser endpoints; no blanket `origin: true` for all routes.
2. `adminUploadMenuImage`:
   - declared and decoded size cap;
   - image MIME/magic-byte/dimension validation;
   - per-UID rate limit.
3. `adminGenerateMenuDescription`:
   - allow trusted Firebase Storage/menu asset origins only;
   - HTTPS only;
   - deny loopback/private/link-local/metadata destinations;
   - timeout, redirect and byte cap.
4. Add rate/body caps to all paid-AI/admin probe/image/description endpoints.
5. Return generic client errors; keep internals server-side.
6. Remove unnecessary project/auth metadata from diagnostics or keep endpoint owner-only with explicit diagnostic mode.
7. Verify auth/size/rate checks execute before Firestore/network/Vertex/Storage work.

**Exit gate:** each sensitive HTTP route is classified and has auth contract, role, size, rate, CORS, error policy and test evidence.

**Commit:** `fix: standardize HTTP and paid AI security controls`

---

# Sprint 6 — Dependency remediation and policy tightening

**Objective:** Remove or explicitly own production dependency risk in both lockfiles.

**Files:**
- Modify: root `package.json`, `package-lock.json`
- Modify: `functions/package.json`, `functions/package-lock.json`
- Modify: `scripts/check-dependency-audit.js`
- Modify: `scripts/dependency-audit-allowlist.json`
- Modify: compatibility tests and `DEPENDENCY_SECURITY_BASELINE.md`.

**Sub-sprints:**

### 6A — Admin/Functions migration spike
1. Isolated fixture for compatible `firebase-functions` + `firebase-admin` upgrade.
2. Test Admin namespace/modular APIs, Auth, Firestore, Storage, Functions export loading.
3. Run Auth/Firestore/Functions Emulator E2E.
4. Adopt only if the critical `protobufjs` path is actually removed and peer contracts remain valid.

### 6B — NLP isolation/replacement
1. Put Functions NLP behind an adapter.
2. Preserve Vietnamese fixtures: order, checkout, inventory, sales and purchase intents.
3. Reject alpha-only migration if `xlsx` high remains.
4. Prefer removing parser/spreadsheet subdependencies from the live voice path.

### 6C — CI policy
1. Critical: fail unless exact advisory allowlist entry is valid.
2. High: fail unless individually allowlisted with graph, package, advisories, owner, reason and expiry.
3. Moderate/low: publish sanitized counts.
4. Keep exception expiry before 2026-08-31 or remove the exception.

**Verification:**
```bash
npm ci --ignore-scripts
npm --prefix functions ci --ignore-scripts
npm audit --omit=dev --json
npm --prefix functions audit --omit=dev --json
npm run check:dependency-audit
npm test -- --runInBand
```

**Exit gate:** no unowned critical/high production finding; both lockfiles reproduce from clean install.

**Commit strategy:** one commit per dependency family; never combine unrelated lockfile churn.

---

# Sprint 7 — CI, artifact and static-analysis completion

**Objective:** Make release gates cover all shipped code and prevent internal/generated files from entering Hosting.

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: root and `functions/package.json`
- Modify: `scripts/build-hosting-dist.js`
- Modify: `scripts/verify-hosting-dist.js`
- Modify: ESLint/jsconfig scope.

**Steps:**

1. Add Functions-local scripts: `check`, `test`, `lint`, `audit`.
2. Replace manually enumerated syntax/test lists with discovery or a maintained export inventory test.
3. Expand lint/type/syntax coverage to `db.js`, AI modules, Store, offline modules and `functions/**/*.js`.
4. Clean current warnings; then enforce zero warnings.
5. Remove `package.json` from `dist`; generate minimal public `build-info.json` only if required.
6. Make artifact verifier reject package/lockfiles, docs/scripts, logs, mobile projects, backups and credential-looking paths.
7. Add clean-tree/source provenance check to release workflow.
8. Do not add `android-native` CI while it is paused; add a documented diagnostic workflow only if the native product is reactivated.

**Exit gate:** required CI jobs pass on a clean clone with no credentials and no production calls.

**Commit:** `ci: enforce complete release gates`

---

# Sprint 8 — Reconstruct reviewable release units in a clean worktree

**Objective:** Produce a reproducible commit series without absorbing unrelated dirty work.

**Release units:**

| Unit | Scope |
|---|---|
| R0 | Manifest, ledger, plan, ignore policy |
| R1 | Telegram webhook + callable containment |
| R2 | Firestore public/signed-in Rules + tests |
| R3 | HTTP/paid-AI containment + browser token callers |
| R4 | Dependency families + compatibility tests |
| R5 | Hosting auth/render containment + artifact boundary |
| R6 | CI only after all referenced scripts/tests exist |
| R7 | Capacitor build metadata/artifact verification |
| R8 | Release notes, rollback table, deploy checklist |

**Packaging steps:**

1. Apply only classified whole files or exact hunks to `/home/longnick/projects/xekho-release-readiness`.
2. For mixed files (`app.js`, `db.js`, `functions/index.js`, Rules, package/lockfiles), review/stage exact hunks only.
3. Run focused gate after each unit.
4. Commit each unit separately and record SHA, impact and rollback prerequisite in `RELEASE_UNIT_LEDGER.md`.
5. Ensure CI commit comes last.
6. Never merge the isolated branch into the broad dirty branch as a shortcut; use a dedicated clean integration branch.

**Exit gate:** clean `git status`; reviewable linear commit series; full gate green from clean installs.

---

# Sprint 9 — Synthetic authenticated E2E

**Objective:** Prove security and behavior through real local Firebase handlers, not source markers alone.

**Environment:** temporary local config outside repo; synthetic project and `@example.com` identities only.

**Required E2E:**

1. Auth + Firestore + Functions Emulators.
2. Seed identities using Admin SDK connected to Emulator:
   - ordinary authenticated;
   - staff;
   - kitchen;
   - manager/admin;
   - owner custom claim if required.
3. Verify:
   - privileged HTTP unauth → `401`;
   - insufficient role → `403`;
   - allowed route → expected `200`;
   - callable approval/rejection role matrix;
   - forged Telegram secret/owner/callback matrix;
   - Rules persona matrix;
   - no unexpected document writes.
4. Locally serve `dist` and run authenticated browser E2E with seeded fixture data.

**Exit gate:** executable report with request/result/write assertions; zero production credential/data dependency.

---

# Sprint 10 — Browser, mobile and Capacitor release QA

**Objective:** Verify the actual operator surfaces after security changes.

**Viewports:** at least `375x667`, `390x844`, tablet, `1440x900`.

**Web flows:**

- login/auth lock;
- Bàn → create/edit/checkout/cancel order;
- kitchen role restrictions;
- Kho read/write authorization;
- finance/report visibility by role;
- attendance check-in/out, overnight and wage display;
- offline queue/manual retry;
- public customer order/service/payment request compatibility;
- no console/page/request errors or horizontal overflow.

**Capacitor:**

```bash
npm run cap:build
```

Then verify APK exists, version metadata, forbidden filename/content scan and real-device smoke. Do not enable OTA auto-update or production write changes in this release.

**Exit gate:** signed QA report with device/browser/version, screenshots, failures and final PASS/FAIL. Any POS/payment/auth failure blocks release.

---

# Sprint 11 — Staged deployment and rollback

**Objective:** Deploy only an owner-approved, clean, verified commit series.

## Approval checkpoints

Owner must separately select:

- [ ] CI/source merge
- [ ] Functions deploy scope
- [ ] Hosting deploy scope
- [ ] Firestore Rules deploy scope
- [ ] Telegram webhook secret/setWebhook change
- [ ] Capacitor APK/OTA publication

## Deployment order

1. Record current production revisions/config names without printing secret values.
2. Deploy backward-compatible Functions subset first.
3. Configure Telegram webhook secret and update provider webhook atomically; immediately run valid/invalid secret smoke.
4. Deploy Hosting after Functions compatibility smoke.
5. Run authenticated Web/real-device smoke.
6. Deploy Firestore Rules last, only after live role/staff mapping read-only review and caller compatibility.
7. Publish Capacitor artifact only after Web/Functions/Rules are stable.

## Rollback plan

- Functions: redeploy prior known-good source/revision; restore old webhook only through owner-approved secret rotation procedure.
- Hosting: `firebase hosting:rollback` or redeploy prior known-good artifact.
- Rules: keep prior Rules file/commit and redeploy immediately if legitimate caller denials occur.
- Capacitor: do not push OTA until server release is stable; retain previous APK/manifest.

**Post-deploy smoke:** unauthorized 401/403, owner Telegram callback, customer request, staff POS order, payment close, finance read, attendance, kitchen notification, logs/error rate.

**Exit gate:** all smoke checks pass; rollback handles recorded; no secret exposed in logs/docs.

---

# Sprint 12 — Monitoring and release closeout

**Objective:** Convert the deployed state into an auditable release.

1. Monitor 24 hours for Functions 4xx/5xx, callback failures, Rules denials, notification spam and AI spend anomalies.
2. Compare operational metrics with pre-release baseline.
3. Remove temporary diagnostic logging that could contain user text or payload details.
4. Record residual P2/P3 debt with owner and next review date.
5. Update `CHANGELOG_AI.md`, `TODO_AI.md`, `FILE_RELATIONS.md`, `CODE_MAP.md` where structure changed and final release task log.
6. Tag release only from clean reviewed SHA.

---

# Required full gate stack

Run from the clean integration worktree:

```bash
npm ci --ignore-scripts
npm --prefix functions ci --ignore-scripts
npm run check
npx tsc --noEmit -p jsconfig.json
npm run lint
npm test -- --runInBand
npm run check:functions
npm run test:functions-security
npm run test:rules
npm run test:rules:red-evidence
npm run check:dependency-audit
npm run build:hosting
npm run verify:hosting-dist
npm run test:browser-smoke
npm run cap:build
git diff --check
git status --short
```

Expected: all required commands pass; clean worktree after generated-output cleanup; no production call.

---

# Definition of Release Ready

The repo is **source-release-ready** only when:

- [ ] Zero open P0.
- [ ] Every P1 fixed or owner-accepted with expiry/compensating control.
- [ ] Clean integration worktree and reproducible dual-lockfile installs.
- [ ] Telegram authenticity + callback authorization tests pass.
- [ ] Callable role E2E passes.
- [ ] Firestore Rules persona/abuse tests pass.
- [ ] Authenticated Functions and browser E2E pass.
- [ ] Hosting artifact contains only public runtime assets.
- [ ] Dependency critical/high policy passes without hidden/unowned findings.
- [ ] Web mobile/desktop and Capacitor real-device QA pass.
- [ ] Release unit ledger contains SHAs, gates and rollback prerequisites.

The repo is **production-release-ready** only after the above plus:

- [ ] Owner approves exact deploy components.
- [ ] Pre-deploy production role/staff mapping review passes.
- [ ] Staged Functions → webhook → Hosting → Rules smoke passes.
- [ ] Rollback has been rehearsed/documented.
- [ ] No secret/token/raw production data appears in commits, logs or task docs.

---

# Estimated execution structure

| Phase | Sprints | Nature | Approximate effort |
|---|---|---|---|
| Containment | 0–2 | Highest priority | 1–2 focused days |
| Data/API hardening | 3–5 | Security + compatibility | 2–4 focused days |
| Dependency/CI/package | 6–8 | Migration + release engineering | 2–4 focused days |
| E2E/QA | 9–10 | Emulator + real device | 1–3 focused days |
| Deploy/monitor | 11–12 | Owner-gated | staged over 1–2 days |

Estimates assume bounded sprints, no secret rotation/history rewrite, no database migration and no reactivation of `android-native`.
