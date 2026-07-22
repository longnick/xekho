# Deep Extraction Plan — app.js Remaining Functions

**Created:** 2026-06-02
**Status:** Planning
**Current:** 324 functions, 11,895 lines in app.js
**Target:** Extract ~30-50 more functions (~500-800 lines)

---

## Analysis Summary

| Category | Functions | Lines | Extractable? |
|----------|-----------|-------|-------------|
| PURE (no deps) | 66 | 814 | ✅ ~20 directly |
| MIXED (state + pure logic) | 245 | 8,216 | ⚠️ ~15 via mixed-purity |
| STATE (deep state) | 13 | 219 | ❌ Keep inline |

---

## Tier 1: Directly Extractable (no deps, ~20 functions)

These functions have NO state dependencies and can be extracted directly:

### Image Zoom/Pan Module → `app/ui/image-zoom.js`
~10 functions, ~100 lines. Self-contained touch/mouse zoom handler group:
- `_applyTransform` (L134, 5 lines)
- `_clampTranslate` (L140, 14 lines)
- `_onTouchStart` (L155, 13 lines)
- `_onTouchMove` (L169, 18 lines)
- `_onTouchEnd` (L188, 5 lines)
- `_onTouchEndTap` (L196, 11 lines)
- `_onMouseDown` (L209, 7 lines)
- `_onMouseMove` (L216, 7 lines)
- `_onMouseUp` (L223, 4 lines)
- `_onWheel` (L228, 8 lines)
- `attach` (L237, 24 lines)
- `detach` (L262, 14 lines)
- `reset` (L277, 4 lines)

**Pattern:** Pass DOM elements (`_img`, `_wrap`) as closure params. Export `createImageZoom(img, wrap)` factory.

### Pure Cart Operations → extend `app/order/helpers.js`
- `changeQty` (L4110, 20 lines) — pure quantity logic
- `setCartQty` (L4131, 15 lines) — pure quantity set
- `addNoteToCartItem` (L2241, 14 lines) — pure note addition

### Pure Report Filters → extend `app/report/helpers.js`
- `getFilteredReportOrders` (L7620, 5 lines)
- `getFilteredReportPurchases` (L7626, 5 lines)
- `getFilteredReportExpenses` (L7632, 5 lines)
- `setReportTransactionFilter` (L7574, 5 lines)
- `setReportMenuFilter` (L7580, 5 lines)
- `resetReportFilters` (L7586, 8 lines)

**Note:** These use `filterHistory`/`filterPurchases`/`filterExpenses` — need lazy resolvers.

### Pure Formatting → extend existing modules
- `normalizeUnitText` (L2650, 22 lines) — extend `app/order/helpers.js`
- `_fmtWait` (L11742, 6 lines) — extend `app/utils/format.js`
- `getTelegramReportTestUrl` (L1782, 3 lines) — extend `app/utils/storage.js`

---

## Tier 2: Mixed-Purity Extraction (~15 functions)

These have BOTH pure logic and state access. Extract the pure core:

### `resolvePeriodDateRange` → Already done! (`resolvePeriodDateRangePure` in date.js)

### `getReportMenuSalesSummary` (L7525, 29 lines)
- **Pure core:** Calculation of sales summary from menu + inventory data
- **State deps:** `_getMenu()`, `_getInventory()`
- **Pattern:** Extract pure calculation, lazy resolve data access

### `normalizeKitchenOrderItems` (L2644, 5 lines)
- **Pure core:** Maps items through normalizeKitchenOrderItem
- **State deps:** `_getMenu()`
- **Pattern:** Pass menu as param, lazy resolve

### `getFinanceExpenseRows` (L6901, 28 lines)
- **Pure core:** Builds expense table rows from data
- **State deps:** `filterPurchases()`, `filterExpenses()`
- **Pattern:** Pass data as param, lazy resolve filters

### `renderPurchasePhotoManager` (L5411, 39 lines)
- **Appears pure** — no state deps detected
- **Need:** Verify DOM usage more carefully

### `getCurrentOrderActorMeta` (L3751, 7 lines)
- **Pure core:** Builds actor metadata object
- **State deps:** `currentUser`
- **Pattern:** Pass user as param

### `_resolveOnlinePosContext` (L3364, 38 lines)
- **Pure core:** Resolves POS context for online orders
- **State deps:** Various state access
- **Pattern:** Pass context as param

### `_estimateOnlineOrderCost` (L3287, 13 lines)
- **Pure core:** Cost estimation from items
- **State deps:** `_getMenu()`, `_getInventory()`
- **Pattern:** Already has lazy resolver pattern in order/helpers.js

---

## Tier 3: Keep Inline (280+ functions)

These CANNOT be extracted without framework migration:
- **UI rendering (60):** `render*`, `update*`, `show*` — direct DOM manipulation
- **Event handlers (13):** `handle*`, `on*` — async + DOM + state
- **CRUD (19):** `save*`, `delete*`, `create*` — Firestore writes
- **State management (29):** `open*`, `close*`, `start*`, `stop*` — appState
- **Data access (19):** `get*`, `load*`, `find*` — db/Store reads
- **Other (144):** Mixed state + DOM + async

---

## Execution Plan

### Sprint D1: Image Zoom Module (~100 lines)
- Extract 13 touch/mouse/zoom functions → `app/ui/image-zoom.js`
- Factory pattern: `createImageZoom(img, wrap)` returns `{ attach, detach, reset }`
- Add delegation wrappers in app.js
- Verify: touch zoom, mouse wheel, double-tap

### Sprint D2: Pure Cart + Report Functions (~80 lines)
- Extract `changeQty`, `setCartQty`, `addNoteToCartItem` → extend `app/order/helpers.js`
- Extract 6 report filter functions → extend `app/report/helpers.js`
- Add delegation wrappers
- Verify: cart operations, report filters

### Sprint D3: Mixed-Purity Extractions (~100 lines)
- Extract `getReportMenuSalesSummary` pure core
- Extract `normalizeKitchenOrderItems` with lazy resolver
- Extract `getFinanceExpenseRows` pure core
- Extract `_estimateOnlineOrderCost` (already has pattern)
- Add delegation wrappers
- Verify: reports, kitchen display

### Sprint D4: Formatting + Small Utilities (~50 lines)
- Extract `normalizeUnitText` → extend `app/order/helpers.js`
- Extract `_fmtWait` → extend `app/utils/format.js`
- Extract `getTelegramReportTestUrl` → extend `app/utils/storage.js`
- Extract `getCurrentOrderActorMeta` → extend `app/auth/staff.js`
- Verify: all small utilities

---

## Expected Results

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| app.js lines | 11,895 | ~11,300 | -600 |
| Functions remaining | 324 | ~285 | -39 |
| Extracted modules | 28 | 29 (+image-zoom) | +1 |
| Total exports | ~150 | ~190 | +40 |

---

## Recommendation

**Do Sprint D1 (Image Zoom) first** — it's the safest, most self-contained extraction. ~13 functions, ~100 lines, no state deps. Then proceed with D2-D4 if D1 succeeds.

**After D1-D4:** app.js will be ~11,300 lines with ~285 functions. The remaining functions are deeply coupled to UI/state and require framework migration (React/Vue) to extract further.

**ROI assessment:** D1-D4 extracts ~39 functions (~600 lines) which is ~5% of app.js. The effort is moderate (4 sprints) but the architectural benefit is real (cleaner module boundaries, better testability).
