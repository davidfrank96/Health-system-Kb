# Phase 04 · QA, incidents, maintenance and reports

9 November 2026 · Local acceptance gate · Branch `phase-04/qa-incidents-reports`

## A. Executive summary

Ready for owner review. Staff can record a completed QA run, investigate an incident against stored evidence, schedule or cancel future maintenance, and read or export a report. The application and PostgreSQL behavior were exercised locally. The signed sender and OIDC issuer were controlled fixtures. No real QA or cloud integration was verified or enabled.

## B. Implementation

- **QA & Security:** signed terminal-run intake, duplicate/conflict handling, attributed staff form and JSON imports, scoped filters, distinct run and case counts, original/receipt times, last matching signed receipt, approved links and finding references. The app does not execute QA tests.
- **Incidents:** verified affected service, environment, severity and owner; initial report and chronological, attributed revisions. Updates may link a stored downtime event, exact check slot, infrastructure reading, failed QA run or already-referenced security finding. Resolution is terminal; concurrent edits cannot silently win.
- **Maintenance:** schedule, edit or cancel eligible future windows; active and historical records remain read-only. Cancellation removes the exclusion from eligible slots without deleting raw observations. Also visible in Application Status.
- **Reports & History:** daily, trailing 7/30/90-day, calendar-month and bounded QA summaries. Reports distinguish source, time, unavailable values, unknown slots, maintenance and sample counts. Monthly comparison is conditional on observed evidence. Private CSV uses the same report and includes coverage and quality. Overview combines earlier degraded/stale monitoring counts with scoped downtime, metrics, recent QA failures, incidents and active maintenance.

## C. Architecture and database

One Next.js application, native PostgreSQL 18 and the existing finite job; no package, service or paid API added. [Migration 005](../../database/migrations/005_operations.sql) adds run and delivery identities, incidents and timeline rows, extends maintenance in place and adds bounded retention. Migrations 001–004 are unchanged. A populated schema was upgraded through v4 to v5, replayed and restored into a separate database; the identity, Phase 03 metric and Phase 04 incident timeline survived.

[ADR 0010](../decisions/0010-operational-evidence.md) explains the separation of staff assertions and observations. The signed and manual paths share validation but not identity. [OpenAPI 0.6.0](../api/openapi.yaml) covers the operational routes, including the new timeline read and compact overview. Reports read one repeatable snapshot. Saturation of a size limit fails the request instead of silently dropping rows.

## D. Testing results

| Executed locally | Passed | What the result proves |
| --- | ---: | --- |
| Vitest unit, security, executor and API contract suites | 91 | Includes raw HMAC bytes, timestamp/identity failure, counts, freshness, safe URLs, terminal transitions, CSV escaping and both intake budgets. Route declarations are contract checks, not database evidence. |
| Native PostgreSQL integration | 13 | Includes concurrent QA deliveries, atomic rollback, grants, overlapping/cancelled maintenance, slot recalculation and report math. Upgrade/replay and dump/restore also succeeded in the harness. |
| Playwright, public and component projects | 18 | Loopback public route behavior, OIDC failure cases, context isolation and state fixtures. These are separate from authenticated workflows. |
| Playwright, authenticated built Next.js application + PostgreSQL | 58 | Real session, inventory, monitoring, infrastructure and operational paths, 29 cases at each viewport. Ten Phase 04 executions cover HTTP sender security/retry, manual intake, incident and maintenance screens, reports/download, stale/empty/error states, roles, audit and revision races. |
| **Distinct automated checks** | **180** | **0 failed, 0 skipped in the passing suites.** Targeted repeats are not added to the total. |

TypeScript, Biome lint, optimized Next.js build and OpenAPI specification validation passed. Dependency audit: no known vulnerabilities reported. The existing finite monitoring fixture job completed four runs; there was no live collection. Git history was scanned with Gitleaks; the review also scanned the complete proposed working tree, including untracked files. No new credential finding; the only directory-scan matches were two checksums in the unchanged archived Phase 00 manifest.

During development a real report request returned 503: PostgreSQL rejected the bare day alias in grouped queries. Explicit SQL aliases fixed both display and export. A numerical regression checks that two successful, three failed, one unknown and one excluded slot yield 40% observed availability, and that one raw reading plus three retained readings yield a sample-weighted mean of 25. A late staff resolution is shown as investigating before its recording time, even when its reported occurrence is earlier. A separate test deliberately locks the delivery table, gets 503, releases the lock and retries the same signed event successfully. One harness invocation was edited while still running and ended with a shell parsing error after its tests; the clean rerun completed the full suite and teardown successfully.

Reproduction commands and the scope of each test are in the [operating guide](../operations/qa-incidents-reports.md). TypeScript/lint/build and tests use existing development dependencies. OpenAPI validation used a temporary validator outside the repository.

## E. Security assessment

Sender authentication verifies exact request bytes with HMAC-SHA256 in constant time, checks a ±300s clock window, and binds synthetic keys to one source and approved service/environment. Unknown keys, expired signatures, wrong scope, oversized payloads and conflicting identities were rejected. Key rotation accepts at most two valid keys with at most 24h overlap. Caps: 128 KiB body, 60 attempts and 30 signed requests per minute for the single-process sender fixture. No raw headers or keys are returned.

Staff paths require the existing session, membership, role, and for writes Origin/CSRF plus idempotency. Incident and maintenance revisions guard against lost updates. Audit events are written with mutations; exports record period/row count. A real viewer export tested private response headers and neutralization of a formula-prefixed incident title. Evidence links require approved HTTPS hosts and are never fetched. Controls cannot establish the truth of a manual assertion or prevent an authorized staff member copying a download.

## F. Documentation

Updated project instructions and plan, backlog, build log, architecture, data-flow and monitoring models, schema, QA/manual integration guides, OpenAPI, threat model, access control, test strategy and README. The [operator guide](../operations/qa-incidents-reports.md) covers local setup, errors, retry, report boundaries and staff procedures; the [build log](../../harness/build-log.md) records checkpoints and failures. The existing product goals and cost target did not change.

## G. Application verification

Chromium exercised the built app at 1440×900 and 360×800. The reporting workflow also checked a 768px layout for horizontal overflow. Authenticated tests read results back through real APIs/SQL and downloaded actual CSV bytes. A viewer observed a loading state, a database timeout, a safe error and successful retry after recovery. Operators imported failed/flaky evidence, resolved a versioned incident, and edited/cancelled maintenance. These screenshots contain **synthetic local evidence only**:

| Workflow | Desktop | Mobile |
| --- | --- | --- |
| QA evidence and provenance | [Desktop](evidence/phase-04-qa-desktop.png) | [Mobile](evidence/phase-04-qa-mobile.png) |
| Incident history | [Desktop](evidence/phase-04-incident-desktop.png) | [Mobile](evidence/phase-04-incident-mobile.png) |
| Health report | [Desktop](evidence/phase-04-report-desktop.png) | [Mobile](evidence/phase-04-report-mobile.png) |

## H. GitHub status

Base: accepted Phase 03 PR #3, `4156c0b2e072482abda63b2b60e8a2cb9d21eacb` on origin/main, including the earlier CI fix. Local branch: `phase-04/qa-incidents-reports`. Changes remain unstaged and uncommitted. [PR description](../../harness/code-review/phase-04-pr.md) prepared locally; no commit, push, PR, merge, deployment or Phase 04 hosted CI run. Previous hosted CI is not Phase 04 evidence.

## I. Known limitations

The actual QA platform's sender, cost, credentials and schedule are unverified. Fixture ingestion is intentionally disabled outside the approved local test context. There is no polling adapter or approved real integration. Staff can manually enter evidence; external links require an approved host. History depends on configured monitors, observed slots and retention. Sparse metrics cannot establish continuous utilization, actual summed network activity or a cause of downtime. Only the current provider collection state exists. Report rows and lookback are bounded; retained daily metrics do not support partial-day reconstruction. No backdated maintenance edits, notifications or public incident publishing. The €50/month target is unchanged, not a verified invoice.

## J. Phase acceptance

| Requested criteria | Assessment and evidence |
| --- | --- |
| 1. Store and display QA | Verified locally: real browser import and scoped readback. |
| 2. Signed webhook | Verified against the controlled sender only; both rotation keys accepted. |
| 3. Replay/duplicate protection | Verified: concurrent delivery, identical retry, changed bytes, key/clock failure, transaction failure. |
| 4. Manual attribution and isolation | Verified locally: separate source namespace, stored actor, staff roles and environment checks. |
| 5. Display test evidence | Verified: original counts, failed/flaky details, approved links, empty and stale results. |
| 6. Investigate and resolve incidents | Verified through operator UI and conflict tests. |
| 7. Preserve history | Verified: append-only versions, scoped references, actor and restored timeline. |
| 8. Manage maintenance without rewriting history | Verified: overlap rejection, future revisions/cancellation and recalculated sample exclusions. |
| 9. Daily/weekly/monthly reports | Verified via real API-backed period selection and file download. |
| 10. Combine operational evidence correctly | Verified with stored fixtures and independent numerical PG expectations. |
| 11. Private bounded CSV | Verified: role/scope, escaped formula, audit, response headers; encoded size and SQL/detail limits enforced. |
| 12. Label quality | Verified: observed vs unknown, excluded, manual, stale, unverified schedule, unsupported historical conclusions. |
| 13. Preserve Phases 01–03 | Earlier suites passed; historic migrations unchanged. |
| 14. Required tests | Passing counts and independent checks in D. No live platform testing authorized. |
| 15. Browser workflows | Authenticated desktop/mobile evidence in G. |
| 16. Documentation | Contracts, decisions, operations and test strategy updated; see F. |
| 17. Acceptance report | Results, defects, limits and synthetic evidence recorded here. |
| 18. Ready for owner PR review | Local review packet ready. Publication and hosted CI await separate authorization. |
| 19. Remain within scope | No cloud access, deployment, new paid service, scheduler activation or Phase 05 work. |

Local engineering verification is complete. Owner acceptance and any publication are separate decisions.
