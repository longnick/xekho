# Scriptable Finance Widget Mockups

Date: 2026-07-09
Repo: `/home/longnick/projects/xekho`

## Design read

Reading this as: iOS Scriptable dashboard widget for owner/operator finance monitoring, with a local-business operational dashboard language, leaning toward compact iOS widget cards with XE KHÔ brand colors.

## Repo data basis

Observed canonical repo sources:

- Sales source: `history`, filtered by `paidAt`, completed/closed and not hidden/cancelled/archived.
- Expense source: `expenses`, filtered by `date`.
- Purchase source: `purchases`, filtered by `date`.
- Snapshot source: `daily_revenue_snapshot`, latest 120 rows.
- Existing summary formula lives in `store.js#getRevenueSummary()`:
  - `grossSales = sum(items.price * items.qty)`
  - `discountTotal = sum(order.discount)`
  - `netSales = grossSales - discountTotal`
  - `cost = sum(item.cost * qty)` fallback `order.cost`
  - `gross = netSales - cost`
  - `operatingExpenseTotal = expenses excluding nhập hàng rows`
  - `purchaseTotal = sum(purchases.price)`
  - UI finance net profit after fixed cost is currently `gross - operatingExpenseTotal - fixedCostTotal` in `app.js#updateFinanceUI()`
- Existing finance chart: `app.js#renderRevenueChart()` renders daily revenue vs expense bars.

## Variants

### Variant A - Owner glance

File: `variant-a-owner-glance.html`

Stance: friendly owner dashboard, quick scan first.

Best when:

- The widget will sit on the iPhone home screen.
- Owner wants profit status first, not accounting details.
- The large widget should show trend and major rollups.

### Variant B - Operator ledger

File: `variant-b-operator-ledger.html`

Stance: compact ledger, more control, less decoration.

Best when:

- Owner wants to see why profit changed.
- Chi phí categories matter more than ambience.
- Scriptable implementation should stay simple and text/bar based.

## My recommendation

Use Variant A for the actual Scriptable widget, but borrow Variant B's explicit cost breakdown for the large widget.

## Proposed real Scriptable data contract

Because Scriptable cannot safely load the whole Firebase web app, the production implementation should use one of these:

1. Preferred: add a read-only owner-guarded HTTPS Cloud Function returning compact JSON:

```json
{
  "rangeLabel": "Hôm nay",
  "updatedAt": "2026-07-09T08:55:00+07:00",
  "revenue": 4820000,
  "cogs": 1530000,
  "expenses": 1860000,
  "fixedCost": 0,
  "profit": 1420000,
  "marginPct": 29.6,
  "orders": 24,
  "bank": 3310000,
  "cash": 1510000,
  "series": [
    { "date": "2026-07-03", "revenue": 3200000, "expenses": 1600000, "profit": 900000 }
  ],
  "expenseBreakdown": [
    { "label": "Nhập hàng", "amount": 15700000 },
    { "label": "Vận hành", "amount": 8400000 }
  ]
}
```

2. Alternative: Scriptable queries Firestore REST directly with a narrow token, but this is less safe and harder to maintain on iPhone.

## Mock data note

Numbers in HTML are illustrative only. They follow the repo formula shape, but are not live Firestore results.
