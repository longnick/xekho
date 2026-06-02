# AI Decisions

## 2026-05-31 - Keep AI map documentation-only

Context:
User requested initialization of `docs/ai-map` for `/home/longnick/projects/xekho` and explicitly required no source-code edits and no contact with secrets, database, migrations, POS data, or service accounts.

Decision:
Only files under `docs/ai-map/` were created. Source code, env files, credential files, database files, migrations, and POS data were not edited.

Reason:
The repo already had a dirty working tree. A documentation-only AI map gives future agents context without increasing risk to app behavior or sensitive data.

Impact:
Future coding agents should read the AI map first, then verify against real repo state with git status/diff and actual code.

Revisit when:
A future task needs code edits, repo cleanup, or a clean baseline commit.

## 2026-05-31 - Treat data mutation commands as confirmation-required

Context:
Repo contains import, sync, audit, and backfill scripts that may affect Firebase/Firestore or POS history.

Decision:
Do not run import/backfill/deploy/database mutation commands unless the user explicitly confirms the target and safety scope.

Reason:
These commands can affect production-like business/POS data.

Impact:
Safe inspection/test commands are allowed, but mutation/deploy commands require explicit approval.

Revisit when:
The user asks for a migration, backfill, deploy, or production data task and confirms scope.
