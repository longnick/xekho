# Task: Fix Scriptable finance large widget UI

Date: 2026-07-09 10:14 +07
Repo: /home/longnick/projects/xekho
Branch: task/kilo-fix-20260623-050807
Agent: Hermes + Kiro coding worker
User report: Large iOS Scriptable finance widget looks ugly and does not match the approved mockup.

## Screenshot analysis

Attached screenshot showed the large widget rendering with:

- Content concentrated in the left third of the card, leaving a huge empty right area.
- KPI tiles too small and not stretched to the available width.
- Red/dark chart bars drawn as disconnected vertical sticks without a polished chart frame or labels.
- Cost breakdown labels at far left and values at far right, causing a visually detached ledger.
- Oversized/loose typography and spacing for the large Scriptable widget size.

## Scope

Used Kiro for the code-edit slice under bounded prompt. Hermes independently inspected and patched the result, then verified.

## Files changed

- `scripts/scriptable/xekho-finance-widget.js`
  - Reworked `buildLarge()` from a vertical stack into a balanced two-column layout.
  - Left column: profit hero, margin/order pills, DrawContext sparkline chart.
  - Right column: contained KPI card and contained expense breakdown card.
  - Replaced old `addBars(widget, ...)` large-widget call with `drawSparkline()` using Scriptable `DrawContext`.
  - Fixed the left column sizing to use Scriptable `Stack.size = new Size(148, 0)` instead of non-API `width` property.
  - Added compact ledger rows and real mini proportion bars for expense breakdown.
- `scripts/verify-scriptable-finance-widget.js`
  - Added source assertions for the new balanced large-widget layout markers.
  - Added forbidden old-pattern checks to prevent the previous disconnected grid/bar/breakdown layout.
  - Added a Node Scriptable runtime stub smoke test for `large` widget rendering: mocks `ListWidget`, `Stack`, `Color`, `Font`, `LinearGradient`, `DrawContext`, `Size`, `Rect`, `Path`, `Script`, `config`, and `args`.

## Verification

Hermes ran:

- `node --check scripts/scriptable/xekho-finance-widget.js` — passed.
- `node --check scripts/verify-scriptable-finance-widget.js` — passed.
- `node scripts/verify-scriptable-finance-widget.js` — passed, 27 assertions.
- `npm run check` — passed.
- `git diff --check` — passed.
- Source secret search for raw token patterns — no raw token found; only placeholder `YOUR_TOKEN` and param name references.

## Verification details

The verifier now confirms:

- Backend formula payload still matches finance rules.
- Endpoint/token source guards still exist.
- Scriptable file still supports small/medium/large.
- Large widget includes `BALANCED_LAYOUT_TWO_COLUMN`.
- Large widget includes `BALANCED_LAYOUT_LEFT_PROFIT_SPARKLINE`.
- Large widget includes `BALANCED_LAYOUT_SPARKLINE_DRAWCONTEXT`.
- Large widget includes `BALANCED_LAYOUT_RIGHT_KPI_BREAKDOWN`.
- Large widget includes `BALANCED_LAYOUT_EXPENSE_BREAKDOWN`.
- Large widget does not call `addBars(widget, ...)` or old `grid1/grid2` metric rows inside `buildLarge()`.
- Stubbed Scriptable runtime renders the large widget and includes the DrawContext image output.

## Deployment

No deploy was needed. This is an iOS Scriptable file update. User needs to paste/update `scripts/scriptable/xekho-finance-widget.js` in the Scriptable app on iPhone.

## Remaining risk

The Node stub verifies Scriptable API assumptions and widget tree shape but cannot produce the exact native iOS widget screenshot. Final visual confirmation still requires pasting the updated script into Scriptable and refreshing the iOS widget.
