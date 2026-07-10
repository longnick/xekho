# Firestore Rules local test harness

These tests run only against a **local Firestore Emulator** with synthetic `*.test` users and documents. They never contact project `pos-v2-909ff` and must never be pointed at production.

## Commands

```bash
# Control tests: proves the emulator, Rules loading, assertSucceeds and assertFails plumbing.
npm run test:rules

# Historical exploit evidence, now a normal regression gate: confirms the four previously
# documented unauthorised mutations remain denied after Sprint 1.
npm run test:rules:red-evidence
```

Both public commands are self-contained and start an emulator-only process with fixed project id `xekho-rules-test`:

```bash
npm run test:rules
npm run test:rules:red-evidence
```

The `*:emulator` variants are intentionally internal helpers for `firebase emulators:exec`; do not run them directly.

## Safety invariants

- Use the fixed emulator-only project id `xekho-rules-test`.
- Do not add real customer/order, staff, or credential values to fixtures.
- Do not run `firebase deploy` as part of this test workflow.
- After Sprint 1 fixes the Rules, rename/move `red-vulnerabilities.evidence.js` into the normal `*.rules.test.js` suite so the authorization regressions become CI gates.
