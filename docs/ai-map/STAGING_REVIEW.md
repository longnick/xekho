# Staging Review - Safe Refactor Sprint 4

**Time:** 2026-06-02 00:44
**Repo:** `/home/longnick/projects/xekho`
**Branch:** `test/xe-kho-repo-implementer-skill`

## Purpose

Sprint 4 direction 1: split the large dirty tree into explicit reviewed staging groups without using `git add -A` and without reading secret contents.

## Staged groups

### Security untracking already staged

These are staged as Git deletions only, preserving local files where they exist. Contents were not read or pasted.

- `functions/.env.gcloud-completed-order.yaml`
- `functions/.env.pos-v2-909ff`
- `pos-v2-909ff-firebase-adminsdk-fbsvc-abdca8f1c5.json`
- `project-724ee6ef-5290-41f4-892-a47703f4859e.json`

### Secret/generated ignore rules

- `.gitignore`

### Refactor planning and AI map

- `REFACTOR_PLAN.md`
- `docs/ai-map/`

### Safe compatibility refactor files

- `app/utils/dom.js`
- `app/utils/format.js`
- `store.js`
- partial staged hunk in `app.js`: `_escapeHtml()` delegation only
- partial staged hunk in `index.html`: script-load seam for `app/utils/format.js`, `app/utils/dom.js`, and POS offline Sprint 19 scripts only

### Verification scripts

- `scripts/verify-dom-utils.js`
- `scripts/verify-format-utils.js`
- `scripts/verify-offline-runtime.js`

## Explicitly left unstaged

Left unstaged because these are unrelated, generated, high-impact, data-adjacent, or mixed with pre-existing work:

- generated/cache/log artifacts such as `.firebase/hosting..cache`, `firebase-debug.log`, `functions-list.json`
- high-impact runtime/backend files with broad pre-existing changes: `functions/index.js`, `db.js`, `firestore.rules`, `server.js`, `style.css`, `ai-actions.js`, `DeepSeekRouter.js`
- import/backfill/data scripts: `audit_cleanup_firebase.js`, `import_master.js`, `import_migrated_history_purchases.js`, `sync_master_to_app.js`, `backfill_history_costs.js`, `loadServiceAccount.js`
- unrelated planning/report docs at repo root
- `app/modules/`, `functions/media-refinery.js`, `functions/scripts/`, `brand/`, `prompts/`
- offline runtime source files and extra verification scripts not part of this staged refactor set
- remaining unstaged hunks in `app.js` and `index.html`

## Notes

- No commit was created.
- No deploy was run.
- No production database, migration, POS/payment/customer data, or raw media was touched.
- Credential rotation and Git history cleanup remain owner/manual follow-up tasks.
