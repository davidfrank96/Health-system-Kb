# API design and contract rules

[openapi.yaml](openapi.yaml) is a valid OpenAPI 3.0.3 **proposal**, not a live API. Every operation has `x-implementation-status: unimplemented`; the server uses `.invalid`. OpenAPI 3.0.3 is selected for mature tooling compatibility, not because it is the newest standard. See [specification](https://spec.openapis.org/oas/v3.0.3.html).

## Boundaries

Public status routes explicitly set `security: []` and return closed public DTOs. Private routes inherit an opaque server-session cookie; roles in `x-required-roles` are documentation that implementation must enforce. Publisher capability is additional to role. QA uses its own HMAC scheme and sender-bound environment; a cookie is not a QA authentication method. Liveness/readiness disclose only minimal status. OIDC initiation/callback/logout paths will be finalized with the selected identity library in Phase 01, and must not be treated as undocumented bypasses.

Every requested environment/asset/report is checked against session membership. For mutations using an object ID, derive its environment from the stored object and authorize before writing; never trust a browser-supplied environment override. Unknown or inaccessible objects return 404 where appropriate to avoid enumeration. Public status responses never serialize internal incident/asset DTOs. Private responses use no-store. Public caching is allowed only on approved projection data; initial max-age 30s, with freshness shown and invalidation after publication. Do not serve a cached healthy state indefinitely during origin failure.

## Validation and errors

JSON only on mutation routes; default body cap 64 KiB, QA 256 KiB. Closed schemas reject extra properties. Dates are UTC RFC 3339; start < end, finished >= started, nonnegative counts and durations. Availability durations reconcile exactly with the window and selected maintenance policy; nullable percentages require a null reason. Histories: public daily <=90d; private raw <=30d/hourly <=90d/daily <=366d. Validate ranges before any database/provider query. No arbitrary PromQL, SQL, provider URL or filter language accepted.

Collections use limit 1–100 and opaque cursor. Use stable `(timestamp,id)` ordering; cursor binds actor scope, environment, filters and snapshot watermark to prevent cursor reuse across privileges. Sorting/filter fields are allowlisted. Public component history requires a public component ID; do not map arbitrary internal asset IDs. Rate limits proposal: public 120 requests/min/IP, private 300/min/user, login 10/min/IP, QA 60/min/sender and 300/min/global. Tune against expected traffic; enforce distributed limits appropriately before multiple replicas. 429 includes Retry-After.

Errors use application/problem+json with safe code, requestId and non-sensitive detail. 400 invalid input; 401 absent/invalid identity; 403 denied operation; 404 absent/hidden resource; 409 stale revision/idempotency conflict/not-ready report; 413 too large; 429 limited; 503 critical dependency unavailable. Return no raw provider error/stack/credential/endpoint. Keep trace IDs in private logs without payload dumps.

## Mutation and event consistency

Browser writes require CSRF token and Origin validation, `Idempotency-Key` scoped to actor/route for 24h, body digest conflict protection and transactional audit. Update/publish/retract/ack/silence use `If-Match`; expose matching quoted ETag revisions from reads/responses. Retrying an identical successful mutation returns its original result. Incident lifecycle: investigating → identified → monitoring → resolved; reopening creates a new incident or a separately approved lifecycle change. Chronological updates cannot precede incident start; resolution sets resolvedAt. Maintenance intervals require owner approval and same-environment assets.

Public preview is a draft. Publish binds exact public revision and digest plus publisher capability; edits invalidate previous approval. Approving an internal incident is not publishing it. A later contract extension must support public maintenance revision/publication under the same boundary before Phase 03 release; current maintenance writes remain internal only.

QA signing, key binding, temporal checks, duplicate conflict rules and count semantics are in [qa.md](../integrations/qa.md). OpenAPI cannot express HMAC canonicalization or every cross-field invariant: runtime validators and contract tests must implement them explicitly. API path version stays v1 for compatible additive fields; breaking payload/semantics require v2 and a documented transition. JSON schemas are closed, so clients must deliberately opt into reviewed schema updates rather than silently accepting incompatible changes.

## Remaining contract work by phase

Phase 01: identity endpoints, admin membership/configuration inputs, monitor approval workflow and pagination/filter conventions after library selection. Phase 02: concrete metric descriptors/capability endpoints. Phase 03: maintenance publication, public subscription/feed policy and conditional approval requirements. Phase 04: report scheduling and notification rules. These are explicit backlog items; the initial contract covers all route groups named in the baseline plus publication/alert/export proposals, not every final administration operation.
