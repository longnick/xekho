# XE KHÔ Firestore security access matrix (Sprint 0 baseline)

**Status:** discovery baseline — no Rules were changed while producing this document.

## Roles and identity sources observed

| Actor | Current source | Evidence | Security implication / Sprint 1 dependency |
|---|---|---|---|
| Unauthenticated | `request.auth == null` | `firestore.rules:4-6` | Public request collections have narrow create rules; all POS/admin data must remain denied. |
| Browser-authenticated user | Firebase Auth session plus `users/{uid}.role` | `db.js:1191-1273`, `firestore.rules:8-28` | The role source is client-writable today; it cannot remain trusted. |
| Owner/admin / manager | `users/{uid}.role`; Rules currently treat `admin` and `manager` alike | `firestore.rules:18-20` | Role assignment must become server-controlled. Manager/admin separation needs explicit policy before rollout. |
| Staff / kitchen | `users/{uid}.role`; personnel record is separately in `Staff/{staffId}` | `firestore.rules:22-28`, `db.js:2142-2207` | No authoritative UID → staffId mapping was found in the current browser data model. Self-only attendance Rules cannot be safely enforced until that mapping exists. |
| Server / Cloud Functions | Firebase Admin SDK bypasses Firestore Rules | `functions/index.js` and companion function modules | Server writers remain viable after client Rules hardening, but public HTTP routes require separate Sprint 2 authentication. |

## Identity provisioning flow (current)

| Flow | Current behavior | Evidence | Required hardening direction |
|---|---|---|---|
| First browser sign-in | Browser reads `users/{uid}`; if missing, it creates it and decides a role in browser code. | `db.js:1226-1253` | Move profile/role initialization to a privileged backend/Auth trigger or a tightly controlled bootstrap. Client must never choose role-bearing fields. |
| Manager creates staff account | Browser creates a Firebase Auth account via a secondary app, then directly writes `users/{newUid}` including the selected role. | `db.js:2081-2139` | Replace with an authenticated callable/admin endpoint. It must set Auth claims/user document server-side and audit actor/action. |
| User profile/role edit | Browser `Users.update`, `Users.setRole`, and `Users.disable` write `users` directly. | `db.js:2061-2078` | Keep only a self profile allowlist client-side (if needed); role/disable/identity changes must be backend-only. |
| Staff personnel record | Browser writes `Staff`, including PIN, wage and role fields. | `db.js:2172-2207` | Manager/admin-only operations; self-service must not expose PIN/payroll/Telegram identifiers. |
| Standalone admin creator | An HTTP function can create an Auth admin account and set custom claims. | `functions/createAdminUser.js:11-70` | Treat as a Sprint 2 endpoint-auth blocker; no secret/default credential values are repeated in this document. |

## Collection access baseline and target policy

Legend: **C/U/D** = create/update/delete. “Target” is the intended security direction; a target marked **blocked** needs application/API work before Rules can be deployed.

| Collection / path | Current client access | Observed client workflow/evidence | Server writer / target policy | Dependency / blocker |
|---|---|---|---|---|
| `users/{uid}` | Any signed-in non-kitchen user can read/write every document. | Listener `db.js:1057-1062`; provisioning and role APIs `db.js:1226-1253,2061-2139`; Rules `121-124`. | Staff: self read + narrow profile/Firebase messaging allowlist only. Manager/admin: list/read needed only for personnel UI. Role, disable, identity and payroll fields: privileged backend only. | Current always-on full-list listener and direct role manager must be replaced/conditioned. |
| `Staff/{staffId}` | Any signed-in user read; admin/manager C/U/D. | Listener `db.js:1064-1069`; APIs `2142-2207`; Rules `95-98`. | Manager/admin CRUD. Staff/kitchen self read only after authoritative UID mapping; do not expose PIN/wage/Telegram data broadly. | UID↔staff mapping not confirmed; field redaction may require backend DTO. |
| `attendance_daily`, `attendance_shifts` | Any signed-in user read; any “staff” C/U. | Listeners `db.js:1071-1088`; APIs `2319-2347`; Rules `100-109`. | Manager/admin full read; staff only own date/shift data. Writes through backend or owner-bound constrained fields; immutable check-in/checkout audit fields. | Current rows are keyed by date/shift, not necessarily Auth UID. Confirm mapping before self-only rules. |
| `history` | Any signed-in user read/write. | Listener `db.js:1090-1115`; APIs `2215-2238`; Rules `149-151`. | Manager/admin read; payment close/cancel through trusted backend/transaction, append/audit semantics. | Client direct add/update/delete and automatic text repair must be redesigned or privileged. |
| `expenses`, `purchases`, `suppliers` | Any signed-in user read/write. | Listeners `db.js:1117-1163`; APIs `2294+`, `2490+`; Rules `153-163`. | Manager/admin financial CRUD; staff only explicit, constrained expense-submission flow if product confirms it. | Current finance UI uses direct browser writes. |
| `inventory`, `Inventory_Items`, `Recipes_BOM`, `unitConversions` | Broad signed-in write (except some master collection variants). | `firestore.rules:145-147,205-206,218-224`; inventory APIs `db.js:1916-1991`; BOM writes `db.js:1856-1867`. | Manager/admin CRUD; staff only scoped stocktake proposal/action, kitchen read appropriate item subset. | Inventory/Sprint 1 must enumerate actual master/legacy aliases before denying broad client writes. |
| `menu`, `Product_Catalog`, `public_menu` | `menu` broad signed-in write; Product Catalog admin; public menu admin with validator. | Rules `62-65,141-143,213-216`; menu APIs `db.js:1801+`. | Menu master/admin manager only; public-menu synchronization via trusted backend. | Browser uses legacy/menu and master catalog fallback paths. Preserve read compatibility. |
| `config`, `settings` | `config` broad signed-in read/write; settings admin write. | Rules `112-119`; reads/writes `db.js:930-953`, functions writers. | Config admin only; settings should use document-specific policy. Sensitive configuration must be backend only. | Identify which safe runtime settings need staff read before denial. |
| `tables`, `orders`, `kitchen_notifications` | Signed-in non-kitchen write for tables/orders; kitchen item-only order update; all signed-in kitchen notification update. | Rules `126-139,169-174`; transaction paths `db.js:1477-1737`. | Operational staff actions must be transaction-constrained; kitchen may update allowed status fields only. | Separate rule test suite after core privilege/data protection. |
| Customer request collections | Public create with validators; staff processing. | Rules `39-87`; Cloud Functions process via Admin SDK. | Preserve narrow public create; validate all mutable transitions server-side/role-scoped. | Out of core Sprint 1 unless coverage finds bypass. |
| Logs / media / AI records / unmatched collections | Mixed broad or default deny rules. | Rules `89-93,176-211,226-228`. | Audit logs append-only; media admin-only; AI history owner/user-scoped; every unmatched server collection stays default deny. | Endpoint and collection inventory continues in Sprint 2/4. |

## Server-side writers requiring no client-Rules exception

- Cloud Functions use the Admin SDK for Telegram, kitchen, reports, finance widget, media, and internal workflows.
- The production outcome after Sprint 1 should be: **client Rules deny privileged changes; authenticated backend performs approved privileged changes and creates an audit record.**
- Server routes are not implicitly safe merely because they bypass Rules. `apiVoice`, `aiRouter`, and `createAdminUser` require their own request-authentication/remediation work in Sprint 2.

## Sprint 1 test commitments derived from this matrix

1. An ordinary signed-in actor cannot create or update role/permission/identity fields in any `users/{uid}` document.
2. An ordinary actor cannot mutate another actor's user, finance, history, inventory, config, or attendance records.
3. Each allowed manager/admin path has a synthetic emulator test.
4. Any app flow that cannot be authorized without the missing UID↔staff mapping is explicitly **blocked**, not silently retained as broad access.
5. Rules deployment is prohibited until client direct-write replacements for the blocked flows are implemented and E2E-verified.
