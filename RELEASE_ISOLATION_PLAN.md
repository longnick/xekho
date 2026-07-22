# RELEASE ISOLATION PLAN

## Scope

Repo covered in this isolation step:

- `D:\APP - BACKUP\xekho`

Reference docs reviewed:

- [TECH_AUDIT.md](./TECH_AUDIT.md)
- [OWNERSHIP_MAP.md](./OWNERSHIP_MAP.md)
- [PRE_DEPLOY_CHECK_REPORT.md](./PRE_DEPLOY_CHECK_REPORT.md)

This step does not deploy, revert, delete, or rename anything.

## Current Worktree Snapshot

Commands reviewed:

```powershell
cd "D:\APP - BACKUP\xekho"
git status
git diff --stat
git diff --name-status
```

Current changed files seen in worktree:

- `.firebase/hosting..cache`
- `.gitignore`
- `DEPLOYMENT_GUIDE.md`
- `DeepSeekRouter.js`
- `README.md`
- `ai-actions.js`
- `audit_cleanup_firebase.js`
- `db.js`
- `firebase-debug.log` deleted
- `functions-list.json` deleted
- `functions/index.js`
- `import_master.js`
- `import_migrated_history_purchases.js`
- `index.html`
- `pos-v2-909ff-firebase-adminsdk-fbsvc-abdca8f1c5.json` deleted
- `project-724ee6ef-5290-41f4-892-a47703f4859e.json` deleted
- `server.js`
- `sync_master_to_app.js`
- `OWNERSHIP_MAP.md` untracked
- `PRE_DEPLOY_CHECK_REPORT.md` untracked
- `TECH_AUDIT.md` untracked
- `loadServiceAccount.js` untracked

Diff summary from tracked files:

- `18` tracked files changed
- `172` insertions
- `12011` deletions
- Most deletions come from `firebase-debug.log`, `functions-list.json`, and tracked JSON key removals

## Classification

### A. CLEANUP_RELEASE_INCLUDED

These are the files that match the cleanup-only release goal for mojibake cleanup, wording cleanup, and audit docs.

| File | Reason |
|---|---|
| `ai-actions.js` | Active mojibake cleanup in user-facing AI action text |
| `DeepSeekRouter.js` | Active mojibake cleanup in AI/router replies |
| `functions/index.js` | Active mojibake cleanup in deployed `xekho` function text |
| `db.js` | Active mojibake cleanup in admin/operator text/comments |
| `index.html` | Gemini/Vertex wording cleanup in user-facing settings UI |
| `TECH_AUDIT.md` | Audit document for current release context |
| `OWNERSHIP_MAP.md` | Ownership document used to avoid cross-repo deploy mistakes |
| `PRE_DEPLOY_CHECK_REPORT.md` | Optional supporting doc for release review and deploy gating |

Release note:

- `PRE_DEPLOY_CHECK_REPORT.md` can be included if the owner wants the release branch to preserve the exact pre-deploy review record.
- If the release should stay minimal, this file can also be kept out without affecting runtime behavior.

### B. SECURITY_MAINTENANCE_REVIEW

These changes may be valid maintenance work, but they should not be mixed into a cleanup-only deploy without explicit approval.

| File | Reason |
|---|---|
| `.gitignore` | Security/maintenance hardening for key files; safe in principle but not required for cleanup-only runtime release |
| `loadServiceAccount.js` | New credential loader helper; clearly outside mojibake/wording scope |
| `pos-v2-909ff-firebase-adminsdk-fbsvc-abdca8f1c5.json` deleted | Tracked key-file removal is good security hygiene but should be reviewed as a separate maintenance/security change |
| `project-724ee6ef-5290-41f4-892-a47703f4859e.json` deleted | Same as above |

### C. OUT_OF_SCOPE_HOLD

These files are not part of the cleanup-only release boundary and should be held out of this release.

| File | Reason |
|---|---|
| `server.js` | Local/server integration path, not part of mojibake/wording cleanup release |
| `audit_cleanup_firebase.js` | Tooling script, not production cleanup release content |
| `import_master.js` | Script maintenance, unrelated to cleanup release |
| `import_migrated_history_purchases.js` | Script maintenance, unrelated to cleanup release |
| `sync_master_to_app.js` | Script maintenance, unrelated to cleanup release |
| `README.md` | Doc update is broader than this release target |
| `DEPLOYMENT_GUIDE.md` | Useful doc changes exist, but they are broader deploy/process guidance, not necessary for cleanup-only runtime release |

### D. DO_NOT_COMMIT_RUNTIME_ARTIFACTS

These are runtime, cache, or generated artifacts and should not be part of a cleanup-only release commit.

| File | Reason |
|---|---|
| `.firebase/hosting..cache` | Hosting cache artifact |
| `firebase-debug.log` deleted | Runtime/debug artifact, not release content |
| `functions-list.json` deleted | Generated inventory artifact, not release content |

## Risks If Deploying From Current Worktree

1. Cleanup changes would be mixed with credential-loader maintenance.
2. Security-related tracked key deletions would be bundled without separate review.
3. Runtime/cache artifact changes would pollute the release commit.
4. Script/doc maintenance unrelated to cleanup would make rollback and blame much harder.
5. A direct `firebase deploy --only hosting,functions` from the current worktree would not respect the intended cleanup-only boundary.

## Release-Safe Isolation Recommendation

Cleanup-only release is isolatable.

Recommended included set:

- `ai-actions.js`
- `DeepSeekRouter.js`
- `functions/index.js`
- `db.js`
- `index.html`
- `TECH_AUDIT.md`
- `OWNERSHIP_MAP.md`
- optional: `PRE_DEPLOY_CHECK_REPORT.md`

Recommended hold set:

- `.gitignore`
- `loadServiceAccount.js`
- tracked JSON key deletions
- `server.js`
- `audit_cleanup_firebase.js`
- `import_master.js`
- `import_migrated_history_purchases.js`
- `sync_master_to_app.js`
- `README.md`
- `DEPLOYMENT_GUIDE.md`
- `.firebase/hosting..cache`
- `firebase-debug.log`
- `functions-list.json`

## Proposed Isolation Options

### Option 1: Branch / stash isolation

Intent:

- Hide everything outside group A
- Validate only the cleanup set
- Deploy only after owner approval

Suggested command flow, do not run yet:

```powershell
cd "D:\APP - BACKUP\xekho"

# review exact included files again
git diff -- ai-actions.js DeepSeekRouter.js functions/index.js db.js index.html TECH_AUDIT.md OWNERSHIP_MAP.md PRE_DEPLOY_CHECK_REPORT.md

# stash everything first, including untracked
git stash push -u -m "hold non-cleanup changes before xekho cleanup-only release"

# restore only cleanup files from stash into worktree
git checkout stash@{0} -- ai-actions.js DeepSeekRouter.js functions/index.js db.js index.html
git checkout stash@{0} -- TECH_AUDIT.md OWNERSHIP_MAP.md PRE_DEPLOY_CHECK_REPORT.md

# then validate
npm test
node --check functions/index.js
```

Pros:

- Keeps current branch history simple
- Fastest path if owner wants to deploy soon

Cons:

- Requires careful stash handling
- Easy to accidentally restore too much if done quickly

### Option 2: Cleanup-only patch onto a clean branch

Intent:

- Create a patch containing only group A
- Apply it to a clean branch/worktree
- Validate and deploy from the clean branch

Suggested command flow, do not run yet:

```powershell
cd "D:\APP - BACKUP\xekho"

git diff -- ai-actions.js DeepSeekRouter.js functions/index.js db.js index.html > cleanup-only.patch
git diff --no-index NUL TECH_AUDIT.md >> cleanup-only.patch
git diff --no-index NUL OWNERSHIP_MAP.md >> cleanup-only.patch
git diff --no-index NUL PRE_DEPLOY_CHECK_REPORT.md >> cleanup-only.patch

# on a clean branch/worktree
git apply cleanup-only.patch

# then validate
npm test
node --check functions/index.js
```

Pros:

- Cleanest release boundary
- Best option if owner wants durable auditability

Cons:

- Slightly more manual
- Need to verify patch creation for untracked docs carefully

## Preferred Option

Preferred option:

- `Option 2: Cleanup-only patch onto a clean branch`

Reason:

- This release is documentation + wording + mojibake cleanup only
- Current worktree clearly contains non-cleanup maintenance and runtime artifacts
- A patch-based isolation makes the release boundary explicit and easy to review

## Validation To Re-Run After Isolation

Do not run yet in this step. Re-run only after the cleanup-only set is isolated.

```powershell
cd "D:\APP - BACKUP\xekho"
npm test
node --check functions/index.js
```

## Deploy Command To Use Only After Owner Approval

Do not run yet in this step.

```powershell
cd "D:\APP - BACKUP\xekho"
firebase use pos-v2-909ff
firebase deploy --only hosting,functions
```

## Final Status

### xekho cleanup-only deploy readiness

- `NOT READY` from the current mixed worktree

### Why not ready yet

- Cleanup changes are mixed with security maintenance, tooling script edits, doc/process edits, and runtime artifacts

### Files that still need isolation from release

- `.gitignore`
- `loadServiceAccount.js`
- `pos-v2-909ff-firebase-adminsdk-fbsvc-abdca8f1c5.json` deletion
- `project-724ee6ef-5290-41f4-892-a47703f4859e.json` deletion
- `server.js`
- `audit_cleanup_firebase.js`
- `import_master.js`
- `import_migrated_history_purchases.js`
- `sync_master_to_app.js`
- `README.md`
- `DEPLOYMENT_GUIDE.md`
- `.firebase/hosting..cache`
- `firebase-debug.log`
- `functions-list.json`

### Can cleanup-only release be isolated?

- `Yes`

### Steps remaining after isolation before deploy

1. Isolate group A only
2. Re-run:
   - `npm test`
   - `node --check functions/index.js`
3. Review final `git diff`
4. Owner approval
5. Run:
   - `firebase use pos-v2-909ff`
   - `firebase deploy --only hosting,functions`
