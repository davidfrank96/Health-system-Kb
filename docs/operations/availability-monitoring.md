# Local availability monitoring

Phase 02 implements one finite collector, shared calculations, PostgreSQL storage and private dashboard/API views. It does not enable live targets or schedule anything. All fixtures are synthetic and clearly labeled. Existing native PostgreSQL 18 setup applies; no local Docker or cloud connection.

## Commands and credentials

From the repository root, with the pinned Node 22/pnpm and PostgreSQL 18 prerequisites in [database setup](../database/local-development.md):

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test:unit
NEXT_TELEMETRY_DISABLED=1 corepack pnpm build
corepack pnpm job:check
corepack pnpm job:fixtures
corepack pnpm test:db
corepack pnpm test:e2e
```

`job:check` returns disabled with zero requests. `job:fixtures` creates an isolated native test database, migrates it, starts controlled loopback endpoints, executes four finite runs with explicit synthetic historical slots, prints safe run counts, stops the endpoint/DB processes and deletes the disposable cluster. Each run has its own slot/limits; this is a scenario command, not a scheduler or catch-up mechanism. Actual observation times remain real execution times, so simulated confirmation/recovery spans may be under one second. It never uses persistent development data. The combined database/browser command seeds the same controlled records, then tests the real built app with signed synthetic staff identities. Screenshot artifacts are under output/playwright.

`pnpm local` remains the persistent development launcher. Its migrations preserve inventory; monitoring stays disabled until exact owner approvals and a separately authorized runtime exist. No fixture observations are inserted in development. Ctrl-C preserves development data. Database reset/restore instructions remain in [native setup](../database/local-development.md). Never reset production or a database selected from ambient connection variables.

Collector connections use `KBEAN_COLLECTOR_USER` and `KBEAN_COLLECTOR_PASSWORD` with the same tier/name/host/port checks as the web and migrator. Native launchers create kbean_test_collector or kbean_development_collector. Only local sockets/literal loopback and development/test databases are accepted. The web subprocess receives neither migration nor collector credentials. Production/managed TLS wiring remains a separately approved release task.

## Endpoint configuration and approval

Admins create disabled monitors under Settings & Integrations. Viewers/operators can read permitted environments but cannot edit monitors. Writes require session-bound CSRF, matching Origin, idempotency key and quoted version on edits. URL, expected codes, required flag, failure/recovery thresholds and slow/clear thresholds are validated. There is no immediate-probe API. Global bounds are200 configurations,20 per service and20 enabled targets. Changing a URL clears owner approval and disables it; changing configuration breaks consecutive streaks while preserving open outage evidence.

An authorized local owner may use migration credentials outside the web process, with explicit approval:

```sh
KBEAN_MONITOR_CONFIG_APPROVED=yes corepack pnpm db:monitoring-admin approve ENDPOINT_UUID https://approved.example.invalid/health REVIEW_REFERENCE
KBEAN_MONITOR_CONFIG_APPROVED=yes corepack pnpm db:monitoring-admin maintenance SERVICE_UUID START_UTC END_UTC REVIEW_REFERENCE
```

These are command templates, not approved targets. The approval command requires an exact stored canonical HTTPS URL; it records audit evidence and a new version. Reload the dashboard before enabling. Recording approval never authorizes live execution in this release. Maintenance is a future, service-wide interval of at most 30 days, approved offline and audited. Full operator incident/maintenance management remains Phase 04. Historical maintenance edits and corrections are deliberately not exposed.

## Executor and scheduling

monitoring/probe.mjs uses Node HTTP/HTTPS directly. Real URLs must be canonical HTTPS host/path on443, with no IP literal, embedded credentials, query or fragment. All A/AAAA results are validated with ipaddr.js 2.5.0; only public unicast is allowed, rejecting mapped/transition/private/loopback/link-local/multicast/reserved/documentation ranges. The connection uses a lookup callback pinned to the validated address; original hostname remains for Host/TLS verification. No redirect, proxy environment, cookies, authorization header or response-body storage. Responses are discarded after at most64KiB. DNS/network/security/collector/oversize uncertainty is unknown, not downtime; timeout, TLS, refused connections and unexpected HTTP outcomes are separate failure categories. Errors are fixed labels without raw URLs or exceptions.

Each run uses a dedicated non-pooled collector connection with a session advisory lock and durable unique deployment-tier/slot registration before requests. Duplicate slots and concurrent runs exit without probes. Losing the lock connection aborts in-flight requests and commits; a crash can leave a running record, shown as stale/error and never automatically replayed. Subsequent slots proceed. Observations/events commit together; uncommitted results leave expected gaps. Configuration revisions are checked under row locks after probing; changed/disabled targets cannot receive a stale state update.

Limits:20 enabled targets, four concurrent requests, ten-second whole-attempt timeout including DNS/body, two attempts maximum,40 total, one1–2s jittered retry only for timeout/refused/reset or502/503/504. No starts in the last20s of the300s deadline. The standalone fixture command adds a process watchdog. The normal runtime target is120s. Platform billing, outer timeout and invocation metadata remain unverified and unauthorized. Future live scheduling must accept a stable current quarter-hour slot (or arrive within2min of it), never invent missed observations. The current live entrypoint is disabled rather than partially implementing a scheduler.

## Evidence, calculations and retention

[Monitoring model](../architecture/monitoring-model.md) defines transitions and the sampled metric. Health condition and quality are separate. Freshness is evaluated at API-read time; refresh the page or monitoring panel to recalculate it. Missing/disabled data never becomes healthy. Current service health follows required enabled targets; history uses the required/enabled periods recorded at the time, not today's configuration.

For each 15-minute service slot, any required failure gives F; otherwise any unknown gives U; otherwise any success gives S. A service-wide approved maintenance slot is M and excluded; no eligible monitor is N. Retained96-character daily codes preserve sub-day boundaries for rolling24h/7d/30d/90d queries, not raw response details. Sum counts, never daily percentages or endpoint percentages. Coverage and bounds are explicit; below 95% coverage the result is qualified as insufficient coverage. Downtime stores first failure, confirmation, first recovery, resolution and slot references with gap evidence. Observed spans are not precise customer outage durations.

Raw observations are retained for up to 30 days using whole UTC-day cutoffs (between29 and30 days remain). Recent complete daily summaries are recomputed before deletion; older summaries stay immutable. A bounded100 endpoint/day backlog pass summarizes older raw data after long gaps. Raw deletes are limited to5000 rows/run and require a summary; backlog can temporarily exceed the retention target rather than destroy evidence. Daily summaries and resolved downtime retain 12 calendar months; at most1000 old rows/table are removed per run. Open downtime remains. Run records older30 days are deleted only after their observations are gone. Enabled/required intervals preserve onboarding/disable semantics. No partitioning or time-series service.

## Troubleshooting and rollback

No runs: collection is disabled until the explicit fixture command; production targets are not authorized. Unknown/security_policy: target is outside the exact fixture authority or URL/address policy; this does not prove an outage. Stale: observation age exceeds35min; inspect actual collection time and run state. Running/stale run: treat unfinished work as unknown, do not replay its slot. Version conflict: reload configuration. Approval required: use reviewed offline approval; never bypass the guard. Database errors: verify native18 binaries, independent test identity and migration version; errors remain redacted in the app.

Migration 003 is transactional and checksum protected. Preserve001/002 unchanged. Test upgrades from populated v1, replay, SQL rollback and native dump/restore before use. An in-place down migration would delete monitoring evidence, so it is not supplied. Disable collection and roll back compatible app code, preserving tables; restoration to a pre-migration snapshot requires explicit operator review and isolated restore verification. Do not delete persistent development data as a troubleshooting shortcut.

Reference implementations: [Node HTTPS](https://nodejs.org/api/https.html), [Node DNS](https://nodejs.org/api/dns.html), [ipaddr.js](https://github.com/whitequark/ipaddr.js). Actual tested controls and limitations are recorded in the Phase 02 report.
