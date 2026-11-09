# Lean internal API rules

[OpenAPI](openapi.yaml) 0.6.0 covers local staff identity, inventory, monitoring, infrastructure, QA, incidents, maintenance, reports and health probes. Other operations retain their roadmap status.

Local GET /auth/login starts OIDC. The callback verifies identity. Logout requires same-origin form CSRF. GET /api/v1/me returns the session-bound CSRF token. Staff mutations require the appropriate role and environment, CSRF, Origin and an idempotency key. Versioned updates also check If-Match. Metrics API details appear in the Phase 03 section below.

## Authentication and scope

All `/api/v1` routes require approved staff session except `/api/v1/webhooks/qa/runs`, which requires the separate QA HMAC sender identity. This includes `/status/overview` and `/status/history`: names do not make them public. `/health/live` and `/health/ready` expose only minimal process/readiness state; no monitored target, secret or report data. Local OIDC routes are implemented as listed above. No public publish, subscriptions or anonymous report access.

Viewer reads permitted environments; Operator additionally imports metrics/QA and manages incidents/maintenance; Admin manages service/target/integration settings and audit. Mutations resolve stored object's scope before writing. Service/endpoint/maintenance environment is immutable; moving data needs a deliberate future migration. Setting enabled requires existing recorded target or cost/permission approvals, not a self-asserted client flag. Secrets never pass through these DTOs.

All private responses no-store; server-side route/data authorization, not UI checks, prevents leakage including Next.js server rendering. Browser mutations require Origin+CSRF and actor/route-scoped Idempotency-Key; body conflicts return 409 and identical retries return the original result. Retain general mutation identity >=24h on associated entity/audit, import/QA identities for their documented record lifetime. Revision-bearing updates require quoted If-Match and reject stale versions. No generic job queue is implied.

## Validation

Closed JSON schemas reject extra fields. Limits: ordinary body 64 KiB, QA 128 KiB, CSV 256 KiB/500 rows. Validate UTF-8, numeric finiteness, known descriptor/unit/aggregation, UUIDs, scope and UTC RFC 3339 dates. start<end; observedAt <=now+2m; manual history no older than 30d. Counts nonnegative; flaky subset; QA status/count consistency and completion>=start. Sample counts reconcile with eligible slots and maintenance policy; null ratios have reasons. OpenAPI does not enforce every cross-field rule; implement and test them explicitly.

Lists limit 1–100, stable `(time,id)` order, opaque cursor bound to environment, actor scope and filters. Endpoint/service lists may use ID order. Raw metrics/checks <=30d, daily sampled history/reports <=366d; aggregates provide older trends. No SQL/PromQL/provider URL query language. Proposed rates: 120 reads/min/staff, 20 mutations/min/staff, login 10/min/IP, QA 30/min/sender and 60/min/global. One app instance initially; use existing database-backed bounded counters where enforcement must survive restarts, not a new cache service.

Errors: 400 invalid, 401 identity missing, 403 forbidden, 404 absent/hidden object, 409 version/idempotency/preview collision, 413 size, 429 rate with Retry-After, 503 unavailable local dependency. Return safe code/request ID, no provider dumps or private credential details.

## Intake and reports

CSV preview/commit and provenance are defined in [manual-imports](../integrations/manual-imports.md). CSV header `X-Preview-Digest` is conditional-required on commit even though the same operation allows preview without it. Single metric input is always assigned manual method by server; no health-check write route is exposed. CSV imports cannot write service configuration or enable providers. CSV correction of existing conflicts is rejected; use the single-snapshot correction path with supersedes ID/reason.

[QA](../integrations/qa.md) is synchronous: validate/signature/scope → one DB transaction → 201; duplicate 200, conflict 409. There is no 202 accepted-but-unprocessed state, inbox consumer or background queue. Manual QA imports have explicit manual provenance. Webhook delivery is conditional on an agreed existing no-charge sender.

Reports are synchronous bounded queries over stored evidence. Summary JSON supports the internal HTML UI; export streams private CSV with source method/observed time/coverage/method version and formula protection. No report object storage, report IDs/jobs, signed public URLs or external document service. Expensive/unbounded requests are rejected; narrowing period is the fallback.

See the native database guide for owner approval and migrations, and the acceptance report for test evidence. These are local framework decisions, not authorization for infrastructure. The lean contract intentionally removes asset/public-revision/alert-delivery endpoints from the prior draft; no existing clients exist to migrate. Breaking future semantics require versioning and tests.


## Phase 02 implemented contract

Version0.4.0 marks five more implemented operations: GET/POST endpoints, PATCH endpoints/{id}, GET status/overview and GET status/history. These extend the existing catch-all route; there is no probing API. Configuration uses expectedCodes, failureThreshold/recoveryThreshold and slowMs/clearMs; owner approval fields are response-only. Endpoint creation starts disabled. Canonical URL change removes approval. ServiceId is optional on the endpoint list, mandatory on history. All list/history pages cap limit100; signed cursors bind actor/scope/query. History requires UTC start/end within90days; fractions are0–1 and displayed as percentages. Outage results are capped100 with an explicit truncation flag. OpenAPI describes the exact local response shapes; unimplemented later-phase operations remain labeled accordingly.

## Phase 03 implementation

The local OpenAPI now covers metrics/latest, history, series, snapshots, imports and integrations list/disable. Series discovery keeps 90-day charts reachable after raw retention. Daily history preserves sample counts and source identity. Preview includes normalized rows and row errors. The staff mutation roles never gain collector authority.

## Phase 04 operational endpoints

GET qa/runs and security/findings accept environment, serviceId, suite, status, start, end and signed, scoped pagination; totals count the entire matching QA set. POST qa/imports is manual; POST webhooks/qa/runs uses a separate sender identity. GET/POST incidents, GET/POST incidents/{id}/updates, GET/POST maintenance and PATCH maintenance/{id} are implemented; cancellation uses {"cancelled":true}. GET reports/summary and reports/export accept kind/start/end/environment. GET reports/attention serves the overview without bulk report data. Paths here are relative to /api/v1/. The timeline GET and compact overview GET extend the proposed contract for chronological staff reads and bounded dashboard counts. Replies use fixed problem codes, no exception or secret. Query bounds: 100 services/endpoints/resources, 500 downtime events/incidents/windows each, 2,000 metric groups, 1,000 QA groups, 5,000 detail rows and 1 MiB CSV. Overflow fails explicitly. No public links or queued exports.
