# Scriptable dark widget: remove status pill, 30-day totals

## Requested behavior

- Remove right-side `LIVE` status pill because it consumes a visual column.
- `Doanh thu`, `Lợi nhuận`, `Chi phí`, and `Đơn hàng` must aggregate exactly latest 30 Vietnam-time days.

## Source changes

- `functions/scriptableFinanceWidget.js`: adds `range=30d`, inclusive today plus preceding 29 days. Existing read-only formula covers all four totals.
- `scripts/scriptable/xekho-finance-widget.js`: defaults to `range: '30d'`; removes live/sample pill; updates small and large copy.
- `scripts/verify-scriptable-finance-widget.js`: tests exact date range, 30-day aggregation, no LIVE pill, Scriptable stub rendering.

## Local verification

- `node --check functions/scriptableFinanceWidget.js`: pass.
- `node --check scripts/scriptable/xekho-finance-widget.js`: pass.
- `node scripts/verify-scriptable-finance-widget.js`: 27 assertions pass.
- `git diff --check`: pass.

## Deploy blocker

Scoped deployment command was attempted:

```text
npx firebase-tools deploy --only functions:xekho:scriptableFinanceWidgetData --project pos-v2-909ff --non-interactive
```

Firebase CLI stopped before deploy because this checkout has no production dotenv file and its environment contains none of required Functions parameters. No Firebase code was deployed and the live endpoint still uses the prior range behavior. Do not create dummy values: they could overwrite unrelated production configuration.

Run the scoped deploy from the approved production checkout with its existing deploy-parameter source, then smoke `?range=30d` using the existing widget token. Do not print secrets.
