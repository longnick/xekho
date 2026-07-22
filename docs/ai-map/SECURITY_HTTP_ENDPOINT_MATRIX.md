# XE KHÔ HTTP endpoint security matrix — Sprint 2

**Status:** local verification complete; **not deployed**. This is a source-of-truth release checklist for HTTP Functions after the Sprint 2 remediation.

## Trust boundaries

| Surface | Caller authentication | Authorization | Abuse/payload controls | Status |
|---|---|---|---|---|
| `createAdminUser` | None accepted | Provisioning unavailable | No request processing | Retired: `410 Gone` |
| `manageUserAccount` callable | Firebase callable context | Server role hierarchy | Callable framework | Existing approved provisioning path |
| `apiVoice` | Firebase ID token | `staff`, `manager`, `admin`, `owner`, `superadmin` | 64 KiB declared request limit; 30 requests/minute/UID per instance | Hardened |
| `aiRouter` | Firebase ID token | `staff`, `manager`, `admin`, `owner`, `superadmin` | 64 KiB declared request limit; image 5 MiB; audio 8 MiB; MIME allowlists; 20 requests/minute/UID per instance | Hardened |
| `purchaseOcr` | Firebase ID token | `manager`, `admin`, `owner`, `superadmin` | 8 MiB declared request limit; 5 MiB decoded image; JPEG/PNG/WebP only | Hardened |
| `aiStatus` | Firebase ID token | Same AI role allowlist | No project identifier or raw runtime error response | Hardened |
| Admin/maintenance HTTP routes using `verifyAdminRequest` | Firebase ID token | `manager`, `admin`, `owner`, `superadmin` | Existing endpoint-specific handling | OAuth userinfo/email fallback removed |
| Telegram webhooks | Provider delivery + application owner allowlist | Bot/owner-specific handler logic | Provider contract is intentionally separate from browser Bearer auth | Preserved; release review required |
| Kitchen device feed | Configured device token | Device-specific route | Device contract is intentionally separate from browser Bearer auth | Preserved; release review required |
| Scriptable finance widget | Widget token parameter/header contract | Widget-specific handler | Widget contract is intentionally separate from browser Bearer auth | Preserved; release review required |

## Shared browser-token contract

Browser callers for `aiRouter`, `aiStatus`, and `purchaseOcr` obtain the Firebase session token only from `window.DB.currentUser.getIdToken()` and send it as `Authorization: Bearer <ID_TOKEN>`. No token is persisted or hard-coded by this sprint.

## Implementation invariants

1. `authorizePosHttpRequest()` verifies the Firebase ID token through Admin SDK and derives the role from the server-read `users/{uid}` document, falling back only to a verified custom claim when no user record exists.
2. Missing/invalid tokens receive `401`; valid identities with insufficient role receive `403`; payloads beyond declared/decoded limits receive `413`; exhausted in-memory quotas receive `429`.
3. Auth, declared-size validation, and rate limiting run before NLP, Firestore data access, Vertex, or OCR invocation in the hardened endpoints.
4. `createAdminUser` no longer imports Admin Auth, parses credentials, creates users, or assigns claims.
5. `aiStatus` only reports safe health booleans; project identifiers and raw exception messages are not returned.

## Release constraints

- The rate limiter is intentionally **in-memory and per Function instance**. It limits accidental/cost abuse but is not a distributed DDoS boundary. If global quota/WAF is required, configure Cloud Armor or an API gateway in a separately approved infrastructure sprint.
- Existing Telegram, kitchen-device, and widget endpoints have different machine/provider credentials. Do not apply browser Firebase-Bearer auth to them without coordinated caller configuration and authenticated end-to-end verification.
- A production Functions deploy requires owner approval and a post-deploy staged smoke plan using test identities/tokens only. This sprint performed no deploy, Firebase configuration mutation, IAM change, or production endpoint call.
