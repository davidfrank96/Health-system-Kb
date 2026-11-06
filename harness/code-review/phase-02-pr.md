# Implement Phase 02 application monitoring and sampled availability

The dashboard previously showed inventory without collected application-health evidence. This change adds a finite local collector and connects stored checks, confirmed downtime/recovery and sampled history to Overview, Application Status and admin monitor settings. Live collection stays disabled.

- Adds migration 003, a restricted collector identity, run/check uniqueness, scoped constraints, immutable historical eligibility, outage records and bounded daily aggregation/retention.
- Implements five existing endpoint/status API contracts with session/environment/RBAC checks, CSRF, idempotency, optimistic revisions and query limits.
- Separates offline exact target approval from web configuration. The executor validates addresses, pins connections, verifies TLS, refuses redirects and bounds requests/responses. Controlled fixture authority is test-only.
- Preserves the seven sections, inventory and Phase 01 auth/session behavior. Adds responsive stored-evidence views and honest missing/stale/error/disabled states.

Validation: 137 unique tests passed (75 unit/contract/executor, 8 real PostgreSQL, 18 database-free browser, 36 authenticated browser). Typecheck, lint, optimized build, frozen install, audit, OpenAPI and shell checks passed. History secret scan is clean; working-file review has only the two previously reviewed archive-checksum false positives. Actual 20-target test stayed within four concurrent requests and forty attempts, completing in approximately nine seconds.

See [Phase 02 acceptance report](../../docs/reports/phase-02-report.md), [desktop evidence](../../docs/reports/evidence/phase-02-desktop.png) and [mobile evidence](../../docs/reports/evidence/phase-02-mobile.png). Full architecture/schema/security/API/setup/test documentation is updated.

Limits: 15-minute sampled availability is not continuous uptime; live targets, cloud integrations, managed hosting/TLS/backup, real IdP policy and sustained production workload remain separate gates. The current entrypoint enables only controlled disposable fixtures. Migration rollback preserves evidence rather than providing a destructive down script.

No cloud deployment, infrastructure change or Phase 03 work. Hosted Phase 02 CI is pending authorized publication. Owner review/approval is required before merge; no automatic merge.
