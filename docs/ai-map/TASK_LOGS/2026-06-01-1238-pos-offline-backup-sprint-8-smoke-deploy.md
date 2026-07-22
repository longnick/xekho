# POS Offline Backup Sprint 8 Smoke QA + Hosting Deploy

Time: 2026-06-01 12:38

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

## Goal

Run Sprint 8 browser/static smoke QA for the safe offline backup stack and deploy the static POS frontend to Firebase Hosting.

## Scope

Performed smoke QA and deploy only:

- Confirmed `index.html` loads offline backup scripts in order:
  - `offlineBackup.js`
  - `offlineSync.js`
  - `offlineFirestoreAdapter.js`
  - `offlineRuntime.js`
  - `offlineStatusUI.js`
  - `offlineOrderFallback.js`
  - `offlineOrderFallbackDevTools.js`
- Ran all Sprint 1-7 targeted Node verification scripts.
- Ran local static HTTP smoke against POS HTML/JS/CSS assets.
- Deployed Firebase Hosting only to project `pos-v2-909ff`, site `xe-kho`.
- Ran live HTTPS smoke against deployed offline assets.

Not included:

- No functions deploy.
- No Firestore rules deploy.
- No production DB/POS data mutation.
- No enabling real offline queue writes.
- No auto sync enablement.
- No real iPad touch-session manual QA was possible from this CLI session.

## Files intentionally changed in this sprint

- `.firebase/hosting..cache` updated by Firebase Hosting deploy.
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1238-pos-offline-backup-sprint-8-smoke-deploy.md`

## Verification commands

```bash
python3 -m http.server 4173
curl http://127.0.0.1:4173/
curl http://127.0.0.1:4173/offlineBackup.js
curl http://127.0.0.1:4173/offlineSync.js
curl http://127.0.0.1:4173/offlineFirestoreAdapter.js
curl http://127.0.0.1:4173/offlineRuntime.js
curl http://127.0.0.1:4173/offlineStatusUI.js
curl http://127.0.0.1:4173/offlineOrderFallback.js
curl http://127.0.0.1:4173/offlineOrderFallbackDevTools.js
node --check offlineBackup.js
node --check offlineSync.js
node --check offlineFirestoreAdapter.js
node --check offlineRuntime.js
node --check offlineStatusUI.js
node --check offlineOrderFallback.js
node --check offlineOrderFallbackDevTools.js
node scripts/verify-offline-backup.js
node scripts/verify-offline-sync.js
node scripts/verify-offline-firestore-adapter.js
node scripts/verify-offline-runtime.js
node scripts/verify-offline-status-ui.js
node scripts/verify-offline-order-fallback.js
node scripts/verify-offline-order-fallback-devtools.js
node node_modules/jest/bin/jest.js --runInBand
npx --yes firebase-tools@latest deploy --only hosting --project pos-v2-909ff
curl https://xe-kho.web.app/
curl https://xe-kho.web.app/offlineOrderFallbackDevTools.js
```

## Verification result

Targeted offline verification passed:

```text
✅ offlineBackup Sprint 1 verification passed
✅ offlineSync Sprint 2 verification passed
✅ offlineFirestoreAdapter Sprint 3 verification passed
✅ offlineRuntime Sprint 4 verification passed
✅ offlineStatusUI Sprint 5 verification passed
✅ offlineOrderFallback Sprint 6 verification passed
✅ offlineOrderFallbackDevTools Sprint 7 verification passed
```

Local static smoke passed for:

- `/`
- `/index.html`
- `/offlineBackup.js`
- `/offlineSync.js`
- `/offlineFirestoreAdapter.js`
- `/offlineRuntime.js`
- `/offlineStatusUI.js`
- `/offlineOrderFallback.js`
- `/offlineOrderFallbackDevTools.js`
- `/app.js`
- `/db.js`
- `/style.css`
- `/manifest.json`
- `/firebase-messaging-sw.js`

Jest remains blocked by repo/tooling dependency state:

```text
sh: 1: napi-postinstall: Permission denied
● Validation Error:
Module /home/longnick/projects/xekho/node_modules/jest-circus/build/runner.js in the testRunner option was not found.
```

## Deploy result

Command:

```bash
npx --yes firebase-tools@latest deploy --only hosting --project pos-v2-909ff
```

Result:

```text
✔ hosting[xe-kho]: release complete
✔ Deploy complete!
Hosting URL: https://xe-kho.web.app
```

Post-deploy live smoke passed for:

- `https://xe-kho.web.app/`
- `https://xe-kho.web.app/index.html`
- `https://xe-kho.web.app/offlineBackup.js`
- `https://xe-kho.web.app/offlineSync.js`
- `https://xe-kho.web.app/offlineFirestoreAdapter.js`
- `https://xe-kho.web.app/offlineRuntime.js`
- `https://xe-kho.web.app/offlineStatusUI.js`
- `https://xe-kho.web.app/offlineOrderFallback.js`
- `https://xe-kho.web.app/offlineOrderFallbackDevTools.js`

## Risk notes

- Real queue writes and auto sync are still disabled by design.
- Browser console dry-run helpers are available but require explicit developer invocation.
- Real iPad operational QA should still be done by opening the deployed POS and confirming app boot/login/table UI visually.
- The repo still contains many pre-existing dirty/untracked/deleted files outside this offline backup sprint.

## Next

If live operator testing looks good, next sprint can review dry-run payloads from a real browser session and decide whether to add a guarded enable flag for real offline queue writes.
