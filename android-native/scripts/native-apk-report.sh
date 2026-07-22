#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APK_REL="app/build/outputs/apk/debug/app-debug.apk"
REPORT_REL="app/build/outputs/apk/debug/xekho-native-debug-apk-report.md"
APK="$ROOT/$APK_REL"
REPORT="$ROOT/$REPORT_REL"
GRADLE_FILE="$ROOT/app/build.gradle.kts"
SCAN_PATTERN='(^|/)(google-services\.json|.*\.env|serviceAccount|firebase-adminsdk|secret|functions-list\.json)$'

if [[ ! -f "$APK" ]]; then
  echo "ERROR: APK not found: $APK" >&2
  echo "Run first: cd $ROOT && ./gradlew :app:assembleDebug --no-daemon" >&2
  exit 1
fi

application_id="$(grep -m1 'applicationId = ' "$GRADLE_FILE" | cut -d'"' -f2)"
version_code="$(grep -m1 'versionCode = ' "$GRADLE_FILE" | tr -dc '0-9')"
version_name="$(grep -m1 'versionName = ' "$GRADLE_FILE" | cut -d'"' -f2)"
sha256="$(sha256sum "$APK" | awk '{print $1}')"
size_bytes="$(stat -c '%s' "$APK")"
size_human="$(du -h "$APK" | awk '{print $1}')"
scan_matches="$(unzip -l "$APK" | grep -Ei "$SCAN_PATTERN" || true)"

if [[ -n "$scan_matches" ]]; then
  scan_status="FAILED"
else
  scan_status="APK_SCAN_NO_MATCHES"
fi

mkdir -p "$(dirname "$REPORT")"
cat > "$REPORT" <<REPORT_EOF
# Xe Khô native debug APK report

- Sprint: 25
- Application ID: $application_id
- Version: $version_name ($version_code)
- APK: $APK
- Size: $size_human ($size_bytes bytes)
- SHA256: $sha256
- Secret/config scan: $scan_status
- Release signing: blocked / not required for debug artifact
- Production write: false
- Firestore sync: false

## Telegram delivery

MEDIA:$APK

## Safety

No google-services.json, service account, .env, production POS rows, Firestore write, or sync should be packaged by this targeted scan.
REPORT_EOF

if [[ -n "$scan_matches" ]]; then
  printf '%s\n' "$scan_matches" >> "$REPORT"
  echo "ERROR: APK scan matched forbidden entries. Report: $REPORT" >&2
  exit 2
fi

cat "$REPORT"
