#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT/.." && pwd)"
TEMPLATE="$REPO_ROOT/docs/android-native-manual-qa-result-template.md"
APK="$ROOT/app/build/outputs/apk/debug/app-debug.apk"
OUT_DIR="$REPO_ROOT/docs/ai-map/MANUAL_QA_RESULTS"
TS="$(TZ=Asia/Ho_Chi_Minh date '+%Y-%m-%d-%H%M')"
OUT="$OUT_DIR/${TS}-android-native-manual-qa-result.md"

if [[ ! -f "$TEMPLATE" ]]; then
  echo "ERROR: template not found: $TEMPLATE" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
cp "$TEMPLATE" "$OUT"

if [[ -f "$APK" ]]; then
  sha256="$(sha256sum "$APK" | awk '{print $1}')"
  python3 - "$OUT" "$sha256" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
sha = sys.argv[2]
text = path.read_text(encoding='utf-8')
text = text.replace('APK SHA256:\n', f'APK SHA256: {sha}\n', 1)
path.write_text(text, encoding='utf-8')
PY
else
  echo "WARN: APK missing, SHA256 left blank: $APK" >&2
fi

cat "$OUT"
echo
echo "Result draft: $OUT"
