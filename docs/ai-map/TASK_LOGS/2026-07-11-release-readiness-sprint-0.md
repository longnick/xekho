# 2026-07-11 — Release Readiness Sprint 0

Repo: `/home/longnick/projects/xekho-release-readiness`
Branch: `task/release-readiness-20260711`
Reviewed base SHA: `5b103bfc853639d1b237084c42fc9ab23a0d9900`
Source dirty tree (read-only): `/home/longnick/projects/xekho`

## Objective

Establish Sprint 0 release-readiness documentation in the clean integration worktree without changing application source behavior, dependencies, Rules, Functions, Hosting config, Capacitor config, or production state.

## Changes

- Copied the approved master plan from the source dirty tree to `docs/ai-map/RELEASE_READINESS_MASTER_PLAN.md` in the integration worktree.
- Created and corrected `docs/ai-map/RELEASE_UNIT_LEDGER.md` with R0-R8 unit definitions, included/future paths, mixed-file hunk-staging rules, excluded workstreams, P0 blockers, gates, rollback prerequisites, commit placeholders, no-deploy authority, dirty-source rescan evidence, and accurate Sprint 0 verification evidence.
- Updated shared AI-map docs with Sprint 0 status and cross-links:
  - `docs/ai-map/TODO_AI.md`
  - `docs/ai-map/CHANGELOG_AI.md`
  - `docs/ai-map/FILE_RELATIONS.md`
- Added only the approved local/generated ignore rules to `.gitignore`:
  - `.hermes/`
  - `.understand-anything/`
  - `firestore-debug.log`

## Scope controls

- No application runtime source changed.
- No dependencies or lockfiles changed.
- No Firestore Rules, Functions, Hosting config, Capacitor runtime/config, deploy, production data, or secret files touched.
- No `git add`, commit, reset, stash, clean, deploy, or database operation run.

## P0 and R7 blockers recorded

- P0 Telegram callback mutation paths require authentic Telegram delivery plus owner/group/user binding before every mutation:
  - online-order approve/reject;
  - draft confirm/cancel;
  - payment finalize/cancel;
  - customer request status updates;
  - pending AI action execute/cancel.
- P0 approve/reject callable paths require verified Firebase Auth and server-derived role before business data mutation.
- R7 remains blocked because canonical `npm run cap:build` fails when invoking tracked `android/gradlew` with mode `100644`; this must be fixed before the release gate can be called all-green.

## Verification

Clean integration candidate evidence recorded in Sprint 0 docs:

- Clean root/functions install and all gates before canonical `cap:build` passed under `set -e`.
- Canonical `npm run cap:build` failed because tracked `android/gradlew` mode is `100644`.
- Direct bash wrapper attempt under the default incomplete Java 21 failed because `jlink` was missing.
- `JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 bash ./gradlew assembleDebug --no-daemon` passed from `android/`: 108 actionable tasks; APK exists at `android/app/build/outputs/apk/debug/app-debug.apk`; observed size `7,096,863` bytes.
- Dirty-source rescan evidence from `/home/longnick/projects/xekho`: 86 entries total, 22 tracked, 64 untracked, 13 tracked paths differ from the clean candidate; excluded local/generated `.hermes/`, `.understand-anything/`, `firestore-debug.log`.
- Documentation correction verification run after this reviewer-gap fix:
  - `git diff --check`
  - structural assertions for ledger headings/evidence
  - scoped `git status --short`

## Status

- R0: Sprint 0 documentation scope passed after spec-compliance corrections.
- Overall release gate: **blocked**, not all-green.
  - P0 security items remain unresolved.
  - R7 canonical Capacitor wrapper mode/script issue remains unresolved.
- R1-R8: pending; prior candidate units are inherited historical context and unverified against the new P0 findings.

## Next step

Sprint 1 only after review: implement and verify P0 Telegram webhook authenticity/owner callback authorization and approve/reject callable auth/role containment, using exact hunks in the clean integration worktree. Separately fix R7 canonical Capacitor wrapper/file-mode issue before claiming a fully green release gate.

## Safety notes

No secrets, database, migration, POS data, payment/customer data, raw media, deploy, staging, commit, reset, stash, clean, or production operation were touched.
