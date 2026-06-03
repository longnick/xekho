# 2026-06-03 23:28 - Deploy bill price display fix with app.js cache bust

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

## Request

User approved deploy after the bill unit-price fix.

## Actions

- Ran full deploy-readiness gate from the clean tree.
- Deployed `hosting,functions:xekho` to Firebase project `pos-v2-909ff`.
- Verified hosting URL `https://xe-kho.web.app` returned HTTP 200.
- Noticed the production `index.html` still referenced the older `app.js?v=20260509-online-complete` cache key.
- Bumped the `app.js` cache key to `20260603-bill-unit-price` so mobile browsers fetch the fixed bill formatter immediately.

## Verification

Cache-bust gate passed before the hosting-only redeploy:

```bash
node --check app.js
node scripts/verify-bill-unit-price.js
node scripts/verify-menu-price-save.js
node scripts/verify-esm-entry.js
npm run check
npx tsc --noEmit -p jsconfig.json
npx tsc --noEmit -p functions/tsconfig.json
npm test -- --runInBand
npm run lint
npx vite build
git diff --check
```

Known lint state remains `0 errors, 5 warnings` in pre-existing files.

## Scope

No business logic changed in this cache-bust sprint. The actual bill formatter fix is in commit `5b6dab4 fix: show exact bill unit prices`.
