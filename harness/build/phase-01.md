# Lean Phase 01: Foundation

Target: 18 December 2026. Status: not started; not authorized.

## Dependencies

Accepted revised Phase 00; L01–L07 decisions and explicit L12 authority.

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

## Ordered local implementation after approval

1. Confirm revised scope, identity/MFA, modest inventory/workload, budget assumptions and library/runtime choices. Pin compatible supported dependencies only after implementation authorization.
2. Create one pnpm Next.js app with server-only database/validation modules, local PostgreSQL configuration, secret-free environment example and minimal CI.
3. Add users/memberships/sessions/services/endpoints/audit and migration metadata only as needed; test constraints/grants and local restore. Later phase tables remain later work.
4. Implement standard Google OIDC and server-managed sessions, membership/CSRF/role enforcement, bootstrap owner procedure and library-owned auth paths. Reject unapproved identities and cross-environment access.
5. Build basic internal navigation, inventory settings and honest empty/loading/error states. All status/report placeholders require auth; no fabricated live health.
6. Run local unit/integration/API/Playwright and scans; update contracts/docs/evidence and present the Phase 01 gate.

Excluded: active collector/provider integration, remote provisioning, database creation in DO, cloud IAM changes, paid API calls, public status and production deployment. Local PostgreSQL creation/dependency installation is future Phase 01 work, not authorized by this Phase 00 revision. No permanent worker or staging service is scaffolded.
