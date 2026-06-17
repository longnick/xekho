# 2026-06-17 - EchoEar kitchen ready notifier

## Goal

Build an EchoEar ESP32-S3 firmware path for service-staff alerts when kitchen marks dishes `done`, connected to xekho without letting the board mutate POS order state.

## Backend added

- `functions/kitchenDeviceFeed.js`
  - Reads open Firestore `orders`.
  - Returns only order items with `kitchenStatus === done`.
  - Excludes retail/skip/direct-sale items.
  - Filters by station (`all`, `hot`, etc.).
  - Sorts newest ready item first and caps response limit.

- `functions/index.js`
  - Exposes `exports.kitchenDeviceFeed` as a GET endpoint.
  - Requires configured `KITCHEN_DEVICE_TOKEN`.
  - Accepts `Authorization: Bearer ***` or `?token=`.
  - Fails closed with `503 device_token_not_configured` if token is missing.
  - Rejects invalid/missing token with `401 unauthorized`.

## Firmware artifact

Created standalone ESP-IDF project at:

```text
/home/longnick/echoear/xekho_kitchen_notifier
```

Key files:

- `main/xekho_kitchen_notifier.cc`
- `main/Kconfig.projbuild`
- `README.md`

Behavior:

- WiFi station mode.
- Polls `kitchenDeviceFeed` every `CONFIG_XEKHO_POLL_SECONDS` seconds.
- Displays table/item/qty/note on EchoEar 360x360 ST77916 panel.
- Plays alert tone when a new ready item appears or every 30s while waiting.
- Does not mark items served.

## Verification

- `node --check functions/index.js`
- `node --check functions/kitchenDeviceFeed.js`
- `node --check scripts/verify-kitchen-device-feed.js`
- `node scripts/verify-kitchen-device-feed.js`
- `git diff --check`
- `npx tsc --noEmit -p functions/tsconfig.json`
- `npm test -- --runInBand`

## Build blocker

This machine does not currently have ESP-IDF `idf.py`, so the firmware project cannot be built/flashed here. Build on an ESP-IDF host with:

```bash
cd /home/longnick/echoear/xekho_kitchen_notifier
idf.py set-target esp32s3
idf.py menuconfig
idf.py build
idf.py -p /dev/ttyACM0 flash monitor
```
