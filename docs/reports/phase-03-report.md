# Phase 03 · Infrastructure Health acceptance review

9 November 2026 · Local implementation · Owner review pending

Staff can open Infrastructure Health, inspect evidence for a service and environment, enter a measurement, preview and confirm CSV, correct a staff assertion, and chart observations in UTC. The DigitalOcean fixture exercises the parser and collector database identity through to the authenticated dashboard. Actual account metrics and permissions have not been verified.

## Features, architecture and database

The web app, PostgreSQL and finite job are the existing three runtime components. Migration 004 adds integrations/resource mappings, metric_definitions, resource_capabilities, metric_snapshots, import_batches, metric_daily and metric_request_budget. The [schema](../database/schema.md) and [ADR](../decisions/0009-infrastructure-metrics.md) explain the scope of staff and provider evidence. Migrations 001–003 retain their published contents.

Resource registration is an offline local operation. The browser lists resource type, service, region, collection state, capabilities, permission/cost status and synchronization time. Operators see missing and stale evidence. Usage and availability have separate data models. A service-level staff entry can coexist with several infrastructure resources without attributing it to the wrong machine.

Raw readings have a 30-day retention window. The collector maintenance command moves expired rows in bounded transactions to UTC daily count, total, minimum and maximum, preserving metric identity and provenance. The 90-day history combines raw and summarized readings. Twelve-month summary expiry runs in the same maintenance operation. A prolonged pause can leave a cleanup backlog.

## Provider authorization and cost

| Status | Evidence and boundary |
| --- | --- |
| Implemented and tested locally | Droplet CPU mode-counter deltas, available memory, root filesystem free bytes, one-minute load and public outbound bandwidth. App Platform CPU, memory and restart readings use exact app/component/instance scope. Controlled matrices exercised success, empty, stale, partial, malformed, timeout, denial and throttling paths. |
| Verified against a live provider | None. The synthetic transport proves request construction, local accounting, parsing and persistence. Real API response shapes and permissions for Kbean assets remain pending. |
| Disabled pending authorization | All automatic provider collection. The owner must supply exact resources and metrics, reviewed read scopes, environment-specific secret, permission and allowance evidence, expiry, budgets and authorization for a bounded live read. |
| Manual or unsupported | Azure/Cosmos, GCP, Firebase and identified other providers accept manual observations. Load balancer and managed PostgreSQL automatic metrics, unidentified Hashio/Fusion products and cross-provider discovery are outside the implemented adapter. |

DigitalOcean documents its Monitoring service at no additional cost. The actual account, effective scopes, existing resources/agents, transfer and additional usage were not verified. The approximate €50/month target remains a planning figure. This change introduces no new runtime service or dependency. See the [official pricing](https://docs.digitalocean.com/products/monitoring/details/pricing/), [scope dependencies](https://docs.digitalocean.com/reference/api/scopes/monitoring/read/) and [reviewed operations](https://docs.digitalocean.com/products/monitoring/reference/api/).

## Manual imports, API and dashboard

The authenticated API implements metric latest/history, archived series discovery, snapshots, CSV imports, resource capabilities and integration list/disable. History and list queries validate environment, bounds and cursor. The series route keeps retained-only evidence discoverable when all raw observations have aged out. Local integration enable requests return a conflict.

CSV preview checks a 256 KiB UTF-8 payload, up to 500 rows and 4 KiB fields, a single environment, service scope, metric units, valid time, safe references and duplicates. Confirmation supplies the same content, preview digest and actor-scoped idempotency key. Batch, readings and audit share a transaction. PostgreSQL prevents concurrent identity collisions, and correction requires the current matching observation and a reason. The entry form records a confirmed single staff observation. The dashboard identifies manual, CSV and provider sources and displays observation and ingestion times.

The dashboard supports 24-hour raw points and 7-, 30- and 90-day daily means with sample counts. Data gaps remain visible. Daily means weight observed samples equally. They are unsuitable for estimating continuous uptime, elapsed outage time or total activity in unobserved intervals. Authenticated desktop and mobile captures use synthetic data: [desktop](evidence/phase-03-desktop.png) and [mobile](evidence/phase-03-mobile.png).

## Verification and security assessment

| Executed locally | Result |
| --- | --- |
| Vitest unit, contract and executor tests | 85 passed. Includes existing foundation and availability tests, CSV normalization/digests/limits, CPU counter resets, app instance scope, schema/unit handling, timeout and zero-call gate cases. |
| Native PostgreSQL 18 tests | 10 passed. Includes scoped FKs, grants, bounded concurrent reservations, constraint failure rollback, correction and exact-once retention. Fresh disposable clusters applied 001 through 004, preserved a populated v3 endpoint, replayed migrations and restored an attributed metric value plus identity in a separate database. |
| Playwright with isolated fixtures and no database | 18 passed. Covers the existing public routes, component fixtures and browser isolation. |
| Playwright with running Next.js, local OIDC and real PostgreSQL | 48 passed across 1440×900 and 360×800. Includes navigation, latest and retained-only history, staging/production switching, manual entry, CSV rejection/confirm/replay, role and CSRF denial, admin revisions, a real DB timeout and recovery. |
| Build and tooling | TypeScript, Biome, optimized Next build, OpenAPI parsing and contract checks, shell syntax and diff checks. Dependency audit reported no known vulnerabilities. The finite fixture job and local maintenance entrypoint ran against disposable PostgreSQL. |

The local review covered protected queries, input/output schemas, origin/CSRF, scope checks, immutable provenance, web/collector grants, fixed HTTPS GET operations, exact resource binding, reservation and abort behavior, request/response size, safe error classifications and reference handling. A redacted history scan found no leaks. The nonignored working-tree scan matched only two previously reviewed SHA-256 archive checksums, unchanged from main. Tokens are accepted only by the collector caller. The web database role cannot insert provider rows, alter review evidence or turn on collection. Budget failures precede transport. Restore and rollback evidence uses only disposable databases.

Earlier browser runs exposed an accessible-label selector mismatch, a noncanonical test timestamp, a latest-reading assertion shadowed by a newer test reading, and an ambiguous archived-reading locator. These were corrected and exercised against the actual UI. One intermediate Phase 01 mobile check lost its Playwright trace during context cleanup while runs shared an output directory. Runs with isolated output and the complete final regression suite passed. See the [build log](../../harness/build-log.md) for the executed commands and their scope.

## Scope, owner decisions and acceptance criteria

| Criterion | Assessment |
| --- | --- |
| Infrastructure/resource model, controlled units, source and freshness | Implemented and exercised locally. |
| DigitalOcean read adapter, disabled/unknown-cost zero-call gate | Implemented with controlled transport and database-backed reservations. Live evidence pending. |
| PostgreSQL observations, isolation and integrity | Verified using native PostgreSQL 18, including correction rollback, scoped identity and budget contention. |
| Manual entry, atomic CSV preview/confirmation, duplicate/replay handling | Verified in the authenticated app and API. Manual and provider data have separate insertion privileges. |
| Historical queries, charting and responsive evidence states | Verified for raw, daily and archived-only series. Environment navigation, missing/stale and error recovery exercised. |
| Prior functionality and automated test requirements | Local unit, API, integration, security-related and browser suites executed. Hosted execution awaits a published PR. |
| Documentation and review evidence | Runbook, API, schema, security, integration guides, roadmap, checkpoints, PR draft and this report updated. |
| Operational boundary | Work used the local repository, synthetic provider data and disposable native test databases. Production deployment and collection require separate authorization. |

Branch `phase-03/infrastructure-health` was created from accepted main `be8d2eb9e90b3c46b8ab4e69df30be03a5e4f104` (Phase 02 PR #2). Phase 03 is an uncommitted local change. Its [PR description](../../harness/code-review/phase-03-pr.md) is prepared. Owner decisions include local acceptance, feature branch publication and any future live-read scope. Hosted CI is pending publication. No live provider credential, infrastructure changes or Phase 04 work formed part of this review.
