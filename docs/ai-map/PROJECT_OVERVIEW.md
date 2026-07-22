# Project Overview

Repo: `/home/longnick/projects/xekho`

## What is this repo?

`xekho` is the XE KHÔ POS / KDS / business automation repo. It contains the point-of-sale UI, kitchen display screens, Firebase/Firestore integration, Cloud Functions, AI assistant modules, and automation scripts used around restaurant operations.

Primary domain areas:

- POS order/table flow.
- Kitchen Display System (KDS).
- Firebase Hosting / Firestore / Cloud Functions.
- AI assistant and business automation.
- Meta/Facebook/marketing automation planning and integrations.

## How to run it?

Known commands from `package.json` and repo docs:

```bash
npm install
npm test
node server.js
npm run backfill:history-costs
```

Firebase emulator/deploy commands are documented in `README.md` / `DEPLOYMENT_GUIDE.md`, but must be used carefully because this repo is tied to Firebase resources and production-like data.

Functions package:

```bash
cd functions
npm install
```

## Main folders

- `/` root: POS/KDS frontend pages and core JS modules.
- `functions/`: Firebase Cloud Functions and AI/Firebase backend helpers.
- `app/`: newer modular app code/work in progress.
- `brand/`: brand/media documentation.
- `docs/`: documentation and AI map.
- `prompts/`: prompt assets / AI workflow notes.
- `.firebase/`: Firebase hosting/cache output; treat as generated/deployment state.
- `node_modules/`, `functions/node_modules/`: dependencies; do not edit manually.

## Main commands

- `npm test`: Jest tests.
- `node server.js`: local HTTP server path mentioned in README.
- `npm run backfill:history-costs`: history cost backfill script; do not run without explicit user confirmation because it may touch data.

## External services

- Firebase Auth / Firestore / Hosting / Cloud Functions.
- Google Vertex AI / Gemini integrations.
- Telegram Bot API for notifications.
- Possible Zalo OA integration.
- Meta/Facebook automation work appears in planning/docs and related modules.

## Sensitive files not to touch

Do not read, edit, stage, commit, or paste contents from:

- `.env`, `.env.*`, `.env.local`.
- `functions/.env.*`.
- Firebase service account JSON files.
- Google credential JSON files.
- production database exports/backups.
- migration/POS/payment/customer data unless explicitly allowed by the user.

Sensitive files are allowed to be mentioned by path only when needed for safety.

## Related repos

- `/home/longnick/projects/webapp-menu`: menu web app / menu UI / online management areas. README warns feature overlap with `xekho`.
- `/home/longnick/projects/VIDEO AI TOOL`: media/image/video generation pipeline for marketing and short video workflows.

## Current repo state when this AI map was initialized

- Branch: `test/xe-kho-repo-implementer-skill`.
- Existing working tree was dirty before AI map creation.
- Existing uncommitted changes included source/docs/config plus sensitive-file paths in git status. This AI map initialization only created files under `docs/ai-map/`.
