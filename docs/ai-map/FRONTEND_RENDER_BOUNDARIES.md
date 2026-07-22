# Frontend render boundaries — Security remediation Sprint 4

**Status:** local hardening in progress; no deployment approved.

## Inventory method and scope

A static scan on 2026-07-10 enumerated **156** uses of `innerHTML`, `outerHTML`, or `insertAdjacentHTML` across runtime JavaScript. The largest surface is `app.js`; secondary surfaces are `ai-ui.js`, `offlineStatusUI.js`, `offlineOrderFallbackDevTools.js`, and `patch_app.js`.

The count is an inventory, not a claim that every sink is exploitable. Each rendering path must be classified before change; this legacy classic-script app deliberately retains controlled template rendering for many UI blocks.

## Trust/data-origin policy

| Origin | Examples | Required render rule |
|---|---|---|
| Static constants / internal numbers | labels, counts, calculated money | Template HTML is allowed only when it contains no external text or URL. |
| Auth/profile and Firestore | staff names, settings, store logo, products, inventory, history, logs | Escape text; do not concatenate into event handlers, attributes, or URL contexts. |
| Customer/operator input | notes, supplier names, order labels, descriptions | Use `textContent` or HTML-escape in text context; do not emit as raw markup. |
| URL/query/external API | image URL, OCR/AI error text, QR/image payloads | Use a context-specific URL validator; reject `javascript:`, `data:text/html`, SVG, and untrusted styles. |

## Mandatory context rules

1. **Text node:** `textContent` first; use `escapeHtml` only when a legacy template must contain text.
2. **HTML:** do not create a generic sanitizer. Remove string-to-HTML creation for high-risk values where feasible.
3. **Attributes / inline handlers:** never interpolate external values. IDs passed to legacy handlers require `_escapeJsString`; HTML attributes require `_escapeHtml`.
4. **Image URLs:** accept only HTTPS or application-created raster `data:image/(png|jpeg|gif|webp);base64,...` values. Reject all other schemes and SVG.
5. **CSS:** set known properties through the `style` object; never concatenate external CSS text.

## Priority map

| Priority | Render boundary | Origin | Sprint 4 action |
|---|---|---|---|
| P0 | Header store logo (`applyStoreSettings`) | persisted settings / Firestore or local storage | Replaced direct `innerHTML` image interpolation with safe DOM image creation. |
| P0 | Settings logo preview (`renderSettings`) | persisted settings / local logo upload | Replaced direct `innerHTML` image interpolation with same URL policy. |
| P1 | Menu/product and purchase image previews | Firestore/operator input | Next bounded migration: replace HTML image template attributes with safe DOM images or URL-policy helper. |
| P1 | Staff/order/history/system-log text | Firestore/customer input | Existing target paths use `_escapeHtml`; retain source-backed checks and review remaining legacy handlers. |
| P2 | Static UI blocks and computed finance/inventory HTML | constants/calculated values | Keep only after source classification; do not bulk rewrite in this sprint. |
| P2 | AI rich text | external model output | Separate sanitizer already exists in `ai-ui.js`; review separately with AI rendering contract tests. |

## Implemented compatibility-safe helper

`app/utils/dom.js` now exports through `window.XekhoApp.utils.dom`:

- `escapeHtml(text)` — legacy text-template encoding;
- `safeImageUrl(value)` — strict HTTPS / constrained raster data-image policy;
- `setSafeImageSource(element, value)` — validates before setting the `src` attribute.

`app.js#_replaceWithSafeImage()` creates an `<img>` DOM node, applies only known style properties, and appends it after the source policy succeeds. An invalid stored image uses the pre-existing emoji fallback rather than creating an image element.

## Verification evidence

- `tests/renderSafety.test.js` covers escaping, rejected `javascript:` and HTML data URLs, accepted HTTPS/raster data URLs, safe `src` attribute setting, and both logo caller paths.
- No live database data, POS data, or production deployment is involved in this sprint.

## Remaining migration gate

Do not bulk-convert the remaining template sinks. Each follow-up batch must add a malicious-payload test before editing, preserve legacy IIFE/script load behavior, and run local desktop/mobile rendering verification before a deployment request.
