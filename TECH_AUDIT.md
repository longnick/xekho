# TECH AUDIT

## Scope

Combined audit for both active repos in this workspace:

- `d:\APP - BACKUP\xekho`
- `d:\APP - BACKUP\webapp-menu`

Audit basis:

1. Vietnamese encoding / mojibake fixes
2. AI migration from Gemini API style flows toward Vertex AI
3. Google service account migration

Cloud verification date:

- `2026-05-19`
- Project: `pos-v2-909ff`
- Region: `asia-southeast1`

Important reading rule for this report:

- `active code` means primary source under each repo, mainly `functions/index.js`, root app code, and `src/`
- `backup/artifact/tmp` files are reported separately and are not treated as source-of-truth unless stated

## Executive Summary

| Area | Result |
|---|---|
| Repo scope | Previous audit was incomplete; current report covers both `xekho` and `webapp-menu` |
| Cloud Functions alignment | `xekho` source/cloud match `34/34`; `webapp-menu` source has `67`, cloud has `63` |
| Runtime service account | Cloud runtime SA is now standardized to `functions-runtime@pos-v2-909ff.iam.gserviceaccount.com` across both codebases |
| Build identity | Still not fully migrated; build/service metadata still references old compute SA in cloud build config |
| Vertex AI migration | Production runtime is mostly Vertex-oriented, but Gemini-era naming and some fallback paths still remain |
| Gemini remnants | Still present in active code, integration patches, docs, and backups |
| Mojibake cleanup | Not complete; active mojibake remains in both repos, heavier in `xekho` than `webapp-menu` |
| Schedule ownership | Telegram reporting exists in both repos, but live scheduled Telegram job currently belongs to `xekho` |
| Cross-repo ownership risk | Still the main architectural risk; several adjacent features exist in both repos with overlapping business scope |

## Validation Run

| Repo | Check | Result |
|---|---|---|
| `xekho` | `npm test` | Pass, `6/6` |
| `xekho` | `node --check functions/index.js` | Pass |
| `webapp-menu` | `npm run build` | Pass |
| `webapp-menu` | `node --check functions/index.js` | Pass |
| `webapp-menu/functions` | `npm run lint` | Pass, but only prints `No lint configured` |
| `webapp-menu` | `npm run lint` | Fail because `eslint` is not installed / not available in PATH |

## Repo Snapshot

| Repo | Purpose in practice | App stack | Functions stack | Export count in source | Deployed functions in cloud |
|---|---|---|---|---:|---:|
| `xekho` | POS app, staff UI, AI assistant, Telegram ops, purchase OCR, order/service/payment triggers | HTML/JS app | Firebase Functions v2 | 34 | 34 |
| `webapp-menu` | Smart menu / online ordering / marketing AI / FFmpeg / analytics / online admin | React + Vite + TS | Firebase Functions v2 | 67 | 63 |

`webapp-menu` source-only functions not found on cloud:

- `scanWorkflowRunsNow`
- `onDineInOrderRequestCreated`
- `dailyReportTelegram`

No cloud-only functions were found outside current source for either codebase.

## Main Feature Inventory

| Feature | File liên quan | Trạng thái | Rủi ro | Cách test | Đề xuất sửa |
|---|---|---|---|---|---|
| POS core tables / ordering / checkout | `xekho/index.html`, `xekho/app.js`, `xekho/db.js` | Active in `xekho` | Medium | Open table, add items, checkout, reopen bill | Keep in `xekho`; cleanup mojibake in operator-facing text |
| AI chatbot / open-question answering | `xekho/ai-core.js`, `xekho/ai-ui.js`, `xekho/functions/index.js`, `xekho/functions/vertexAi.js` | Active and deployed in `xekho` | Medium-High | Test AI bubble, `/aiStatus`, `/aiRouter`, voice route | Keep runtime path; finish wording and error-text cleanup |
| Voice recognition / speech flows | `xekho/ai-ui.js`, `xekho/server.js`, `xekho/functions/index.js` | Active but mixed local/cloud path | Medium | Browser mic flow + `/apiVoice` + Telegram voice flow | Audit end-to-end after text cleanup |
| Purchase OCR / import OCR | `xekho/app.js`, `xekho/functions/index.js`, `xekho/functions/vertexAi.js` | Active and deployed in `xekho` | High | OCR purchase image and confirm parsed items | Keep feature; remove stale Gemini UI wording |
| Telegram webhook + kitchen/completed-order notifications | `xekho/functions/index.js` | Active and deployed in `xekho` | Medium | Create order, update kitchen status, complete order | Keep in `xekho`; fix remaining mojibake in message templates |
| Telegram scheduled daily report | `xekho/functions/index.js`, `webapp-menu/functions/index.js` | Overlapping source, but live scheduler belongs to `xekho` | High | Test `scheduledTelegramReport` | Declare single owner; do not keep two schedule implementations indefinitely |
| Public menu sync from POS catalog | `xekho/functions/index.js` | Active and deployed in `xekho` | Medium-High | Update `Product_Catalog`, inspect public site data | Clarify if `xekho` remains source-of-truth while web ordering lives in `webapp-menu` |
| Online order approve/reject admin callables | `xekho/functions/index.js`, `xekho/app.js`, `xekho/db.js` | Active and deployed in `xekho` | Medium | Approve/reject from staff UI | Verify business boundary against `webapp-menu` online order flows |
| Online order creation / POS sync / payment webhooks | `webapp-menu/functions/index.js`, `webapp-menu/src/features/admin/services/onlineAdminService.ts` | Active and deployed in `webapp-menu` | High | Create online order, PayOS/SePay webhook sandbox, POS sync | Keep in `webapp-menu`; document that this is separate from `xekho` callables |
| Marketing AI / director AI / trend scan | `webapp-menu/functions/index.js`, `webapp-menu/functions/aiService.js`, `webapp-menu/src/features/admin` | Active and deployed in `webapp-menu` | High | Trigger admin callables, inspect generated outputs | Keep in `webapp-menu`; audit cross-project secret usage |
| Scheduled analytics / guardian / chief-of-staff / weather | `webapp-menu/functions/index.js` | Active and mostly aligned with scheduler jobs | Medium | Verify scheduler jobs, manual trigger endpoints | Keep; monitor paused BigQuery sync job |
| FFmpeg worker pipeline | `webapp-menu/functions/index.js`, `webapp-menu/workers/ffmpeg-renderer` | Active and deployed in `webapp-menu` | Medium-High | Trigger render task and callback flow | Keep; ensure Cloud Run worker docs match production |
| Smart menu customer flows | `webapp-menu/src/features/commerce`, `webapp-menu/functions/index.js` | Active in source, partly deployed | Medium | Browse customer menu, order drawer, service request | Keep; clarify any source-only handlers before relying on them |

## Source-Of-Truth Notes For Key Shared / Confusing Areas

| Area | Current owner in cloud | Source status | Conclusion |
|---|---|---|---|
| Telegram scheduled report | `xekho:scheduledTelegramReport` | `xekho` and `webapp-menu` both contain report logic | `xekho` is current production owner |
| Telegram test daily report | `xekho:testDailyReportTelegram` (removed 2026-06-03) | `webapp-menu` also has source copy, not deployed | Keep `xekho` as live owner unless intentionally migrated |
| Online order admin approve/reject | `xekho` | Separate online-order pipeline exists in `webapp-menu` | Two adjacent domains exist; do not delete either side yet |
| Public menu sync triggers | `xekho` | Public ordering UX lives in `webapp-menu` | Ownership needs explicit documentation, but current trigger owner is `xekho` |
| Online order intake / payment webhooks | `webapp-menu` | Source and cloud both present in `webapp-menu` | `webapp-menu` is current production owner |

## AI Migration Findings

### Active Gemini remnants

These are still present in active or semi-active code and should not be treated as fully migrated:

| Type | File | Notes |
|---|---|---|
| Hidden UI wording | `xekho/index.html` | Hidden settings UI wording was updated toward `Vertex AI`, but legacy hidden card and badge labeling still need final ownership review |
| Internal naming | `xekho/ai-ui.js`, `xekho/functions/geminiTools.js`, `xekho/functions/index.js` | `gemini` naming still exists in metrics, helper names, and tool abstractions |
| Direct Gemini key fallback | `webapp-menu/functions/aiService.js` | Still accepts `GEMINI_API_KEY` / `GOOGLE_API_KEY` fallback along with AI API key |
| Gemini wording in production functions | `webapp-menu/functions/index.js:14804` | Trend-scan summary still says `Gemini API search grounding` |
| Docs / plans | `xekho/IMPLEMENTATION.md`, `webapp-menu/remakeAI.md`, `webapp-menu/plan-v3-thuc-thi.md` | Documentation still references Gemini API or Gemini key workflow |

### Old Gemini HTTP / SDK traces not treated as active source-of-truth

These exist mostly in integration or patch artifacts:

- `webapp-menu/integration-patches/xekho-functions-index.js`
- `webapp-menu/integration-patches/xekho-app.js`
- `webapp-menu/integration-patches/xekho-db.js`

These should be treated as historical migration material, not current production source.

### Active Vertex AI usage

| Repo | File | Current pattern |
|---|---|---|
| `xekho` | `functions/index.js` | Uses `VERTEX_SERVICE_ACCOUNT_JSON`, `VERTEX_PROJECT_ID`, `VERTEX_LOCATION`, `VERTEX_TEXT_MODEL` |
| `xekho` | `functions/vertexAi.js` | Main Vertex auth/request helper with ADC + secret JSON fallback |
| `webapp-menu` | `functions/index.js` | Uses `GOOGLE_SERVICE_ACCOUNT_JSON`, `AI_VERTEX_PROJECT_ID`, multiple AI model envs, runtime service account |
| `webapp-menu` | `functions/aiService.js` | Central client builder for API-key vs service-account Vertex access |

### Credential / project / region findings

| Repo | File | Relevant config |
|---|---|---|
| `xekho` | `functions/index.js` | `VERTEX_PROJECT_ID=pos-v2-909ff`, `VERTEX_LOCATION=global`, secret `VERTEX_SERVICE_ACCOUNT_JSON` |
| `webapp-menu` | `functions/index.js` | `AI_VERTEX_PROJECT_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `SMART_MENU_RUNTIME_SERVICE_ACCOUNT` |
| `webapp-menu` | cloud env metadata during previous audits | Several functions still reference cross-project AI project IDs for director flows |

## Service Account Findings

### Runtime SA state

Cloud runtime SA is now consistent across both codebases:

- `functions-runtime@pos-v2-909ff.iam.gserviceaccount.com`

Verified by `gcloud functions list` across all `97` deployed functions:

- `xekho`: `34`
- `webapp-menu`: `63`

### Remaining credential risks in source

| Item | File | State | Risk |
|---|---|---|---|
| Local key file fallback | `xekho/functions/vertexAi.js` | Still looks for `serviceAccountKey.json` | Medium |
| Local loader fallback | `xekho/loadServiceAccount.js` | Still supports env/file JSON | Medium |
| Root ignore | `xekho/.gitignore`, `webapp-menu/.gitignore` | Ignore rules exist | Low-Medium |
| Secret JSON runtime | `webapp-menu/functions/aiService.js` | Still depends on `GOOGLE_SERVICE_ACCOUNT_JSON` in runtime | Medium-High |
| Cross-project AI secret dependency | `webapp-menu/functions/index.js`, cloud env | Still likely present for director flows | High |

Important nuance:

- Runtime SA migration is done
- Build identity cleanup is not done
- Secret strategy cleanup is not done

## Firebase Functions And Schedule Inventory

### Source function counts

| Repo | onCall | onRequest | Firestore/Event | onSchedule | Total |
|---|---:|---:|---:|---:|---:|
| `xekho` | 2 | 14 | 17 | 1 | 34 |
| `webapp-menu` | 21 | 29 | 6 | 11 | 67 |

### Schedule comparison: source vs cloud

| Repo | Source schedule function | Source cron | Cloud job found | Cloud target | Match |
|---|---|---|---|---|---|
| `xekho` | `scheduledTelegramReport` | `every 5 minutes` | Yes | `scheduledTelegramReport` | Yes |
| `webapp-menu` | `scheduledWeatherForecast` | `30 7 * * *` | Yes | `scheduledWeatherForecast` | Yes |
| `webapp-menu` | `scheduledTrendScan` | `0 8 * * *` | Yes | scheduler currently points to `scheduledTrendScanNow` HTTP endpoint | Partial |
| `webapp-menu` | `scheduledRevenueSnapshot` | `30 22 * * *` | Yes | `scheduledRevenueSnapshot` | Yes |
| `webapp-menu` | `scheduledFacebookPageSnapshot` | `40 23 * * *` | Yes | `scheduledFacebookPageSnapshot` | Yes |
| `webapp-menu` | `scheduledBigQuerySync` | `45 23 * * *` | Yes | `scheduledBigQuerySync` and extra `bigquery-sync-http-v2` | Partial |
| `webapp-menu` | `scheduledEvaluator` | `50 23 * * *` | Yes | `scheduledEvaluator` | Yes |
| `webapp-menu` | `scheduledGuardian` | `55 23 * * *` | Yes | `scheduledGuardian` | Yes |
| `webapp-menu` | `scheduledChiefOfStaff` | `58 23 * * *` | Yes | `scheduledChiefOfStaff` | Yes |
| `webapp-menu` | `scheduledFfmpegRenderCleanup` | `20 4 * * *` | Yes | `scheduledFfmpegRenderCleanup` | Yes |
| `webapp-menu` | `dailyReportTelegram` | `0 7 * * *` | No | none found by same function name | No |
| `webapp-menu` | `aiDirectorBrief` | `0 9 * * *` | Yes | scheduler currently points to `aiDirectorBriefNow` HTTP endpoint | Partial |

Scheduler notes:

- All inspected scheduler OIDC identities now use `functions-runtime@pos-v2-909ff.iam.gserviceaccount.com`
- `firebase-schedule-scheduledBigQuerySync-asia-southeast1` is currently `PAUSED`
- `bigquery-sync-http-v2` is a separate enabled HTTP scheduler job without OIDC token in current config

## Mojibake Findings

### Active code still affected

Highest-signal active files with remaining mojibake:

| File | Problem type | Severity |
|---|---|---|
| `xekho/ai-actions.js` | User-facing warning / confirmation text still mojibake | High |
| `xekho/db.js` | Data cleanup regexes and admin alerts contain mojibake | High |
| `xekho/import_master.js` | Operator script logs/comments are mojibake | Medium |
| `xekho/DeepSeekRouter.js` | AI/router text and normalization tables are heavily mojibake-oriented | High |
| `xekho/functions/index.js` | Some Telegram/AI/payment text still broken | High |
| `webapp-menu/functions/index.js` | Small but real mojibake remains in online-order admin strings near `18098+` | Medium |
| `webapp-menu/src/features/admin/pages/OnlineManagementPage.tsx` | Explicit mojibake detection/repair logic still present | Medium |
| `webapp-menu/scripts/fix-menu-categories.mjs` | Repair script still encodes old broken category spellings | Low-Medium |

### Not counted as active defects by default

These still contain heavy mojibake, but are backup/integration/history material:

- `webapp-menu/artifacts/**`
- `webapp-menu/tmp-xekho-live/**`
- `webapp-menu/integration-patches/**`
- `xekho/*.bak`
- `xekho/*.backup*`

## Hidden / Disabled / Route-Risk Findings

| Feature / route | File liên quan | Trạng thái | Rủi ro | Cách test | Đề xuất sửa |
|---|---|---|---|---|---|
| Hidden AI settings with Gemini wording | `xekho/index.html` | Hidden but still present | Medium | Inspect settings DOM manually | Update wording or remove dead UI after ownership decision |
| Public order routes redirected away from `xekho` | `xekho/firebase.json` | Redirect active | Medium-High | Visit `/dat-hang`, `/order`, `/dat-mon` | Document that public ordering is delegated |
| `webapp-menu` source-only daily Telegram functions | `webapp-menu/functions/index.js` | Present in source, absent in cloud | Medium | Inspect build/deploy plan before assuming live | Mark as source-only in docs |
| `webapp-menu` source-only `scanWorkflowRunsNow` | `webapp-menu/functions/index.js` | Source only | Low-Medium | Search callers before deploying | Decide whether to deploy or remove |
| `webapp-menu` source-only `onDineInOrderRequestCreated` | `webapp-menu/functions/index.js` | Source only | Medium | Search Firestore producer paths | Clarify whether feature is planned or abandoned |

## Recommended Controlled Cleanup Order

### Priority 1: ownership and deploy truth

1. Write an explicit ownership map for shared business domains:
   - Telegram reporting
   - online ordering
   - public menu sync
   - Reference: [OWNERSHIP_MAP.md](./OWNERSHIP_MAP.md)
2. Mark source-only `webapp-menu` functions in docs so they are not mistaken for live production
3. Keep treating `xekho` and `webapp-menu` as separate codebases with separate deployment intent

### Priority 2: active mojibake cleanup

Start with the files that affect real operator/runtime output:

1. `xekho/ai-actions.js`
2. `xekho/DeepSeekRouter.js`
3. `xekho/functions/index.js`
4. `xekho/db.js`
5. `webapp-menu/functions/index.js`

### Priority 3: finish Gemini-to-Vertex wording cleanup

1. Remove remaining `Gemini API` wording from `xekho/index.html`
2. Review `webapp-menu/functions/index.js` for user-facing Gemini wording
3. Decide whether `GEMINI_API_KEY` / `GOOGLE_API_KEY` fallback in `webapp-menu/functions/aiService.js` is still intentionally supported

### Pending Gemini/Vertex wording

- `xekho/index.html:1951`
  - Current visible badge text is `Offline NLP + DeepSeek`
  - Kept unchanged in wording-cleanup phase because it may still reflect the current chatbot runtime label
  - Needs explicit product decision before renaming to avoid UI/runtime mismatch

### Priority 4: credential hygiene

1. Keep `serviceAccountKey.json` ignored in both repos
2. Reduce local-file credential fallback where ADC/Secret Manager is enough
3. Audit cross-project AI secrets in `webapp-menu` separately from runtime SA work

## Final Conclusion

This newest audit is for both repos, not just `xekho`.

Current truth:

- `xekho` is not drifted from cloud anymore; it is aligned `34/34`
- `webapp-menu` is close to cloud, but still has `4` source-only functions not deployed
- Runtime SA migration is complete across production functions in both codebases
- Gemini-era remnants still exist in active code and docs
- Mojibake cleanup is incomplete in active code
- The largest remaining technical risk is not runtime SA anymore; it is cross-repo ownership ambiguity plus lingering text/credential cleanup
