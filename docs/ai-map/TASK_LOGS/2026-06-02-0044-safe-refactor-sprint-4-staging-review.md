# Task Log: Safe refactor Sprint 4 - explicit staging review

**Time:** 2026-06-02 00:44
**Repo:** `/home/longnick/projects/xekho`
**Branch:** `test/xe-kho-repo-implementer-skill`
**Agent:** Hermes

## Goal

Execute Sprint 4 direction 1: safely split the dirty tree by reviewing/staging only explicit security/docs/refactor paths, without staging unrelated production-adjacent work.

## Backup

Created external backup before editing Sprint 4 AI-map docs:

- `/home/longnick/backups/xekho-refactor-sprint4-safe-staging-20260602-004419`

## What was staged

Used explicit `git add` paths and partial cached patches only. Did not use `git add -A`.

### Already staged security untracking

These remain staged as Git deletions only; secret contents were not read or pasted:

- `functions/.env.gcloud-completed-order.yaml`
- `functions/.env.pos-v2-909ff`
- `pos-v2-909ff-firebase-adminsdk-fbsvc-abdca8f1c5.json`
- `project-724ee6ef-5290-41f4-892-a47703f4859e.json`

### Staged safe groups

- `.gitignore`
- `REFACTOR_PLAN.md`
- `docs/ai-map/`
- `app/utils/dom.js`
- `app/utils/format.js`
- `store.js`
- partial cached hunk in `app.js`: `_escapeHtml()` delegation only
- partial cached hunk in `index.html`: script-load seam for format/dom/offline scripts only
- `scripts/verify-dom-utils.js`
- `scripts/verify-format-utils.js`
- `scripts/verify-offline-runtime.js`

## What was left unstaged

Left unstaged intentionally:

- generated/cache/log artifacts
- high-impact broad runtime/backend changes
- import/backfill/data scripts
- unrelated root planning docs
- media-refinery modules/assets/prompts
- remaining mixed hunks in `app.js` and `index.html`
- extra offline source/verification files not part of this staged set

See `docs/ai-map/STAGING_REVIEW.md` for the staging manifest.

## Safety notes

- No commit was created.
- No deploy was run.
- No production database, migration, POS/payment/customer data, or raw media was touched.
- No secret contents were read or exposed.
- Credential rotation and Git history cleanup remain owner/manual tasks.

## Verification

Ran/checked:

```bash
git branch --show-current
git status --short
git diff --stat
git diff --cached --stat
git diff --cached --name-status
git diff --cached --check
node --check app/utils/format.js
node --check store.js
node --check scripts/verify-format-utils.js
node scripts/verify-format-utils.js
node scripts/verify-dom-utils.js
node --check app.js
node scripts/verify-offline-runtime.js
node scripts/verify-offline-status-ui.js
npm test -- --runInBand
UTF-8/mojibake scan on touched Sprint 4 docs
```

## Next

If the staged set looks correct, commit only this explicit staged set. Otherwise continue splitting the remaining dirty tree into smaller reviewed scopes; do not stage all remaining files.
