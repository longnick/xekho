# Task: Scriptable modern 30-day revenue widget

Date: 2026-08-05 07:29 UTC
Repo: `/home/longnick/projects/xekho-scriptable-revenue-line`
Branch: `task/scriptable-revenue-line`

## Owner direction

Rebuild revenue widget to match the modern dark XE KHÔ Meta Ads Widget style. Trend must connect revenue values across the latest 30 days.

## Delivered

- `functions/scriptableFinanceWidget.js`
  - `buildSeries()` now generates 30 dated revenue points by default, bounded to 1–90 days for future callers.
  - Endpoint payload reports `seriesDays: 30` and returns 30 points. Formula, endpoint, token guard, and Firestore reads remain unchanged.
- `scripts/scriptable/xekho-finance-widget.js`
  - Full dark modern visual system: `#071120` to `#0B1628` background, dark outlined metric cards, blue revenue line, grid, point markers, and selected date labels.
  - Small, medium, and large families render the connected 30-day revenue trend. Large family includes revenue, profit, expenses, and order cards.
  - Uses native Scriptable `DrawContext`: `addPath(line)` then `strokePath()`; this avoids unsupported line-call variants.
- `scripts/verify-scriptable-finance-widget.js`
  - Formula assertion requires exactly 30 daily points.
  - Runtime stub covers native `Path.addEllipse`, connected line drawing, and dark modern layout source markers.
- `scripts/scriptable/README.md`
  - Documents 30-day chart behavior and correct private-token handling.

## Verification

```text
node --check functions/scriptableFinanceWidget.js                                PASS
node --check scripts/scriptable/xekho-finance-widget.js                         PASS
node --check scripts/verify-scriptable-finance-widget.js                        PASS
node scripts/verify-scriptable-finance-widget.js                                PASS (24 assertions)
npm run check                                                                    PASS
git diff --check                                                                 PASS
```

## Native iPhone gate

Node verifies source, API surface, and Scriptable render tree. Paste the delivered script into Scriptable, retain/configure only the private widget token on-device, then refresh a medium or large iOS widget for final visual confirmation.

## Production deploy and live smoke

Approved scope: only `xekho:scriptableFinanceWidgetData` in Firebase project `pos-v2-909ff`.

```text
npx firebase-tools deploy --only functions:xekho:scriptableFinanceWidgetData --project pos-v2-909ff --non-interactive  PASS
GET without token                                                                             401
GET with private widget token                                                                  200
source                                                                                        firestore-readonly
seriesDays                                                                                    30
seriesCount                                                                                   30
```

The live response at 2026-08-05T09:07:44.600Z reported revenue `0` and orders `0` for the current Vietnam day. This is real read-only Firestore output, not sample data. Temporary deployment env file was removed after deploy; no token value was printed.
