# Attendance status-bar checkout deployment snapshot

Created: 2026-07-14 23:50 +07
Source worktree: `/home/longnick/projects/xekho`
Source base commit: `d03c95733ac0eebc66871414ae00933437d33b82`
Deployed Hosting version: `f9cb856cda04ffb7`

## Purpose

This is a rollback/audit snapshot for the deployed attendance status-bar checkout change. The source worktree was broadly dirty and contains unrelated workstreams, so this backup branch deliberately stores exact file snapshots and the tracked-file binary diff instead of claiming a clean source integration commit.

## Contents

- `files/`: exact deployed-state copies of the touched runtime, verifier, and AI-map files.
- `worktree-target.patch`: binary Git diff for tracked target files from the original dirty worktree.
- `SHA256SUMS`: checksums for core snapshots and the patch.

## Restore guidance

Do not apply the patch wholesale to an arbitrary branch. Compare it to the intended integration base and selectively apply/reconstruct the attendance workstream after reviewing unrelated dirty changes.

No secrets, production database data, or credentials are included.
