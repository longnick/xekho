# Scriptable dark widget: corrected owner delivery

## Correction

Previous delivery used warm Owner Glance variant by mistake. Owner confirmed target is `Modern dark revenue trend` from this worktree.

## Scope

- Preserved dark navy palette (`#071120` → `#0B1628`), outlined metric cards, blue 30-day revenue line, and tight four-card large layout.
- Added existing private owner widget token only to `scripts/scriptable/xekho-finance-widget.js`.
- No Firebase Function source or production deploy changed.

## Verification

- `node --check scripts/scriptable/xekho-finance-widget.js`: pass.
- `node scripts/verify-scriptable-finance-widget.js`: 24 assertions pass.
- Existing production endpoint, authorized owner token: HTTP 200; `ok: true`; `source: firestore-readonly`; `sample: false`; 30 daily points.
- Token scan: one occurrence, only intended Scriptable file.

## iPhone rollout

Replace the private Scriptable script with this exact dark source, then refresh a medium or large widget. It is already configured for official data and must display `LIVE`, not `MẪU`.
