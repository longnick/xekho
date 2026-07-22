# Final main integration candidate

## Provenance

- Reviewed packaging parent: `c9f920633934872ceb3d9e86dce1ba058b69c538`.
- Rewritten `main` parent: `3e00de54faa3ac74ae916fd1696cabe55f45fab2`.
- Integration merge: `70812e5333d71db4007a5640ac5b9b01da5c6b71`.
- Packaging runtime won conflicted application/dependency paths because `main` runtime fixes for mojibake, service-account binding, and secret scanning were patch-equivalent in packaging.
- Preserved unique `main` Hosting redirects for `/dat-hang`, `/dat-mon`, and `/order`.
- Independent review found duplicate `hosting.redirects` keys created by merge resolution; removed the byte-identical duplicate and validated the final config with a duplicate-key-rejecting JSON parser.
- Restored reviewed `google/gemini-3.5-flash` routing after merge exposed `main`'s stale `2.5` config.
- Excluded generated `.firebase/hosting..cache` and `functions-list.json`.

## Verification

- Root `npm ci --ignore-scripts`: PASS.
- Functions `npm ci --ignore-scripts`: PASS.
- Full Jest: 18 suites / 207 tests PASS.
- Functions security: 12 suites / 144 tests PASS.
- `npm run check` and `npm run check:functions`: PASS.
- `npx tsc --noEmit -p jsconfig.json`: PASS, no errors.
- Canonical `npm run lint`: baseline remains `250 errors / 16 warnings` in 10 pre-existing source/test files (`no-undef` is 250 errors); integration-only paths are docs plus `firebase.json`, so this is recorded as inherited non-blocking debt, not claimed PASS.
- Production dependency policy: root and Functions critical/high `0/0`.
- Firestore Rules: 4 suites / 37 tests PASS.
- Rules deny regression: 4/4 PASS.
- Hosting build and boundary verifier: PASS (`required=17`).
- Browser smoke: PASS (`screen=tables`, signed-out routes blocked).
- Auth + Firestore + Functions synthetic Emulator E2E: PASS: unauthenticated voice `401`, staff status `200`, owner provisioning `200`, Firestore role/staff mapping and Auth claim persisted, unauthenticated provisioning denied.

## Gate status

- Source integration candidate: locally green, pending independent review and GitHub PR checks.
- Production: not deployed; real-device authenticated QA, role/staff mapping review, staged deploy approval, and live smoke remain required.

## GitHub PR correction

- Closed merge-history PR #3 after Gitleaks correctly scanned inherited pre-sanitization history and found historical findings; no allowlist bypass was added.
- GitHub Frontend jobs exposed missing `functions/node_modules` before root Jest discovery; CI now installs the Functions lockfile in each Frontend matrix job.
- GitHub Rules job exposed Firebase CLI's Java 21 floor; CI now installs Temurin 21 before Emulator tests.
- Final handoff uses a single-parent snapshot commit based on current `main`, so old pre-sanitization history is not introduced into `main`.
- Snapshot content matches the reviewed tree semantically; `git diff --cached --check` required whitespace-only normalization in 5 inherited files (42 findings), recorded explicitly rather than claiming byte identity.