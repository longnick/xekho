# XE KHÔ Android Native Manual QA Result Template

Sprint: 27
Artifact type: debug APK only

## Artifact

```text
APK: /home/longnick/projects/xekho/android-native/app/build/outputs/apk/debug/app-debug.apk
APK SHA256:
Report command: cd /home/longnick/projects/xekho/android-native && scripts/native-apk-report.sh
Secret/config scan: PASS/FAIL
```

## Device / tester

```text
Tester:
Test date/time (+07):
Device:
Android version:
Install source:
Network state: Wi-Fi / mobile / offline
```

## Install result

```text
Install result: PASS/FAIL
Open app: PASS/FAIL
Crash on first open: YES/NO
Notes:
```

## Smoke result

```text
PIN gate: PASS/FAIL
Bàn: PASS/FAIL
Kho: PASS/FAIL
Tài chính: PASS/FAIL
Cài đặt: PASS/FAIL
Firestore cards blocked: PASS/FAIL
Rotate/background foreground: PASS/FAIL
```

## Required observations

- [ ] Wrong PIN stays locked.
- [ ] Demo PIN `1234` unlocks local fake tabs.
- [ ] `Bàn` tab renders local multi-table/cart/payment/queue cards.
- [ ] `Kho` tab renders local inventory/low-stock cards.
- [ ] `Tài chính` tab renders local finance/POS dry-run cards.
- [ ] `Cài đặt` tab renders Auth readiness and safety copy.
- [ ] Firestore UI mapping remains preview-only with `sampleRowCount = 0`.
- [ ] Firestore approval checklist remains blocked/approval-held and not executable.
- [ ] Rotate device or background/foreground does not crash.

## Blocked confirmations

- [ ] No `google-services.json` used or packaged.
- [ ] No service account used or packaged.
- [ ] No `.env` used or packaged.
- [ ] No production POS data read, sampled, returned, written, or synced.
- [ ] No Firestore write, sync, background worker, query, listener, or `get()` approved.

## Issues found

```text
1.
2.
3.
```

## Final verdict

```text
Manual QA verdict: PASS / FAIL / NEEDS RETEST
Retest needed before next sprint: YES/NO
Notes:
```
