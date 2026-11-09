# Draft PR · Add private QA intake, incident history, maintenance scheduling and health reports

Target: main. Source: phase-04/qa-incidents-reports. Local draft only.

Staff can now import a completed QA run, link a failure to an internal incident, append a resolution, schedule a future maintenance window, and download an environment-scoped report derived from the same evidence. The existing QA webhook is implemented for a controlled sender; live use remains disabled.

Migration 005 preserves migrations 001–004 and extends the existing maintenance table and slot function. QA event/run identities reject conflicting replays. Incident updates are append-only, protected by revisions and scoped source lookups. All staff writes require the existing session, role, origin, CSRF and idempotency controls. CSV reads are private, bounded, formula-escaped and audited.

Review the [OpenAPI changes](../../docs/api/openapi.yaml), [operating procedure](../../docs/operations/qa-incidents-reports.md), [decision](../../docs/decisions/0010-operational-evidence.md) and [acceptance report with verification and screenshots](../../docs/reports/phase-04-report.md). Pay particular attention to raw-byte signing, service/environment joins, future-only maintenance and weighted report denominators.

Verified locally on the built app and native PostgreSQL 18, including upgrade from populated v4, restore, simultaneous deliveries and updates, a forced timeout and retry, and real CSV download. Local QA ownership, keys, cadence and platform cost do not establish a live integration. No polling adapter, production rollout or Phase 05 work is included. Owner review and separate authorization are required for publication.
