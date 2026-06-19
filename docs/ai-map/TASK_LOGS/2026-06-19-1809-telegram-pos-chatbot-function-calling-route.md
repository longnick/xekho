# Telegram route for POS chatbot function calling

Time: 2026-06-19 18:09 +07
Repo: `/home/longnick/projects/xekho`
Branch: `push-clean-main-20260604-072900`

## Goal

Make the Gemini 2.5 Flash POS chatbot function-calling path reachable from Telegram owner text chat, not only from the callable `askPosChatbot` endpoint.

## Changes

- Added `isTelegramPosChatbotFunctionCallingQuestion()` detector for natural report/profit questions.
- Added `tryAnswerTelegramPosChatbotFunctionCalling()` wrapper that calls `runAskPosChatbot()` and returns a normal Telegram `geminiResult` shape.
- Wired the owner-only `telegramWebhook` text branch to call this path after deterministic handlers and before generic Firestore tool fallback.
- Hardened `getPosChatbotAi()` to support:
  - Gemini API key env (`GEMINI_API_KEY` / `GOOGLE_API_KEY`),
  - Vertex AI Cloud Functions runtime (`vertexai: true`, project/location),
  - final `const ai = new GoogleGenAI()` fallback.
- Extended `scripts/verify-pos-chatbot-function-calling.js` to assert the Telegram integration.

## Safety

- Owner-only Telegram guard remains before this path.
- No production data mutation was added.
- `getProfitReport()` still returns mock data only.

## Verification/deploy

See assistant final report for command outputs and deployed targets.
