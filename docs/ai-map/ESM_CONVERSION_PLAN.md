# ESM Conversion Plan — XE KHO POS

**Created:** 2026-06-02
**Status:** Planning (not started)
**Estimated effort:** 2-3 weeks
**Risk:** HIGH — breaks script load order, inline event handlers, global namespace

---

## Current Architecture

- 20 frontend IIFE modules loaded via `<script>` tags (non-module)
- Global namespace: `window.XekhoApp.*`
- Inline event handlers in HTML: `onclick="addToOrder(...)"`
- 8 backend CJS modules via `require()`/`module.exports`
- Vite spike merged but serves IIFE files as static assets (no bundling)

## Why ESM?

1. **Vite tree-shaking** — reduces bundle size by removing unused code
2. **Better code splitting** — lazy-load report/admin modules
3. **Native browser support** — `<script type="module">` is standard
4. **Better IDE support** — import/export is what TypeScript/IDE tools expect
5. **Circular dependency detection** — ESM enforces explicit imports

## Risks

1. **Inline event handlers break** — `onclick="addToOrder()"` can't access module-scoped functions
2. **Script load order changes** — ESM loads asynchronously, no guaranteed order
3. **Global namespace removal** — `window.XekhoApp.*` becomes import/export
4. **`db.js` already `type="module"`** — must integrate with new module system
5. **Firebase SDK loaded via CDN** — must remain as global script
6. **Offline modules** — 7 files with dependency chain must be converted together

---

## Phase 1: Preparation (Week 1)

### Sprint 1.1: Audit inline event handlers
- Scan `index.html` and `app.js` for all `onclick`, `onchange`, `onsubmit` etc.
- Count: ~50-100 inline handlers
- Plan: Move all to `addEventListener` in app.js

### Sprint 1.2: Audit global namespace usage
- Scan all files for `window.XekhoApp.*` references
- Scan for bare global function calls (`addToOrder()`, `showToast()`)
- Count dependencies per module

### Sprint 1.3: Create ESM entry point
- Create `src/main.js` as new entry point
- Import all modules explicitly
- Keep `<script type="module" src="src/main.js">` in index.html

---

## Phase 2: Convert Frontend Modules (Week 1-2)

### Sprint 2.1: Convert simple utils first (lowest risk)
- `app/utils/dom.js` → `src/utils/dom.js` (export/instead of IIFE)
- `app/utils/format.js` → `src/utils/format.js`
- `app/utils/date.js` → `src/utils/date.js`
- `app/utils/storage.js` → `src/utils/storage.js`
- Pattern: Remove IIFE wrapper, add `export function` / `export default`

### Sprint 2.2: Convert UI modules
- `app/ui/toast.js` → `src/ui/toast.js`
- `app/ui/theme.js` → `src/ui/theme.js`
- `app/ui/modal.js` → `src/ui/modal.js`
- Pattern: Export functions, import where needed

### Sprint 2.3: Convert auth + order modules
- `app/auth/staff.js` → `src/auth/staff.js`
- `app/order/helpers.js` → `src/order/helpers.js`
- Pattern: Same as above

### Sprint 2.4: Convert report modules
- `app/report/helpers.js` → `src/report/helpers.js`
- `app/report/ads.js` → `src/report/ads.js`
- `app/report/expense.js` → `src/report/expense.js`
- `app/report/excel.js` → `src/report/excel.js`
- Pattern: Replace lazy resolvers with direct imports

### Sprint 2.5: Convert remaining utils
- `app/utils/excel.js` → `src/utils/excel.js`
- `app/utils/print.js` → `src/utils/print.js`
- `app/utils/parser.js` → `src/utils/parser.js`
- `app/utils/categorize.js` → `src/utils/categorize.js`
- `app/utils/fixedcost.js` → `src/utils/fixedcost.js`

---

## Phase 3: Convert app.js (Week 2-3)

### Sprint 3.1: Extract inline event handlers
- Move all `onclick="..."` to `addEventListener` in app.js
- This is the BIGGEST risk — must test every button/form

### Sprint 3.2: Convert app.js to ESM
- Add `import` statements at top
- Replace `window.XekhoApp.*` with direct imports
- Keep `window.appState` as global (needed by inline handlers)

### Sprint 3.3: Convert offline modules
- `offlineBackup.js` → `src/offline/backup.js`
- `offlineSync.js` → `src/offline/sync.js`
- `offlineFirestoreAdapter.js` → `src/offline/adapter.js`
- `offlineRuntime.js` → `src/offline/runtime.js`
- `offlineStatusUI.js` → `src/offline/status-ui.js`
- `offlineOrderFallback.js` → `src/offline/fallback.js`
- `offlineOrderFallbackDevTools.js` → `src/offline/devtools.js`
- Must convert together (dependency chain)

---

## Phase 4: Convert Backend (Week 3)

### Sprint 4.1: Convert CJS to ESM
- `functions/utils/text.js` → ESM export
- `functions/utils/general.js` → ESM export
- `functions/telegram/*.js` → ESM export
- `functions/index.js` → ESM import
- **Risk:** Firebase Functions may not support ESM natively — check runtime

### Sprint 4.2: Update build config
- Update `vite.config.mjs` for proper ESM bundling
- Enable tree-shaking
- Configure code splitting (admin/report lazy load)

---

## Phase 5: Testing & Deployment (Week 3)

### Sprint 5.1: Full regression test
- Test all POS flows (open table, add item, close order, payment)
- Test offline mode (queue, sync, fallback)
- Test Telegram bot (commands, callbacks)
- Test reports (daily, ads, export)

### Sprint 5.2: Performance verification
- Measure bundle size before/after
- Measure load time
- Verify tree-shaking works

### Sprint 5.3: Deploy
- Deploy to staging first
- Verify Firebase Functions work with ESM
- Deploy to production

---

## File Structure (Target)

```
src/
├── main.js              # Entry point (ESM)
├── utils/
│   ├── dom.js
│   ├── format.js
│   ├── date.js
│   ├── storage.js
│   ├── excel.js
│   ├── print.js
│   ├── parser.js
│   ├── categorize.js
│   └── fixedcost.js
├── ui/
│   ├── toast.js
│   ├── theme.js
│   ├── modal.js
│   └── image-zoom.js
├── auth/
│   └── staff.js
├── order/
│   └── helpers.js
├── report/
│   ├── helpers.js
│   ├── ads.js
│   ├── expense.js
│   └── excel.js
├── offline/
│   ├── backup.js
│   ├── sync.js
│   ├── adapter.js
│   ├── runtime.js
│   ├── status-ui.js
│   ├── fallback.js
│   └── devtools.js
├── store.js
└── db.js
```

---

## Decision Points

1. **Keep global namespace?** — Option A: Remove completely. Option B: Keep `window.XekhoApp.*` as compatibility layer during transition.
2. **Backend ESM?** — Firebase Functions v2 supports ESM. Check if current runtime is v1 or v2.
3. **Code splitting?** — Lazy-load report/admin modules (reduces initial bundle by ~30%).
4. **Inline handlers?** — Option A: Move all to addEventListener. Option B: Keep inline + expose globals.

## Recommendation

**Start with Phase 1 (audit)** — low risk, high value. The audit will reveal the actual complexity and help decide whether to proceed with full ESM conversion or do a partial conversion (utils + report only, keep app.js as IIFE).
