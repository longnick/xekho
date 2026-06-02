# AI TODO

## Doing

- `REFACTOR_PLAN.md` execution is progressing sprint-by-sprint.
- Sprint 9 completed Phase 2 Sprint 2.1+2.2: mapped all 35 exports in `functions/index.js`, extracted 11 pure text/formatting utilities into `functions/utils/text.js`.
- Current conservative progress estimate:
  - Total long-term plan including optional TypeScript/CI/build tooling: ~21% complete.
  - Core non-optional refactor/security/testing plan: ~25% complete.
  - Near-term safe-execution track: ~52% complete.

## Next

- Use `docs/ai-map/REFACTOR_PROGRESS.md` and `docs/ai-map/STAGING_REVIEW.md` before further edits to avoid mixing unrelated dirty files.
- Review the current staged set with:
  - `git diff --cached --stat`
  - `git diff --cached --name-status`
- If approved, commit the explicit staged safe set only; otherwise continue splitting remaining dirty paths into smaller reviewed scopes.
- For every next refactor sprint:
  - create backup under `/home/longnick/backups/`
  - write or update deterministic verification first when practical
  - implement the smallest compatibility wrapper
  - run syntax checks, targeted verification, offline verification scripts, `npm test -- --runInBand`, and UTF-8/mojibake checks
- Rotate any credentials that were previously tracked in Git. This is an owner/manual task; do not read or paste secret values.
- Continue avoiding production database, migration files, POS/payment/customer data, and destructive commands.
- Before any coding task, inspect current dirty working tree carefully with:
  - `git status --short`
  - `git diff --stat`
  - targeted `git diff -- <file>` for files to be edited.
- Update this AI map after each future coding/refactor task.
- Expand `CODE_MAP.md` Cloud Functions endpoint/API section after a dedicated read of `functions/index.js`.
- Expand data schema notes after a dedicated read of `README.md`, `db.js`, and relevant Firestore helpers.

## Blocked

- Full 100% refactor completion is not safe as a single unbounded operation because the repo has a large pre-existing dirty tree and production-sensitive paths/history; continue sprint-by-sprint.
- Credential rotation cannot be completed by the agent without secret-owner action.
- Deploy/DB mutation tasks are blocked until the user explicitly confirms scope and credentials/data safety.
- Any task touching secret values, production database, migration, POS data, payment/customer data is blocked until explicitly allowed and backed up.

## Risks

- Repo currently has many modified/untracked/deleted files before this refactor sprint; see `docs/ai-map/REFACTOR_PROGRESS.md`.
- `.gitignore`, `app.js`, and `index.html` already had pre-existing changes; current diff stats include prior work, not only the refactor sprints.
- Sensitive-file paths were removed from Git tracking, but credentials may still need rotation and Git history cleanup.
- `functions/index.js`, `app.js`, `db.js`, and `firestore.rules` are high-impact files; changes may affect production behavior.
- Import/backfill scripts may mutate database/POS history; do not run casually.
- Immediate ES modules/Vite migration may break global script order and browser runtime assumptions; use compatibility-first extraction.

## Done recently

- 2026-06-02 01:44: Safe refactor Sprint 9 (Phase 2 Sprint 2.1+2.2): mapped all 35 exports in `functions/index.js` into CODE_MAP.md, extracted 11 pure text/formatting utilities into `functions/utils/text.js` with delegation wrappers. Progress: ~21% total / ~25% core / ~52% near-term. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-0144-safe-refactor-sprint-9-phase2-mapping-text-utils.md`
- 2026-06-02 01:38: Safe refactor Sprint 8: extracted pure staff helpers into `app/auth/staff.js` IIFE, added 4 compatibility wrappers in `app.js`. Progress: ~19% total / ~23% core / ~48% near-term. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-0138-safe-refactor-sprint-8-auth-staff.md`
- 2026-06-02 01:36: Safe refactor Sprint 7: extracted `openModal`/`closeModal`/`isModalOpen` into `app/ui/modal.js` IIFE, wrapped 6 existing modal functions in `app.js`. Progress: ~18% total / ~22% core / ~45% near-term. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-0136-safe-refactor-sprint-7-modal-ui.md`
- 2026-06-02 01:32: Safe refactor Sprint 6: extracted `applyTheme()` into `app/ui/theme.js` IIFE module with `XekhoApp.ui.applyTheme`, added compatibility wrapper in `app.js`, added `scripts/verify-theme-ui.js`. Progress: ~17% total / ~21% core / ~43% near-term. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-0132-safe-refactor-sprint-6-theme-ui.md`
- 2026-06-02 01:25: Safe refactor Sprint 5: extracted `showToast()` and `repairVietnameseText()` into `app/ui/toast.js` IIFE module with `XekhoApp.ui.*` namespace, added compatibility wrappers in `app.js`, added `scripts/verify-toast-ui.js`. Progress: ~16% total / ~20% core / ~40% near-term. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-0125-safe-refactor-sprint-5-toast-ui.md`
- 2026-06-02 00:44: Safe refactor Sprint 4 direction 1: performed safe staging review, staged only explicit security/docs/refactor paths, documented staged vs unstaged groups in `docs/ai-map/STAGING_REVIEW.md`, and left mixed/high-impact unrelated changes unstaged. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-0044-safe-refactor-sprint-4-staging-review.md`
- 2026-06-02 00:32: Safe refactor Sprint 3: added `app/utils/format.js`, loaded it before `store.js`, kept legacy `store.js` formatter names as wrappers/delegates, added `scripts/verify-format-utils.js`, and updated progress to ~15% total / ~19% core / ~36% near-term. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-0032-safe-refactor-sprint-3-format-utils.md`
- 2026-06-02 00:16: Safe refactor Sprint 2: created `docs/ai-map/REFACTOR_PROGRESS.md`, classified dirty tree path-only, recorded progress percentages, and removed duplicate CODE_MAP runtime verification entry. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-0016-safe-refactor-sprint-2-dirty-tree-progress.md`
- 2026-06-02 00:07: Safe refactor Sprint 1: expanded `.gitignore`, untracked sensitive paths without reading contents, fixed Jest permission blocker, added `app/utils/dom.js`, added `scripts/verify-dom-utils.js`, loaded the DOM utility before `app.js`, delegated `_escapeHtml()` through compatibility wrapper, updated stale offline runtime verification to Sprint 19, and passed verification. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-0007-safe-refactor-sprint-1.md`
- 2026-06-01 18:58: Rewrote `REFACTOR_PLAN.md` into a sprint-safe production refactor plan. Task log: `docs/ai-map/TASK_LOGS/2026-06-01-1858-safe-refactor-plan-rewrite.md`
- 2026-05-31 09:35: Initialized AI code map. Task log: `docs/ai-map/TASK_LOGS/2026-05-31-0935-initialize-ai-code-map.md`
