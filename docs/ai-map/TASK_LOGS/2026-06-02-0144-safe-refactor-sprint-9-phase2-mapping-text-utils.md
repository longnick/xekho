# Task Log: Safe refactor Sprint 9 - Phase 2 Cloud Functions mapping + text utils extraction

**Time:** 2026-06-02 01:44
**Repo:** `/home/longnick/projects/xekho`
**Branch:** `test/xe-kho-repo-implementer-skill`
**Agent:** Hermes

## What was done

Sprint 2.1 + 2.2 from REFACTOR_PLAN.md: mapped all exports in `functions/index.js` and extracted pure text/formatting utilities.

## Sprint 2.1: Map exports

Updated `docs/ai-map/CODE_MAP.md` with complete listing of:
- 35 exported Cloud Functions grouped by domain
- ~241 top-level helper functions categorized into 6 groups
- Pure utilities identified for safe extraction

## Sprint 2.2: Extract pure utilities

### New files
- `functions/utils/text.js` — CommonJS module with 11 pure text/formatting functions
- `scripts/verify-text-utils.js` — Node verification script

### Modified files
- `functions/index.js` — added `require('./utils/text')` + 11 function bodies replaced with delegation wrappers

### Extracted functions
- `chunkArray(arr, size)`
- `escapeTelegramHtml(text)`
- `escapeXml(text)`
- `scoreTelegramTextQuality(text)`
- `fixTelegramMojibake(text)`
- `normalizeTelegramText(value)`
- `normalizeTelegramTextPreserveLines(value)`
- `formatCurrencyVi(amount)`
- `formatQtyVi(amount)`
- `getTelegramProductDisplayName(product, fallback)`
- `shouldPreferTelegramCatalogName(currentName, product)`

## Verification results

- `node --check functions/index.js` ✅
- `node --check functions/utils/text.js` ✅
- `node scripts/verify-text-utils.js` ✅
- All frontend verification scripts ✅
- `npm test -- --runInBand` ✅ (6 passed)

## Progress update

- Total long-term plan: ~21% complete
- Core non-optional plan: ~25% complete
- Near-term safe-execution track: ~52% complete
