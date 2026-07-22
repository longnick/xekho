# Staging Review — 2026-06-02 10:22

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`
Purpose: clear the current dirty tree safely after the tooling cleanup, ESM audit, and ESM Phase E1 harness work.

## Safety rules followed

- No `git add -A`.
- No destructive commands.
- No secret files read or staged.
- No deploy, no production database, no migration, no POS/payment/customer data mutation.
- Staged only explicit path groups.

## Dirty tree classification before cleanup

### Group 1 — tooling/typecheck cleanup

Runtime/tooling files from the post-audit cleanup sprint:

- `package.json`
- `package-lock.json`
- `jsconfig.json`
- `functions/tsconfig.json`
- `app/modules/media-refinery/index.js`
- `app/report/excel.js`
- `app/report/expense.js`
- `functions/index.js`
- `functions/telegram/ads.js`
- `functions/telegram/reports.js`
- `functions/telegram/send.js`
- `docs/ai-map/TASK_LOGS/2026-06-02-0907-tooling-cleanup.md`

Intent:

- Restore local `npm run lint` availability with explicit local ESLint dependency.
- Unblock TypeScript 6 checks via `ignoreDeprecations`.
- Fix frontend/backend `@ts-check` issues.
- Make ads revenue data dependencies explicit via dependency injection.

### Group 2 — ESM audit + E1 harness + AI map docs

ESM and documentation files:

- `app/esm/main.js`
- `app/esm/README.md`
- `index.html`
- `scripts/verify-esm-entry.js`
- `docs/ai-map/ESM_AUDIT.md`
- `docs/ai-map/TASK_LOGS/2026-06-02-0931-esm-audit.md`
- `docs/ai-map/TASK_LOGS/2026-06-02-1008-esm-e1-compat-harness.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/REFACTOR_PROGRESS.md`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/STAGING_REVIEW.md`

Intent:

- Document ESM readiness and blockers.
- Add the safe ESM compatibility harness.
- Record script/load-order relation changes.

## Intentionally unstaged groups

None expected after both commits. If any files remain dirty after cleanup, inspect before staging.

## Verification plan

Before/around commits:

```bash
git diff --cached --check
git diff --cached --stat
git diff --cached --name-status
```

After cleanup:

```bash
node scripts/verify-esm-entry.js
npm run check
npx tsc --noEmit -p jsconfig.json
npx tsc --noEmit -p functions/tsconfig.json
npm run lint -- --max-warnings=9999
node -e "const {execSync}=require('child_process'); console.log(execSync('npx vite build 2>&1',{timeout:60000,encoding:'utf8'}))"
git status --short
```
