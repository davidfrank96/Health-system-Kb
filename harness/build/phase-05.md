# Lean Phase 05: Verification and controlled release

Target: 31 March 2027. Status: not started; not authorized.

## Dependencies

All local phase gates, owner budget/cost/risk approval, explicit resource/deploy authority.

## Scope

L05-1 through L05-3: full tests, small-plan evidence, approved temporary managed restore, controlled DO release and handover.

## Verification

Local full regression/load/security; scoped remote job/startup/billing/TLS/restore proof when approved; cleanup/readback and rollback.

## Acceptance

No unresolved unaccepted critical/high findings; measured recovery/runtime/cost fit approved limit; target ownership/private access and operational owner confirmed.

## Rollback

Stop new job work, revert tested compatible artifact; DB recovery only with separately approved data-loss/cost assessment; tear down authorized temporary resources.

## Completion record

Record requirements, files, commands/results, unresolved defects, cost/permission evidence, limitations and approved actions in the build log. Stop at phase boundary; no deployment/commit/push is implied.

Apply the [engineering workflow](../../AGENTS.md) to every significant change. Provide milestone evidence in the build log and a short progress update to the owner. Before closing Phase 05, complete `docs/reports/phase-05-report.md` using the [A–F report and acceptance requirements](../../docs/testing/test-strategy.md#phase-report-and-acceptance). Record the verification above against delivered behavior and stop for review.
