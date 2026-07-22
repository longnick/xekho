# Task: Scriptable finance widget Variant A

Date: 2026-07-09 09:39 +07
Repo: /home/longnick/projects/xekho
Branch: task/kilo-fix-20260623-050807
AI/Agent: Hermes
User request: "Duyệt làm Variant A" after reviewing Scriptable finance widget mockups.

## Before state

- Existing branch: `task/kilo-fix-20260623-050807`
- Existing uncommitted files: large dirty tree from attendance and prior sprints; this task did not reset or clean it.
- Relevant AI map/source read:
  - `sketches/finance-scriptable-widget/README.md`
  - `sketches/finance-scriptable-widget/variant-a-owner-glance.html`
  - `store.js#getRevenueSummary()` formula section
  - `app/report/expense.js#buildOperationalExpenseBreakdown()` fixed-cost and purchase/expense breakdown section
  - `functions/index.js` existing Cloud Function patterns
- Relevant skill reference: `xekho-main-repo-coder/references/xekho-scriptable-finance-widget.md`

## Goal

Biến mockup Variant A thành widget Scriptable thật và backend JSON read-only an toàn:

- Small/medium/large widget theo phong cách Owner glance.
- Backend Cloud Function trả JSON compact cho doanh thu, chi phí, lợi nhuận, margin, tiền mặt/chuyển khoản, 7 ngày trend, breakdown chi phí.
- Không nhúng Firebase credentials vào iPhone Scriptable.
- Không commit token runtime vào source/docs.

## Files changed

- `functions/scriptableFinanceWidget.js`
  - New read-only finance aggregation module.
  - Builds owner widget payload from Firestore collections `history`, `expenses`, `purchases`, and `settings/financial_profile`.
  - Implements token-guarded request handler factory.
- `functions/index.js`
  - Wires `SCRIPTABLE_FINANCE_WIDGET_TOKEN` config param.
  - Exports `scriptableFinanceWidgetData` HTTPS function.
- `scripts/scriptable/xekho-finance-widget.js`
  - New iOS Scriptable script implementing Variant A Owner glance for small/medium/large widget families.
- `scripts/scriptable/README.md`
  - Install notes, endpoint URL, token location, formula explanation.
- `scripts/verify-scriptable-finance-widget.js`
  - New deterministic verifier for formulas, endpoint wiring, widget source markers, and token hygiene.
- `docs/ai-map/TASK_LOGS/2026-07-09-0939-scriptable-finance-widget-variant-a.md`
  - This task log.
- AI map summary files updated separately.

## Code relations

- `functions/index.js#scriptableFinanceWidgetData` calls `functions/scriptableFinanceWidget.createFinanceWidgetHandler()`.
- `functions/scriptableFinanceWidget.js#buildFinanceWidgetPayload()` reads Firestore read-only and returns JSON consumed by `scripts/scriptable/xekho-finance-widget.js`.
- `scripts/scriptable/xekho-finance-widget.js` accepts `endpoint|token|range` in Scriptable widget parameter or direct `CONFIG` values.
- `scripts/verify-scriptable-finance-widget.js` tests formula parity and guards source/token assumptions.

## Decisions made

- Used the approved Variant A as the visual base.
- Borrowed the large-widget explicit cost breakdown idea from Variant B.
- Implemented a token-guarded HTTPS JSON endpoint instead of direct Firebase credentials in Scriptable.
- Kept `purchaseTotal` in the payload/breakdown as cash-flow context but did not subtract purchases a second time from profit, matching the repo's finance logic.
- Deployed the backend endpoint with a generated token stored outside the repo at `~/.hermes/local-secrets/xekho-scriptable-finance-widget-token.txt`.
- Did not print the runtime token in terminal output or docs.

## Verification

Commands run:

- `node --check functions/index.js` — passed.
- `node --check functions/scriptableFinanceWidget.js` — passed.
- `node --check scripts/scriptable/xekho-finance-widget.js` — passed.
- `node --check scripts/verify-scriptable-finance-widget.js` — passed.
- `node scripts/verify-scriptable-finance-widget.js` — passed, 15 assertions.
- `npm run check` — passed.
- `npm test -- --runInBand` — passed, 1 suite / 6 tests.
- `npm run build:hosting` — passed; Vite produced existing classic-script warnings, then `OK: hosting dist prepared with 86 files`.
- `git diff --check` — passed.

Production deploy:

- `npx firebase-tools deploy --only functions:xekho:scriptableFinanceWidgetData --project pos-v2-909ff --non-interactive` — passed.
- Function URL: `https://asia-southeast1-pos-v2-909ff.cloudfunctions.net/scriptableFinanceWidgetData`

Production smoke:

- Unauthorized request without token returned `401`.
- Authorized request with generated local token returned `200`, `ok: true`, `source: firestore-readonly`, `rangeLabel: Hôm nay`, required fields present, `series_len: 7`.
- Secret search verified generated token does not appear in repo source/docs.
- Temporary deploy dotenv `functions/.env.pos-v2-909ff` was removed after deploy.

## Remaining issues

- User still needs to paste the Scriptable script on iPhone and configure the token from the local secret file.
- Today's live payload had `orders: 0` at smoke time; endpoint is working, but current business data for the selected day may naturally be empty depending on actual sales.
- No iPhone visual screenshot was captured in Scriptable itself because Scriptable runs on the user's iOS device.

## Next step

Install `scripts/scriptable/xekho-finance-widget.js` in Scriptable, set widget parameter:

```text
https://asia-southeast1-pos-v2-909ff.cloudfunctions.net/scriptableFinanceWidgetData|<token>|today
```

Token lives outside repo:

```text
~/.hermes/local-secrets/xekho-scriptable-finance-widget-token.txt
```

## Safety notes

Touched Cloud Functions source and deployed one read-only HTTPS function. Used a temporary `.env.pos-v2-909ff` to provide deploy params, then removed it. No production Firestore writes, migrations, POS mutations, customer/payment records, raw media, Firebase service account files, or repo-committed secrets were touched.
