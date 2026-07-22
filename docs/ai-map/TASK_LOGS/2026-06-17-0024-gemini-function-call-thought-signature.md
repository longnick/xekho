# 2026-06-17 00:24 - Preserve Gemini function-call thought signatures

Repo: `/home/longnick/projects/xekho`
Branch: `push-clean-main-20260604-072900`

## Context

Post-deploy live owner-assistant smoke test reached Gemini tool calling and failed with a Vertex/Gemini error requiring `thought_signature` metadata on follow-up function-call parts.

## Change

- `functions/vertexAi.js#collectFunctionCalls()` now keeps the original model `part` alongside parsed tool name/args.
- `functions/index.js#runVertexToolLoop()` now reuses the original function-call part when appending the model turn before sending tool responses, preserving Gemini/Vertex `thoughtSignature` metadata.
- Added `scripts/verify-gemini-function-call-thought-signature.js` to guard this behavior.

## Verification

- `node --check functions/index.js`
- `node --check functions/vertexAi.js`
- `node --check scripts/verify-gemini-function-call-thought-signature.js`
- `node scripts/verify-gemini-function-call-thought-signature.js`
- existing owner assistant guard verifier

## Notes

No database mutation. The fix is runtime-only for AI tool-call continuity.
