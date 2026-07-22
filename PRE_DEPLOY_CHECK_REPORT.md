# PRE DEPLOY CHECK REPORT

## Scope

Repos checked in this workspace:

- `D:\APP - BACKUP\xekho`
- `D:\APP - BACKUP\webapp-menu`

Reference docs reviewed before this check:

- [TECH_AUDIT.md](./TECH_AUDIT.md)
- [OWNERSHIP_MAP.md](./OWNERSHIP_MAP.md)

No deploy was run in this step.

## Repo Status

### xekho

`git status` shows modified, deleted, and untracked files.

Changed files seen in worktree:

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
- `TECH_AUDIT.md` untracked
- `loadServiceAccount.js` untracked

Diff summary:

- `18` tracked files changed by `git diff --stat`
- `172` insertions
- `12011` deletions
- Large deletions are mostly `firebase-debug.log`, `functions-list.json`, and tracked JSON key removal

In-scope cleanup changes for this phase:

- `ai-actions.js`
- `DeepSeekRouter.js`
- `functions/index.js`
- `db.js`
- `index.html`
- `TECH_AUDIT.md`
- `OWNERSHIP_MAP.md`

Out-of-scope or mixed-scope changes still present:

- `server.js`
- `audit_cleanup_firebase.js`
- `import_master.js`
- `import_migrated_history_purchases.js`
- `sync_master_to_app.js`
- `loadServiceAccount.js`
- tracked JSON key deletions
- `.firebase/hosting..cache`
- `firebase-debug.log`
- `functions-list.json`
- docs / ignore updates

Assessment:

- The cleanup work itself looks coherent.
- The worktree is not cleanly isolated to cleanup-only changes.
- A raw `firebase deploy --only hosting,functions` from current state would bundle hosting and functions changes together with some unrelated repo maintenance changes.

### webapp-menu

`git status` shows both modified tracked files and a large set of untracked new files.

Tracked changed files:

- `db.ts`
- `firebase-debug.log`
- `functions/index.js`
- `package-lock.json`
- `package.json`
- `schema.ts`
- `src/App.tsx`
- `src/features/admin/pages/PosDashboardWireframePage.tsx`

Untracked new files / directories:

- `PhotoAI.md`
- `docs/PhotoAI.md`
- `docs/PhotoAI_SETUP.md`
- `functions/captionGenerationService.js`
- `functions/creativeConceptService.js`
- `functions/creativePromptBuilder.js`
- `functions/imageGenerationService.js`
- `functions/marketingAi/`
- `functions/photoAiConfig.js`
- `functions/photoAiOrchestrator.js`
- `functions/photoAiPosterRenderer.js`
- `functions/photoAiQualityGate.js`
- `functions/photoAiStorageService.js`
- `functions/photoAiUsageLogger.js`
- `functions/testPosterRenderer.js`
- `functions/test_output_poster.png`
- `src/features/marketing-ai/`
- `src/services/marketingAi/`

Diff summary:

- `8` tracked files changed by `git diff --stat`
- `7599` insertions
- `26929` deletions
- Large churn is heavily affected by `firebase-debug.log`

Cleanup-specific change in this step:

- `functions/index.js` mojibake fix for 4 online-order Telegram strings

Major unrelated feature work present:

- Photo AI / marketing AI feature additions across `functions`, `src`, `db.ts`, `schema.ts`, `package.json`, `package-lock.json`

Assessment:

- Current worktree is not deploy-safe for a cleanup-only release.
- This repo needs a separate review / branch / PR boundary before any production deploy.

## Special Check: webapp-menu/functions/index.js

`git diff -- functions/index.js` shows two kinds of changes:

1. Cleanup-related wording fix:
   - online-order Telegram/admin text at:
     - `18098`
     - `18164`
     - `18175`
     - `18176`

2. Extra exports at end of file:
   - `exports.createPhotoAiJob = require('./photoAiOrchestrator').createPhotoAiJob;`
   - `exports.getPhotoAiJob = require('./photoAiOrchestrator').getPhotoAiJob;`
   - `exports.listPhotoAiJobs = require('./photoAiOrchestrator').listPhotoAiJobs;`
   - `exports.createPostDraftFromPhotoAiVariant = require('./photoAiOrchestrator').createPostDraftFromPhotoAiVariant;`

Classification:

- `B. thay đổi unrelated chưa rõ`

Reason:

- These exports are not part of mojibake cleanup.
- They align with the larger unrelated `PhotoAI` feature set currently present in worktree.
- They should not be removed or edited in this pre-deploy step without a separate source-of-truth / ownership decision.

## Validation Results

### xekho

- `npm test` -> Pass (`6/6`)
- `node --check functions/index.js` -> Pass

### webapp-menu

- `npm run build` -> Pass
- `node --check functions/index.js` -> Pass

Known tooling note:

- Root `npm run lint` for `webapp-menu` was intentionally not used here because previous audits already confirmed missing `eslint` tooling in root. That is a known tooling issue, not a cleanup regression.

## Risk Assessment

### Remaining risks

1. `xekho` worktree still contains unrelated loader / script / tracked-file deletions mixed with cleanup.
2. `webapp-menu` contains a large unrelated `PhotoAI` feature batch and should not be deployed as part of cleanup.
3. `webapp-menu/functions/index.js` has cleanup diff plus unrelated export additions in the same file.
4. Build / deploy identity cleanup is still a separate unfinished concern from earlier infra work.

### Count of major remaining deploy risks

- `4` major risks before a safe release pass

## Deploy Recommendation

### xekho

Status:

- `Deploy được, nhưng chưa nên deploy ngay từ worktree hiện tại`

Reason:

- Validation passes
- Cleanup changes themselves look safe
- But there are mixed unrelated changes in the worktree

Recommended gate before deploy:

- Separate or explicitly approve unrelated worktree changes
- Recheck final `git diff` limited to intended release content

Suggested deploy command only after that review:

```powershell
cd "D:\APP - BACKUP\xekho"
firebase use pos-v2-909ff
firebase deploy --only hosting,functions
```

### webapp-menu

Status:

- `Chưa nên deploy`

Reason:

- Large unrelated PhotoAI / marketing AI feature set is present
- `functions/index.js` contains unrelated exports outside cleanup scope
- Current state is not a cleanup-only release candidate

Suggested deploy command only after separate PhotoAI review:

```powershell
cd "D:\APP - BACKUP\webapp-menu"
firebase use pos-v2-909ff
firebase deploy --only functions
```

## Recommended Deploy Order

1. Deploy `xekho` first
2. Smoke test POS / AI / OCR / Telegram
3. Only if stable, review and then deploy `webapp-menu`
4. Smoke test online order / admin flow

## Smoke Test Checklist After xekho Deploy

- Open POS staff UI
- Check Vertex / OCR wording in settings
- Open AI bubble and ask one simple question
- Test AI report / inventory answer if sample data exists
- Test purchase OCR if convenient
- Test Telegram notification in a safe test environment if available
- Check browser console
- Check Firebase Functions logs

## Smoke Test Checklist After webapp-menu Deploy

- Open smart menu / customer order flow
- Create one online order
- Check online order admin page
- Test approve / reject flow if test data exists
- Check Functions logs
- Check built UI for runtime errors

## Final Recommendation

- `Có deploy được chưa?`
  - `xekho`: Có thể chuẩn bị deploy, nhưng chưa nên bấm deploy từ worktree hiện tại nếu chưa chốt các thay đổi ngoài phạm vi
  - `webapp-menu`: Chưa nên deploy

- `Nên deploy repo nào trước?`
  - `xekho` trước

- `Có file nào diff ngoài phạm vi không?`
  - Có, ở cả hai repo
  - `xekho`: loader/scripts/docs/tracked JSON deletions/cache files
  - `webapp-menu`: PhotoAI / marketing AI feature set và 4 export cuối `functions/index.js`

- `Validation pass/fail đầy đủ`
  - `xekho npm test`: Pass
  - `xekho node --check functions/index.js`: Pass
  - `webapp-menu npm run build`: Pass
  - `webapp-menu node --check functions/index.js`: Pass
