# 2026-06-03 22:55 - Fix Vietnamese thousands menu price input

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

## User report

In `Kho` → `Quản lý món`, saving `Bia Tiger bạc` as `17.500đ` still resulted in `18.000đ` / charged as `18k`.

## Root cause

- The menu price field was `type="number"`.
- Browser/JavaScript treated `17.500` as decimal `17.5`, not Vietnamese thousands `17500`.
- Downstream formatting/rounding then displayed or charged the wrong value.

## Changes

- `index.html`: changed `#menu-item-price` to text input with `inputmode="numeric"` so users can enter Vietnamese formatted prices such as `17.500`.
- `app.js`: added `parseVietnameseMoneyInput()` and made `submitMenuItem()` use it for menu price parsing.
- `scripts/verify-menu-price-save.js`: expanded regression coverage for `17.500`, `17.500đ`, `17,500`, `17.5`, and `17500` all parsing to `17500`.

## Verification

Targeted checks passed:

```bash
node --check app.js
node --check scripts/verify-menu-price-save.js
node scripts/verify-menu-price-save.js
```

Full gate is recorded in the final report.

## Notes

- No production Firestore/POS/payment/customer data was read or mutated by verification.
- Existing canonical DB mapping from the previous commit remains: `sell_price` and `price` are both written.
