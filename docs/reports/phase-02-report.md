# Phase 02 implementation and acceptance report

**6 November 2026 · Ready for Review · Local implementation only**

Branch: `phase-02/availability-monitoring`. Base and current HEAD: `f9423c06d70ed6655432f3faea47194d5325a209`. Phase 02 changes remain uncommitted and unpushed. This report does not approve the phase or authorize deployment.

## A. Executive Summary

The local application now records controlled HTTP/HTTPS health observations in PostgreSQL, evaluates confirmed failures and recovery, and presents current condition, evidence freshness, sampled availability and downtime history through the authenticated dashboard. Admins can configure monitors while a separate offline owner operation controls exact target approval. Live collection remains disabled.

The final verification contains **137 passing tests, zero failing and zero skipped**: 75 unit/security-contract/executor tests, 8 real PostgreSQL tests, 18 database-free browser tests and 36 authenticated browser tests. A focused visual rerun also passed two existing cases; these are not added to the unique total. No cloud resource, production endpoint, IAM configuration, paid API or deployment was used.

## B. Implementation Summary

| Area | Delivered behavior |
| --- | --- |
| Collector | Finite reusable runner, dedicated advisory lock, unique deployment-tier/quarter-hour slot, bounded requests, retries, concurrency, time and response size; explicit disposable fixture command |
| Classification | Healthy/degraded/down/maintenance/unknown; separate fresh/stale/missing/error quality; configurable two-to-five failure/recovery slots, slow/clear latency thresholds and 35-minute freshness |
| Persistence | Migration 003, separate collector credentials/grants, checks, runs, current state, downtime/recovery and compact daily summaries; approved maintenance evidence |
| Availability | One service vote per slot across historically required monitors, missing/maintenance/disabled treatment, coverage, observed fraction and missing-sample bounds; rolling 24-hour/7/30/90-day history |
| Dashboard | Overview counts, latest run and recent failures; Application Status service drill-down, last observation/success, latency, freshness, accessible history bars and downtime/recovery evidence |
| Configuration | Admin create/edit/enable/disable, exact offline approval, URL-change revocation, CSRF, environment isolation, idempotency and revision conflicts; viewer/operator reads |
| Operational controls | Live default sends zero requests; fixtures use only a disposable test database; native PostgreSQL 18 retained; no Docker, new service or paid dependency |

All seven sections remain. Inventory management stays in Settings. Infrastructure collection, QA integration, operational incident narratives, reporting workflows and full maintenance management remain later-phase work. No INSSA or other live endpoint has been verified or approved by this implementation.

## C. Architecture Changes

One Next.js app, one PostgreSQL database and one finite job remain the design. `monitoring/probe.mjs`, `model.mjs`, `runner.mjs` and `store.mjs` supply shared execution and evidence rules. The app adds a monitoring server module and client views using the existing authenticated API architecture. No queue, monitoring server, persistent collector, AI or billable integration was added.

The only new runtime package is pinned `ipaddr.js@2.5.0`, for IPv4/IPv6 parsing and range classification. Node supplies HTTP, HTTPS, DNS, TLS and cancellation. [ADR 0008](../decisions/0008-monitoring-evidence.md) records compact daily evidence, historical required-target eligibility, offline authority and the fixture boundary. The approximate €50/month future hosting target is unchanged; current local execution supplies no evidence of actual DigitalOcean cost.

Five existing contract operations are now implemented: GET/POST `/api/v1/endpoints`, PATCH `/api/v1/endpoints/{id}`, GET `/api/v1/status/overview`, GET `/api/v1/status/history`. OpenAPI version 0.4.0 marks twelve operations implemented locally; future operations remain labeled unimplemented. There is no immediate-probe API. History is limited to 90 days and pages to 100 items; outage responses cap at 100 with a truncation indication.

## D. Database Report

Migration 003 extends endpoints without modifying published migrations 001/002. It adds `collection_runs`, `health_checks`, `downtime_events`, `daily_summaries` and `maintenance_windows`. Composite environment FKs, quarter-hour constraints, run/slot and endpoint/slot uniqueness, and one-open-outage uniqueness protect consistency. Actual observation, collection and ingestion timestamps are separate. Configuration changes preserve prior required/enabled periods and break pending streaks without erasing open events.

The web identity cannot approve destinations or write check/state/run evidence. The collector cannot alter endpoint configuration or identities. Bootstrap/migrator credentials remain outside the web subprocess. Existing development data was not reset or used for destructive tests.

The native launcher successfully applied 001 to a fresh test database, inserted an identity, upgraded to 003, replayed migrations and verified preservation. A native dump restored into a separate test database. Tests exercised transaction rollback, constraints, restricted grants, real HTTP persistence, duplicate/overlapping runs, loss of the lock before and during I/O, confirmation/recovery, historical reads and retention.

Retention recomputes complete recent days and summarizes a bounded older backlog before deleting raw rows. Whole UTC-day cutoffs retain between 29 and 30 days of raw detail; a backlog may temporarily exceed the target to preserve evidence. Deletes cap at 5,000 observations and 1,000 old rows per other retained table per invocation. Summaries and resolved events retain 12 calendar months; open events remain. The retention test covers a 61-day collection gap, repeated rollup, failed/missing/maintenance samples, partial-day reads, later required-flag changes and expiry beyond 12 months. Daily codes preserve counts rather than averaging percentages.

A destructive down migration is deliberately not supplied. Compatible code rollback keeps evidence; restoration to an earlier snapshot requires operator review. See [setup, reset and recovery](../database/local-development.md) and [monitoring operations](../operations/availability-monitoring.md).

## E. Security Assessment

Implemented controls include exact canonical target approval outside web privileges; HTTPS-only external URLs on port 443; no credentials, query or fragment; rejection of IP literals and forbidden A/AAAA ranges including mapped IPv6; pinned connection lookup; normal hostname/certificate verification; redirects disabled; no proxy/agent reuse, response-body storage or target credentials; bounded response bytes and total attempt time. Unknown DNS/network/collector/policy failures cannot confirm target downtime. A stalled DNS resolution is classified unknown/DNS rather than a target timeout.

The separate fixture authority requires the approved `kbean_test` database and an exact loopback URL list. Real Node HTTP/TLS requests verified response/status, size, timeout, redirect refusal and certificate trust behavior. Resolver fixtures exercised mixed private/public answers, mapped/transition addresses and stalled resolution through the executor. The same request path pins the approved fixture connection. No public target or production resolver/network was probed; these local checks are not a hosted network certification.

Actual app tests verify anonymous denial, admin/operator/viewer distinctions, scoped object hiding, CSRF, malformed input, approval refusal, URL-change approval revocation, revision conflicts, duplicate keys and query bounds. Existing authentication/session regression tests continue to pass. Errors returned to the app are fixed labels, not raw exception messages.

Gitleaks history scan: no leaks. Review of all tracked and nonignored new files: two matches, both the unchanged historical archive SHA-256 entries already reviewed at lines 23/52; no new credential finding and no new blanket exception. Native credentials, environment files, browser traces and generated private TLS keys are outside tracked changes. Selected screenshots were visually reviewed and contain synthetic local data only. Dependency audit: no known vulnerabilities.

## F. Testing Results

Environment: macOS arm64, Node 22.23.2, pnpm 10.34.9, native Homebrew PostgreSQL 18.3, Vitest 5.1.0 and Playwright 1.64.1 Chromium. Postgres.app remains the preferred documented macOS installation. Browser sizes were 1440×900 and 360×800.

| Executed command / layer | Final result | What it establishes |
| --- | --- | --- |
| `corepack pnpm test:unit` | 75 passed | 35 API security-contract checks, 5 existing foundation tests and 35 monitoring/domain/executor cases, including actual local HTTP/TLS and deterministic DNS/address cases |
| `corepack pnpm test:db` · PostgreSQL | 8 passed | Two foundation tests plus six actual runner/storage/grants/retention/concurrency/failure scenarios |
| `corepack pnpm test:db` · desktop | 18 passed | Four new monitoring scenarios plus fourteen existing auth/inventory regressions |
| `corepack pnpm test:db` · mobile | 18 passed | Same actual application/API/database behaviors at 360px |
| `corepack pnpm test:e2e` | 18 passed | Twelve actual app anonymous/negative OIDC cases; four separate component-fixture checks and two browser-isolation checks |
| `corepack pnpm test:e2e:db tests/e2e/monitoring.spec.ts -g stored` | 2 passed again | Focused visual review; rerun evidence, not two additional unique tests |
| `corepack pnpm job:fixtures` | Completed | Four finite runs, four attempts per run, approximately 22–27ms per measured run, actual controlled responses and stored events, automatic cleanup |
| `corepack pnpm job:check` | Disabled, zero attempts | No default live execution |
| Frozen install, typecheck, Biome lint, optimized build | Passed | Lockfile and static/build verification; no lint errors or warnings in the final lint run |
| `corepack pnpm audit --audit-level=high` | Passed | No known dependency vulnerabilities at execution time |
| OpenAPI validator, `bash -n database/native.sh`, `git diff --check` | Passed | Contract syntax, shell syntax and whitespace |
| Gitleaks Git/file review | No new exposure | History clean; two known archive-checksum file-scan false positives explicitly reviewed |

The 20-target transient-failure test made exactly 40 attempts, asserted no more than four concurrent requests and finished in **8.997 seconds** in a recorded combined run. A shortened deadline-reserve test sent zero additional probes. Lock-loss tests verified no committed observations after cancellation, including loss during an in-flight request. The configured 300-second watchdog/deadline was inspected; no full 300-second soak or provider timeout/billing test is claimed. These measurements are local and synthetic, not a production performance guarantee.

API tests are assertions inside the authenticated Playwright scenarios, not a separate test total. Contract tests and separate component fixtures are clearly distinguished from running product behavior. No required test was disabled or skipped. The original migration expectation now includes version 003; the inventory timeout test navigates Settings instead of the replaced Application Status placeholder, retaining its assertions. A separate actual database-timeout test covers monitoring loading/error/retry.

Failures investigated and resolved: fixture arrays required explicit JSON serialization for pg; date decoding shifted historical dates in a non-UTC machine timezone; repeated retention needed immutable completed summaries and an older backlog pass; a fixture incorrectly combined a closed historical interval with an enabled monitor; a browser API test nondeterministically selected the full 20-monitor fixture service and correctly received a limit conflict. The corrected test creates its own service. OpenAPI's empty required array was removed. Visual review corrected panel spacing, the skip-link clipping and history ordering. Final tests above passed after the relevant fixes.

## G. Application Verification

The actual built app, signed local issuer and PostgreSQL rendered controlled healthy, down, recovered, unknown and stale services. Browser tests opened service detail/history, changed time windows, read stored recovery evidence, configured targets, exercised approval/role barriers and confirmed Overview updates. Actual PostgreSQL locks produced visible loading and error states, followed by successful retry. Page-width assertions passed at both viewports.

Selected synthetic evidence:

- [Desktop service history](evidence/phase-02-desktop.png)
- [Mobile service history](evidence/phase-02-mobile.png)

Bars have textual accessible labels and a color legend; controls use native labels/buttons. The horizontal history strip is bounded inside the responsive page. This is a keyboard/native-control and browser-layout review, not a comprehensive screen-reader or WCAG certification. Current freshness is recalculated on API reads; refresh the panel to update it.

## H. Git and PR Status

- Branch: `phase-02/availability-monitoring`.
- Reviewed base/current HEAD: `f9423c06d70ed6655432f3faea47194d5325a209`.
- Phase 01 implementation commit: `733af8d1c8edc30154385ef062657af0cc538e49`, merged through [PR #1](https://github.com/davidfrank96/Health-system-Kb/pull/1).
- Phase 01 hosted [Engineering quality run](https://github.com/davidfrank96/Health-system-Kb/actions/runs/41954771693): success, verified through GitHub.
- Phase 02 working tree: intentional tracked modifications and new implementation/test/doc/evidence files, unstaged and uncommitted. Existing work was preserved.
- Phase 02 push: **not performed**. No remote feature branch or PR was created. No merge occurred.
- Phase 02 hosted CI: pending authorized publication/PR. The existing isolated PostgreSQL 18 PR workflow was reviewed and automatically includes the added test suites; it remains unchanged.
- [Prepared PR description](../../harness/code-review/phase-02-pr.md) is ready locally. AGENTS now requires owner-reviewed PRs for main and separate publication authority.

The owner prompt requires publication approval after local validation. Approval to publish Phase 01 has not been reused for Phase 02.

## I. Documentation

Updated AGENTS, GOALS, PLANS, README, Phase 01 publication addendum, Phase 01/02 plans, approval register and build log. Updated architecture overview, monitoring model, data flow, database schema/setup, API guide/OpenAPI, security/access-control and test strategy. Added ADR 0008, the [monitoring operations guide](../operations/availability-monitoring.md), this report, PR description and selected screenshots.

Implementation files: monitoring shared modules/declarations; web monitoring API/component and dashboard/inventory presentation; migration 003 and native bootstrap/connection/approval tools; finite job entrypoint; package lock/scripts. Test changes: monitoring unit, integration and Playwright suites; fixture seeding; native launcher/upgrade helpers and Playwright configuration. The final Git diff is the authoritative file manifest. Historical archive contents and published migrations remain unchanged.

## J. Known Limitations

Fifteen-minute samples miss short outages and do not measure a continuous SLA. Confirmation/recovery across two slots takes time; a single-node, same-provider deployment cannot independently report its own complete failure. Unknown or low-coverage periods remain visible. Collector crashes can leave unfinished run rows; they are not automatically replayed. Retention backlog may temporarily exceed the raw target to preserve evidence.

Live collection, provider integrations, actual Google organization/MFA setup, DigitalOcean scheduling/networking/managed TLS/backup/billing and production operation remain unverified and unauthorized. The current runner is deliberately exposed only for disposable fixtures; a future authorized live scheduling adapter must bind current invocation slots, exact approvals and managed database connections. No deployment readiness or final hosting cost is asserted.

Full incident/maintenance workflows, retrospective evidence correction, infrastructure telemetry, QA ingestion and reports remain later phases. Only offline future maintenance intervals are provided here. History has explicit size limits; highly active outage history may require a narrower range. The 1GiB sustained workload, comprehensive accessibility and managed recovery gates remain later release evidence.

## K. Phase Acceptance

| Owner criterion | Evidence/status |
| --- | --- |
| 1. Controlled monitoring executes | Actual HTTP/TLS fixture and finite runner tests passed |
| 2. Checks persist correctly | Real PostgreSQL checks/run/slot integrity and reads passed |
| 3. Classification/confirmation/recovery | Domain transitions plus stored outage/recovery tests passed |
| 4. Sampled availability accurate/documented | Count/bounds, worst required endpoint, gaps/maintenance and retention tests; model/ADR updated |
| 5. Dashboard uses real stored evidence | Real collector→PostgreSQL→built app browser tests passed |
| 6. History and downtime function | 24h/90d UI selection, bounded API history, retained partial-day calculations and events verified |
| 7. Configuration roles/environment boundaries | Actual admin/viewer/operator, scoped IDs, CSRF and approval tests passed |
| 8. SSRF/unauthorized probing controls | Executor validation, forbidden addresses, mixed/stalled DNS, controlled TLS/HTTP and live-disabled checks; production-network proof remains separately gated |
| 9. Phase 01 remains operational | All 88 baseline checks retained; full regression suites passed with legitimate feature-aware test updates |
| 10. Required automated tests | 137 unique tests passed, zero failures/skips in final results |
| 11. Documentation matches code | Contract, schema, setup, architecture, security and tests reconciled |
| 12. Evidence-based report | This report contains actual results, resolved failures and limits |
| 13. Review branch/PR | Local feature branch and PR description prepared; commit/push/PR await explicit permission |
| 14. No unauthorized external action | No live probe, cloud resource/IAM change, paid integration, deployment, push or merge |

**Ready for Review.** Owner acceptance and commit/push/PR authorization remain outstanding. Phase 03 has not started.


## Publication authorization update

After reviewing the local handoff, the owner authorized committing and pushing Phase 02 and opening its review PR. Section H records the pre-publication state. The published commit and PR provide the subsequent Git record; this authorization does not approve merge, live collection, deployment or Phase 03. The recorded 137-test verification is unchanged.
