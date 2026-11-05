# Phase 01: Foundation and isolated staging

Target: 18 December 2026. Status: not started; not authorized.

## Dependencies

Approved Phase 00 revision; Q03/Q05/Q06/Q07/Q15/Q17.

## Scope and deliverables

P01-01 through P01-07: workspace, DB, auth/RBAC, API/app shell, durable worker foundation, CI and separately authorized staging.

## Verification

Vitest domain tests, real local Postgres migrations/constraints/leases, OIDC/RBAC/CSRF integration, Playwright access and empty-state flows, staging TLS/readiness/rollback smoke.

## Acceptance gate

Denied roles/environments cannot access resources; no fake production health; job recovery/idempotency and restore smoke pass. No deployment without its own scope approval.

## Rollback implications

Expand/contract DB compatibility, preserve previous tested artifact, disable new jobs safely; schema restore only as approved recovery.

## Completion evidence

Record implemented features and requirement IDs, changed files, commands/pass-fail results, unresolved defects/security findings, authorized deployment changes, limitations, owner approvals and next-phase dependencies in the build log. Stop at this phase boundary.

## Ordered execution slices

1. Confirm exact approved scope, OIDC settings, runtime/tool pins, database plan and test workload. Finish auth/admin contract details and library review before wiring secrets.
2. Create workspaces and CI checks; pin compatible dependencies and define secret-free environment example. Establish typed package boundaries.
3. Implement identity/inventory/roles/jobs migrations first, constraints and isolated fixture database. Reserve metric partitions for measured Phase 02 volume.
4. Implement OIDC/session lifecycle and complete denial tests before exposing private pages. Build honest empty states and minimal liveness/readiness.
5. Implement durable scheduler claims/idempotency/fencing with mocked providers only. Select PostgreSQL queue library or document custom-queue decision after proof tests.
6. Run local unit/integration/E2E checks and security scans. Produce a reviewable staging spec and rollback procedure.
7. Only within separately recorded provisioning/deployment authority, deploy isolated staging and record smoke/restore evidence. Report gate status and await Phase 02 approval.

Excluded: production provider connection, cloud agents/exports/permission changes, real public status, alert delivery, QA engine execution and production deployment. Staging setup is a deliverable but is not pre-authorized by this plan. Missing infrastructure authorization does not permit fabricated staging evidence.
