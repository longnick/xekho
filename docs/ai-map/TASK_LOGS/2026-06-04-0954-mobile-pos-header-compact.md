# Mobile POS header compact status bar

## Scope
- Repo: `/home/longnick/projects/xekho`
- Branch: `test/xe-kho-repo-implementer-skill`
- Request: thiết kế lại thanh trạng thái/header của app POS vì bị tràn khung và quá nhiều thông tin trên mobile.
- Risk level: low

## Pre-state
- Dirty files before task: clean working tree.
- Related docs read: `docs/ai-map/TODO_AI.md`, `docs/ai-map/CHANGELOG_AI.md`.
- Backup dir: `/home/longnick/backups/xekho-pos-header-compact-20260604-0954`

## Code Anchors
- `index.html::<header.app-header>` — replaced inline current user styling with reusable `header-user-chip`. Marker: `class="header-user-chip"`.
- `style.css::.app-header/.header-logo/.header-actions` — constrained header to viewport, shrink-safe brand/actions, and clipped overflow. Marker: `max-width: 100vw`.
- `style.css::.header-user-chip` — bounded username pill with ellipsis for long names. Marker: `max-width: 112px`.
- `style.css::@media (max-width: 430px)` — tightened logo/user/action sizes for iPhone widths. Marker: `max-width: 35%`.
- `app.js::applyRoleRights()` — wraps username text in `.header-user-name` so CSS can ellipsize it. Marker: `class="header-user-name"`.
- `offlineStatusUI.js::formatBadgeText()` — shortened header badge labels from `Offline: OK` to compact `OK`/counts. Marker: `return 'OK';`.
- `offlineStatusUI.js::ensureStyle()` — bounded offline status badge width. Marker: `flex: 0 1 72px`.
- `scripts/verify-mobile-pos-header.js` — added deterministic source verifier for compact header layout. Marker: `verify-mobile-pos-header passed`.

## Files Changed
- `index.html` — current user chip now uses reusable class instead of wide inline style.
- `style.css` — compact, shrink-safe mobile header/status-bar styling.
- `app.js` — user display markup updated for ellipsis.
- `offlineStatusUI.js` — offline badge label and injected CSS made compact.
- `scripts/verify-mobile-pos-header.js` — focused regression verifier.
- `docs/ai-map/CHANGELOG_AI.md` — dated summary.
- `docs/ai-map/TODO_AI.md` — done-recently entry.
- `docs/ai-map/TASK_LOGS/2026-06-04-0954-mobile-pos-header-compact.md` — this task log.

## Verification
- `node --check app.js` → passed.
- `node --check offlineStatusUI.js` → passed.
- `node --check scripts/verify-mobile-pos-header.js` → passed.
- `node scripts/verify-mobile-pos-header.js` → passed (`verify-mobile-pos-header passed`).
- `node scripts/verify-mobile-table-grid.js` → passed.
- `npm run check` → passed.
- `npm test -- --runInBand` → passed (1 suite, 6 tests).
- `npm run lint` → passed with 0 errors and 5 pre-existing warnings in `app/ui/toast.js` / `app/utils/storage.js`.
- `node - <<'NODE' ... execFileSync('npx', ['vite', 'build']) ...` → passed (`✓ built in 234ms`).
- `git diff --check` → passed.

## Handoff / Continue Here
- Current state: done, verification passed.
- Next safe step: mobile Safari QA on the POS table screen; if accepted, deploy Hosting/functions only after explicit deploy request.
- Do not touch: production database, secrets, Firebase deploy unless explicitly requested.

## Rollback
- Restore from backup: `/home/longnick/backups/xekho-pos-header-compact-20260604-0954`
- Or revert this working-tree diff before commit/deploy.
