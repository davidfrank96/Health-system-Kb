# Lean Phase 01: Foundation

Target: 18 December 2026. Status: local foundation delivered on phase-01/foundation. Acceptance is awaiting owner review.

## Dependencies

The owner authorized the foundation, native database setup and local verification. Track product prerequisites and L01–L07/L12 decisions separately in the approval register.

## Scope

L01-1 through L01-5: one Next.js app, local PostgreSQL, OIDC/RBAC, service inventory/basic private dashboard and local CI.

## Verification

Local DB migration/grant/restore, session/role/env/CSRF tests, Playwright access/empty states, build/typecheck and secret/dependency scans.

## Acceptance

Every operational page/API private; no invented data or active provider; minimal local foundation verified.

## Rollback

Revert compatible local code/migrations in isolated test DB; no cloud rollback required.

## Completion record

Record requirements, files, commands/results, unresolved defects, cost/permission evidence, limitations and approved actions in the build log. Stop at phase boundary; no deployment/commit/push is implied.

## Ordered local implementation

1. Confirm revised scope, identity/MFA, modest inventory/workload, budget assumptions and library/runtime choices. Pin compatible supported dependencies only after implementation authorization.
2. Create one pnpm Next.js app with server-only database/validation modules, local PostgreSQL configuration, secret-free environment example and minimal CI.
3. Add users/memberships/sessions/services/endpoints/audit and migration metadata only as needed; test constraints/grants and local restore. Later phase tables remain later work.
4. Implement standard Google OIDC and server-managed sessions, membership/CSRF/role enforcement, bootstrap owner procedure and library-owned auth paths. Reject unapproved identities and cross-environment access.
5. Build basic internal navigation, inventory settings and honest empty/loading/error states. All status/report placeholders require auth; no fabricated live health.
6. Run local unit/integration/API/Playwright and scans; update contracts/docs/evidence and present the Phase 01 gate.

Excluded: active collector/provider integration, remote provisioning, database creation in DO, cloud IAM changes, paid API calls, public status and production deployment. Development uses a persistent native PostgreSQL 18 database and automated tests use disposable clusters. Postgres.app is preferred on macOS. CI uses a separate PostgreSQL 18 service. Local Docker and connections to DigitalOcean are excluded. No permanent worker or staging service is scaffolded.

## Required milestone evidence

1. Quality setup: run the harness, distinguish fixture isolation from product assurance, and record the prepared PR checks.
2. Database: apply actual migrations on a fresh test database and an upgrade fixture. Verify constraints, role grants, representative queries and restore. Record commands and results before moving on.
3. Authentication/API: use a local test issuer and synthetic memberships. Exercise login/logout, expiry/revocation, direct private page/API access, role/environment denials, CSRF, invalid payloads and redaction. Record positive and negative results.
4. Dashboard/inventory: run Playwright against the actual local app. Test routing, seven sections, authorized inventory workflows, unauthorized direct access, loading/empty/error states, keyboard navigation and desktop/mobile layouts. Use deterministic seeded data, controlled delays and injected failures. Record traces/screenshots only as needed.
5. Consolidate the evidence, blocked checks and outstanding work into the [Phase 01 report](../../docs/reports/phase-01-report.md) using the [phase report standard](../../docs/testing/test-strategy.md#phase-report-and-acceptance). Publish a short build-log update and owner-facing summary after each milestone.

Verified milestone results and remaining release-only checks are recorded in the [consolidated report](../../docs/reports/phase-01-report.md). Follow the [setup, migration and reset procedures](../../docs/database/local-development.md).
