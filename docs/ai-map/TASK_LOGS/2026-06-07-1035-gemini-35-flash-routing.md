# Gemini 3.5 Flash routing update

Time: 2026-06-07 10:35 ICT
Repo: `/home/longnick/projects/xekho`
Branch: `push-clean-main-20260604-072900`

## Request

Configure flows that were calling `gemini-2.5-flash` or `gemini-2.5-pro` to use `gemini-3.5-flash`.

## Files changed

- `functions/index.js`
- `functions/vertexAi.js`
- `opencode.json`

## Behavior changed

- `VERTEX_TEXT_MODEL` default changed from `gemini-2.5-flash` to `gemini-3.5-flash`.
- Vertex runtime text-model fallback list now prefers `gemini-3.5-flash`.
- `adminProbeVertex` default probe model now uses `gemini-3.5-flash`.
- `opencode.json` Google model config now points to `google/gemini-3.5-flash`.

## Verification

Commands run:

```bash
cd functions && node --check index.js
cd functions && node --check vertexAi.js
node -e "JSON.parse(require('fs').readFileSync('opencode.json','utf8')); console.log('opencode json ok')"
```

All returned exit code 0.

Runtime/config search excluding docs, artifacts, backups, and `.env*` files found no remaining `gemini-2.5-flash` or `gemini-2.5-pro` references.

## Notes

- Backup files such as `functions/index.js.backup-20260509` were intentionally not edited.
- Deployed Firebase params/environment may still override source defaults if production config still sets old model names.
