# Scriptable finance widget: live token + large layout

## Scope

- Private owner Scriptable copy only.
- No Firebase credentials embedded.
- No Functions/Firestore code or production deployment changed.

## Changes

- Filled `CONFIG.token` from existing local owner widget-token store.
- Large family uses explicit `142px + 10px + 149px` columns. This prevents Scriptable from collapsing trailing width and leaving blank right space.
- Kept right KPI and cost cards contained inside fixed right column.
- Updated verifier to require a private widget token and explicit two-column allocation.

## Verification

- `node --check scripts/scriptable/xekho-finance-widget.js`: pass.
- `node scripts/verify-scriptable-finance-widget.js`: 29 assertions pass.
- Production endpoint with owner token: HTTP 200, `ok: true`, `source: firestore-readonly`, `sample: false`.
- Token scan: token appears only in `scripts/scriptable/xekho-finance-widget.js`.

## Rollout

Copy this exact Scriptable file to the private iPhone Scriptable script and refresh widget. No Firebase deploy needed; live endpoint already returns official data.
