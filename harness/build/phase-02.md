# Phase 02: Application health and sampled availability

6 November 2026. Authorized local implementation; branch phase-02/availability-monitoring from reviewed main f9423c0 (PR #1). Baseline rerun: 40 unit, 18 database-free browser, 2 PostgreSQL, 28 authenticated browser tests passed. Hosted Phase 01 workflow41954771693 succeeded. No uncommitted baseline changes.

## Ordered implementation and checkpoints

1. **A — Engine.** Finite executor, explicit fixture command, exact target authority, DNS/IP validation and pinned HTTPS, redirects disabled, 64 KiB response limit. Maximum20 targets/40 attempts/four concurrent/10s attempt/300s job; no starts in last20s. One transient retry. No live runtime approval.
2. **B — Persistence/calculation.** Migration 003 extends endpoints; runs/checks/events/daily summaries/basic maintenance evidence. Dedicated collector identity, advisory session lock and unique slot. Two failures confirm; two successes recover. Missing/maintenance breaks streaks. Freshness35m, latency warning2000ms/clear1000ms, bounded settings. Preserve enabled intervals/config revision. Retain raw30d/summaries12months; aggregate before bounded purge. Real disposable PG18 upgrade/rollback/grants/duplicate/lock-loss/state/history/retention tests.
3. **C — API/UI.** Existing endpoints/status routes, scoped bounded history/outage details, collection evidence, admin configuration with CSRF/idempotency/revisions. Seven sections and inventory preserved. Overview/Status use stored observations with accessible bars and drill-down. Real app Playwright desktop/mobile and all Phase 01 regressions.
4. **D — Review.** Type/lint/build, unit/database/API/security/browser, audit/secrets/OpenAPI/workflow. Current docs, A–K report and PR description. No commit/push without new permission; no automatic merge. Stop before Phase 03.

## Decisions and boundaries

Lean rules resolve unspecified recovery to two successes. Condition and quality stay separate. Stale confirmed outages remain open but current health becomes unknown. Collector/security failures never confirm downtime. Availability counts eligible slots, excludes approved maintenance, reports coverage and missing-sample bounds, never a continuous SLA.

Basic maintenance evidence serves calculations; full incident management remains Phase 04. An offline migration-authority command loads approved windows. External target approval is offline and outside web credentials. The separate fixture capability requires disposable test DB and exact loopback registry. Live runtime remains disabled. Native PG18 only; preserve development data. One finite job, one app, one database, no paid service; future hosting target approximately €50/month unchanged.

## Acceptance and rollback

Reconcile all fourteen owner criteria in docs/reports/phase-02-report.md. Controlled checks must persist and appear in the real dashboard, deterministic state/history/outage calculations and security/regressions must pass. Prefer compatible code rollback with collection disabled and evidence retained; test SQL rollback in disposable DB, never reset development. Deployment/provider scheduling and production proof remain separate gates.

## Local verification complete

137 unique tests passed:75 unit/contract/executor,8 PostgreSQL,18 database-free browser,36 authenticated browser. Static/build/contract/dependency/secret review completed. See the [A–K report](../../docs/reports/phase-02-report.md) for exact evidence, resolved defects and limitations. Ready for Review; changes remain local and uncommitted.
