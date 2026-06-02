# Task: Initialize AI code map

Date: 2026-05-31 09:35 UTC

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

AI/Agent: Hermes

User request:
Khởi tạo AI code map cho repo `/home/longnick/projects/xekho`. Chỉ tạo `docs/ai-map`, không sửa source code, không đụng env/token/API key/service account/database/migration/POS data. Đọc cấu trúc repo cấp 2, tạo các file AI map, chạy `git status --short`, báo cáo file đã tạo.

## Before state

- Existing branch: `test/xe-kho-repo-implementer-skill`
- Existing uncommitted files: repo already had many modified/deleted/untracked files before this task, including source/docs/config files and sensitive-file paths shown by `git status --short`. Sensitive contents were not read or logged.
- Relevant AI map files read: none existed under `docs/ai-map/` at task start.
- Relevant source files read:
  - `README.md`
  - `package.json`
  - `functions/package.json`
  - repo structure to depth 2 via `find`

## Goal

Tạo bản đồ code dạng tài liệu để AI/model khác hiểu nhanh repo `xekho` trước khi sửa code trong các task sau.

## Files changed

- `docs/ai-map/PROJECT_OVERVIEW.md`
  - Created overview of repo purpose, commands, folders, services, sensitive file rules, and related repos.
- `docs/ai-map/CODE_MAP.md`
  - Created initial map of frontend, KDS, AI, Firebase Functions, scripts, config, and test/build commands.
- `docs/ai-map/FILE_RELATIONS.md`
  - Created readable dependency/relationship map for major modules.
- `docs/ai-map/CHANGELOG_AI.md`
  - Created AI changelog and logged this initialization task.
- `docs/ai-map/TODO_AI.md`
  - Created future handoff TODO/risk list.
- `docs/ai-map/DECISIONS.md`
  - Created initial decisions about documentation-only map and confirmation-required data mutations.
- `docs/ai-map/TASK_LOGS/2026-05-31-0935-initialize-ai-code-map.md`
  - Created this task log.

## Code relations

This task did not change source code relationships. It documented existing high-level relations:

- `index.html` / `app.js` / `db.js` / `style.css` form the POS frontend path.
- `kitchen.html` and notification-related files support KDS.
- `functions/index.js` is the Firebase Functions entry point and connects to helper modules such as `functions/firestoreMegaTools.js`, `functions/geminiTools.js`, and `functions/vertexAi.js`.
- `ai-core.js`, `ai-actions.js`, `ai-ui.js`, and `DeepSeekRouter.js` form the AI assistant/client-side integration area.
- import/sync/backfill scripts may affect operational/POS data and require explicit user confirmation before running.

## Decisions made

- Keep this task documentation-only under `docs/ai-map/`.
- Do not modify source code.
- Do not read or reveal sensitive file contents.
- Treat deploy/import/backfill/database mutation commands as confirmation-required.

## Verification

Commands run and result:

- `git branch --show-current`
  - Result: `test/xe-kho-repo-implementer-skill`
- `git status --short`
  - Result: dirty working tree existed before task; after task, new `docs/ai-map/` files were added to untracked status.
- `git diff --stat`
  - Result: showed pre-existing modified/deleted files; no source code diff from this task.
- `find /home/longnick/projects/xekho -maxdepth 2 ...`
  - Result: read level-2 repo structure.
- Read `README.md`, `package.json`, `functions/package.json`.

## Remaining issues

- AI map is initial and high-level; exact Cloud Functions endpoint list still needs a dedicated read of `functions/index.js`.
- Existing dirty working tree should be reviewed before any new code edits.
- Sensitive-file paths are present in status; do not expose contents or stage them accidentally.

## Next step

For the next AI/model:

1. Read `docs/ai-map/TODO_AI.md`.
2. Read this task log.
3. Run `git status --short` and `git diff --stat`.
4. Inspect only the source files needed for the user's next task.
5. Update AI map after any code change.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched.

Sensitive file paths appeared in git status, but contents were not read or logged.
