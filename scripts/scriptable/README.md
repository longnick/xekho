# XE KHÔ Scriptable Finance Widget

Variant: **Modern dark revenue trend** — visual style aligned with XE KHÔ Meta Ads widget.

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

The revenue chart always displays the latest **30 daily points**, independent of the summary range above.

## Install on iPhone

1. Open Scriptable.
2. Create a new script named `XE KHÔ Finance`.
3. Paste `scripts/scriptable/xekho-finance-widget.js`.
4. Token setup:
   - Private owner copy has `CONFIG.token` prefilled and loads official live data immediately.
   - Or pass a rotated token as widget parameter:

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
- Private owner source embeds only narrow widget token. Do not share it; rotate token before any sharing.
