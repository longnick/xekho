#!/usr/bin/env python3
"""Build a Capgo-compatible OTA zip from the current Capacitor web bundle.

This script intentionally does not upload anywhere and does not read secrets.
It only packages dist/ into android/app/build/outputs/ota/ so an owner can
upload the zip to Capgo Cloud or a self-hosted updater endpoint later.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
OUT_DIR = ROOT / 'android' / 'app' / 'build' / 'outputs' / 'ota'
FORBIDDEN_PARTS = {'android', 'android-native', 'functions', 'node_modules', '.git'}
FORBIDDEN_NAMES = {'google-services.json', 'serviceAccount.json', '.env', 'functions-list.json'}


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
    zip_path = OUT_DIR / f'xekho-capacitor-ota-{stamp}.zip'

    files = sorted(p for p in DIST.rglob('*') if should_include(p))
    if not files:
        raise SystemExit('No files selected for OTA bundle.')

    with ZipFile(zip_path, 'w', compression=ZIP_DEFLATED) as zf:
        for path in files:
            zf.write(path, path.relative_to(DIST).as_posix())

    manifest = {
        'createdAt': datetime.now(timezone.utc).isoformat(),
        'type': 'capacitor-web-ota-bundle',
        'appId': 'com.xekho.pos.capacitor',
        'sourceDir': 'dist',
        'zip': zip_path.name,
        'sha256': sha256(zip_path),
        'sizeBytes': zip_path.stat().st_size,
        'fileCount': len(files),
        'upload': 'Manual: upload this zip to Capgo Cloud or a self-hosted updater endpoint; no API key is stored in repo.',
    }
    manifest_path = zip_path.with_suffix('.json')
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

    print(f'OTA zip: {zip_path}')
    print(f'Manifest: {manifest_path}')
    print(f"SHA256: {manifest['sha256']}")
    print(f"Files: {manifest['fileCount']}  Size: {manifest['sizeBytes']} bytes")


if __name__ == '__main__':
    main()
