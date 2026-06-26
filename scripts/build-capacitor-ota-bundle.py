#!/usr/bin/env python3
"""Build a Capgo-compatible OTA zip from the current Capacitor web bundle.

Publishes artefacts to dist/ota/ so Firebase Hosting can serve them at:
  /ota/<name>.zip
  /ota/<name>.json   (per-release manifest)
  /ota/latest.json   (always points to newest release)

No secrets are read or written.
"""
from __future__ import annotations

import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
OUT_DIR = ROOT / 'android' / 'app' / 'build' / 'outputs' / 'ota'
HOSTING_OTA_DIR = DIST / 'ota'

FORBIDDEN_PARTS = {'android', 'android-native', 'functions', 'node_modules', '.git', 'ota'}
FORBIDDEN_NAMES = {'google-services.json', 'serviceAccount.json', '.env', 'functions-list.json'}

APP_ID = 'com.xekho.pos.capacitor'
HOSTING_BASE = '/ota'


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def should_include(path: Path) -> bool:
    rel = path.relative_to(DIST)
    parts = set(rel.parts)
    if parts & FORBIDDEN_PARTS:
        return False
    if path.name in FORBIDDEN_NAMES:
        return False
    if path.name.startswith('.env'):
        return False
    return path.is_file()


def main() -> None:
    if not DIST.exists():
        raise SystemExit('dist/ does not exist. Run npm run build:hosting first.')
    if not (DIST / 'index.html').exists():
        raise SystemExit('dist/index.html is missing; refusing to build OTA bundle.')

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    zip_name = f'xekho-capacitor-ota-{stamp}.zip'
    zip_path = OUT_DIR / zip_name

    # Build zip from dist/ BEFORE ota/ subdirectory is created (no recursion)
    files = sorted(p for p in DIST.rglob('*') if should_include(p))
    if not files:
        raise SystemExit('No files selected for OTA bundle.')

    with ZipFile(zip_path, 'w', compression=ZIP_DEFLATED) as zf:
        for path in files:
            zf.write(path, path.relative_to(DIST).as_posix())

    digest = sha256(zip_path)
    size = zip_path.stat().st_size
    now_iso = datetime.now(timezone.utc).isoformat()

    release_manifest = {
        'createdAt': now_iso,
        'type': 'capacitor-web-ota-bundle',
        'appId': APP_ID,
        'version': stamp,
        'enabled': True,
        'url': f'{HOSTING_BASE}/{zip_name}',
        'zip': zip_name,
        'sha256': digest,
        'sizeBytes': size,
        'fileCount': len(files),
    }

    # Write per-release manifest next to zip (android/app/build/outputs/ota/)
    manifest_path = zip_path.with_suffix('.json')
    manifest_path.write_text(
        json.dumps(release_manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8'
    )

    # Publish to dist/ota/ for Firebase Hosting
    HOSTING_OTA_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(zip_path, HOSTING_OTA_DIR / zip_name)
    shutil.copy2(manifest_path, HOSTING_OTA_DIR / manifest_path.name)

    # latest.json — always points at newest release
    latest = {
        'createdAt': now_iso,
        'appId': APP_ID,
        'version': stamp,
        'enabled': True,
        'url': f'{HOSTING_BASE}/{zip_name}',
        'sha256': digest,
        'sizeBytes': size,
        'fileCount': len(files),
    }
    (HOSTING_OTA_DIR / 'latest.json').write_text(
        json.dumps(latest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8'
    )

    print(f'OTA zip: {zip_path}')
    print(f'Manifest: {manifest_path}')
    print(f'Hosting OTA dir: {HOSTING_OTA_DIR}')
    print(f'  → {zip_name}')
    print(f'  → {manifest_path.name}')
    print(f'  → latest.json  (version={stamp})')
    print(f"SHA256: {digest}")
    print(f"Files: {len(files)}  Size: {size} bytes")


if __name__ == '__main__':
    main()
