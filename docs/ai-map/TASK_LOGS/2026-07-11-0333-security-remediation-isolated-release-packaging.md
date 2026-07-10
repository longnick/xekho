# 2026-07-11 03:33 +07 — Security remediation: isolated release packaging

## Safety boundary

- Packaging workspace: `/home/longnick/projects/xekho-security-packaging`
- Branch: `task/security-release-packaging`
- No deploy, push, credential inspection, production Firestore access, or POS writes.
- The original broad dirty tree remains untouched.

## Reviewable commit series

| SHA | Unit | Evidence |
|---|---|---|
| `d03c957` | Release manifest | Document-only boundary |
| `d909b58` | Rules emulator containment | Persona matrix 15/15, deny evidence 4/4 |
| `8dd9377` | Dependency compatibility | dual clean installs; compatibility 8/8 |
| `e66f5b3` | Render containment | render tests 5/5; syntax/build |
| `55e70d9` | Functions HTTP containment | endpoint security tests 15/15 |
| `f399924` | Managed user provisioning | identity tests + Rules Emulator pass |
| `994b76f` | CI/audit/artifact/browser gates | clean installs, policy, build, artifact, signed-out browser smoke |

## Final local rehearsal on this branch

- Root + Functions clean installs: PASS
- Main Jest: **10 suites / 45 tests** PASS
- Rules persona matrix: **4 suites / 15 tests** PASS
- Rules deny evidence: **1 suite / 4 tests** PASS
- Functions security: **7 suites / 31 tests** PASS
- Functions syntax: PASS
- Dependency policy: PASS; only documented Functions `protobufjs` temporary exception remains, expiry `2026-08-31`
- Hosting build: PASS — 91 files, 1.80 MB
- Artifact verifier: PASS — 17 required paths
- Signed-out browser smoke: PASS — login lock, protected routes blocked
- `git diff --check`: PASS

## Retained release blockers

1. Authenticated synthetic-safe Function E2E is still not evidenced.
2. Real mobile/POS authenticated QA is still not evidenced.
3. Live UID → role → staffId mapping must be owner-reviewed before any Rules deployment.
4. Do not merge/cherry-pick this series into the broad dirty main worktree without a dedicated integration procedure.
5. No deployment approval is implied by this local rehearsal.
