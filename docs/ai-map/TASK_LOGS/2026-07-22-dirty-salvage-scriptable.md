# Dirty salvage — Scriptable finance widget

## Source

Recovered from `/home/longnick/projects/xekho` after reviewed release PR #4 merged into `main`.

## Boundary

- Forward-ported only standalone Scriptable finance widget module, endpoint wiring, verifier, widget client, sketches, and matching design logs.
- Did not copy dirty `functions/index.js`, lockfiles, Rules, or other core files wholesale.
- Removed hardcoded widget token from client source. Token must be configured locally through Scriptable widget parameters.
- Production was not accessed or deployed.

## Verification

- `node scripts/verify-scriptable-finance-widget.js`: PASS, 28 assertions.
- `npm run test:functions-security`: PASS, 12 suites / 144 tests.
- `npm run check:functions`: PASS.
- `npm run check:dependency-audit`: PASS; root and Functions critical/high `0/0`.
- Widget source scan: prior hardcoded token absent; no Firebase admin credential/private key marker introduced.

## Remaining

- Independent review and PR required before merge.
- Rotate `SCRIPTABLE_FINANCE_WIDGET_TOKEN` if prior local token was ever configured in production.
- Production deploy requires separate approval.
