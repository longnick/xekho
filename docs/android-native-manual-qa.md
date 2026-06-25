# XE KHÔ Android Native Manual QA Checklist

Sprint: 26
Artifact type: debug APK only

## Build and report

```bash
cd /home/longnick/projects/xekho/android-native
./gradlew :app:assembleDebug --no-daemon
scripts/native-apk-report.sh
```

Expected report includes:

```text
APK: /home/longnick/projects/xekho/android-native/app/build/outputs/apk/debug/app-debug.apk
Secret/config scan: APK_SCAN_NO_MATCHES
Production write: false
Firestore sync: false
```

Telegram delivery line:

```text
MEDIA:/home/longnick/projects/xekho/android-native/app/build/outputs/apk/debug/app-debug.apk
```

## Android device install

1. Send/open the APK on a trusted Android test device.
2. Enable **Install unknown apps** only for the trusted app used to open the APK.
3. Install the APK.
4. Optionally disable **Install unknown apps** again after install.
5. Open **Xe Kho POS**.
6. Unlock with demo PIN:

```text
1234
```

## Manual smoke checklist

- [ ] Wrong PIN stays locked.
- [ ] Demo PIN `1234` unlocks local fake tabs.
- [ ] `Bàn` tab renders POS local multi-table flow.
- [ ] Local cart/payment/queue cards render without network/data errors.
- [ ] `Kho` tab renders `Kho cần nhập` / local inventory cards.
- [ ] `Tài chính` tab renders `Tài chính hôm nay` and `POS dry-run` cards.
- [ ] `Cài đặt` tab renders `Auth readiness` and safety copy.
- [ ] `Firestore UI mapping Sprint 21` remains preview-only with `sampleRowCount = 0`.
- [ ] `Firestore approval checklist Sprint 22` remains blocked/approval-held and not executable.
- [ ] Rotate device / background-foreground smoke: app still opens and does not crash.

## Explicitly blocked in Sprint 26

- [ ] No `google-services.json` required or packaged.
- [ ] No service account.
- [ ] No `.env`.
- [ ] No production POS rows read/sampled/returned.
- [ ] No Firestore write.
- [ ] No Firestore sync/background worker.
- [ ] No release signing requirement for this debug APK.

## Pass/fail note template

Use the structured Sprint 27 template:

```bash
cd /home/longnick/projects/xekho/android-native
scripts/native-qa-result-template.sh
```

Template source:

```text
docs/android-native-manual-qa-result-template.md
```

Generated result drafts are written under:

```text
docs/ai-map/MANUAL_QA_RESULTS/
```
