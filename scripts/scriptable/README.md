# XE KHÔ Scriptable Finance Widget

Variant approved: **Variant A — Owner glance**.

## Files

- `xekho-finance-widget.js` — paste into the iOS Scriptable app.
- Backend endpoint: `scriptableFinanceWidgetData` Cloud Function.

## Endpoint

```text
https://asia-southeast1-pos-v2-909ff.cloudfunctions.net/scriptableFinanceWidgetData
```

Supported range values:

- `today`
- `7d`
- `month`

## Install on iPhone

1. Open Scriptable.
2. Create a new script named `XE KHÔ Finance`.
3. Paste `scripts/scriptable/xekho-finance-widget.js`.
4. Token setup:
   - Current private owner copy has `CONFIG.token` prefilled in `xekho-finance-widget.js` so the widget can fetch live data immediately.
   - If rotating/removing the embedded token later, you can also pass it as widget parameter:

```text
https://asia-southeast1-pos-v2-909ff.cloudfunctions.net/scriptableFinanceWidgetData|YOUR_TOKEN|today
```

Runtime token for the deployed function was generated locally and stored at:

```text
~/.hermes/local-secrets/xekho-scriptable-finance-widget-token.txt
```

## Data formula

Backend uses read-only Firestore aggregation matching the existing finance formulas:

```text
grossSales = sum(items.price * items.qty)
discountTotal = sum(order.discount)
netSales = grossSales - discountTotal
cogs = sum(item.cost * qty), fallback order.cost
grossProfit = netSales - cogs
operatingExpense = expenses excluding nhập hàng rows
purchaseTotal = sum(purchases.price)
fixedCost = financial_profile.daily_fixed_cost * days
profit = grossProfit - operatingExpense - fixedCost
```

`purchaseTotal` is returned as cash-flow context and displayed in the large widget breakdown, but is not subtracted a second time from profit.

## Security

- Endpoint requires `Authorization: Bearer <token>` or `?token=<token>` / `x-widget-token`.
- No Firebase credentials are embedded in Scriptable.
- This repo copy intentionally embeds the widget token in `CONFIG.token` because the owner approved single-user private use. Do not share the script publicly without rotating/removing that token.
