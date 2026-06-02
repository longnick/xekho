# 2026-06-02 10:22 — Safe dirty tree cleanup

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`
Task: Clean the dirty tree safely after tooling cleanup and ESM E1 work.

## Scope

User asked to continue and clear dirty files safely. The cleanup is performed as explicit path group commits, never with `git add -A`.

## Planned commit groups

1. `chore: restore lint and typecheck tooling`
   - Tooling/typecheck cleanup files.
   - Explicit backend dependency injection fix for ads revenue data helpers.
   - Tooling task log.

2. `feat: add esm compatibility harness`
   - ESM audit and E1 harness.
   - `index.html` module-script load order change.
   - AI map updates and staging review.

## Safety notes

- No secrets read or staged.
- No deploy.
- No production database or POS/customer/payment data touched.
- No destructive git commands.
- `git add -A` not used.

## Verification target

- `git diff --cached --check` before each commit.
- Final `git status --short` should be clean.
- Final verification should include ESM verify, syntax check, frontend/backend tsc, lint, and Vite build.
