# Sprint 0 — Security remediation baseline

- **Time (Asia/Ho_Chi_Minh):** 2026-07-10 10:39
- **Branch:** `task/kilo-fix-20260623-050807`
- **Scope:** local documentation and synthetic Firestore Emulator test foundation only. No production Firebase deploy, POS data access, secret/config edit, migration, reset, stash, or clean operation.

## Dirty-tree classification observed before Sprint 0

| Classification | Paths / status | Sprint-0 handling |
|---|---|---|
| Prior in-progress application work | `app.js`, `db.js`, `index.html`, `style.css`, `vite.config.mjs`, `eslint.config.mjs` modified | Do not overwrite, stage, reset, or claim as Sprint 0. Read-only inspection only. |
| Prior in-progress security-adjacent source | `firestore.rules`, `functions/index.js` modified | Read-only baseline comparison. Sprint 0 will not modify either file. Later security edits must be surgical and separately diffed. |
| Prior documentation work | `docs/ai-map/{CHANGELOG_AI,CODE_MAP,FILE_RELATIONS,TODO_AI}.md` modified plus existing untracked task logs/plans | Do not rewrite historical logs. Sprint 0 adds a new, timestamped log and a new access matrix only. |
| Prior generated / auxiliary work | untracked `.understand-anything/`, `sketches/`, `scripts/scriptable/`, verification scripts, `functions/scriptableFinanceWidget.js` | Out of scope. Never stage as part of this sprint. |
| Sprint 0 artifacts | `.hermes/plans/2026-07-10_101706-xekho-security-quality-remediation.md`, this task log, planned `SECURITY_ACCESS_MATRIX.md`, planned `tests/firestore-rules/**` | Only these new artifacts plus minimal package/harness configuration may be attributed to Sprint 0. |
| Sensitive / never-stage | `functions/index.js.backup-20260509` (path-only inventory); `.env*`, credential files, service-account JSON if present | No file content inspected or copied. No secret values recorded. |

## Baseline findings

1. Existing Rules contain role-bearing user documents and broad authenticated writes. The current behavior must be captured as **RED evidence in the local emulator** before Rules hardening begins.
2. The repository has no installed `@firebase/rules-unit-testing` package. `npx firebase-tools` resolves to Firebase CLI `15.23.0`; a pinned local Rules-test dependency will be added only for synthetic emulator tests.
3. Current root scripts include `test`, `check`, and `build:hosting`; they are the Sprint 0 regression gate.
4. `firebase.json` already points Firestore at `firestore.rules`; it lacks an explicit emulator block. Any addition will be local-test configuration only.

## Scope boundary / rollback

- **No deployment in Sprint 0.** `firebase deploy`, Firestore REST writes, and production functions are prohibited.
- All emulator documents use `*.test` identities and the emulator project id, never production `pos-v2-909ff`.
- Rollback is limited to deleting the new test/documentation files and reverting package/harness-only configuration; no existing business source is modified in this sprint.

## Execution result

### RED security evidence (local emulator only)

The explicit RED command completed with the expected non-zero result: all four `assertFails` assertions reported **“Expected request to fail, but it succeeded.”** This proves, without touching production data, that the current Rules allow an ordinary signed-in actor to:

1. elevate their own role;
2. edit another user profile;
3. manipulate completed financial history; and
4. change another staff member’s daily payroll record.

### Harness and E2E gates

| Gate | Result |
|---|---|
| Firestore Emulator control suite (`npm run test:rules`) | PASS — 2/2, one signed-in allow path and one unauthenticated deny path. |
| Local POS browser smoke | PASS — Vite `http://127.0.0.1:4177/` returned HTTP 200; login/attendance lock screen rendered; browser console had 0 JS errors; no credentials, attendance actions, or Firebase writes were performed. |
| `npm run check` | PASS |
| `npm test -- --runInBand` | PASS — 4 suites / 24 tests. Rules tests are intentionally excluded from default Jest because they require the Emulator; the dedicated `test:rules` script is the Rules gate. |
| `npm run build:hosting` | PASS — hosting dist prepared. Existing classic-script Vite notices were non-fatal and pre-existing architecture warnings. |
| JSON parse + `git diff --check` | PASS |
| Added-file secret assignment scan | PASS — no findings. |

### Local prerequisite installed

The Firebase CLI required Java 21 while the host had Java 17. Installed `openjdk-21-jre-headless` from the Ubuntu repository (approximately 203 MB installed footprint) and confirmed `java -version` reports 21.0.11. No application runtime, Firebase configuration, or production service was restarted or deployed.

## Next gate

Sprint 0 is complete. Sprint 1 may begin only with the access matrix as its contract: first replace the unsafe client role-provisioning/role-management flow with an authenticated backend path, then tighten Rules and promote the RED evidence cases into normal passing regression tests. No Rules deployment occurred in Sprint 0.
